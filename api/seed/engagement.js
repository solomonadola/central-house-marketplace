// Demo data for the features built on top of listings: price history,
// questions, open houses, a tenancy with a maintenance request and quick
// replies. Called from api/seed.js after users and listings exist.
import PriceChange from '../models/priceChange.model.js';
import ListingQuestion from '../models/listingQuestion.model.js';
import OpenHouse from '../models/openHouse.model.js';
import Application from '../models/application.model.js';
import MaintenanceRequest from '../models/maintenanceRequest.model.js';
import QuickReply from '../models/quickReply.model.js';
import ListingDraft from '../models/listingDraft.model.js';

const DAY = 24 * 60 * 60 * 1000;

// Removes everything this module creates for the given demo users and
// their listings, so re-seeding starts clean.
export const removeEngagement = async (userIds, listingIds) => {
  await Promise.all([
    PriceChange.deleteMany({ listing: { $in: listingIds } }),
    ListingQuestion.deleteMany({ $or: [{ listing: { $in: listingIds } }, { asker: { $in: userIds } }] }),
    OpenHouse.deleteMany({ listing: { $in: listingIds } }),
    Application.deleteMany({ $or: [{ applicant: { $in: userIds } }, { owner: { $in: userIds } }] }),
    MaintenanceRequest.deleteMany({ $or: [{ tenant: { $in: userIds } }, { owner: { $in: userIds } }] }),
    QuickReply.deleteMany({ owner: { $in: userIds } }),
    ListingDraft.deleteMany({ owner: { $in: userIds } }),
  ]);
};

// users: [sarah, david, maria, james]; listing i is owned by users[i % 4].
export const seedEngagement = async ({ users, listings, now = Date.now() }) => {
  const [sarah, david, maria, james] = users;
  const ago = (days) => new Date(now - days * DAY);
  const at = (daysAhead, hours, minutes = 0) => {
    const d = new Date(now + daysAhead * DAY);
    d.setHours(hours, minutes, 0, 0);
    return d;
  };

  // Every listing's launch price; listings on offer also dropped to their
  // discounted price ten days ago.
  const priceChanges = listings.flatMap((l) => {
    const launch = { listing: l._id, price: l.regularPrice, previousPrice: null, regularPrice: l.regularPrice, offer: false, createdAt: ago(30) };
    if (!l.offer) return [launch];
    return [
      launch,
      { listing: l._id, price: l.discountPrice, previousPrice: l.regularPrice, regularPrice: l.regularPrice, offer: true, createdAt: ago(10) },
    ];
  });
  await PriceChange.insertMany(priceChanges);

  await ListingQuestion.insertMany([
    {
      listing: listings[0]._id,
      asker: david._id,
      question: 'Is the garden south-facing?',
      answer: { body: 'Yes, it gets sun from late morning until evening.', answeredAt: ago(2) },
      createdAt: ago(3),
    },
    {
      listing: listings[1]._id,
      asker: maria._id,
      question: 'Are utilities included in the rent?',
      answer: { body: 'Water and internet are included; electricity is separate.', answeredAt: ago(1) },
      createdAt: ago(2),
    },
    { listing: listings[4]._id, asker: james._id, question: 'Is there storage for bikes?', createdAt: ago(1) },
  ]);

  await OpenHouse.insertMany([
    {
      listing: listings[0]._id,
      owner: sarah._id,
      startsAt: at(4, 11),
      endsAt: at(4, 13),
      note: 'Park on Noe Street; ring the bell at the side gate.',
      capacity: 15,
      rsvps: [{ user: david._id }, { user: james._id }],
    },
    { listing: listings[2]._id, owner: maria._id, startsAt: at(6, 14), endsAt: at(6, 16), rsvps: [{ user: sarah._id }] },
  ]);

  // David rents Sarah's riverside apartment, so he can report problems.
  await Application.create({
    listing: listings[4]._id,
    applicant: david._id,
    owner: sarah._id,
    fullName: 'David Realty',
    email: david.email,
    status: 'approved',
    statusChangedAt: ago(20),
  });
  await MaintenanceRequest.create({
    listing: listings[4]._id,
    tenant: david._id,
    owner: sarah._id,
    title: 'Bathroom extractor fan stopped working',
    description: 'It makes a clicking noise but does not spin.',
    category: 'electrical',
    urgency: 'normal',
    status: 'in_progress',
    updates: [{ author: sarah._id, body: 'Electrician booked for Thursday morning.', status: 'in_progress' }],
  });

  await QuickReply.insertMany([
    { owner: sarah._id, title: 'Viewing times', body: 'I can show the home on weekday evenings after 6pm or Saturday mornings.' },
    { owner: sarah._id, title: 'Deposit', body: 'The deposit is one month of rent, returned within 14 days of moving out.' },
  ]);
};
