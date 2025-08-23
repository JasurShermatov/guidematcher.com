# ──────── 1-bosqich: Dependencies ────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# ──────── 2-bosqich: Build ────────
FROM deps AS builder
WORKDIR /app
COPY . .

# Build arguments
ARG REACT_APP_API_URL=http://localhost:8000/api/v1/
ARG REACT_APP_WS_URL=ws://localhost:8000

# Environment variables
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_WS_URL=$REACT_APP_WS_URL
ENV NODE_OPTIONS="--max_old_space_size=1024"
ENV CI=false
ENV GENERATE_SOURCEMAP=false

# Build the application
RUN npm run build

# ──────── 3-bosqich: Production Runtime ────────
FROM nginx:1.25-alpine

# Copy built app
COPY --from=builder /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create nginx cache directory
RUN mkdir -p /var/cache/nginx/client_temp

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]