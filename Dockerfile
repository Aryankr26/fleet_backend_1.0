FROM node:18-slim
# Install OpenSSL and certs (glibc base avoids musl engine issues)
RUN apt-get update \ 
	&& apt-get install -y --no-install-recommends openssl ca-certificates \ 
	&& rm -rf /var/lib/apt/lists/*
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
