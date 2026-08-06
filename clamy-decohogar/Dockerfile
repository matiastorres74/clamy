FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build -- --configuration production

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist/clamy-decohogar ./dist/clamy-decohogar

ENV PORT=4000
EXPOSE 4000

CMD ["node", "dist/clamy-decohogar/server/server.mjs"]
