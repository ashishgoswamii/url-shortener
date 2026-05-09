# ── Stage 1: Install dependencies ──────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Copy package files first (layer cache optimization)
COPY package*.json ./

# ci = clean install, exact versions from lockfile
# only=production = skip devDependencies
RUN npm ci --only=production

# ── Stage 2: Run the app ───────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Don't run as root — security best practice
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Copy only what we need from stage 1
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY --chown=appuser:appgroup src/ ./src/

# Copy package.json (needed for npm start)
COPY --chown=appuser:appgroup package.json ./

# Document which port the app uses
EXPOSE 3000

# Health check built into Docker
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

# Start command
CMD ["node", "src/index.js"]