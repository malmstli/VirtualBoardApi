FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY prisma ./prisma

RUN npm ci --include=dev \
    && npx prisma generate \
    && npm prune --omit=dev

COPY src ./src

ENV NODE_ENV=production
USER node
EXPOSE 3000

CMD ["npm", "start"]
