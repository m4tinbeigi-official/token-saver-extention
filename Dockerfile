# Dockerfile for TokenSaver application
# Stage 1: Build the frontend using Vite
FROM node:20-alpine AS builder
WORKDIR /app
# Install frontend dependencies
COPY frontend/package.json frontend/package-lock.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

# Stage 2: Production image
FROM node:20-alpine
WORKDIR /app
# Install backend dependencies (production only)
COPY server/package.json server/package-lock.json ./
RUN npm install --production
# Copy backend source code
COPY server/ ./
# Copy built frontend assets
COPY --from=builder /app/dist ./frontend/dist
# Expose the server port
EXPOSE 8080
# Start the server
CMD ["node", "server.js"]
