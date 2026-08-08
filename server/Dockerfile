FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma/

RUN npm install

COPY src ./src/
RUN npx prisma generate
RUN mkdir -p uploads

EXPOSE 5000

CMD ["sh", "-c", "npx prisma db push && npx tsx src/index.ts"]
