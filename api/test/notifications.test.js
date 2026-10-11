import { describe, expect, it } from 'vitest';
import { api, createListing, createUser, signedInAgent } from './helpers.js';
import Notification from '../models/notification.model.js';

const notificationsFor = (userId) => Notification.find({ recipient: userId }).sort({ createdAt: 1 });

describe('notifications are created by other actions', () => {
  it('notifies the owner when someone messages them', async () => {
    const owner = await createUser();
    const buyer = await createUser();
    const listing = await createListing(owner);
    const buyerAgent = await signedInAgent(buyer);

    await buyerAgent
      .post('/api/messages/conversations')
      .send({ listingId: listing._id.toString(), body: 'Is it available?' });

    const [note] = await notificationsFor(owner._id);
    expect(note).toMatchObject({ type: 'message', title: `New message from ${buyer.username}` });
    expect(note.link).toMatch(/^\/messages\//);
  });

  it('notifies the other participant on a reply but not the sender', async () => {
    const owner = await createUser();
    const buyer = await createUser();
    const listing = await createListing(owner);
    const buyerAgent = await signedInAgent(buyer);
    const ownerAgent = await signedInAgent(owner);

    const start = await buyerAgent
      .post('/api/messages/conversations')
      .send({ listingId: listing._id.toString(), body: 'Hi' });
    await ownerAgent
      .post(`/api/messages/conversations/${start.body.conversationId}/messages`)
      .send({ body: 'Yes' });

    expect(await Notification.countDocuments({ recipient: buyer._id })).toBe(1);
    expect(await Notification.countDocuments({ recipient: owner._id })).toBe(1);
  });

  it('notifies the owner of a viewing request', async () => {
    const owner = await createUser();
    const listing = await createListing(owner);
    const agent = await signedInAgent(await createUser());

    await agent
      .post('/api/viewings')
      .send({ listingId: listing._id.toString(), startsAt: new Date(Date.now() + 86_400_000).toISOString() });

    const [note] = await notificationsFor(owner._id);
    expect(note.type).toBe('viewing_requested');
    expect(note.link).toBe('/viewings?as=owner');
  });

  it('notifies the requester when the owner accepts a viewing', async () => {
    const owner = await createUser();
    const requester = await createUser();
    const listing = await createListing(owner);
    const agent = await signedInAgent(requester);
    const ownerAgent = await signedInAgent(owner);

    const created = await agent
      .post('/api/viewings')
      .send({ listingId: listing._id.toString(), startsAt: new Date(Date.now() + 86_400_000).toISOString() });
    await ownerAgent.patch(`/api/viewings/${created.body._id}`).send({ action: 'accept' });

    const note = await Notification.findOne({ recipient: requester._id, type: 'viewing_accepted' });
    expect(note).not.toBeNull();
    expect(note.title).toBe('Viewing accepted');
  });

  it('notifies the owner about a new review', async () => {
    const owner = await createUser();
    const buyer = await createUser();
    const listing = await createListing(owner);
    const agent = await signedInAgent(buyer);
    await agent
      .post('/api/messages/conversations')
      .send({ listingId: listing._id.toString(), body: 'Interested' });

    await agent.post(`/api/reviews/listing/${listing._id}`).send({ rating: 5, comment: 'Great place' });

    const note = await Notification.findOne({ recipient: owner._id, type: 'review' });
    expect(note).not.toBeNull();
    expect(note.title).toContain('5-star review');
  });

  it('notifies admins about a new report', async () => {
    const admin = await createUser({ role: 'admin' });
    const listing = await createListing(await createUser());
    const agent = await signedInAgent(await createUser());

    await agent
      .post('/api/reports')
      .send({ listingId: listing._id.toString(), reason: 'scam', details: 'Suspicious' });

    const note = await Notification.findOne({ recipient: admin._id });
    expect(note).toMatchObject({ type: 'report_received', title: 'New listing report' });
  });

  it('notifies an owner when a moderator hides their listing', async () => {
    const admin = await createUser({ role: 'admin' });
    const owner = await createUser();
    const listing = await createListing(owner);
    const adminAgent = await signedInAgent(admin);

    await adminAgent
      .post(`/api/admin/listings/${listing._id}/hide`)
      .send({ reason: 'Inaccurate address' });

    const note = await Notification.findOne({ recipient: owner._id, type: 'listing_hidden' });
    expect(note).not.toBeNull();
    expect(note.body).toContain('Inaccurate address');
  });

  it('notifies a user whose account is suspended', async () => {
    const admin = await createUser({ role: 'admin' });
    const target = await createUser();
    const adminAgent = await signedInAgent(admin);

    await adminAgent.post(`/api/admin/users/${target._id}/suspend`).send({ reason: 'Spam' });

    const note = await Notification.findOne({ recipient: target._id, type: 'account_suspended' });
    expect(note).not.toBeNull();
  });
});

describe('GET /api/notifications', () => {
  it('lists the signed-in user notifications with an unread count', async () => {
    const user = await createUser();
    await Notification.create([
      { recipient: user._id, type: 'message', title: 'One' },
      { recipient: user._id, type: 'review', title: 'Two', read: true },
    ]);
    const agent = await signedInAgent(user);

    const res = await agent.get('/api/notifications');

    expect(res.status).toBe(200);
    expect(res.body.notifications).toHaveLength(2);
    expect(res.body.unreadCount).toBe(1);
    expect(res.headers['x-total-count']).toBe('2');
  });

  it('only returns the caller notifications', async () => {
    const user = await createUser();
    const other = await createUser();
    await Notification.create({ recipient: other._id, type: 'message', title: 'Secret' });
    const agent = await signedInAgent(user);

    const res = await agent.get('/api/notifications');
    expect(res.body.notifications).toHaveLength(0);
  });

  it('filters to unread only', async () => {
    const user = await createUser();
    await Notification.create([
      { recipient: user._id, type: 'message', title: 'New' },
      { recipient: user._id, type: 'message', title: 'Old', read: true },
    ]);
    const agent = await signedInAgent(user);

    const res = await agent.get('/api/notifications?unread=true');
    expect(res.body.notifications).toHaveLength(1);
    expect(res.body.notifications[0].title).toBe('New');
  });

  it('requires sign-in', async () => {
    expect((await api().get('/api/notifications')).status).toBe(401);
  });
});

describe('GET /api/notifications/unread-count', () => {
  it('returns the unread count', async () => {
    const user = await createUser();
    await Notification.create([
      { recipient: user._id, type: 'message', title: 'A' },
      { recipient: user._id, type: 'message', title: 'B' },
    ]);
    const agent = await signedInAgent(user);

    const res = await agent.get('/api/notifications/unread-count');
    expect(res.body).toEqual({ count: 2 });
  });
});

describe('marking notifications', () => {
  it('marks one as read', async () => {
    const user = await createUser();
    const note = await Notification.create({ recipient: user._id, type: 'message', title: 'Hi' });
    const agent = await signedInAgent(user);

    const res = await agent.patch(`/api/notifications/${note._id}/read`);

    expect(res.status).toBe(200);
    expect(res.body.read).toBe(true);
    expect(res.body.readAt).not.toBeNull();
    expect((await agent.get('/api/notifications/unread-count')).body.count).toBe(0);
  });

  it('can mark one unread again', async () => {
    const user = await createUser();
    const note = await Notification.create({ recipient: user._id, type: 'message', title: 'Hi', read: true });
    const agent = await signedInAgent(user);

    const res = await agent.patch(`/api/notifications/${note._id}/unread`);

    expect(res.body.read).toBe(false);
  });

  it("cannot touch another user's notification", async () => {
    const user = await createUser();
    const other = await createUser();
    const note = await Notification.create({ recipient: other._id, type: 'message', title: 'Hi' });
    const agent = await signedInAgent(user);

    expect((await agent.patch(`/api/notifications/${note._id}/read`)).status).toBe(404);
  });

  it('marks all as read', async () => {
    const user = await createUser();
    await Notification.create([
      { recipient: user._id, type: 'message', title: 'A' },
      { recipient: user._id, type: 'message', title: 'B' },
    ]);
    const agent = await signedInAgent(user);

    const res = await agent.post('/api/notifications/read-all');

    expect(res.body.updated).toBe(2);
    expect((await agent.get('/api/notifications/unread-count')).body.count).toBe(0);
  });

  it('returns 400 for a malformed id', async () => {
    const agent = await signedInAgent(await createUser());
    expect((await agent.patch('/api/notifications/abc/read')).status).toBe(400);
  });
});

describe('deleting notifications', () => {
  it('deletes one', async () => {
    const user = await createUser();
    const note = await Notification.create({ recipient: user._id, type: 'message', title: 'Hi' });
    const agent = await signedInAgent(user);

    const res = await agent.delete(`/api/notifications/${note._id}`);

    expect(res.status).toBe(200);
    expect(await Notification.findById(note._id)).toBeNull();
  });

  it('clears the whole inbox', async () => {
    const user = await createUser();
    await Notification.create([
      { recipient: user._id, type: 'message', title: 'A' },
      { recipient: user._id, type: 'message', title: 'B' },
    ]);
    const agent = await signedInAgent(user);

    const res = await agent.delete('/api/notifications');

    expect(res.body.deleted).toBe(2);
    expect(await Notification.countDocuments({ recipient: user._id })).toBe(0);
  });

  it('only clears read ones with ?read=true', async () => {
    const user = await createUser();
    await Notification.create([
      { recipient: user._id, type: 'message', title: 'A' },
      { recipient: user._id, type: 'message', title: 'B', read: true },
    ]);
    const agent = await signedInAgent(user);

    const res = await agent.delete('/api/notifications?read=true');

    expect(res.body.deleted).toBe(1);
    expect(await Notification.countDocuments({ recipient: user._id })).toBe(1);
  });
});
