FROM node:20-slim

# 필수 패키지 설치 (Playwright 실행 + 한글 폰트)
RUN apt-get update && apt-get install -y \
    libnss3 libatk-bridge2.0-0 libgtk-3-0 libdrm2 libxkbcommon0 libgbm1 \
    libasound2 libxshmfence1 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
    libpango-1.0-0 libpangocairo-1.0-0 libcairo2 fonts-noto-cjk \
  && rm -rf /var/lib/apt/lists/*

# 작업 디렉토리
WORKDIR /app

# Node.js 의존성 설치
COPY package.json package-lock.json* ./
RUN npm install

# 코드 복사
COPY . .

# Playwright 브라우저 설치
RUN npx playwright install --with-deps chromium

# 환경변수로 production 설정 (필요시)
ENV NODE_ENV=production

# 포트 노출 (안 써도 됨, 웹서버 없으면)
EXPOSE 3000

# 실행 명령
CMD ["npm", "start"]
