import { describe, expect, it } from 'vitest';
import { api, createListing, createUser, signedInAgent } from './helpers.js';
import Message from '../models/message.model.js';

const setup = async () => {
  const owner = await createUser({ username: 'owner_user' });
  const buyer = await createUser({ username: 'buyer_user' });
  const listing = await createListing(owner, { name: 'Sunny Loft Apartment' });
  const buyerAgent = await signedInAgent(buyer);
  const ownerAgent = await signedInAgent(owner);
  const start = async (body = 'Hi', forListing = listing) => {
    const res = await buyerAgent
      .post('/api/messages/conversations')
      .send({ listingId: forListing._id.toString(), body });
    return res.body.conversationId;
  };
  const reply = (agent, id, body) => agent.post(`/api/messages/conversations/${id}/messages`).send({ body });
  return { owner, buyer, listing, buyerAgent, ownerAgent, start, reply };
};

describe('GET /api/messages/conversations', () => {
  it('lists conversations with the listing, the other user and unread counts', async () => {
    const { buyer, owner, ownerAgent, buyerAgent, start, reply } = await setup();
    const id = await start('First');
    await reply(buyerAgent, id, 'Second');

    const ownerView = await ownerAgent.get('/api/messages/conversations');
    const buyerView = await buyerAgent.get('/api/messages/conversations');

    expect(ownerView.body).toHaveLength(1);
    expect(ownerView.body[0]).toMatchObject({
      _id: id,
      listing: { name: 'Sunny Loft Apartment', imageUrl: 'https://example.com/photo.jpg' },
      otherUser: { _id: buyer._id.toString(), username: 'buyer_user' },
      isOwner: true,
      lastMessage: { body: 'Second' },
      unreadCount: 2,
    });
    expect(ownerView.body[0].otherUser).not.toHaveProperty('email');
    expect(buyerView.body[0]).toMatchObject({
      otherUser: { _id: owner._id.toString(), username: 'owner_user' },
      isOwner: false,
      unreadCount: 0,
    });
  });

  it('sorts by most recent message', async () => {
    const { owner, buyerAgent, start, reply } = await setup();
    const other = await createListing(owner, { name: 'Quiet Garden Cottage' });
    const a = await start('About the loft');
    await start('About the cottage', other);
    await reply(buyerAgent, a, 'Loft again');

    const res = await buyerAgent.get('/api/messages/conversations');

    expect(res.body.map((c) => c.listing.name)).toEqual(['Sunny Loft Apartment', 'Quiet Garden Cottage']);
  });

  it("does not show other people's conversations", async () => {
    const { start } = await setup();
    await start();
    const stranger = await signedInAgent(await createUser());

    expect((await stranger.get('/api/messages/conversations')).body).toEqual([]);
  });

  it('requires sign-in', async () => {
    expect((await api().get('/api/messages/conversations')).status).toBe(401);
  });
});

describe('GET /api/messages/conversations/:id', () => {
  it('returns the messages oldest first and marks them read', async () => {
    const { ownerAgent, start, reply, buyerAgent } = await setup();
    const id = await start('One');
    await reply(buyerAgent, id, 'Two');

    const res = await ownerAgent.get(`/api/messages/conversations/${id}`);

    expect(res.status).toBe(200);
    expect(res.body.messages.map((m) => m.body)).toEqual(['One', 'Two']);
    expect(res.body.hasMore).toBe(false);
    expect(res.body.conversation.listing.name).toBe('Sunny Loft Apartment');

    const inbox = await ownerAgent.get('/api/messages/conversations');
    expect(inbox.body[0].unreadCount).toBe(0);
  });

  it('pages back through older messages', async () => {
    const { buyer, ownerAgent, start } = await setup();
    const id = await start('Message 0');
    const firstAt = (await Message.findOne({ conversation: id })).createdAt.getTime();
    await Message.insertMany(
      Array.from({ length: 59 }, (_, i) => ({
        conversation: id,
        sender: buyer._id,
        body: `Message ${i + 1}`,
        createdAt: new Date(firstAt + (i + 1) * 1000),
      }))
    );

    const latest = await ownerAgent.get(`/api/messages/conversations/${id}`);
    expect(latest.body.messages).toHaveLength(50);
    expect(latest.body.messages[0].body).toBe('Message 10');
    expect(latest.body.messages.at(-1).body).toBe('Message 59');
    expect(latest.body.hasMore).toBe(true);

    const older = await ownerAgent.get(
      `/api/messages/conversations/${id}?before=${latest.body.messages[0].createdAt}`
    );
    expect(older.body.messages.map((m) => m.body)).toEqual(
      Array.from({ length: 10 }, (_, i) => `Message ${i}`)
    );
    expect(older.body.hasMore).toBe(false);
  });

  it('hides the conversation from other users', async () => {
    const { start } = await setup();
    const id = await start();
    const stranger = await signedInAgent(await createUser());

    expect((await stranger.get(`/api/messages/conversations/${id}`)).status).toBe(404);
  });

  it('rejects an invalid before date', async () => {
    const { ownerAgent, start } = await setup();
    const id = await start();

    expect((await ownerAgent.get(`/api/messages/conversations/${id}?before=not-a-date`)).status).toBe(400);
  });
});

describe('GET /api/messages/unread-count', () => {
  it('counts conversations with unread messages', async () => {
    const { owner, ownerAgent, buyerAgent, start, reply } = await setup();
    const other = await createListing(owner, { name: 'Quiet Garden Cottage' });
    const a = await start('About the loft');
    await start('About the cottage', other);

    expect((await ownerAgent.get('/api/messages/unread-count')).body).toEqual({ count: 2 });
    expect((await buyerAgent.get('/api/messages/unread-count')).body).toEqual({ count: 0 });

    await ownerAgent.get(`/api/messages/conversations/${a}`);
    expect((await ownerAgent.get('/api/messages/unread-count')).body).toEqual({ count: 1 });

    await reply(ownerAgent, a, 'Reply');
    expect((await buyerAgent.get('/api/messages/unread-count')).body).toEqual({ count: 1 });
  });
});

describe('deleting data', () => {
  it("removes a deleted account's conversations and messages", async () => {
    const { buyer, buyerAgent, ownerAgent, start } = await setup();
    await start('Hello');

    await buyerAgent.delete(`/api/user/delete/${buyer._id}`).expect(200);

    expect((await ownerAgent.get('/api/messages/conversations')).body).toEqual([]);
    expect(await Message.countDocuments()).toBe(0);
  });

  it('keeps conversations about a deleted listing', async () => {
    const { listing, buyerAgent, ownerAgent, start } = await setup();
    const id = await start('Hello');

    await ownerAgent.delete(`/api/listing/delete/${listing._id}`).expect(200);

    const inbox = await buyerAgent.get('/api/messages/conversations');
    expect(inbox.body).toHaveLength(1);
    expect(inbox.body[0].listing).toBeNull();
    expect((await buyerAgent.get(`/api/messages/conversations/${id}`)).body.messages).toHaveLength(1);
  });
});
