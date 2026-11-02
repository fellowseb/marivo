FROM node:26-alpine
RUN corepack enable && corepack prepare pnpm@12.15.0 --activate
WORKDIR /app
COPY package*.json ./
RUN pnpm install --frozen-lockfile
COPY . .
EXPOSE 3001
CMD ["pnpm", "dev"]
