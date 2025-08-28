FROM node:20-slim

# Playwright 필수 라이브러리 + 한글 폰트
RUN apt-get update && apt-get install -y \
  libnss3 libatk-bridge2.0-0 libgtk-3-0 libdrm2 libxkbcommon0 libgbm1 \
  libasound2 libxshmfence1 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
  libpango-1.0-0 libpangocairo-1.0-0 libcairo2 fonts-noto-cjk ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
# 크로미움 & 런타임 의존성 설치 (이게 없어서 이전에 headless_shell 오류가 났던 것)
RUN npx playwright install --with-deps chromium

ENV NODE_ENV=production
CMD ["npm","start"]

