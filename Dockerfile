FROM node:18-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
# Use pnpm v9 to match lockfileVersion 9.0
RUN npm install -g pnpm@9
RUN pnpm install --frozen-lockfile --prod
COPY . .
RUN pnpm run prisma:generate || true
EXPOSE 3000
CMD [ "node", "-r", "dotenv/config", "src/server.js" ]
