# 기존과 동일
FROM node:20-slim

RUN apt-get update && apt-get install -y \
  libnss3 libatk-bridge2.0-0 libgtk-3-0 libdrm2 libxkbcommon0 libgbm1 \
  libasound2 libxshmfence1 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
  libpango-1.0-0 libpangocairo-1.0-0 libcairo2 fonts-noto-cjk \
  libatspi2.0-0 libx11-6 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN npm install

# 🔥 이걸 반드시 COPY 전에 위치시켜야 함
RUN npx playwright install --with-deps chromium

COPY . .

ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "start"]

