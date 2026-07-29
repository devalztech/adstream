# syntax=docker/dockerfile:1

# --- Dependencies ---------------------------------------------------
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install

# --- Build ------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* variables must be present at BUILD time, not just
# runtime — Next.js inlines them into the client bundle during `next
# build`. Render/Koyeb should set this as a build-time env var.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN npm run build

# --- Runtime ------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -S adstream && adduser -S adstream -G adstream

# `output: 'standalone'` in next.config.js produces a minimal server
# bundle with only the files actually needed at runtime.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=adstream:adstream /app/.next/standalone ./
COPY --from=builder --chown=adstream:adstream /app/.next/static ./.next/static

USER adstream

EXPOSE 3000
ENV PORT=3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3000) + '/', r => process.exit(r.statusCode < 500 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "server.js"]
