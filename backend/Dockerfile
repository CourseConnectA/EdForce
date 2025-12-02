# Backend Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY shared/package*.json ./shared/

# Install dependencies
RUN npm ci --only=production

# Development image
FROM base AS dev
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

EXPOSE 3001
CMD ["npm", "run", "start:dev"]

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build shared types first
RUN cd shared && npm run build

# Build backend
RUN cd backend && npm run build

# Production image
FROM base AS production
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nestjs
RUN adduser --system --uid 1001 nestjs

# Copy built application
COPY --from=builder --chown=nestjs:nestjs /app/backend/dist ./dist
COPY --from=builder --chown=nestjs:nestjs /app/shared/dist ./shared/dist
COPY --from=deps --chown=nestjs:nestjs /app/node_modules ./node_modules
COPY --chown=nestjs:nestjs backend/package*.json ./

USER nestjs

EXPOSE 3001

CMD ["node", "dist/main.js"]