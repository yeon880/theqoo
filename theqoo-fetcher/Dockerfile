FROM node:20-slim

# Playwright 의존성 + 한글 폰트 등 설치
RUN apt-get update && apt-get install -y \
  libnss3 libatk-bridge2.0-0 libgtk-3-0 libdrm2 libxkbcommon0 libgbm1 \
  libasound2 libxshmfence1 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
  libpango-1.0-0 libpangocairo-1.0-0 libcairo2 fonts-noto-cjk \
  libatspi2.0-0 libx11-6 curl unzip \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 종속성 설치 + 브라우저 설치 한꺼번에
COPY package.json ./
RUN npm install && npx playwright install --with-deps chromium

# 나머지 코드 복사
COPY . .

ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "start"]
