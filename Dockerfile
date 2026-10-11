# syntax=docker/dockerfile:1
# Firebase web API keys are public by design (they ship to every browser),
# so passing one as a build arg isn't leaking a secret.
# check=skip=SecretsUsedInArgOrEnv

# --- Build the React client ---
FROM node:24-alpine AS client
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
# Baked into the client bundle at build time.
ARG VITE_FIREBASE_API_KEY=""
ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY
RUN npm run build

# --- Production image: the API serves the built client ---
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY api ./api
COPY --from=client /app/client/dist ./client/dist

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD wget -qO- http://localhost:3000/api/listing/get?limit=1 >/dev/null || exit 1
CMD ["node", "api/index.js"]
