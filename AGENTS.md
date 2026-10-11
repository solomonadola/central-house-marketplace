# Agent notes

Central House Marketplace is a MERN app: an Express + Mongoose API under `api/`
and a React (Vite) client under `client/`.

## Commands

- API tests: `npm test` (Vitest + mongodb-memory-server, one in-memory DB per file)
- Client tests: `npm test --prefix client`
- Client lint: `npm run lint --prefix client` (eslint, `--max-warnings 0`)
- Dev servers: `npm run dev` (API) and `npm run dev --prefix client`

Always run the API suite, the client suite and the client lint after changing
code.

## Conventions

- Controllers live in `api/controllers`, models in `api/models`, routes in
  `api/routes`. Mount new routers in `api/app.js`.
- Request bodies are validated with Zod schemas in `api/validation/schemas.js`
  via the `validate()` middleware.
- Side effects that must not break a request (notifications, audit logging,
  saved-search alerts) live in `api/utils` and swallow their own errors.
- Shared vocabulary (amenities, property types) is defined once in
  `api/constants/listing.js` and mirrored in `client/src/utils/listingDetails.js`.
- Client API calls go through `client/src/utils/apiFetch.js`; data-loading
  pages use the `useFetchJson` hook.
- Keep the English default in `client/src/i18n/translations.js` in sync with
  every other language.
