import express from "express";
import { chromium } from "playwright";

const app = express();
app.use(express.json({ limit: "1mb" }));

// 간단 토큰 보호 (환경변수 FETCH_TOKEN)
app.use((req, res, next) => {
  const token = req.headers["x-fetch-token"];
  if (!process.env.FETCH_TOKEN || token === process.env.FETCH_TOKEN) return next();
  return res.status(401).json({ error: "unauthorized" });
});

app.get("/healthz", (_, res) => res.send("ok"));

// 전역 브라우저 1회 기동 후 재사용(가볍고 빠름)
let browserPromise;
async function getBrowser() {
  if (!browserPromise) {
    browserPromise = chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
  }
  return browserPromise;
}

app.post("/fetch", async (req, res) => {
  const { url, wait = "domcontentloaded", timeoutMs = 35000, waitMs = 8000 } = req.body || {};
  if (!url) return res.status(400).json({ error: "url required" });

  const browser = await getBrowser();
  const ctx = await browser.newContext({
    locale: "ko-KR",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    viewport: { width: 1366, height: 900 },
  });

  try {
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: wait, timeout: timeoutMs });
    await page.waitForTimeout(waitMs); // Cloudflare 검사 대기
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));

    const html = await page.content();
    res.json({ html, finalUrl: page.url() });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  } finally {
    await ctx.close();
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("theqoo-fetcher on", port));
