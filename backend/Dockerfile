FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund

COPY src ./src

RUN chown -R node:node /app

ENV NODE_ENV=production

USER node

EXPOSE 3000

CMD ["node", "src/server.js"]
