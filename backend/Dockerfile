FROM node:20-alpine
RUN apk add --no-cache pandoc typst fontconfig font-noto ttf-dejavu \
    font-liberation font-carlito \
    && apk add --no-cache --repository=https://dl-cdn.alpinelinux.org/alpine/edge/community \
    inkscape \
    && fc-cache -f
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm install
COPY tsconfig*.json ./
COPY src ./src
COPY scripts ./scripts
RUN npm run build
EXPOSE 8080
CMD ["sh","-lc","node ./scripts/migrate-and-start.js"]
