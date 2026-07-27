# Base image: Using Node.js 22 with Alpine Linux for a minimal footprint
FROM node:22-alpine AS base

# Stage 1: Dependencies
# This stage is responsible for installing all npm dependencies
# Pin Bun so dependency installation cannot drift between local and Railway builds.
FROM oven/bun:1.3.11-alpine AS deps
# Installing libc6-compat for Alpine Linux compatibility with certain Node.js packages
# Required for some npm packages that have native dependencies
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy package files and install dependencies using pnpm
# pnpm is used for faster and more efficient package management
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Stage 2: Building the application
# This stage builds the Next.js application
FROM base AS builder
WORKDIR /app
ARG NEXT_PUBLIC_APP_URL=https://twiga.ai
ARG NEXT_PUBLIC_SOURCE_URL=https://github.com/HNM500/twiga-ai
ENV SKIP_ENV_VALIDATION=true
ENV NODE_OPTIONS="--max-old-space-size=3584"
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_SOURCE_URL=$NEXT_PUBLIC_SOURCE_URL
# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
# Copy all source files
COPY . .
# Validate types separately so Next's compiler and type checker do not overlap
# inside the Railway/local Docker memory envelope.
RUN npm run typecheck
# Build the Next.js application
RUN npm run build

# Migration image used as a one-shot job in local Compose. It deliberately does
# not inherit the application build: migrations only need the database driver,
# Drizzle runtime, the SQL ledger, and the small migration script.
FROM base AS migrator
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY drizzle/twiga-migrations ./drizzle/twiga-migrations
COPY scripts/migrate.mjs ./scripts/migrate.mjs
CMD ["node", "scripts/migrate.mjs"]

# Stage 3: Production runtime
# Final stage that runs the application
FROM base AS runner
LABEL org.opencontainers.image.name="twiga-web"
WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Copy only the necessary files for running the application
# Static files for serving
COPY --from=builder /app/public ./public

# Copy the standalone build output and static files
# Using Next.js output tracing to minimize the final image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Railway runs this lightweight migrator as a pre-deploy command in the same
# runtime image, before the new application revision receives traffic.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=builder --chown=nextjs:nodejs /app/drizzle/twiga-migrations ./drizzle/twiga-migrations
COPY --from=builder --chown=nextjs:nodejs /app/scripts/migrate.mjs ./scripts/migrate.mjs

# Switch to non-root user for security
USER nextjs

# Expose the port the app runs on
EXPOSE 3000

# Configure the server
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the Next.js application
CMD ["node", "server.js"]
