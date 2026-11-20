# Multi-stage Dockerfile for Vox Checkout & Control
# Stage 1: Build Frontend Vite
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package*.json tsconfig.json vite.config.ts index.html ./
COPY src ./src
COPY public ./public
COPY App.tsx index.tsx ./
RUN npm ci
RUN npm run build

# Stage 2: Build Backend Fastify
FROM node:20-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json backend/tsconfig.json ./
RUN npm ci
COPY backend/src ./src
RUN npm run build

# Stage 3: Production Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3333

COPY backend/package*.json ./
RUN npm ci --only=production

# Copy backend compiled dist
COPY --from=backend-builder /app/backend/dist ./dist

# Copy frontend static build to client_dist
COPY --from=frontend-builder /app/dist ./client_dist

# Create uploads folder
RUN mkdir -p uploads

EXPOSE 3333

CMD ["node", "dist/index.js"]
