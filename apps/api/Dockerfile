FROM node:26-alpine
RUN npm install -g pnpm@12.15.0
WORKDIR /app
COPY package*.json ./
RUN pnpm install --frozen-lockfile
COPY . .
EXPOSE 3001
CMD ["pnpm", "dev"]
