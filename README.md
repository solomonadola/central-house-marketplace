# Central House Marketplace

Central House Marketplace is a platform where you can find houses for rent and sale. You can also rent and sell your own properties on the platform.

## Features

- Browse, search and filter listings by type (rent/sale), price range, bedrooms, bathrooms, offers, parking and furnishing, sorted by price or date
- See search results and individual listings on a map (addresses are geocoded with OpenStreetMap)
- Save listings to favorites and find them on the Saved page
- See how many times each of your listings has been viewed
- Create, edit and delete your own listings with up to 6 photos
- Email/password and Google sign-in
- Contact a listing's owner directly from the listing page
- Profile management with avatar upload

## Tech stack

| Layer    | Tools                                                                 |
| -------- | --------------------------------------------------------------------- |
| Frontend | React 18, Vite, Redux Toolkit + redux-persist, React Router, Tailwind CSS, Swiper, Leaflet |
| Backend  | Node.js, Express, MongoDB + Mongoose, Zod                             |
| Auth     | JWT in an httpOnly cookie, Firebase Auth for Google sign-in           |
| Storage  | Firebase Storage for listing and avatar images                        |

## Getting started

### Prerequisites

- Node.js 18 or newer
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

This creates 4 demo users and 20 listings in San Francisco neighbourhoods. Sign in with `sarah_homes@demo.centralhouse.local` / `password123`. Re-running the command only replaces the demo data and never touches other accounts.

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

When deploying, set `NODE_ENV=production` so the auth cookie is marked `Secure`, and `TRUST_PROXY=1` if the app runs behind a reverse proxy.

## Testing

```bash
npm test                    # API tests (Vitest + Supertest, in-memory MongoDB)
npm test --prefix client    # client tests (Vitest + React Testing Library)
npm run lint --prefix client
```

The API tests start their own in-memory MongoDB, so they don't need a database or a `.env` file. The first run downloads the MongoDB binary (~100 MB). Use `npm run test:watch` in either folder to re-run tests on change.

CI runs all of the above, plus the client production build, on every pull request and on every push to `master`.

## Scripts

| Command                       | Description                                   |
| ----------------------------- | --------------------------------------------- |
| `npm run dev`                 | Start the API with auto-restart on changes    |
| `npm start`                   | Start the API (and serve `client/dist`)       |
| `npm run build`               | Install all dependencies and build the client |
| `npm run seed`                | Reset the demo users and listings             |
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

Search query parameters: `searchTerm`, `type` (`rent` / `sale` / `all`), `offer`, `parking`, `furnished` (`true` to require), `minPrice` / `maxPrice` (compared against the discounted price for offers), `minBedrooms`, `minBathrooms`, `sort` (`createdAt` / `regularPrice`), `order` (`asc` / `desc`), `limit` (1-50, default 9), `startIndex`. The response body is an array of listings; the `X-Total-Count` header gives the total number of matches.

### Security

- Passwords are hashed with bcrypt. Login tokens are JWTs in an httpOnly, SameSite=Lax cookie that expire after 7 days.
- Google sign-in tokens are verified server-side with `firebase-admin`.
- Request bodies are validated with Zod, and search parameters are restricted to known values.
- Failed auth attempts are rate-limited to 10 per IP per 15 minutes.
- Security headers are set with `helmet`.

## License

This project is licensed under the MIT License.
