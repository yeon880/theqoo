FROM node:20-slim

# Playwright가 필요한 시스템 패키지 설치 + 한글 폰트
RUN apt-get update && apt-get install -y \
  wget gnupg curl unzip \
  libnss3 libatk-bridge2.0-0 libgtk-3-0 libdrm2 libxkbcommon0 libgbm1 \
  libasound2 libxshmfence1 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
  libpango-1.0-0 libpangocairo-1.0-0 libcairo2 fonts-noto-cjk \
  ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 종속성 설치
COPY package.json package-lock.json* ./
RUN npm ci

# 전체 코드 복사
COPY . .

# 🔥 여기서 Playwright + Chromium 브라우저 설치
RUN npx playwright install --with-deps chromium

ENV NODE_ENV=production
CMD ["npm", "start"]
