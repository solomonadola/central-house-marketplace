import { describe, expect, it } from 'vitest';
import { api, createUser, signedInAgent } from './helpers.js';

describe('GET /api/user/preferences', () => {
  it('requires sign-in', async () => {
    expect((await api().get('/api/user/preferences')).status).toBe(401);
  });

  it('returns the current preferences', async () => {
    const agent = await signedInAgent(await createUser({ emailNotifications: true }));
    const res = await agent.get('/api/user/preferences');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ emailNotifications: true, marketingEmails: false });
  });
});

describe('PATCH /api/user/preferences', () => {
  it('updates one preference at a time', async () => {
    const agent = await signedInAgent(await createUser());

    const res = await agent.patch('/api/user/preferences').send({ emailNotifications: false });

    expect(res.body).toEqual({ emailNotifications: false, marketingEmails: false });
    expect((await agent.get('/api/user/preferences')).body.emailNotifications).toBe(false);
  });

  it('updates several preferences together', async () => {
    const agent = await signedInAgent(await createUser());

    const res = await agent
      .patch('/api/user/preferences')
      .send({ emailNotifications: false, marketingEmails: true });

    expect(res.body).toEqual({ emailNotifications: false, marketingEmails: true });
  });

  it('rejects non-boolean values', async () => {
    const agent = await signedInAgent(await createUser());

    const res = await agent.patch('/api/user/preferences').send({ emailNotifications: 'yes' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('true or false');
  });

  it('rejects an empty update', async () => {
    const agent = await signedInAgent(await createUser());

    const res = await agent.patch('/api/user/preferences').send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Nothing to update');
  });

  it('requires sign-in', async () => {
    expect((await api().patch('/api/user/preferences').send({ emailNotifications: false })).status).toBe(401);
  });
});
