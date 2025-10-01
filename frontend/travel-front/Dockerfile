# Multi-stage: 1-qadam - React build, 2-qadam - Nginx serve
FROM node:18-alpine AS build

# Ish papkasi
WORKDIR /app

# Package fayllarini ko'chiring va o'rnating
COPY package*.json ./
RUN npm ci --only=production

# Kodni ko'chiring va build qiling
COPY . .
RUN npm run build

# Production stage: Nginx
FROM nginx:1.21-alpine

# Nginx config ni ko'chiring
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Build natijasini Nginx ga ko'chiring
COPY --from=build /app/build /usr/share/nginx/html

# Port 80
EXPOSE 80

# Nginx ni ishga tushiring
CMD ["nginx", "-g", "daemon off;"]