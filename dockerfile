FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev

COPY . .

FROM node:22-alpine AS production

WORKDIR /app

COPY --from=builder /app /app

EXPOSE 5000

CMD ["node", "index.js"]