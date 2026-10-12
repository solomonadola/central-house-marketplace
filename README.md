# Central House Marketplace

Central House Marketplace is a platform where you can find houses for rent and sale. You can also rent and sell your own properties on the platform.

## Features

- Browse, search and filter listings by type (rent/sale), price range, bedrooms, bathrooms, offers, parking and furnishing, sorted by price or date
- See search results and individual listings on a map (addresses are geocoded with OpenStreetMap)
- Save listings to favorites and find them on the Saved page
- See how many times each of your listings has been viewed
- Rate and review listings you've enquired about, and see ratings on listing cards
- Report suspicious or inaccurate listings
- Request viewings of a listing; owners accept or decline, and updates appear in your messages
- Owner analytics: views per day, saves, enquiries and viewing requests for each listing
- Admin dashboard: site statistics, a reports queue, hiding listings, and suspending users
- Create, edit and delete your own listings with up to 6 photos
- Email/password and Google sign-in, with email confirmation and password reset
- Message listing owners in the app, with an inbox, unread badges and live updates (email addresses stay private)
- Profile management with avatar upload

## More things you can do

- **Notifications** – an in-app inbox (bell menu) for messages, viewing and
  application updates, reviews and moderation, with per-user email preferences
  under *Notification settings*.
- **Saved searches** – save the filters you care about and get notified when a
  matching home is listed. Manage them on the *Saved searches* page.
- **Applications** – apply to rent or buy a listing with your details; owners
  review, approve or decline applications from the *Received* tab.
- **Holding deposits** – once an application is approved, pay a refundable
  deposit to reserve the home (a simulated payment flow). Owners can refund it.
- **Viewing availability** – owners publish the times they can show a property;
  visitors can only request those slots, and overlapping requests are blocked.
- **Calendar export** – download your upcoming viewings as an `.ics` file.
- **Comparison** – put up to four homes side by side on the *Compare* page.
- **Owner analytics** – views, saves, enquiries, viewing requests, applications
  and deposits received, with a CSV export.
- **Market insights** – public, aggregate stats about listings and prices.
- **Owner profiles** – a public page for each seller with their rating and
  active listings, plus pause/resume for your own listings.
- **Recently viewed** – a private, on-device history of homes you have opened.
- **Admin tools** – a reports queue, user suspension, hidden listings, an audit
  log of every moderation action and a per-user detail page.
- **Price history and price-drop alerts** – every listing shows its past
  prices, and people who saved it are notified when the price falls.
- **Price comparison** – how a listing's price compares with the median of
  similar homes: same rent/sale type and bedroom count, within 5 km.
- **Questions and answers** – ask an owner a public question about a listing;
  answered questions are shown to everyone.
- **Open houses** – owners schedule public viewing times with an optional
  capacity, visitors RSVP, and everyone is told if one is cancelled. All
  upcoming ones are on the *Open houses* page.
- **Rent and leases** – after approving a rental application, an owner sets up
  a lease (rent, due day, start and end). Every month gets a rent charge the
  tenant can pay online (simulated) or the owner can record as paid by cash,
  transfer or check, or waive. Both sides see the balance, overdue months and a
  downloadable ledger, and owners get a rental income chart. Tenants are
  reminded 3 days before rent is due and when it is 1 and 7 days late; run
  `npm run rent-reminders` from a scheduler, or set `RENT_REMINDERS=daily`.
- **Move-in and move-out inspections** – owners write a room-by-room condition
  report, the tenant signs or disputes it, and the move-out report shows what
  got worse since move-in.
- **Maintenance requests** – tenants report problems with the home they rent
  and follow the repair from open to resolved.
- **Mortgage calculator** – monthly payment, total interest and a yearly payoff
  schedule on homes for sale.
- **Listing drafts** – save an unfinished listing and publish it later.
- **Quick replies** – owners save answers they send often and insert them into
  a message with one click.
- **Owner response stats** – how often and how quickly an owner replies,
  shown on listings and owner profiles.
- **Blocking** – block a user so neither of you can message the other.
- **Two-step sign-in** – optionally require a code sent by email after the
  password.
- **Download my data** – export everything stored about your account as JSON.
- **Content moderation** – anyone signed in can report a review or question;
  admins remove it (with a reason sent to the author) or dismiss the reports
  from the *Reviews & questions* tab, and can restore removed content. Removed
  reviews no longer count towards a listing's rating.

## Tech stack

| Layer    | Tools                                                                 |
| -------- | --------------------------------------------------------------------- |
| Frontend | React 18, Vite, Redux Toolkit + redux-persist, React Router, Tailwind CSS, Swiper, Leaflet |
| Backend  | Node.js, Express, MongoDB + Mongoose, Zod                             |
| Auth     | JWT in an httpOnly cookie, Firebase Auth for Google sign-in           |
| Storage  | Firebase Storage for listing and avatar images                        |

## Quick start with Docker

With Docker installed, this runs the app and MongoDB together:

```bash
JWT_SECRET=$(openssl rand -hex 32) docker compose up --build
docker compose exec app node api/seed.js   # optional demo data
```

Then open http://localhost:8080 (set `APP_PORT` to change the port). The other settings in `docker-compose.yml` (`SMTP_URL`, `VITE_FIREBASE_API_KEY`, ...) can be set in your shell or a `.env` file. For local development with hot reload, follow the steps below instead.

## Getting started

### Prerequisites

- Node.js 22 or newer (CI and the Docker image use Node 24 LTS)
- MongoDB, either local or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster. With Docker you can run one with:

  ```bash
  docker run -d --name central-house-mongo -p 27017:27017 -v central-house-mongo-data:/data/db mongo:7
  ```

- A Firebase web API key, needed for Google sign-in and image uploads

### 1. Configure environment variables

```bash
cp .env.example .env
cp client/.env.example client/.env
```

Then fill in:

- `.env`: `DB` (your MongoDB connection string) and `JWT_SECRET` (any long random string)
- `client/.env`: `VITE_FIREBASE_API_KEY`

Every setting is documented in the two `.env.example` files.

### 2. Install dependencies

```bash
npm install
npm install --prefix client
```

### 3. Load demo data (optional)

```bash
npm run seed
```

This creates 4 demo users (with confirmed emails) and an admin, 20 listings in San Francisco neighbourhoods with 30 days of view history, and sample conversations, reviews and viewing requests. It also adds price
history, questions, open houses, quick replies, a lease with
three paid months and one due, a maintenance request and a flagged question for
the moderation queue. Sign in with `sarah_homes@demo.centralhouse.local` / `password123`. Re-running the command only replaces the demo data and never touches other accounts.

### Email

Password reset and email confirmation send email through `SMTP_URL` (any SMTP provider: Gmail, Resend, SendGrid, Mailgun, ...). Without it, emails are printed to the API server's console, so you can copy the links while developing. See `.env.example`.

### Admins

There's no way to become an admin through the app. Grant or remove admin rights from the command line:

```bash
npm run make-admin -- someone@example.com
npm run make-admin -- someone@example.com --remove
```

The demo data includes an admin account: `admin@demo.centralhouse.local` / `password123`.

### 4. Run the app

In two terminals:

```bash
npm run dev                  # API on http://localhost:3000
npm run dev --prefix client  # frontend on http://localhost:5173
```

Open http://localhost:5173. The Vite dev server forwards `/api` requests to the API.

If port 3000 is taken, set `PORT` in `.env` and `API_PORT` in `client/.env` to the same free port.

### Production build

```bash
npm run build   # installs dependencies and builds the client into client/dist
npm start       # serves the API and the built client on PORT
```

When deploying, set `NODE_ENV=production` so the auth cookie is marked `Secure` (override with `COOKIE_SECURE=false` if you must serve over plain HTTP), and `TRUST_PROXY=1` if the app runs behind a reverse proxy.

## Testing

```bash
npm test                    # API tests (Vitest + Supertest, in-memory MongoDB)
npm test --prefix client    # client tests (Vitest + React Testing Library)
npm run lint --prefix client
```

The API tests start their own in-memory MongoDB, so they don't need a database or a `.env` file. The first run downloads the MongoDB binary (~100 MB). Use `npm run test:watch` in either folder to re-run tests on change.

CI runs all of the above, plus the client production build and a Docker image build, on every pull request and on every push to `master`.

## Scripts

| Command                       | Description                                   |
| ----------------------------- | --------------------------------------------- |
| `npm run dev`                 | Start the API with auto-restart on changes    |
| `npm start`                   | Start the API (and serve `client/dist`)       |
| `npm run build`               | Install all dependencies and build the client |
| `npm run seed`                | Reset the demo users and listings             |
| `npm run make-admin -- <email>` | Grant admin rights (`--remove` to revoke)   |
| `npm run rent-reminders`      | Send due-soon and overdue rent reminders once |
| `npm test`                    | Run the API tests                             |
| `npm test --prefix client`    | Run the client tests                          |
| `npm run dev --prefix client` | Start the Vite dev server                     |

## Project structure

```
api/
  controllers/   Route handlers for auth, users and listings
  models/        Mongoose schemas
  routes/        Express routers
  utils/         Auth cookie, Firebase token verification, rate limiting, errors
  validation/    Zod request schemas and the validate middleware
  test/          API tests and test setup
  app.js         Express app (routes, middleware, error handling)
  index.js       Entry point: checks config, connects to MongoDB, starts the server
  seed.js        Demo data script
client/
  src/
    components/  Shared UI (header, listing card, OAuth button, ...)
    pages/       Route pages (home, search, listing, profile, ...)
    redux/       User state slice and persisted store
    utils/       apiFetch (signs out on an expired session)
    test/        Client test setup and helpers
```

## API

All responses are JSON. Errors have the shape `{ success: false, statusCode, message }`. Routes marked 🔒 require the `access_token` cookie set by sign-in.

| Method | Route                       | Description                                       |
| ------ | --------------------------- | ------------------------------------------------- |
| POST   | `/api/auth/signup`          | Create an account (`username`, `email`, `password`) |
| POST   | `/api/auth/signin`          | Sign in with email and password                   |
| POST   | `/api/auth/google`          | Sign in with a Firebase Google ID token (`idToken`) |
| GET    | `/api/auth/signout`         | Clear the auth cookie                             |
| POST   | `/api/auth/forgot-password` | Email a password reset link (`email`)             |
| POST   | `/api/auth/reset-password`  | Set a new password (`token`, `password`)          |
| POST   | `/api/auth/verify-email`    | Confirm an email address (`token`)                |
| POST   | `/api/auth/resend-verification` 🔒 | Send a new confirmation link               |
| GET    | `/api/user/favorites` 🔒    | List your saved listings                          |
| PUT    | `/api/user/favorites/:id` 🔒 | Save a listing                                   |
| DELETE | `/api/user/favorites/:id` 🔒 | Remove a saved listing                           |
| POST   | `/api/user/update/:id` 🔒   | Update your username, email, password or avatar   |
| DELETE | `/api/user/delete/:id` 🔒   | Delete your account and its listings              |
| GET    | `/api/user/listings/:id` 🔒 | List your own listings                            |
| GET    | `/api/user/:id` 🔒          | Get a user's public profile                       |
| POST   | `/api/listing/create` 🔒    | Create a listing                                  |
| POST   | `/api/listing/update/:id` 🔒 | Update your listing (any subset of fields)       |
| DELETE | `/api/listing/delete/:id` 🔒 | Delete your listing                              |
| GET    | `/api/listing/get/:id`      | Get one listing                                   |
| GET    | `/api/listing/get`          | Search listings (see below)                       |
| POST   | `/api/listing/view/:id`     | Count a view of a listing (rate-limited)          |
| GET    | `/api/messages/conversations` 🔒 | Your conversations with unread counts        |
| POST   | `/api/messages/conversations` 🔒 | Message a listing's owner (`listingId`, `body`) |
| GET    | `/api/messages/conversations/:id` 🔒 | Latest 50 messages (`?before=<date>` for older); marks read |
| POST   | `/api/messages/conversations/:id/messages` 🔒 | Reply in a conversation (`body`) |
| GET    | `/api/messages/unread-count` 🔒 | Number of conversations with unread messages |
| GET    | `/api/reviews/listing/:id`  | A listing's reviews and rating; for signed-in users, whether they can review |
| POST   | `/api/reviews/listing/:id` 🔒 | Create or update your review (`rating` 1-5, `comment`) |
| DELETE | `/api/reviews/:id` 🔒       | Delete your review                                |
| GET    | `/api/reviews/owner/:id`    | A landlord's average rating across their listings |
| POST   | `/api/reports` 🔒           | Report a listing (`listingId`, `reason`, `details`) |
| GET    | `/api/viewings` 🔒          | Your viewing requests (`?as=owner` for requests on your listings) |
| POST   | `/api/viewings` 🔒          | Request a viewing (`listingId`, `startsAt`, `timeZone`, `note`) |
| PATCH  | `/api/viewings/:id` 🔒      | `accept` / `decline` (owner) or `cancel` (either side), with an optional `note` |
| GET    | `/api/user/analytics` 🔒    | Views, saves, enquiries and viewing requests for your listings |

Admin routes (🛡 admins only):

| Method | Route                       | Description                                       |
| ------ | --------------------------- | ------------------------------------------------- |
| GET    | `/api/admin/stats` 🛡       | Site statistics                                   |
| GET    | `/api/admin/reports` 🛡     | Reports queue (`?status=open\|resolved\|dismissed\|all`) |
| PATCH  | `/api/admin/reports/:id` 🛡 | Set a report's `status`                          |
| GET    | `/api/admin/listings/hidden` 🛡 | Hidden listings                              |
| POST   | `/api/admin/listings/:id/hide` 🛡 | Hide a listing (`reason`); resolves its open reports |
| POST   | `/api/admin/listings/:id/unhide` 🛡 | Make a hidden listing public again          |
| GET    | `/api/admin/users` 🛡       | Search users (`?search=`, `?suspended=true`)      |
| POST   | `/api/admin/users/:id/suspend` 🛡 | Suspend a user (`reason`) and hide their listings |
| POST   | `/api/admin/users/:id/unsuspend` 🛡 | Reinstate a user and restore their listings |

Search query parameters: `searchTerm`, `type` (`rent` / `sale` / `all`), `offer`, `parking`, `furnished` (`true` to require), `propertyType` (`apartment` / `house` / `studio` / `room` / `land`), `amenities` (comma-separated ids; the listing must have them all), `minPrice` / `maxPrice` (compared against the discounted price for offers), `minBedrooms`, `minBathrooms`, `sort` (`createdAt` / `regularPrice`), `order` (`asc` / `desc`), `limit` (1-50, default 9), `startIndex`. The response body is an array of listings; the `X-Total-Count` header gives the total number of matches.

Listings also carry a `propertyType` and an `amenities` list. The shared
vocabulary lives in `api/constants/listing.js` and is mirrored on the client in
`client/src/utils/listingDetails.js`, so the two stay in step.

### Security

- Passwords are hashed with bcrypt. Login tokens are JWTs in an httpOnly, SameSite=Lax cookie that expire after 7 days.
- Google sign-in tokens are verified server-side with `firebase-admin`.
- Request bodies are validated with Zod, and search parameters are restricted to known values.
- Failed auth attempts are rate-limited to 10 per IP per 15 minutes.
- Messages are rate-limited to 30 per IP per minute, and listing views to 60 per IP per hour.
- Other users only see your username and avatar; your email and saved listings stay private.
- Posting listings requires a confirmed email address. Reset and confirmation links use single-use random tokens, stored only as hashes, that expire after 1 and 24 hours.
- Only users who have messaged a listing's owner can review that listing.
- Every authenticated request re-checks the account: suspended users are signed out immediately, and resetting a password signs out all sessions (changing it signs out other devices).
- Security headers are set with `helmet`.

## Testing

- API suite: `npm test` (Vitest with `mongodb-memory-server`; one in-memory
  database per test file, cleaned between tests).
- Client suite: `npm test --prefix client` (Vitest + Testing Library, jsdom).
- Client lint: `npm run lint --prefix client` (eslint, zero warnings allowed).

Run all three after changing code.

## Additional API routes

Beyond the core routes above, the app exposes:

| Method | Route | Description |
| ------ | ----- | ----------- |
| GET | `/api/listing/compare?ids=` 🔒 | Up to four listings by id, in order, for the compare page |
| GET | `/api/listing/by-ids?ids=` | Up to twelve listings by id, for the recently-viewed page |
| GET | `/api/listing/:id/similar` | Up to four similar listings by type and price |
| POST | `/api/listing/:id/active` 🔒 | Pause or reactivate a listing (`active`) |
| POST | `/api/listing/:id/duplicate` 🔒 | Clone a listing as an unpublished draft |
| GET | `/api/listing/availability/:id` | An owner's open viewing slots for a listing |
| GET | `/api/notifications` 🔒 | Your notification inbox (`?unread=true`) |
| GET | `/api/notifications/unread-count` 🔒 | Unread notification count |
| PATCH | `/api/notifications/:id/read` 🔒 | Mark one read (or `/unread`) |
| POST | `/api/notifications/read-all` 🔒 | Mark everything read |
| DELETE | `/api/notifications` 🔒 | Clear the inbox (`?read=true` for read ones only) |
| GET | `/api/saved-searches` 🔒 | Your saved searches |
| POST | `/api/saved-searches` 🔒 | Save the current filters; alerts you to new matches |
| PATCH | `/api/saved-searches/:id` 🔒 | Rename or pause alerts |
| DELETE | `/api/saved-searches/:id` 🔒 | Delete a saved search |
| GET | `/api/availability/:listingId` | Upcoming viewing slots (open ones to everyone) |
| POST | `/api/availability/:listingId` 🔒 | Owner adds viewing slots |
| DELETE | `/api/availability/slot/:id` 🔒 | Owner removes an open slot |
| GET | `/api/applications` 🔒 | Your applications (`?role=owner` for those received) |
| POST | `/api/applications` 🔒 | Apply to rent or buy a listing |
| PATCH | `/api/applications/:id` 🔒 | `review` / `approve` / `reject` (owner) or `withdraw` |
| GET | `/api/applications/export` 🔒 | Applications received, as CSV |
| GET | `/api/payments` 🔒 | Deposits you paid (`?role=payee` for those received) |
| POST | `/api/payments` 🔒 | Start a holding deposit for an approved application |
| POST | `/api/payments/:id/confirm\|cancel` 🔒 | Confirm/cancel a pending deposit |
| POST | `/api/payments/:id/refund` 🔒 | Owner refunds a paid deposit |
| GET | `/api/payments/export` 🔒 | Deposits, as CSV |
| GET | `/api/user/preferences` 🔒 | Notification email preferences |
| PATCH | `/api/user/preferences` 🔒 | Update notification preferences |
| GET | `/api/user/public/:id` | Public owner profile, rating and active listings |
| GET | `/api/user/analytics/export` 🔒 | Per-listing analytics, as CSV |
| GET | `/api/viewings/export` 🔒 | Upcoming viewings as an `.ics` calendar file |
| GET | `/api/messages/conversations/export` 🔒 | Your conversations, as CSV |
| POST | `/api/messages/read-all` 🔒 | Mark every conversation read |
| GET | `/api/admin/audit` 🛡 | Moderation audit trail (`?action=`, `?targetType=`, `?actor=`) |
| GET | `/api/admin/audit/summary` 🛡 | Counts per moderation action |
| GET | `/api/admin/users/:id` 🛡 | A user's profile, stats, listings and recent actions |
| GET | `/api/admin/reports/export` 🛡 | Reports, as CSV |
| GET | `/api/insights` | Public aggregate marketplace statistics |
| GET | `/api/listing/:id/price-history` | Price changes for a listing |
| GET | `/api/listing/:id/price-comparison` | How the price compares with similar homes |
| GET | `/api/questions/listing/:id` | Questions on a listing |
| POST | `/api/questions/listing/:id` 🔒 | Ask a question |
| POST | `/api/questions/:id/answer` 🔒 | Owner answers a question |
| DELETE | `/api/questions/:id` 🔒 | Delete a question (owner, or asker while unanswered) |
| GET | `/api/open-houses/upcoming` | Upcoming open houses across all listings |
| GET | `/api/open-houses/mine` 🔒 | Open houses you host or RSVP'd to |
| GET | `/api/open-houses/listing/:id` | Open houses for a listing |
| POST | `/api/open-houses/listing/:id` 🔒 | Owner schedules an open house |
| POST | `/api/open-houses/:id/rsvp` 🔒 | RSVP (`DELETE` to cancel the RSVP) |
| POST | `/api/open-houses/:id/cancel` 🔒 | Owner cancels an open house |
| GET | `/api/leases` 🔒 | Leases you rent (`?as=owner` for those you let) |
| GET | `/api/leases/candidates` 🔒 | Approved rental applications without a lease |
| GET | `/api/leases/income` 🔒 | Rent expected and collected per month (`?months=`) |
| POST | `/api/leases` 🔒 | Owner sets up a lease |
| GET | `/api/leases/:id` 🔒 | A lease with its monthly charges and balance |
| GET | `/api/leases/:id/export` 🔒 | The rent ledger, as CSV |
| POST | `/api/leases/:id/end` 🔒 | Owner ends a lease |
| POST | `/api/leases/:id/charges/:chargeId/pay` 🔒 | Tenant pays a month online |
| POST | `/api/leases/:id/charges/:chargeId/record\|waive` 🔒 | Owner records an offline payment or waives a month |
| GET | `/api/inspections?leaseId=` 🔒 | Inspection reports on a lease |
| POST | `/api/inspections` 🔒 | Owner starts a move-in or move-out report |
| GET/PATCH/DELETE | `/api/inspections/:id` 🔒 | Read, edit (draft or disputed) or delete (draft) a report |
| POST | `/api/inspections/:id/submit\|sign\|dispute` 🔒 | Owner sends it; tenant signs or disputes |
| GET | `/api/maintenance` 🔒 | Your requests (`?as=owner`, `?status=`) |
| GET | `/api/maintenance/eligible` 🔒 | Rentals you can report problems for |
| GET | `/api/maintenance/summary` 🔒 | Open request counts for owners |
| POST | `/api/maintenance` 🔒 | Report a problem |
| GET | `/api/maintenance/:id` 🔒 | A request with its updates |
| POST | `/api/maintenance/:id/updates` 🔒 | Comment and/or change the status |
| GET/POST | `/api/quick-replies` 🔒 | Your quick replies |
| PATCH/DELETE | `/api/quick-replies/:id` 🔒 | Edit or delete a quick reply |
| GET/POST | `/api/listing-drafts` 🔒 | Your listing drafts |
| GET/PUT/DELETE | `/api/listing-drafts/:id` 🔒 | Read, save or delete a draft |
| POST | `/api/listing-drafts/:id/publish` 🔒 | Publish a draft as a listing |
| GET | `/api/user/blocks` 🔒 | Users you blocked |
| GET/PUT/DELETE | `/api/user/blocks/:id` 🔒 | Check, block or unblock a user |
| GET | `/api/user/export` 🔒 | Everything stored about you, as JSON |
| POST | `/api/user/two-factor` 🔒 | Turn two-step sign-in on or off (needs your password) |
| POST | `/api/auth/verify-2fa` | Finish signing in with the emailed code |
| POST | `/api/auth/resend-2fa` | Send a new sign-in code |
| GET | `/api/user/public/:id/response-stats` | How often and how fast an owner replies |
| POST | `/api/content-flags` 🔒 | Report a review or question |
| GET | `/api/admin/content/flagged` 🛡 | Reported content, most-reported first |
| GET | `/api/admin/content/removed` 🛡 | Recently removed content |
| POST | `/api/admin/content/:type/:id/remove\|restore\|dismiss` 🛡 | Remove, restore, or keep and dismiss reports |

## License

This project is licensed under the MIT License.
