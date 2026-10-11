import { describe, expect, it } from 'vitest';
import { api, createUser, signedInAgent } from './helpers.js';
import QuickReply from '../models/quickReply.model.js';

const setup = async () => {
  const user = await createUser();
  return { user, agent: await signedInAgent(user) };
};

const create = (agent, body = { title: 'Viewing times', body: 'I can show the flat on weekday evenings.' }) =>
  agent.post('/api/quick-replies').send(body);

describe('quick replies', () => {
  it('creates, lists by name, updates and deletes replies', async () => {
    const { agent } = await setup();
    const a = (await create(agent, { title: 'Viewing times', body: 'Weekday evenings work best.' })).body;
    await create(agent, { title: 'Deposit', body: 'The deposit is one month of rent.' });

    const list = await agent.get('/api/quick-replies');
    expect(list.body.map((r) => r.title)).toEqual(['Deposit', 'Viewing times']);

    const updated = await agent.patch(`/api/quick-replies/${a._id}`).send({ body: '  Weekends too!  ' });
    expect(updated.body).toMatchObject({ title: 'Viewing times', body: 'Weekends too!' });

    await agent.delete(`/api/quick-replies/${a._id}`).expect(200);
    expect((await agent.get('/api/quick-replies')).body).toHaveLength(1);
  });

  it.each([
    ['a missing name', { body: 'Hi' }, 'Give the reply a short name'],
    ['a long name', { title: 'x'.repeat(41), body: 'Hi' }, 'Name must be at most 40 characters'],
    ['empty text', { title: 'Hello', body: '  ' }, 'Reply text is required'],
  ])('rejects %s', async (_, body, message) => {
    const { agent } = await setup();
    const res = await create(agent, body);
    expect(res.status).toBe(400);
    expect(res.body.message).toBe(message);
  });

  it('rejects an empty update', async () => {
    const { agent } = await setup();
    const reply = (await create(agent)).body;
    expect((await agent.patch(`/api/quick-replies/${reply._id}`).send({})).body.message).toBe('Nothing to update');
  });

  it('caps the number of saved replies', async () => {
    const { user, agent } = await setup();
    await QuickReply.insertMany(Array.from({ length: 30 }, (_, i) => ({ owner: user._id, title: `Reply ${i}`, body: 'Text' })));

    expect((await create(agent)).status).toBe(400);
  });

  it("keeps each user's replies private", async () => {
    const { agent } = await setup();
    const reply = (await create(agent)).body;
    const other = await signedInAgent(await createUser());

    expect((await other.get('/api/quick-replies')).body).toEqual([]);
    expect((await other.patch(`/api/quick-replies/${reply._id}`).send({ title: 'Mine now' })).status).toBe(404);
    expect((await other.delete(`/api/quick-replies/${reply._id}`)).status).toBe(404);
    expect((await api().get('/api/quick-replies')).status).toBe(401);
  });

  it('are included in the data export and deleted with the account', async () => {
    const { user, agent } = await setup();
    await create(agent);

    const exported = JSON.parse((await agent.get('/api/user/export')).text);
    expect(exported.quickReplies).toEqual([expect.objectContaining({ title: 'Viewing times' })]);

    await agent.delete(`/api/user/delete/${user._id}`).expect(200);
    expect(await QuickReply.countDocuments()).toBe(0);
  });
});
