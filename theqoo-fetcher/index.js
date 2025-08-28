const playwright = require('playwright');
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function getPostsFromHtml(html) {
  const posts = [];

  try {
    const allPostsPattern = /<td class="title">.*?<a href="([^"]+)"[^>]*>(.*?)<\/a>(?:(?!<\/td>).)*<\/td>/gs;
    const matches = [...html.matchAll(allPostsPattern)];

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

        if (link[0].includes("class='preface'")) {
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
          const post = {
            title: cleanTitle,
            url: `https://theqoo.net${mainUrl}`,
            fullTitle: preface ? `[${preface}] ${cleanTitle}` : cleanTitle,
            preface,
          };
          posts.push(post);
        }
      }
    }
  } catch (error) {
    console.error('[ERROR] 크롤링 실패:', error.message);
  }

  return posts;
}

async function main() {
  const browser = await playwright.chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const url = 'https://theqoo.net/bl';

  try {
    await page.goto(url, { timeout: 20000 });
    await page.waitForSelector('.title', { timeout: 10000 }); // 기다려야 렌더링됨
    const html = await page.content();

    // 디버깅용 출력
    console.log('[DEBUG] 페이지 HTML 일부:', html.slice(0, 500));

    const posts = await getPostsFromHtml(html);
    console.log(`[INFO] ${posts.length}개 게시글 파싱됨`);

    if (posts.length === 0) {
      console.log('[WARN] 게시글이 감지되지 않았습니다. HTML 구조가 변경되었을 수 있습니다.');
    }

    // 키워드별로 메시지 전송
    for (const post of posts) {
      const title = post.fullTitle || post.title;
      let message = '';
      if (title.includes('도둑들')) {
        message = `🐣 ${title}`;
      } else if (title.includes('주한') || title.includes('민재')) {
        message = `🌰 ${title}\n${post.url}`;
      }

      if (message) {
        await sendToTelegram(message);
        console.log('[INFO] 텔레그램 전송:', message);
      }
    }
  } catch (err) {
    console.error('[ERROR] 크롤링 실패:', err.message);
  } finally {
    await browser.close();
  }
}

async function sendToTelegram(message) {
  const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const res = await fetch(telegramUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
    }),
  });
  return res.json();
}

main();
