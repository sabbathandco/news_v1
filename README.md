# FreshWave News

Responsive single‑page site that curates upbeat news (≥3× positive vs negative) across eight sections, auto‑fetched via the OpenAI `gpt-4o-search-preview` model with integrated web search.

## Quick start

```bash
git clone https://github.com/yourname/freshwave-news
cd freshwave-news
cp .env.example .env        # add your OpenAI key
npm install
npm run dev                 # builds Tailwind on the fly
npm run serve               # starts Live‑Server at http://127.0.0.1:8080