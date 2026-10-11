import { describe, expect, it } from 'vitest';
import { api, createListing, createUser, signedInAgent } from './helpers.js';
import ListingQuestion from '../models/listingQuestion.model.js';
import Notification from '../models/notification.model.js';

const setup = async (listingOverrides = {}) => {
  const owner = await createUser({ username: 'owner_user' });
  const asker = await createUser({ username: 'asker_user' });
  const listing = await createListing(owner, { name: 'Sunny Garden Apartment', ...listingOverrides });
  return {
    owner,
    asker,
    listing,
    ownerAgent: await signedInAgent(owner),
    askerAgent: await signedInAgent(asker),
  };
};

const ask = (agent, listing, question = 'Are pets allowed in the building?') =>
  agent.post(`/api/questions/listing/${listing._id}`).send({ question });

const list = (agent, listing) => agent.get(`/api/questions/listing/${listing._id}`);

describe('asking questions', () => {
  it('posts a question and notifies the owner', async () => {
    const { owner, listing, askerAgent } = await setup();

    const res = await ask(askerAgent, listing, '  Are pets allowed in the building?  ');

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ question: 'Are pets allowed in the building?', asker: { username: 'asker_user' } });
    expect(res.body.asker).not.toHaveProperty('email');
    const notification = await Notification.findOne({ recipient: owner._id });
    expect(notification).toMatchObject({
      type: 'question_asked',
      title: 'asker_user asked a question',
      body: 'About "Sunny Garden Apartment"',
      link: `/listing/${listing._id}#questions`,
    });
  });

  it.each([
    ['a too-short question', 'Hi?', 'at least 5 characters'],
    ['a too-long question', 'x'.repeat(501), 'at most 500 characters'],
  ])('rejects %s', async (_, question, message) => {
    const { listing, askerAgent } = await setup();
    const res = await ask(askerAgent, listing, question);
    expect(res.status).toBe(400);
    expect(res.body.message).toContain(message);
  });

  it("does not let owners ask about their own listing", async () => {
    const { listing, ownerAgent } = await setup();
    expect((await ask(ownerAgent, listing)).status).toBe(400);
  });

  it('limits each person to 3 unanswered questions per listing', async () => {
    const { listing, askerAgent } = await setup();
    for (let i = 0; i < 3; i++) await ask(askerAgent, listing, `Question number ${i}?`).expect(201);

    const res = await ask(askerAgent, listing, 'One more question?');

    expect(res.status).toBe(429);
  });

  it('requires sign-in and a visible listing', async () => {
    const { owner, askerAgent } = await setup();
    const hidden = await createListing(owner, { hidden: true, hiddenBy: 'moderation' });
    const paused = await createListing(owner, { active: false });

    expect((await api().post(`/api/questions/listing/${hidden._id}`).send({ question: 'Anyone home?' })).status).toBe(401);
    expect((await ask(askerAgent, hidden)).status).toBe(404);
    expect((await ask(askerAgent, paused)).status).toBe(404);
  });
});

describe('listing questions', () => {
  const withQuestions = async () => {
    const ctx = await setup();
    const other = await createUser();
    const otherAgent = await signedInAgent(other);
    const answered = (await ask(ctx.askerAgent, ctx.listing, 'Is there a dishwasher?')).body;
    await ctx.ownerAgent.post(`/api/questions/${answered._id}/answer`).send({ answer: 'Yes, a new one.' });
    const mine = (await ask(ctx.askerAgent, ctx.listing, 'Is the street noisy at night?')).body;
    const theirs = (await ask(otherAgent, ctx.listing, 'Can I paint the walls?')).body;
    return { ...ctx, otherAgent, answered, mine, theirs };
  };

  it('shows visitors only answered questions', async () => {
    const { listing } = await withQuestions();

    const res = await list(api(), listing);

    expect(res.body.questions.map((q) => q.question)).toEqual(['Is there a dishwasher?']);
    expect(res.body.questions[0].answer.body).toBe('Yes, a new one.');
    expect(res.body.viewer).toBeNull();
  });

  it("shows askers their own pending questions but not other people's", async () => {
    const { listing, askerAgent } = await withQuestions();

    const res = await list(askerAgent, listing);

    expect(res.body.questions.map((q) => q.question)).toEqual(['Is the street noisy at night?', 'Is there a dishwasher?']);
    expect(res.body.viewer).toEqual({ isOwner: false, canAsk: true });
  });

  it('shows the owner every question', async () => {
    const { listing, ownerAgent } = await withQuestions();

    const res = await list(ownerAgent, listing);

    expect(res.body.questions).toHaveLength(3);
    expect(res.body.viewer).toEqual({ isOwner: true, canAsk: false });
  });

  it('keeps questions on hidden listings private', async () => {
    const { owner, ownerAgent } = await setup();
    const hidden = await createListing(owner, { hidden: true, hiddenBy: 'moderation' });

    expect((await list(api(), hidden)).status).toBe(404);
    expect((await list(ownerAgent, hidden)).status).toBe(200);
  });
});

describe('answering questions', () => {
  it('lets the owner answer, notifying the asker once', async () => {
    const { asker, listing, askerAgent, ownerAgent } = await setup();
    const question = (await ask(askerAgent, listing)).body;

    const res = await ownerAgent.post(`/api/questions/${question._id}/answer`).send({ answer: 'Cats and small dogs, yes.' });
    await ownerAgent.post(`/api/questions/${question._id}/answer`).send({ answer: 'Cats and small dogs only.' });

    expect(res.status).toBe(200);
    expect(res.body.answer.body).toBe('Cats and small dogs, yes.');
    expect((await ListingQuestion.findById(question._id)).answer.body).toBe('Cats and small dogs only.');
    expect(await Notification.countDocuments({ recipient: asker._id, type: 'question_answered' })).toBe(1);
  });

  it('only lets the owner answer', async () => {
    const { listing, askerAgent } = await setup();
    const question = (await ask(askerAgent, listing)).body;

    const res = await askerAgent.post(`/api/questions/${question._id}/answer`).send({ answer: 'Answering myself' });

    expect(res.status).toBe(403);
  });

  it('rejects an empty answer and unknown questions', async () => {
    const { listing, askerAgent, ownerAgent } = await setup();
    const question = (await ask(askerAgent, listing)).body;

    expect((await ownerAgent.post(`/api/questions/${question._id}/answer`).send({ answer: '  ' })).status).toBe(400);
    expect((await ownerAgent.post('/api/questions/0123456789abcdef01234567/answer').send({ answer: 'Hi' })).status).toBe(404);
  });
});

describe('deleting questions', () => {
  it('lets askers withdraw a question until it is answered', async () => {
    const { listing, askerAgent, ownerAgent } = await setup();
    const pending = (await ask(askerAgent, listing, 'First question here?')).body;
    const answered = (await ask(askerAgent, listing, 'Second question here?')).body;
    await ownerAgent.post(`/api/questions/${answered._id}/answer`).send({ answer: 'Sure.' });

    expect((await askerAgent.delete(`/api/questions/${pending._id}`)).status).toBe(200);
    expect((await askerAgent.delete(`/api/questions/${answered._id}`)).status).toBe(403);
  });

  it('lets owners and admins remove any question', async () => {
    const { listing, askerAgent, ownerAgent } = await setup();
    const a = (await ask(askerAgent, listing, 'First question here?')).body;
    const b = (await ask(askerAgent, listing, 'Second question here?')).body;
    const admin = await signedInAgent(await createUser({ role: 'admin' }));

    expect((await ownerAgent.delete(`/api/questions/${a._id}`)).status).toBe(200);
    expect((await admin.delete(`/api/questions/${b._id}`)).status).toBe(200);
    expect(await ListingQuestion.countDocuments()).toBe(0);
  });

  it("doesn't let other users delete questions", async () => {
    const { listing, askerAgent } = await setup();
    const question = (await ask(askerAgent, listing)).body;
    const stranger = await signedInAgent(await createUser());

    expect((await stranger.delete(`/api/questions/${question._id}`)).status).toBe(403);
  });

  it('removes questions with their listing or the asking account', async () => {
    const { owner, asker, listing, askerAgent, ownerAgent } = await setup();
    const otherListing = await createListing(owner);
    await ask(askerAgent, listing);
    await ask(askerAgent, otherListing);

    await ownerAgent.delete(`/api/listing/delete/${listing._id}`).expect(200);
    expect(await ListingQuestion.countDocuments()).toBe(1);

    await askerAgent.delete(`/api/user/delete/${asker._id}`).expect(200);
    expect(await ListingQuestion.countDocuments()).toBe(0);
  });
});
