FROM node:20-alpine
RUN apk add --no-cache pandoc typst font-noto
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm install
COPY tsconfig*.json ./
COPY src ./src
COPY scripts ./scripts
RUN npm run build
EXPOSE 8080
CMD ["sh","-lc","node ./scripts/migrate-and-start.js"]
