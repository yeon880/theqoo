FROM node:20-slim

# Playwright 의존성 + 한글 폰트
RUN apt-get update && apt-get install -y \
    libnss3 libatk-bridge2.0-0 libgtk-3-0 libdrm2 libxkbcommon0 libgbm1 \
    libasound2 libxshmfence1 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
    libpango-1.0-0 libpangocairo-1.0-0 libcairo2 fonts-noto-cjk \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json ./
RUN npm i
COPY . .
RUN npx playwright install --with-deps chromium

ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm","start"]
