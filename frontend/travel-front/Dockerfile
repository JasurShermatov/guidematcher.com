# --- 1-qadam: React build ---
FROM node:18-alpine AS build

# Ish papkasi
WORKDIR /app

# Package fayllarini ko'chiring
COPY package*.json ./

# Dev dependency-larni ham o‘rnatamiz (tailwind, postcss, autoprefixer uchun kerak)
RUN npm ci --include=dev

# Barcha kodni ko‘chiramiz
COPY . .

# Build jarayoni
RUN npm run build

# --- 2-qadam: Nginx orqali serve ---
FROM nginx:1.21-alpine

# Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Build natijasini Nginx papkasiga ko‘chirish
COPY --from=build /app/build /usr/share/nginx/html

# Port ochish
EXPOSE 80

# Nginx ni ishga tushirish
CMD ["nginx", "-g", "daemon off;"]