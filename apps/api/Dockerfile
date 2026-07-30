# syntax=docker/dockerfile:1

# --- Build stage -------------------------------------------------------
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# --- Runtime stage -------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

# Run as non-root — good practice on both Render and Koyeb.
RUN addgroup -S adstream && adduser -S adstream -G adstream

ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .

USER adstream

# Both Render and Koyeb inject PORT at runtime; the app reads it via env.js.
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 4000) + '/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["sh", "-c", "npm run migrate && node src/server.js"]