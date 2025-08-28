# Playwright가 사전 설치된 공식 이미지 사용
FROM mcr.microsoft.com/playwright:v1.44.1-jammy

# 작업 디렉터리 설정
WORKDIR /app

# package.json 및 package-lock.json 복사 후 의존성 설치
COPY package.json package-lock.json* ./
RUN npm install

# 나머지 소스 코드 복사
COPY . .

# 환경 변수 설정 (필요 시 수정)
ENV NODE_ENV=production

# 앱 시작
CMD ["npm", "start"]
