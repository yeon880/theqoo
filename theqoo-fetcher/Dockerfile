# Node.js 18 LTS slim 이미지 기반
FROM node:18-slim

# Playwright 실행에 필요한 패키지 설치 + 한글 폰트 추가
RUN apt-get update && apt-get install -y \
    libnss3 libatk-bridge2.0-0 libgtk-3-0 libdrm2 libxkbcommon0 libgbm1 \
    libasound2 libxshmfence1 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
    libpango-1.0-0 libpangocairo-1.0-0 libcairo2 fonts-noto-cjk \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# 작업 디렉토리 생성
WORKDIR /app

# 의존성 설치
COPY package.json ./
RUN npm install

# Playwright 브라우저 설치 (중요!)
RUN npx playwright install chromium
RUN npx playwright install-deps chromium

# 앱 소스 복사
COPY . .

# 환경 설정
ENV NODE_ENV=production

# 앱 실행
CMD ["node", "index.js"]
