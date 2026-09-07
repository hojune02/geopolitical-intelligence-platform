FROM node:24-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/server/package.json ./apps/server/package.json
COPY apps/client/package.json ./apps/client/package.json

RUN npm ci

COPY . .

RUN npm run build -w @geo-intel/server


FROM node:24-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY apps/server/package.json ./apps/server/package.json
COPY apps/client/package.json ./apps/client/package.json

RUN npm ci --omit=dev

COPY --from=build \
  /app/apps/server/dist \
  ./apps/server/dist

COPY apps/server/sql \
  ./apps/server/sql

EXPOSE 3000

CMD ["node", "apps/server/dist/index.js"]