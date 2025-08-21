# Stage 1: Base image with pnpm installed
FROM node:20.12.2-alpine3.18 AS base

# Install pnpm globally
RUN npm install -g pnpm

# Stage 2: Dependencies stage
FROM base AS deps

# Set working directory
WORKDIR /app

# Copy package.json and pnpm-lock.yaml
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Stage 3: Builder stage
FROM base AS builder

WORKDIR /app

# Copy the rest of the application code
COPY . .

# Copy modules and dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Build the application
RUN pnpm run build

# Stage 4: Runner stage
FROM base AS runner

# Set working directory
WORKDIR /app

# Copy artifacts from the previous stages
COPY . .
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Create uploads directory and set permissions
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs
RUN mkdir -p uploads && chown -R nodejs:nodejs uploads

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port 3000
EXPOSE 3000

# Switch to non-root user
USER nodejs

# Start the application
CMD ["pnpm", "start"]
