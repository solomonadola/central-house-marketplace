import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcryptjs from 'bcryptjs';
import User from './models/user.model.js';
import Listing from './models/listing.model.js';
import Conversation from './models/conversation.model.js';
import Message from './models/message.model.js';
import Review from './models/review.model.js';
import { updateListingRating } from './utils/ratings.js';
dotenv.config();

// Seed data is tagged by this email domain so re-running the script only
// replaces demo data and never touches real accounts.
const SEED_DOMAIN = '@demo.centralhouse.local';
const SEED_PASSWORD = 'password123';

const img = (id) => `https://images.unsplash.com/photo-${id}?w=1200&q=80`;

const exteriors = [
  '1568605114967-8130f3a36994',
  '1570129477492-45c003edd2be',
  '1564013799919-ab600027ffc6',
  '1512917774080-9991f1c4c750',
  '1600596542815-ffad4c1539a9',
  '1600585154340-be6161a56a0c',
  '1580587771525-78b9dba3b914',
  '1613490493576-7fde63acd811',
  '1605276374104-dee2a0ed3cd6',
  '1600047509807-ba8f99d2cdde',
  '1598928506311-c55ded91a20c',
  '1576941089067-2de3c901e126',
  '1449844908441-8829872d2607',
  '1518780664697-55e3ad937233',
  '1572120360610-d971b9d7767c',
  '1494526585095-c41746248156',
  '1583608205776-bfd35f0d9f83',
  '1554995207-c18c203602cb',
  '1523217582562-09d0def993a6',
].map(img);

const interiors = [
  '1502672260266-1c1ef2d93688',
  '1522708323590-d24dbb6b0267',
  '1493809842364-78817add7ffb',
  '1484154218962-a197022b5858',
  '1560448204-e02f11c3d0e2',
  '1600607687939-ce8a6c25118c',
  '1505691938895-1758d7feb511',
  '1556909114-f6e7ad7d3136',
  '1600566753190-17f0baa2a6c3',
  '1600210492486-724fe5c67fb0',
  '1586023492125-27b2c045efd7',
].map(img);

const users = [
  { username: 'sarah_homes', avatar: 'https://i.pravatar.cc/150?img=47' },
  { username: 'david_realty', avatar: 'https://i.pravatar.cc/150?img=12' },
  { username: 'maria_lettings', avatar: 'https://i.pravatar.cc/150?img=32' },
  { username: 'james_properties', avatar: 'https://i.pravatar.cc/150?img=59' },
];

// [name, description, address, type, regularPrice, discountPrice|null, bedrooms, bathrooms, furnished, parking, [lat, lng]]
// Street-level addresses in real San Francisco neighbourhoods, with fixed
// coordinates so seeding doesn't depend on the geocoding service.
const listings = [
  ['Modern Family Home with Garden', 'Spacious four-bedroom family home on a quiet tree-lined street. Open-plan kitchen, large private garden and a double garage. Walking distance to schools and parks.', 'Noe Street, Noe Valley, San Francisco', 'sale', 485000, 459000, 4, 3, false, true, [37.7502, -122.4337]],
  ['Cozy Downtown Studio', 'Bright studio apartment in the heart of downtown. Fully furnished with a modern kitchenette, fast internet and on-site laundry. Perfect for young professionals.', 'Valencia Street, Mission District, San Francisco', 'rent', 1150, null, 1, 1, true, false, [37.7599, -122.4214]],
  ['Luxury Villa with Pool', 'Stunning contemporary villa with floor-to-ceiling windows, infinity pool and panoramic views. Chef\'s kitchen, home cinema and a three-car garage.', 'Sea Cliff Avenue, Sea Cliff, San Francisco', 'sale', 1250000, null, 5, 5, true, true, [37.7869, -122.49]],
  ['Charming Two-Bedroom Cottage', 'Renovated cottage full of character, with exposed beams, a wood-burning fireplace and a sunny back patio. Close to the village high street.', 'Church Street, Castro, San Francisco', 'rent', 1650, 1500, 2, 1, true, true, [37.7609, -122.429]],
  ['Riverside Apartment with Balcony', 'Two-bedroom apartment with a private balcony overlooking the river. Secure entry, elevator and a dedicated parking space.', 'Mission Bay Boulevard, Mission Bay, San Francisco', 'rent', 1900, null, 2, 2, false, true, [37.7706, -122.391]],
  ['Suburban Ranch House', 'Single-storey ranch home on a generous lot. Updated bathrooms, new roof in 2024 and a large backyard ready for entertaining.', 'Ocean Avenue, Ingleside, San Francisco', 'sale', 329000, 315000, 3, 2, false, true, [37.7236, -122.456]],
  ['Penthouse with City Views', 'Top-floor penthouse with wraparound terrace and sweeping skyline views. Concierge, gym and rooftop lounge included.', 'California Street, Nob Hill, San Francisco', 'sale', 975000, null, 3, 3, true, true, [37.7915, -122.414]],
  ['Student-Friendly Shared House', 'Five-bedroom shared house ten minutes from campus. All bills included, furnished rooms and a large communal kitchen.', 'Haight Street, Haight-Ashbury, San Francisco', 'rent', 2600, 2400, 5, 2, true, false, [37.7692, -122.4481]],
  ['Minimalist Loft Apartment', 'Converted warehouse loft with soaring ceilings, polished concrete floors and huge industrial windows. Open-plan living at its best.', '3rd Street, Dogpatch, San Francisco', 'rent', 2300, null, 1, 1, false, false, [37.7606, -122.3884]],
  ['Lakefront Cabin Retreat', 'Peaceful lakefront cabin with a private dock, wraparound porch and stone fireplace. Ideal as a holiday home or rental investment.', 'Lake Merced Boulevard, Lake Merced, San Francisco', 'sale', 410000, 389000, 3, 2, true, true, [37.721, -122.484]],
  ['Elegant Townhouse', 'Three-storey townhouse with period features, modern kitchen and a rooftop terrace. Located in a sought-after historic district.', 'Fillmore Street, Pacific Heights, San Francisco', 'sale', 620000, null, 3, 3, false, false, [37.7905, -122.434]],
  ['Garden-Level Flat', 'Quiet garden-level flat with direct access to a shared landscaped garden. Recently repainted with new flooring throughout.', 'Cortland Avenue, Bernal Heights, San Francisco', 'rent', 1350, 1250, 2, 1, false, false, [37.7389, -122.416]],
  ['Executive Home Near Golf Course', 'Impressive five-bedroom executive home backing onto the golf course. Home office, wine cellar and landscaped grounds.', 'Harding Road, Lakeshore, San Francisco', 'sale', 890000, 849000, 5, 4, false, true, [37.725, -122.493]],
  ['Furnished One-Bedroom by the Park', 'Fully furnished one-bedroom apartment overlooking the city park. Move-in ready with all utilities set up.', 'Fulton Street, NoPa, San Francisco', 'rent', 1700, null, 1, 1, true, true, [37.776, -122.44]],
  ['Starter Home with Renovation Potential', 'Solid three-bedroom home in a growing neighbourhood. Needs some updating but offers great value and a large plot.', 'Mission Street, Excelsior, San Francisco', 'sale', 215000, 199000, 3, 1, false, true, [37.724, -122.435]],
  ['Beachside Holiday Apartment', 'Two-bedroom apartment steps from the beach. Sea-view balcony, shared pool and secure underground parking.', 'Great Highway, Outer Sunset, San Francisco', 'rent', 2800, 2550, 2, 2, true, true, [37.755, -122.508]],
  ['Contemporary Duplex', 'Newly built duplex with smart-home features, energy-efficient design and a private courtyard.', '18th Street, Potrero Hill, San Francisco', 'sale', 545000, null, 3, 2, false, true, [37.7616, -122.399]],
  ['Spacious Family Rental', 'Large four-bedroom house available for long-term rent. Fenced backyard, pet-friendly and close to the train station.', 'Clement Street, Inner Richmond, San Francisco', 'rent', 2450, null, 4, 2, false, true, [37.783, -122.464]],
  ['Historic Brownstone', 'Beautifully restored brownstone with original moulding, high ceilings and a private rear garden.', 'Columbus Avenue, North Beach, San Francisco', 'sale', 1080000, 1020000, 4, 3, false, false, [37.8, -122.41]],
  ['Compact City Micro-Apartment', 'Smartly designed micro-apartment with fold-away furniture and a shared rooftop garden. Great value in a central location.', 'Hayes Street, Hayes Valley, San Francisco', 'rent', 950, 875, 1, 1, true, false, [37.7765, -122.4245]],
];

const pick = (arr, i) => arr[i % arr.length];

// Sample reviews: [author index, listing index, rating, comment]. Authors
// have a conversation about the listing (see below), as the app requires.
const reviews = [
  [1, 0, 5, 'Sarah answered all my questions within the hour and the house is exactly as pictured.'],
  [3, 4, 4, 'Great apartment and the parking space is a real bonus. Slightly noisy on weekends.'],
  [0, 2, 5, 'Stunning villa and Maria was very helpful.'],
];

// Sample conversations: [buyer index, listing index, messages as
// [sender: 'buyer' | 'owner', text, minutes ago], read by both?]. Listing i is owned by
// user i % 4, so Sarah (user 0) owns listings 0, 4, 8, ...
const conversations = [
  [1, 0, [
    ['buyer', 'Hi Sarah, is the family home on Noe Street still available?', 300],
    ['owner', 'Hi David, yes it is! Are you looking to buy soon?', 280],
    ['buyer', 'Within the next couple of months. Could I arrange a viewing this Saturday?', 20],
  ]],
  [0, 2, [
    ['buyer', 'Hello Maria, does the villa price include the furniture?', 1500],
    ['owner', 'Hi! Yes, the villa is sold fully furnished, including the outdoor furniture.', 45],
  ]],
  [3, 4, [
    ['buyer', 'Is parking included with the Mission Bay apartment?', 4000],
    ['owner', 'Yes, it comes with one dedicated parking space in the garage.', 3900],
    ['buyer', 'Perfect, thanks!', 3850],
  ], true],
];

const seed = async () => {
  await mongoose.connect(process.env.DB);
  console.log('Connected to MongoDB');

  const oldUsers = await User.find({ email: { $regex: `${SEED_DOMAIN}$` } });
  const oldIds = oldUsers.map((u) => u._id.toString());
  await Review.deleteMany({ author: { $in: oldIds } });
  const oldConversations = await Conversation.find({ 'participants.user': { $in: oldIds } }).distinct('_id');
  await Message.deleteMany({ conversation: { $in: oldConversations } });
  await Conversation.deleteMany({ _id: { $in: oldConversations } });
  const { deletedCount: removedListings } = await Listing.deleteMany({ userRef: { $in: oldIds } });
  await User.deleteMany({ _id: { $in: oldIds } });
  console.log(`Removed ${oldUsers.length} demo users and ${removedListings} demo listings`);

  const password = bcryptjs.hashSync(SEED_PASSWORD, 10);
  const createdUsers = await User.insertMany(
    users.map((u) => ({ ...u, email: `${u.username}${SEED_DOMAIN}`, emailVerified: true, password }))
  );

  const now = Date.now();
  const docs = listings.map(
    ([name, description, address, type, regularPrice, discountPrice, bedrooms, bathrooms, furnished, parking, [lat, lng]], i) => ({
      name,
      description,
      address,
      type,
      regularPrice,
      discountPrice: discountPrice ?? 0,
      offer: discountPrice !== null,
      bedrooms,
      bathrooms,
      furnished,
      parking,
      location: { lat, lng },
      imageUrls: [pick(exteriors, i), pick(interiors, i * 2), pick(interiors, i * 2 + 1)],
      userRef: pick(createdUsers, i)._id.toString(),
      // Stagger creation dates so "recent" sorting looks realistic.
      createdAt: new Date(now - i * 36 * 60 * 60 * 1000),
    })
  );
  const createdListings = await Listing.insertMany(docs);

  for (const [buyerIndex, listingIndex, thread, readByBoth = false] of conversations) {
    const buyer = createdUsers[buyerIndex]._id;
    const listing = createdListings[listingIndex];
    const owner = listing.userRef;
    const at = (minutesAgo) => new Date(now - minutesAgo * 60 * 1000);
    const last = thread.at(-1);
    const lastSender = last[0] === 'buyer' ? buyer : owner;

    // Each side has read up to their own latest message.
    const lastReadBy = (role) => {
      if (readByBoth) return at(last[2]);
      const mine = thread.filter(([sender]) => sender === role).at(-1);
      return mine ? at(mine[2]) : new Date(0);
    };

    const conversation = await Conversation.create({
      listing: listing._id,
      buyer,
      owner,
      participants: [
        { user: buyer, lastReadAt: lastReadBy('buyer') },
        { user: owner, lastReadAt: lastReadBy('owner') },
      ],
      lastMessage: { body: last[1], sender: lastSender, createdAt: at(last[2]) },
    });
    await Message.insertMany(
      thread.map(([sender, body, minutesAgo]) => ({
        conversation: conversation._id,
        sender: sender === 'buyer' ? buyer : owner,
        body,
        createdAt: at(minutesAgo),
      }))
    );
  }

  for (const [authorIndex, listingIndex, rating, comment] of reviews) {
    await Review.create({
      listing: createdListings[listingIndex]._id,
      author: createdUsers[authorIndex]._id,
      rating,
      comment,
    });
    await updateListingRating(createdListings[listingIndex]._id);
  }

  console.log(
    `Created ${createdUsers.length} demo users, ${docs.length} listings, ` +
      `${conversations.length} conversations and ${reviews.length} reviews`
  );
  console.log(`Demo login: ${createdUsers[0].email} / ${SEED_PASSWORD}`);
};

seed()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
