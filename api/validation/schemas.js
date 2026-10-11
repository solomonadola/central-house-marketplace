import { z } from 'zod';

// Form inputs arrive as strings, so numeric fields are coerced.
const count = (label) =>
  z.coerce
    .number({ invalid_type_error: `${label} must be a number` })
    .int(`${label} must be a whole number`)
    .min(1, `${label} must be between 1 and 10`)
    .max(10, `${label} must be between 1 and 10`);
const price = (label) =>
  z.coerce
    .number({ invalid_type_error: `${label} must be a number` })
    .min(0, `${label} cannot be negative`)
    .max(10_000_000, `${label} must be at most 10,000,000`);

// The profile form sends '' for a field the user cleared, which should
// mean "unchanged" rather than e.g. setting an empty password.
const optional = (schema) =>
  z.preprocess((v) => (v === '' || v === null ? undefined : v), schema.optional());

const username = z
  .string()
  .trim()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be at most 30 characters')
  .regex(/^[a-zA-Z0-9_.-]+$/, 'Username can only contain letters, numbers, _ . and -');
const email = z.string().trim().email('Invalid email address');
const newPassword = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters');

export const signupSchema = z.object({
  username,
  email,
  password: newPassword,
});

// No length rules on signin so accounts created before validation existed
// can still log in.
export const signinSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
});

export const updateUserSchema = z.object({
  username: optional(username),
  email: optional(email),
  password: optional(newPassword),
  avatar: optional(z.string().url('Avatar must be a URL')),
});

const listingFields = {
  name: z.string().trim().min(10, 'Name must be at least 10 characters').max(62, 'Name must be at most 62 characters'),
  description: z.string().trim().min(1, 'Description is required').max(5000),
  address: z.string().trim().min(1, 'Address is required').max(200),
  regularPrice: price('Regular price').refine((v) => v >= 50, 'Regular price must be at least 50'),
  discountPrice: price('Discount price'),
  bathrooms: count('Bathrooms'),
  bedrooms: count('Bedrooms'),
  furnished: z.boolean(),
  parking: z.boolean(),
  type: z.enum(['rent', 'sale'], { message: "Type must be 'rent' or 'sale'" }),
  offer: z.boolean(),
  imageUrls: z
    .array(z.string().url('Image must be a URL'))
    .min(1, 'You must upload at least one image')
    .max(6, 'You can upload at most 6 images'),
};

const discountBelowRegular = (listing) =>
  !listing.offer ||
  listing.discountPrice === undefined ||
  listing.regularPrice === undefined ||
  listing.discountPrice < listing.regularPrice;

const discountRule = [
  discountBelowRegular,
  { message: 'Discount price must be lower than regular price', path: ['discountPrice'] },
];

export const createListingSchema = z.object(listingFields).refine(...discountRule);

// Updates may send any subset of fields.
export const updateListingSchema = z.object(listingFields).partial().refine(...discountRule);
