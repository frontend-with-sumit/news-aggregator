# Build stage: compile the static React/Vite bundle.
FROM node:26-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Serve stage: a single nginx container serves the build and reverse-proxies the three
# provider APIs, injecting each one's key server-side (docs/specs/0001-news-api-proxy-architecture.md).
FROM nginx:1.27-alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/nginx/default.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 80
