import { describe, expect, it } from 'vitest';
import { createListing, createUser } from './helpers.js';
import Application from '../models/application.model.js';
import Lease from '../models/lease.model.js';
import RentCharge from '../models/rentCharge.model.js';
import Notification from '../models/notification.model.js';
import { daysUntilDue, reminderFor, sendRentReminders } from '../utils/rentReminders.js';
import { syncCharges } from '../controllers/lease.controller.js';

const day = (iso) => new Date(`${iso}T09:00:00Z`);

describe('reminderFor', () => {
  const charge = (overrides) => ({ status: 'unpaid', dueDate: new Date('2026-10-10T00:00:00Z'), remindersSent: [], ...overrides });

  it('counts whole days to the due date', () => {
    expect(daysUntilDue(charge(), day('2026-10-07'))).toBe(3);
    expect(daysUntilDue(charge(), day('2026-10-10'))).toBe(0);
    expect(daysUntilDue(charge(), day('2026-10-12'))).toBe(-2);
  });

  it.each([
    ['2026-10-01', null],
    ['2026-10-07', 'upcoming'],
    ['2026-10-10', 'upcoming'],
    ['2026-10-11', 'overdue_1'],
    ['2026-10-16', 'overdue_1'],
    ['2026-10-17', 'overdue_7'],
    ['2026-11-30', 'overdue_7'],
  ])('on %s sends %s', (today, expected) => {
    expect(reminderFor(charge(), day(today))?.key ?? null).toBe(expected);
  });

  it('never sends the same reminder twice', () => {
    expect(reminderFor(charge({ remindersSent: ['upcoming'] }), day('2026-10-08'))).toBeNull();
    expect(reminderFor(charge({ remindersSent: ['upcoming'] }), day('2026-10-12'))?.key).toBe('overdue_1');
  });

  it('skips earlier stages when a later one already applies', () => {
    expect(reminderFor(charge(), day('2026-10-20')).markSent).toEqual(['overdue_7', 'overdue_1', 'upcoming']);
    expect(reminderFor(charge(), day('2026-10-12')).markSent).toEqual(['overdue_1', 'upcoming']);
  });

  it('ignores settled charges', () => {
    expect(reminderFor(charge({ status: 'paid' }), day('2026-10-20'))).toBeNull();
    expect(reminderFor(charge({ status: 'waived' }), day('2026-10-20'))).toBeNull();
  });
});

describe('sendRentReminders', () => {
  // A lease from September 2026 with rent due on the 10th.
  const setup = async (status = 'active') => {
    const owner = await createUser();
    const tenant = await createUser();
    const listing = await createListing(owner, { name: 'Maple Court Flat', type: 'rent' });
    const application = await Application.create({
      listing: listing._id,
      applicant: tenant._id,
      owner: owner._id,
      fullName: 'Tenant',
      email: tenant.email,
      status: 'approved',
    });
    const lease = await Lease.create({
      listing: listing._id,
      owner: owner._id,
      tenant: tenant._id,
      application: application._id,
      monthlyRent: 1250,
      dueDay: 10,
      startDate: new Date('2026-09-01T00:00:00Z'),
      status,
    });
    return { tenant, lease };
  };

  const reminders = (tenant) => Notification.find({ recipient: tenant._id, type: 'rent_reminder' }).sort({ createdAt: 1 });

  it('reminds the tenant about late and upcoming rent, once each', async () => {
    const { tenant, lease } = await setup();

    const first = await sendRentReminders(day('2026-10-08'));

    // September is 28 days late; October is due in 2 days.
    expect(first).toEqual({ checked: 2, sent: 2 });
    expect((await reminders(tenant)).map((n) => n.title).sort()).toEqual([
      'Rent for October 2026 is due in 2 days',
      'Rent for September 2026 is 28 days late',
    ]);
    const notification = (await reminders(tenant))[0];
    expect(notification.body).toBe('$1,250 is still owed for "Maple Court Flat"');
    expect(notification.link).toBe(`/leases/${lease._id}`);

    expect(await sendRentReminders(day('2026-10-09'))).toEqual({ checked: 2, sent: 0 });
  });

  it('sends the next stage when rent stays unpaid', async () => {
    const { tenant } = await setup();
    await sendRentReminders(day('2026-10-08'));

    await sendRentReminders(day('2026-10-11'));

    expect((await reminders(tenant)).at(-1).title).toBe('Rent for October 2026 is 1 day late');
  });

  it("doesn't remind about paid rent or ended leases", async () => {
    const { tenant, lease } = await setup();
    await syncCharges(lease, day('2026-10-20'));
    await RentCharge.updateMany({ lease: lease._id }, { status: 'paid' });
    const ended = await setup('ended');

    const result = await sendRentReminders(day('2026-10-20'));

    expect(result.sent).toBe(0);
    expect(await reminders(tenant)).toHaveLength(0);
    expect(await reminders(ended.tenant)).toHaveLength(0);
  });

  it("doesn't double-send when two runs overlap", async () => {
    const { tenant } = await setup();

    await Promise.all([sendRentReminders(day('2026-10-08')), sendRentReminders(day('2026-10-08'))]);

    expect(await reminders(tenant)).toHaveLength(2);
  });
});
