FROM node:18-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN npm install -g pnpm@7
RUN pnpm install --frozen-lockfile --prod
COPY . .
RUN pnpm run prisma:generate || true
EXPOSE 3000
CMD [ "node", "-r", "dotenv/config", "src/server.js" ]
