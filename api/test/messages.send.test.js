import { describe, expect, it } from 'vitest';
import { api, createListing, createUser, signedInAgent } from './helpers.js';
import Conversation from '../models/conversation.model.js';
import Message from '../models/message.model.js';

const setup = async () => {
  const owner = await createUser();
  const buyer = await createUser();
  const listing = await createListing(owner);
  return { owner, buyer, listing, buyerAgent: await signedInAgent(buyer), ownerAgent: await signedInAgent(owner) };
};

describe('POST /api/messages/conversations', () => {
  it('starts a conversation with the listing owner', async () => {
    const { owner, buyer, listing, buyerAgent } = await setup();

    const res = await buyerAgent
      .post('/api/messages/conversations')
      .send({ listingId: listing._id.toString(), body: '  Is it still available?  ' });

    expect(res.status).toBe(201);
    expect(res.body.message).toMatchObject({ body: 'Is it still available?', sender: buyer._id.toString() });

    const conversation = await Conversation.findById(res.body.conversationId);
    expect(conversation.owner.toString()).toBe(owner._id.toString());
    expect(conversation.buyer.toString()).toBe(buyer._id.toString());
    expect(conversation.lastMessage.body).toBe('Is it still available?');
  });

  it('reuses the conversation for the same listing', async () => {
    const { listing, buyerAgent } = await setup();
    const send = (body) =>
      buyerAgent.post('/api/messages/conversations').send({ listingId: listing._id.toString(), body });

    const first = await send('Hello');
    const second = await send('Hello again');

    expect(second.body.conversationId).toBe(first.body.conversationId);
    expect(await Conversation.countDocuments()).toBe(1);
    expect(await Message.countDocuments()).toBe(2);
  });

  it('handles two first messages sent at the same time', async () => {
    const { listing, buyerAgent } = await setup();
    const send = () =>
      buyerAgent.post('/api/messages/conversations').send({ listingId: listing._id.toString(), body: 'Hi' });

    const results = await Promise.all([send(), send(), send()]);

    expect(results.map((r) => r.status)).toEqual([201, 201, 201]);
    expect(await Conversation.countDocuments()).toBe(1);
  });

  it("does not let owners message about their own listing", async () => {
    const { listing, ownerAgent } = await setup();

    const res = await ownerAgent
      .post('/api/messages/conversations')
      .send({ listingId: listing._id.toString(), body: 'Hi me' });

    expect(res.status).toBe(400);
  });

  it.each([
    ['an empty message', { body: '   ' }, 'Message cannot be empty'],
    ['a missing message', { body: undefined }, 'Message is required'],
    ['a very long message', { body: 'x'.repeat(2001) }, 'at most 2000 characters'],
    ['a malformed listing id', { listingId: 'abc' }, 'Invalid listing id'],
  ])('rejects %s', async (_, override, message) => {
    const { listing, buyerAgent } = await setup();

    const res = await buyerAgent
      .post('/api/messages/conversations')
      .send({ listingId: listing._id.toString(), body: 'Hello', ...override });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain(message);
  });

  it('returns 404 for a listing that does not exist', async () => {
    const { buyerAgent } = await setup();

    const res = await buyerAgent
      .post('/api/messages/conversations')
      .send({ listingId: '0123456789abcdef01234567', body: 'Hello' });

    expect(res.status).toBe(404);
  });

  it('requires sign-in', async () => {
    const res = await api().post('/api/messages/conversations').send({ body: 'Hi' });
    expect(res.status).toBe(401);
  });
});

describe('POST /api/messages/conversations/:id/messages', () => {
  const start = async () => {
    const ctx = await setup();
    const res = await ctx.buyerAgent
      .post('/api/messages/conversations')
      .send({ listingId: ctx.listing._id.toString(), body: 'Hi' });
    return { ...ctx, conversationId: res.body.conversationId };
  };

  it('lets both participants reply', async () => {
    const { owner, buyerAgent, ownerAgent, conversationId } = await start();

    const reply = await ownerAgent.post(`/api/messages/conversations/${conversationId}/messages`).send({ body: 'Yes it is' });
    await buyerAgent.post(`/api/messages/conversations/${conversationId}/messages`).send({ body: 'Great' });

    expect(reply.status).toBe(201);
    expect(reply.body.sender).toBe(owner._id.toString());
    expect(await Message.countDocuments({ conversation: conversationId })).toBe(3);
    expect((await Conversation.findById(conversationId)).lastMessage.body).toBe('Great');
  });

  it('marks the conversation read for the sender', async () => {
    const { owner, ownerAgent, conversationId } = await start();

    const reply = await ownerAgent.post(`/api/messages/conversations/${conversationId}/messages`).send({ body: 'Yes' });

    const conversation = await Conversation.findById(conversationId);
    const ownerState = conversation.participants.find((p) => p.user.toString() === owner._id.toString());
    expect(ownerState.lastReadAt.toISOString()).toBe(reply.body.createdAt);
  });

  it('hides conversations from other users', async () => {
    const { conversationId } = await start();
    const stranger = await signedInAgent(await createUser());

    const res = await stranger.post(`/api/messages/conversations/${conversationId}/messages`).send({ body: 'Hi' });

    expect(res.status).toBe(404);
    expect(await Message.countDocuments()).toBe(1);
  });

  it('returns 400 for a malformed id', async () => {
    const { buyerAgent } = await setup();
    const res = await buyerAgent.post('/api/messages/conversations/abc/messages').send({ body: 'Hi' });
    expect(res.status).toBe(400);
  });
});
