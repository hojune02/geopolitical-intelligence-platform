FROM node:24-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/server/package.json ./apps/server/package.json
COPY apps/client/package.json ./apps/client/package.json

RUN npm ci

COPY . .

ARG VITE_API_BASE_URL=http://localhost:3000

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build -w @geo-intel/client


FROM nginx:alpine AS runtime

COPY apps/client/nginx.conf \
  /etc/nginx/conf.d/default.conf

COPY --from=build \
  /app/apps/client/dist \
  /usr/share/nginx/html

EXPOSE 80