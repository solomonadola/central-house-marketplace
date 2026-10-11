import request from 'supertest';
import bcryptjs from 'bcryptjs';
import app from '../app.js';
import User from '../models/user.model.js';
import Listing from '../models/listing.model.js';

export const api = () => request(app);

let counter = 0;
const unique = () => `${Date.now()}${counter++}`;

export const PASSWORD = 'password123';

export const createUser = async ({ password = PASSWORD, ...overrides } = {}) => {
  const id = unique();
  return User.create({
    username: `user${id}`,
    email: `user${id}@example.com`,
    // Most tests act as established, verified users.
    emailVerified: true,
    // Keep tests from printing notification emails; in-app notifications
    // are still created.
    emailNotifications: false,
    ...overrides,
    // Low cost factor keeps tests fast.
    password: bcryptjs.hashSync(password, 4),
  });
};

// Returns a supertest agent that carries the user's auth cookie.
export const signedInAgent = async (user, password = PASSWORD) => {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/signin').send({ email: user.email, password });
  if (res.status !== 200) throw new Error(`Sign-in failed: ${res.status} ${res.text}`);
  return agent;
};

export const validListing = (overrides = {}) => ({
  name: 'Bright Two-Bedroom Apartment',
  description: 'A lovely place to live.',
  address: '1 Test Street',
  regularPrice: 1200,
  discountPrice: 0,
  bathrooms: 1,
  bedrooms: 2,
  furnished: false,
  parking: true,
  type: 'rent',
  offer: false,
  imageUrls: ['https://example.com/photo.jpg'],
  ...overrides,
});

export const createListing = (user, overrides = {}) =>
  Listing.create({ ...validListing(overrides), userRef: user._id.toString() });
