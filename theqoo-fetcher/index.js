import 'dotenv/config';
import { chromium } from 'playwright';
import fs from 'fs';
import TelegramBot from 'node-telegram-bot-api';

const {
  TARGET_URL = 'https://theqoo.net/bl',
  KEYWORDS = '',
  POLL_INTERVAL_SEC = '300',
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
  TIMEZONE = 'Asia/Seoul',
  SEEN_FILE = './seen.json',
} = process.env;

const keywords = KEYWORDS.split(',').map(s => s.trim()).filter(Boolean);
const pollMs = Math.max(60, parseInt(POLL_INTERVAL_SEC, 10)) * 1000;
const bot = TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID
  ? new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false })
  : null;

function loadSeen() {
  try {
    return new Set(JSON.parse(fs.readFileSync(SEEN_FILE, 'utf-8')));
  } catch {
    return new Set();
  }
}

function saveSeen(set) {
  try {
    fs.writeFileSync(SEEN_FILE, JSON.stringify([...set]), 'utf-8');
  } catch {}
}

const seen = loadSeen();
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function notify(msg) {
  if (!bot) return console.log('[NO-TELEGRAM]', msg);
  try {
    await bot.sendMessage(TELEGRAM_CHAT_ID, msg, { disable_web_page_preview: true });
  } catch (error) {
    console.error('[TELEGRAM ERROR]', error.message);
  }
}

function matchKeywords(title) {
  if (keywords.length === 0) return true;
  const t = title.toLowerCase();
  return keywords.some(k => t.includes(k.toLowerCase()));
}

async function extractPosts(page) {
  const html = await page.content();
  
  // 디버깅: HTML 일부 출력
  console.log('[DEBUG] HTML 길이:', html.length);
  console.log('[DEBUG] title 클래스 포함 여부:', html.includes('class="title"'));
  console.log('[DEBUG] HTML 첫 500자:', html.substring(0, 500));
  
  const posts = [];

  const allPostsPattern = /<td class="title">.*?<a href="([^"]+)"[^>]*>(.*?)<\/a>(?:(?!<\/td>).)*<\/td>/gs;
  const matches = [...html.matchAll(allPostsPattern)];
  
  console.log('[DEBUG] 패턴 매칭 결과:', matches.length, '개');

  for (let i = 0; i < matches.length && i < 30; i++) {
    const match = matches[i];
    const fullMatch = match[0];

    const linkPattern = /<a href="([^"]+)"[^>]*>(.*?)<\/a>/g;
    const links = [...fullMatch.matchAll(linkPattern)];

    let mainUrl = '';
    let mainTitle = '';
    let preface = '';

    for (const link of links) {
      const url = link[1];
      const content = link[2];

      if (link[0].includes("class='preface'") || link[0].includes('class="preface"')) {
        preface = content.replace(/<[^>]*>/g, '').trim();
      } else if (!mainUrl && url) {
        mainUrl = url.trim();
        mainTitle = content.trim();
      }
    }

    if (mainUrl && mainTitle) {
      const cleanTitle = mainTitle
        .replace(/<[^>]*>/g, '')
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (cleanTitle && cleanTitle.length > 1) {
        const fullTitle = preface ? `[${preface}] ${cleanTitle}` : cleanTitle;
        posts.push({
          id: `https://theqoo.net${mainUrl}`.split('?')[0],
          title: fullTitle,
          url: `https://theqoo.net${mainUrl}`,
        });
      }
    }
  }

  console.log(`[INFO] ${posts.length}개 게시글 파싱됨`);
  return posts;
}

async function openAndWait(page, url) {
  try {
    const resp = await page.goto(url, { 
      waitUntil: 'domcontentloaded', 
      timeout: 30_000  // 타임아웃 단축
    });

    // CF 챌린지 감지 및 대기
    const cfText = '잠시만 기다려주세요';
    const hasCF = await page.locator(`text=${cfText}`).count().catch(() => 0);
    if (hasCF) {
      console.log('[CF] 보안 검사중 감지 → 대기 중...');
      await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
      await sleep(5000); // 3초 → 5초로 증가
    }

    return resp;
  } catch (error) {
    console.error('[PAGE ERROR]', error.message);
    throw error;
  }
}

async function runOnce(browser) {
  let context;
  let page;
  
  try {
    context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36',
      locale: 'ko-KR',
      timezoneId: TIMEZONE,
      // 메모리 사용량 최적화
      viewport: { width: 1280, height: 720 },
    });
    
    page = await context.newPage();

    await openAndWait(page, TARGET_URL);
    await sleep(1000 + Math.random() * 1000);

    const posts = await extractPosts(page);
    if (posts.length === 0) {
      console.log('[INFO] 글이 0개로 파싱됨');
      return;
    }

    const head = posts.slice(0, 40);
    const hits = head.filter(p => matchKeywords(p.title) && !seen.has(p.id));

    for (const p of hits) {
      seen.add(p.id);
      const matchedKeyword = keywords.find(k => p.title.toLowerCase().includes(k.toLowerCase()));
      let msg = '';

      if (matchedKeyword === '도둑들') {
        msg = `🐣 ${p.title}`;
      } else {
        msg = `🌰 ${p.title}\n${p.url}`;
      }

      console.log('[ALERT]', msg);
      await notify(msg);
    }

    if (hits.length) saveSeen(seen);
    else console.log('[INFO] 신규 매칭 없음');

  } catch (e) {
    console.error('[ERROR]', e?.message || e);
  } finally {
    // 리소스 정리
    if (page) await page.close().catch(() => {});
    if (context) await context.close().catch(() => {});
  }
}

async function main() {
  let browser;
  
  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--no-first-run',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-web-security',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
        '--memory-pressure-off'
      ]
    });

    console.log(`[START] Monitoring ${TARGET_URL} every ${pollMs / 1000}s`);
    
    // 첫 실행
    await runOnce(browser);
    
    // 정기 실행
    setInterval(async () => {
      try {
        await runOnce(browser);
      } catch (error) {
        console.error('[INTERVAL ERROR]', error.message);
      }
    }, pollMs);

  } catch (err) {
    console.error('[BROWSER ERROR]', err);
    if (browser) await browser.close().catch(() => {});
    process.exit(1);
  }
}

// 프로세스 종료 시 정리
process.on('SIGINT', async () => {
  console.log('[SHUTDOWN] Gracefully shutting down...');
  process.exit(0);
});

main().catch(err => {
  console.error('[MAIN ERROR]', err);
  process.exit(1);
});
