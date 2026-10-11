import { z } from 'zod';
import { AMENITIES, PROPERTY_TYPES } from '../constants/listing.js';

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

// z.string().url() accepts any scheme (javascript:, data:, ...). Image
// URLs end up in <img src> and CSS url(), so only allow http(s).
const httpUrl = (message) =>
  z
    .string()
    .url(message)
    .refine((v) => /^https?:\/\//i.test(v), message);

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
  avatar: optional(httpUrl('Avatar must be a URL')),
});

export const updatePreferencesSchema = z
  .object({
    emailNotifications: z.boolean({ invalid_type_error: 'Must be true or false' }).optional(),
    marketingEmails: z.boolean({ invalid_type_error: 'Must be true or false' }).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'Nothing to update' });

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
  propertyType: z.enum(PROPERTY_TYPES, { message: 'Please choose a property type' }).optional().default('apartment'),
  amenities: z
    .array(z.enum(AMENITIES, { message: 'Unknown amenity' }))
    .max(20, 'Too many amenities')
    .optional()
    .default([]),
  imageUrls: z
    .array(httpUrl('Image must be a URL'))
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

export const setListingActiveSchema = z.object({
  active: z.boolean({ invalid_type_error: 'Active must be true or false' }),
});

const messageBody = z
  .string({ required_error: 'Message is required' })
  .trim()
  .min(1, 'Message cannot be empty')
  .max(2000, 'Message must be at most 2000 characters');

export const startConversationSchema = z.object({
  listingId: z.string().regex(/^[0-9a-f]{24}$/i, 'Invalid listing id'),
  body: messageBody,
});

export const sendMessageSchema = z.object({
  body: messageBody,
});

export const reviewSchema = z.object({
  // Coerce form strings, but leave a missing rating missing so it's
  // reported as required rather than as NaN.
  rating: z.preprocess(
    (v) => (v === undefined || v === '' ? undefined : Number(v)),
    z
      .number({ invalid_type_error: 'Rating must be a number', required_error: 'Rating is required' })
      .int('Rating must be a whole number')
      .min(1, 'Rating must be between 1 and 5')
      .max(5, 'Rating must be between 1 and 5')
  ),
  comment: z.string().trim().max(1000, 'Review must be at most 1000 characters').optional().default(''),
});

export const reviewReplySchema = z.object({
  comment: z
    .string({ required_error: 'Reply is required' })
    .trim()
    .min(1, 'Reply cannot be empty')
    .max(1000, 'Reply must be at most 1000 characters'),
});

export const reportSchema = z.object({  listingId: z.string().regex(/^[0-9a-f]{24}$/i, 'Invalid listing id'),
  reason: z.enum(['scam', 'inaccurate', 'inappropriate', 'unavailable', 'other'], {
    errorMap: () => ({ message: 'Please choose a reason' }),
  }),
  details: z.string().trim().max(1000, 'Details must be at most 1000 characters').optional().default(''),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset link is invalid'),
  password: newPassword,
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Confirmation link is invalid'),
});

const moderationReason = z
  .string({ required_error: 'Please give a reason' })
  .trim()
  .min(1, 'Please give a reason')
  .max(300, 'Reason must be at most 300 characters');

export const updateReportSchema = z.object({
  status: z.enum(['open', 'resolved', 'dismissed'], {
    errorMap: () => ({ message: "Status must be 'open', 'resolved' or 'dismissed'" }),
  }),
});

export const moderationReasonSchema = z.object({ reason: moderationReason });

const MAX_VIEWING_DAYS_AHEAD = 90;

const isTimeZone = (tz) => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

export const createViewingSchema = z.object({
  listingId: z.string().regex(/^[0-9a-f]{24}$/i, 'Invalid listing id'),
  startsAt: z.coerce
    .date({ errorMap: () => ({ message: 'Please choose a valid date and time' }) })
    .refine((d) => d > new Date(), 'Please choose a time in the future')
    .refine(
      (d) => d < new Date(Date.now() + MAX_VIEWING_DAYS_AHEAD * 24 * 60 * 60 * 1000),
      `Viewings can be requested up to ${MAX_VIEWING_DAYS_AHEAD} days ahead`
    ),
  timeZone: z.string().refine(isTimeZone, 'Invalid time zone').optional().default('UTC'),
  note: z.string().trim().max(500, 'Note must be at most 500 characters').optional().default(''),
});

export const updateViewingSchema = z.object({
  action: z.enum(['accept', 'decline', 'cancel'], {
    errorMap: () => ({ message: "Action must be 'accept', 'decline' or 'cancel'" }),
  }),
  note: z.string().trim().max(500, 'Note must be at most 500 characters').optional().default(''),
});

// An optional numeric range filter; an empty string from a cleared form
// field is treated as "not set" rather than as zero.
const optionalFilterNumber = z.preprocess(
  (v) => (v === '' || v === null ? undefined : v),
  z.coerce
    .number({ invalid_type_error: 'Filter values must be numbers' })
    .min(0, 'Filter values cannot be negative')
    .max(10_000_000, 'Filter values are too large')
    .optional()
);

export const createSavedSearchSchema = z
  .object({
    name: z.string().trim().max(60, 'Name must be at most 60 characters').optional().default(''),
    searchTerm: z.string().trim().max(100, 'Keyword must be at most 100 characters').optional().default(''),
    type: z.enum(['all', 'rent', 'sale']).optional().default('all'),
    parking: z.boolean().optional().default(false),
    furnished: z.boolean().optional().default(false),
    offer: z.boolean().optional().default(false),
    propertyType: z.enum(PROPERTY_TYPES).optional().nullable().default(null),
    amenities: z.array(z.enum(AMENITIES)).max(20).optional().default([]),
    minPrice: optionalFilterNumber,
    maxPrice: optionalFilterNumber,
    minBedrooms: optionalFilterNumber,
    minBathrooms: optionalFilterNumber,
  })
  .refine(
    (data) => data.minPrice === undefined || data.maxPrice === undefined || data.minPrice <= data.maxPrice,
    { message: 'Minimum price must be at most the maximum price', path: ['minPrice'] }
  );

export const updateSavedSearchSchema = z.object({
  name: z.string().trim().max(60, 'Name must be at most 60 characters').optional(),
  alertsEnabled: z.boolean().optional(),
});

// Availability slots an owner opens up for viewings. Each slot is a start
// and end time; the controller rejects past or overlapping ones.
export const createAvailabilitySchema = z.object({
  slots: z
    .array(
      z.object({
        startsAt: z.coerce.date({ errorMap: () => ({ message: 'Please choose a valid date and time' }) }),
        endsAt: z.coerce.date({ errorMap: () => ({ message: 'Please choose a valid date and time' }) }),
      })
    )
    .min(1, 'Add at least one slot')
    .max(50, 'You can add at most 50 slots at once'),
});

const optionalDate = z.preprocess(
  (v) => (v === '' || v === null ? undefined : v),
  z.coerce.date({ errorMap: () => ({ message: 'Please choose a valid date' }) }).optional()
);

const optionalMoney = z.preprocess(
  (v) => (v === '' || v === null ? undefined : v),
  z.coerce.number({ invalid_type_error: 'Income must be a number' }).min(0, 'Income cannot be negative').max(100_000_000).optional()
);

export const createApplicationSchema = z.object({
  listingId: z.string().regex(/^[0-9a-f]{24}$/i, 'Invalid listing id'),
  fullName: z.string().trim().min(3, 'Please enter your full name').max(80, 'Name must be at most 80 characters'),
  email,
  phone: z.string().trim().max(40, 'Phone must be at most 40 characters').optional().default(''),
  message: z.string().trim().max(1000, 'Message must be at most 1000 characters').optional().default(''),
  moveInDate: optionalDate,
  occupants: z.coerce
    .number({ invalid_type_error: 'Occupants must be a number' })
    .int('Occupants must be a whole number')
    .min(1, 'There must be at least 1 occupant')
    .max(20, 'At most 20 occupants')
    .optional()
    .default(1),
  income: optionalMoney,
});

export const updateApplicationSchema = z.object({
  action: z.enum(['withdraw', 'review', 'approve', 'reject'], {
    errorMap: () => ({ message: "Action must be 'withdraw', 'review', 'approve' or 'reject'" }),
  }),
  note: z.string().trim().max(500, 'Note must be at most 500 characters').optional().default(''),
});

export const createPaymentSchema = z.object({
  applicationId: z.string().regex(/^[0-9a-f]{24}$/i, 'Invalid application id'),
  amount: z.coerce
    .number({ invalid_type_error: 'Amount must be a number' })
    .min(10, 'Deposit must be at least 10')
    .max(10_000_000, 'Deposit is too large'),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, 'Currency must be a 3-letter code')
    .optional()
    .default('USD'),
});

export const askQuestionSchema = z.object({
  question: z
    .string({ required_error: 'Question is required' })
    .trim()
    .min(5, 'Question must be at least 5 characters')
    .max(500, 'Question must be at most 500 characters'),
});

export const answerQuestionSchema = z.object({
  answer: z
    .string({ required_error: 'Answer is required' })
    .trim()
    .min(1, 'Answer cannot be empty')
    .max(1000, 'Answer must be at most 1000 characters'),
});

const MAX_OPEN_HOUSE_HOURS = 8;
const MAX_OPEN_HOUSE_DAYS_AHEAD = 90;

export const createOpenHouseSchema = z
  .object({
    startsAt: z.coerce
      .date({ errorMap: () => ({ message: 'Please choose a valid start time' }) })
      .refine((d) => d > new Date(), 'The open house must start in the future')
      .refine(
        (d) => d < new Date(Date.now() + MAX_OPEN_HOUSE_DAYS_AHEAD * 24 * 60 * 60 * 1000),
        `Open houses can be scheduled up to ${MAX_OPEN_HOUSE_DAYS_AHEAD} days ahead`
      ),
    endsAt: z.coerce.date({ errorMap: () => ({ message: 'Please choose a valid end time' }) }),
    note: z.string().trim().max(300, 'Note must be at most 300 characters').optional().default(''),
    capacity: z.coerce
      .number({ invalid_type_error: 'Capacity must be a number' })
      .int('Capacity must be a whole number')
      .min(0, 'Capacity cannot be negative')
      .max(500, 'Capacity must be at most 500')
      .optional()
      .default(0),
  })
  .refine((v) => v.endsAt > v.startsAt, { message: 'The end time must be after the start time', path: ['endsAt'] })
  .refine((v) => v.endsAt - v.startsAt <= MAX_OPEN_HOUSE_HOURS * 60 * 60 * 1000, {
    message: `An open house can last at most ${MAX_OPEN_HOUSE_HOURS} hours`,
    path: ['endsAt'],
  });

export const createMaintenanceSchema = z.object({
  listingId: z.string().regex(/^[0-9a-f]{24}$/i, 'Invalid listing id'),
  title: z
    .string({ required_error: 'Please describe the problem' })
    .trim()
    .min(5, 'Title must be at least 5 characters')
    .max(100, 'Title must be at most 100 characters'),
  description: z.string().trim().max(2000, 'Description must be at most 2000 characters').optional().default(''),
  category: z.enum(['plumbing', 'electrical', 'heating', 'appliance', 'pest', 'structural', 'other'], {
    errorMap: () => ({ message: 'Please choose a category' }),
  }),
  urgency: z
    .enum(['low', 'normal', 'urgent'], { errorMap: () => ({ message: "Urgency must be 'low', 'normal' or 'urgent'" }) })
    .optional()
    .default('normal'),
});

export const maintenanceUpdateSchema = z
  .object({
    body: z.string().trim().max(2000, 'Update must be at most 2000 characters').optional().default(''),
    status: z
      .enum(['open', 'in_progress', 'resolved', 'closed'], { errorMap: () => ({ message: 'Unknown status' }) })
      .optional(),
  })
  .refine((v) => v.body.length > 0 || v.status, { message: 'Write an update or change the status' });

const quickReplyFields = {
  title: z
    .string({ required_error: 'Give the reply a short name' })
    .trim()
    .min(1, 'Give the reply a short name')
    .max(40, 'Name must be at most 40 characters'),
  body: z
    .string({ required_error: 'Reply text is required' })
    .trim()
    .min(1, 'Reply text is required')
    .max(1000, 'Reply must be at most 1000 characters'),
};

export const createQuickReplySchema = z.object(quickReplyFields);

export const updateQuickReplySchema = z
  .object(quickReplyFields)
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'Nothing to update' });

const challengeToken = z.string({ required_error: 'Your sign-in session expired' }).min(1, 'Your sign-in session expired');

export const verifyTwoFactorSchema = z.object({
  challengeToken,
  code: z
    .string({ required_error: 'Enter the 6-digit code' })
    .trim()
    .regex(/^\d{6}$/, 'Enter the 6-digit code from the email'),
});

export const resendTwoFactorSchema = z.object({ challengeToken });

export const setTwoFactorSchema = z.object({
  enabled: z.boolean({ invalid_type_error: 'Enabled must be true or false', required_error: 'Enabled is required' }),
  password: z.string({ required_error: 'Enter your password to confirm' }).min(1, 'Enter your password to confirm'),
});
