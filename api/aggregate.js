// /api/aggregate.js – pulls fresh RSS stories first, then back-fills with GPT search
import Parser from "rss-parser";
import handlerNews from "./news.js";        // reuse your existing OpenAI search function

const parser = new Parser({ timeout: 10000 });

// ─── config ────────────────────────────────────────────────────────────────────
const NOW        = Date.now();
const THREE_DAYS = 1000 * 60 * 60 * 24 * 3;          // freshness window
const DEFAULT_CT = 5;                                // articles per call

const SECTION_FEEDS = {
  design: [
    "https://www.smashingmagazine.com/feed/",
    "https://www.nngroup.com/feed/rss/",
    "https://uxdesign.cc/feed",
    "https://www.creativebloq.com/feed/",
    "https://www.printmag.com/feed/"
  ],
  wellness: [
    "https://www.muscleandfitness.com/feed",
    "https://www.self.com/section/health/rss",
    "https://www.mindful.org/feed",
    "https://www.yogajournal.com/feed/",
    "https://hipandhealthy.com/feed"
  ],
  "things-to-do": [
    "https://www.timeout.com/newyork/feed",
    "https://www.nycgo.com/rss"
  ],
  "local-nyc": [
    "https://www.thecity.nyc/rss.xml",
    "https://www.amny.com/feed/"
  ],
  "tech-ai": [
    "https://techcrunch.com/feed/",
    "https://www.technologyreview.com/feed/"
  ]
};
// ───────────────────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    const {
      section,
      count  = DEFAULT_CT,
      offset = 0,
      prompt = ""
    } = req.body || {};

    if (!section) {
      return res.status(400).json({ error: "Missing `section` in body" });
    }

    /* 1️⃣ RSS pass — pull every feed for the section in parallel */
    const feeds = SECTION_FEEDS[section] || [];
    let articles = [];

    await Promise.all(
      feeds.map(async (url) => {
        try {
          const feed = await parser.parseURL(url);
          (feed.items || []).forEach((it) => {
            const pub = it.isoDate ? new Date(it.isoDate).getTime() : NaN;
            if (pub && NOW - pub <= THREE_DAYS) {
              articles.push({
                headline: it.title || "",
                summary:
                  it.contentSnippet ||
                  it.content ||
                  it["content:encoded"] ||
                  "",
                url: it.link || "",
                paywall: false,
                pubDate: pub
              });
            }
          });
        } catch (err) {
          console.warn("RSS error:", url, err.message);
        }
      })
    );

    /* 2️⃣ Sort newest → oldest, de-dup by URL */
    const seen = new Set();
    articles = articles
      .sort((a, b) => b.pubDate - a.pubDate)
      .filter((a) => {
        if (seen.has(a.url)) return false;
        seen.add(a.url);
        return true;
      });

    /* 3️⃣ Pagination slice */
    let slice = articles.slice(offset, offset + count);

    /* 4️⃣ Back-fill with GPT search if slice still short */
        if (slice.length < count && prompt) {
              try {
                const mock = mockRes();                         // capture the mock
                await handlerNews(
                  { method: "POST", body: { prompt } },
                  mock
                );
                /* mock.payload now contains the raw GPT JSON */
                const gptItems = JSON.parse(mock.payload || "[]");
                slice = slice.concat(gptItems).slice(0, count);
              } catch (err) {
                console.error("GPT back-fill failed:", err);
              }
            }

    /* 5️⃣ Return to client */
    res.status(200).json({ items: slice });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Aggregator failure", details: err.message });
  }
}

/* helper – tiny mock of Next/Vercel response so we can reuse news.js */
function mockRes() {
  const res = {};
  res.statusCode = 200;
  res.headers    = {};
  res.status     = (c) => ((res.statusCode = c), res);
  res.setHeader  = () => {};
  res.json       = (obj) => (res.payload = JSON.stringify(obj.content ?? "[]"));
  return res;
}
