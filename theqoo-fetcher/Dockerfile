FROM node:20-slim

# Playwright 의존성 + 한글 폰트(+누락 가능성 있는 lib 2개 추가)
RUN apt-get update && apt-get install -y \
    libnss3 libatk-bridge2.0-0 libgtk-3-0 libdrm2 libxkbcommon0 libgbm1 \
    libasound2 libxshmfence1 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
    libpango-1.0-0 libpangocairo-1.0-0 libcairo2 fonts-noto-cjk \
    libatspi2.0-0 libx11-6 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json ./
RUN npm i

# ▶ 여기서 브라우저를 실제로 이미지에 설치
ARG PLAYWRIGHT_BUILD=1
RUN npx playwright install --with-deps chromium

COPY . .

ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm","start"]
