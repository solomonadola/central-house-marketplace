import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcryptjs from 'bcryptjs';
import User from './models/user.model.js';
import Listing from './models/listing.model.js';
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

// [name, description, address, type, regularPrice, discountPrice|null, bedrooms, bathrooms, furnished, parking]
const listings = [
  ['Modern Family Home with Garden', 'Spacious four-bedroom family home on a quiet tree-lined street. Open-plan kitchen, large private garden and a double garage. Walking distance to schools and parks.', '42 Maple Avenue, Springfield', 'sale', 485000, 459000, 4, 3, false, true],
  ['Cozy Downtown Studio', 'Bright studio apartment in the heart of downtown. Fully furnished with a modern kitchenette, fast internet and on-site laundry. Perfect for young professionals.', '310 Market Street, Apt 5B, Riverside', 'rent', 1150, null, 1, 1, true, false],
  ['Luxury Villa with Pool', 'Stunning contemporary villa with floor-to-ceiling windows, infinity pool and panoramic views. Chef\'s kitchen, home cinema and a three-car garage.', '8 Ocean Crest Drive, Bayview', 'sale', 1250000, null, 5, 5, true, true],
  ['Charming Two-Bedroom Cottage', 'Renovated cottage full of character, with exposed beams, a wood-burning fireplace and a sunny back patio. Close to the village high street.', '17 Willow Lane, Oakridge', 'rent', 1650, 1500, 2, 1, true, true],
  ['Riverside Apartment with Balcony', 'Two-bedroom apartment with a private balcony overlooking the river. Secure entry, elevator and a dedicated parking space.', '55 Quay Road, Apt 12, Riverside', 'rent', 1900, null, 2, 2, false, true],
  ['Suburban Ranch House', 'Single-storey ranch home on a generous lot. Updated bathrooms, new roof in 2024 and a large backyard ready for entertaining.', '903 Prairie Road, Springfield', 'sale', 329000, 315000, 3, 2, false, true],
  ['Penthouse with City Views', 'Top-floor penthouse with wraparound terrace and sweeping skyline views. Concierge, gym and rooftop lounge included.', '1 Skyline Plaza, PH2, Metro City', 'sale', 975000, null, 3, 3, true, true],
  ['Student-Friendly Shared House', 'Five-bedroom shared house ten minutes from campus. All bills included, furnished rooms and a large communal kitchen.', '22 College Street, Oakridge', 'rent', 2600, 2400, 5, 2, true, false],
  ['Minimalist Loft Apartment', 'Converted warehouse loft with soaring ceilings, polished concrete floors and huge industrial windows. Open-plan living at its best.', '78 Foundry Lane, Unit 3, Metro City', 'rent', 2300, null, 1, 1, false, false],
  ['Lakefront Cabin Retreat', 'Peaceful lakefront cabin with a private dock, wraparound porch and stone fireplace. Ideal as a holiday home or rental investment.', '5 Pinecone Trail, Lake Serene', 'sale', 410000, 389000, 3, 2, true, true],
  ['Elegant Townhouse', 'Three-storey townhouse with period features, modern kitchen and a rooftop terrace. Located in a sought-after historic district.', '14 Heritage Row, Old Town', 'sale', 620000, null, 3, 3, false, false],
  ['Garden-Level Flat', 'Quiet garden-level flat with direct access to a shared landscaped garden. Recently repainted with new flooring throughout.', '9 Elm Court, Flat A, Springfield', 'rent', 1350, 1250, 2, 1, false, false],
  ['Executive Home Near Golf Course', 'Impressive five-bedroom executive home backing onto the golf course. Home office, wine cellar and landscaped grounds.', '120 Fairway Drive, Greenhill', 'sale', 890000, 849000, 5, 4, false, true],
  ['Furnished One-Bedroom by the Park', 'Fully furnished one-bedroom apartment overlooking the city park. Move-in ready with all utilities set up.', '200 Parkside Avenue, Apt 7C, Metro City', 'rent', 1700, null, 1, 1, true, true],
  ['Starter Home with Renovation Potential', 'Solid three-bedroom home in a growing neighbourhood. Needs some updating but offers great value and a large plot.', '61 Birch Street, Oakridge', 'sale', 215000, 199000, 3, 1, false, true],
  ['Beachside Holiday Apartment', 'Two-bedroom apartment steps from the beach. Sea-view balcony, shared pool and secure underground parking.', '33 Coastline Boulevard, Apt 4, Bayview', 'rent', 2800, 2550, 2, 2, true, true],
  ['Contemporary Duplex', 'Newly built duplex with smart-home features, energy-efficient design and a private courtyard.', '47 Innovation Way, Greenhill', 'sale', 545000, null, 3, 2, false, true],
  ['Spacious Family Rental', 'Large four-bedroom house available for long-term rent. Fenced backyard, pet-friendly and close to the train station.', '18 Station Road, Springfield', 'rent', 2450, null, 4, 2, false, true],
  ['Historic Brownstone', 'Beautifully restored brownstone with original moulding, high ceilings and a private rear garden.', '256 Chestnut Street, Old Town', 'sale', 1080000, 1020000, 4, 3, false, false],
  ['Compact City Micro-Apartment', 'Smartly designed micro-apartment with fold-away furniture and a shared rooftop garden. Great value in a central location.', '91 Central Avenue, Unit 15, Metro City', 'rent', 950, 875, 1, 1, true, false],
];

const pick = (arr, i) => arr[i % arr.length];

const seed = async () => {
  await mongoose.connect(process.env.DB);
  console.log('Connected to MongoDB');

  const oldUsers = await User.find({ email: { $regex: `${SEED_DOMAIN}$` } });
  const oldIds = oldUsers.map((u) => u._id.toString());
  const { deletedCount: removedListings } = await Listing.deleteMany({ userRef: { $in: oldIds } });
  await User.deleteMany({ _id: { $in: oldIds } });
  console.log(`Removed ${oldUsers.length} demo users and ${removedListings} demo listings`);

  const password = bcryptjs.hashSync(SEED_PASSWORD, 10);
  const createdUsers = await User.insertMany(
    users.map((u) => ({ ...u, email: `${u.username}${SEED_DOMAIN}`, password }))
  );

  const now = Date.now();
  const docs = listings.map(
    ([name, description, address, type, regularPrice, discountPrice, bedrooms, bathrooms, furnished, parking], i) => ({
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
      imageUrls: [pick(exteriors, i), pick(interiors, i * 2), pick(interiors, i * 2 + 1)],
      userRef: pick(createdUsers, i)._id.toString(),
      // Stagger creation dates so "recent" sorting looks realistic.
      createdAt: new Date(now - i * 36 * 60 * 60 * 1000),
    })
  );
  await Listing.insertMany(docs);

  console.log(`Created ${createdUsers.length} demo users and ${docs.length} listings`);
  console.log(`Demo login: ${createdUsers[0].email} / ${SEED_PASSWORD}`);
};

seed()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
