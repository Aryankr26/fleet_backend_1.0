FROM node:18-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
# Bring prisma schema in before install so postinstall can run
COPY prisma ./prisma
# Use pnpm v9 to match lockfileVersion 9.0
RUN npm install -g pnpm@9

# Install all deps (need devDeps for prisma), then prune to prod
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run prisma:generate || true
# Prune dev deps but skip lifecycle scripts so prisma postinstall is not re-run
RUN pnpm prune --prod --ignore-scripts
EXPOSE 3000
CMD [ "node", "-r", "dotenv/config", "src/server.js" ]
