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
  await bot.sendMessage(TELEGRAM_CHAT_ID, msg, { disable_web_page_preview: true });
}

function matchKeywords(title) {
  if (keywords.length === 0) return true;
  const t = title.toLowerCase();
  return keywords.some(k => t.includes(k.toLowerCase()));
}

async function extractPosts(page) {
  const selectors = [
    'table.board-list a[href*="/bl/"]',
    '.board-list a[href*="/bl/"]',
    'a[href^="/bl/"].hx, a[href^="/bl/"].title, td.title a',
    'a[href^="/bl/"]'
  ];

  for (const sel of selectors) {
    const items = await page.$$eval(sel, (as) => {
      const uniq = new Map();
      for (const a of as) {
        const title = (a.textContent || '').trim();
        let href = a.getAttribute('href') || '';
        if (!href || title.length < 2) continue;
        if (href.startsWith('/')) href = location.origin + href;
        const id = href.split('?')[0];
        if (!uniq.has(id)) {
          uniq.set(id, { id, title, url: href });
        }
      }
      return [...uniq.values()];
    }).catch(() => []);

    if (items.length > 5) return items;
  }
  return [];
}

async function openAndWait(page, url) {
  const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });

  const cfText = '잠시만 기다려주세요';
  const hasCF = await page.locator(`text=${cfText}`).count().catch(() => 0);
  if (hasCF) {
    console.log('[CF] 보안 검사중 감지 → 대기 중...');
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  }

  const ok = await Promise.any([
    page.waitForSelector('table.board-list', { timeout: 30_000 }),
    page.waitForSelector('a[href*="/bl/"]', { timeout: 30_000 })
  ]).then(() => true).catch(() => false);

  if (!ok) console.log('[WARN] 리스트 셀렉터가 안 잡힘');
  return resp;
}

async function runOnce(browser) {
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36',
    locale: 'ko-KR',
    timezoneId: TIMEZONE,
  });
  const page = await context.newPage();

  try {
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
    await page.close().catch(() => {});
    await context.close().catch(() => {});
  }
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-dev-shm-usage', '--no-sandbox']
  });

  console.log(`[START] Monitoring ${TARGET_URL} every ${pollMs / 1000}s`);
  await runOnce(browser);
  setInterval(() => runOnce(browser), pollMs);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
