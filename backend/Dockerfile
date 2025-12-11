# Backend Dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY shared/package*.json ./shared/

# Install ALL dependencies (including devDependencies for build)
RUN npm install --legacy-peer-deps

# Also install in backend folder to ensure all deps are available
RUN cd backend && npm install --legacy-peer-deps

# Production dependencies only - install directly in backend folder
FROM base AS prod-deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy all package files
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY shared/package*.json ./shared/

# Install production dependencies
RUN npm install --legacy-peer-deps --omit=dev
RUN cd backend && npm install --legacy-peer-deps --omit=dev

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

# Install NestJS CLI and TypeScript globally for build
RUN npm install -g @nestjs/cli typescript

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

# Copy node_modules from prod-deps (backend folder has the right deps)
COPY --from=prod-deps --chown=nestjs:nestjs /app/node_modules ./node_modules
COPY --from=prod-deps --chown=nestjs:nestjs /app/backend/node_modules ./backend_modules

# Merge backend_modules into node_modules
RUN cp -rn ./backend_modules/* ./node_modules/ 2>/dev/null || true
RUN rm -rf ./backend_modules

COPY --chown=nestjs:nestjs backend/package*.json ./

USER nestjs

EXPOSE 3000

CMD ["node", "dist/main.js"]