############################################
# 1-bosqich: dependency layer
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps

############################################
# 2-bosqich: build layer
FROM deps AS builder
WORKDIR /app
COPY . .

# --- API va WS uchun ARG ---
ARG REACT_APP_API_URL=http://localhost:8000/api/v1/
ARG REACT_APP_WS_ORIGIN=ws://localhost:8000

# --- React build vaqtida ENV ---
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_WS_ORIGIN=$REACT_APP_WS_ORIGIN

ENV NODE_OPTIONS="--max_old_space_size=1024"
ENV CI=false

RUN npm run build

############################################
# 3-bosqich: runtime layer (nginx)
FROM nginx:1.25-alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
