# Docker for Crawler 
# with Bun.js, Chromium, Puppeteer, Alpine Linux

FROM oven/bun:alpine

RUN apk add  \
      chromium \
      nss \
      freetype \
      freetype-dev \
      harfbuzz \
      ca-certificates \
      ttf-freefont

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

COPY package*.json ./

RUN bun install

COPY . .

EXPOSE 3000

CMD ["bun", "start"]