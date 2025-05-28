/* FreshWave News – HYBRID RSS ➜ GPT loader */
import { format } from "https://cdn.skypack.dev/date-fns";

/* ------------------------------------------------------------------ */
/* SECTION METADATA – identical prompts keep the original editorial tone */
const sections = [
  {
    id: "design",
    prompt:
      "Find 4 recent design industry news from the last 3 days - UX trends, design tools, product launches, creative projects. " +
      "Include design agency news, tool releases, company announcements, design trend reports, creative campaigns. " +
      "AVOID Wikipedia. Focus on design publications and industry news sites. " +
      'For each: headline, summary, direct article URL. ' +
      'IMPORTANT: Return ONLY valid JSON without code blocks: [{"headline":"...","summary":"...","url":"...","paywall":false}]'
  },
  {
    id: "wellness",
    prompt:
      "Find 5 positive wellness, fitness, mental health, or nutrition stories from the last 3 days. " +
      "Include health studies, fitness trends, wellness product launches, mental health awareness, nutrition research, surf/yoga news. " +
      "AVOID Wikipedia. Focus on wellness publications, fitness magazines, and health news sites. " +
      'For each: headline, summary, direct article URL. ' +
      'IMPORTANT: Return ONLY valid JSON without code blocks: [{"headline":"...","summary":"...","url":"...","paywall":false}]'
  },
  {
    id: "things-to-do",
    prompt:
      "Find 5 NYC events, restaurant openings, cultural activities, or entertainment news from the last 3 days. " +
      "Include new restaurant openings, cultural events, nightlife news, food trends, entertainment venues. " +
      "AVOID Wikipedia. Focus on NYC lifestyle publications, event listings, food blogs, entertainment news. " +
      'For each: headline, summary, direct article URL. ' +
      'IMPORTANT: Return ONLY valid JSON without code blocks: [{"headline":"...","summary":"...","url":"...","paywall":false}]'
  },
  {
    id: "local-nyc",
    prompt:
      "Find 5 positive NYC local news stories from the last 3 days - city developments, community news, local business, transportation updates, housing news. " +
      "Include positive developments, community initiatives, local business success, infrastructure improvements. " +
      "AVOID Trump, Israel, Russia, Wikipedia, and national politics. Focus on NYC-specific local news sources. " +
      'For each: headline, summary, direct article URL. ' +
      'IMPORTANT: Return ONLY valid JSON without code blocks: [{"headline":"...","summary":"...","url":"...","paywall":false}]'
  },
  {
    id: "tech-ai",
    prompt:
      "Find 5 encouraging tech & AI news from the last 3 days - product launches, startup funding, AI breakthroughs, tech company news. " +
      "Include software releases, hardware announcements, AI research, startup news, tech industry developments. " +
      "AVOID Trump, Israel, Russia, Wikipedia. Focus on tech publications, startup news, AI research outlets. " +
      'For each: headline, summary, direct article URL. ' +
      'IMPORTANT: Return ONLY valid JSON without code blocks: [{"headline":"...","summary":"...","url":"...","paywall":false}]'
  },
  {
    id: "entertainment",
    prompt:
      "Find 4 entertainment & music news from the last 3 days - album releases, movie announcements, streaming news, celebrity projects. " +
      "Include music releases, film/TV announcements, streaming platform news, entertainment industry developments. " +
      "AVOID Wikipedia. Focus on entertainment publications, music blogs, film industry news. " +
      'For each: headline, summary, direct article URL. ' +
      'IMPORTANT: Return ONLY valid JSON without code blocks: [{"headline":"...","summary":"...","url":"...","paywall":false}]'
  },
  {
    id: "top-stories",
    prompt:
      "Find 6 positive international news stories from the last 3 days - science breakthroughs, environmental progress, economic developments, international cooperation, health advances, technology innovations. " +
      "Include discoveries, policy wins, diplomatic progress, humanitarian efforts, medical breakthroughs, climate solutions. " +
      "AVOID Trump, Israel, Russia, Wikipedia, and negative news. Focus on uplifting, constructive global developments. " +
      "Sources: Reuters, AP News, BBC World, Guardian World, CNN International, positive news outlets. " +
      'For each: headline, summary, direct article URL (complete, not truncated). ' +
      'CRITICAL: Return as a JSON ARRAY: [{"headline":"...","summary":"...","url":"...","paywall":false}]'
  },
  {
    id: "style-art",
    prompt:
      "Find 4 fashion, art, or cultural news from the last 3 days - fashion brand launches, art exhibition openings, cultural events, style trends, museum announcements, gallery news, fashion week updates. " +
      "Include luxury fashion, contemporary art, cultural institutions, designer collaborations, art fairs, museum exhibitions. " +
      "AVOID Wikipedia. Sources: Vogue, Harper's Bazaar, Artforum, Wallpaper, WWD, Dezeen, BoF, Artnet News. " +
      'For each: headline, summary, direct article URL (complete, not truncated). ' +
      'CRITICAL: Return as a JSON ARRAY: [{"headline":"...","summary":"...","url":"...","paywall":false}]'
  }
];

/* ------------------------------------------------------------------ */
/* Duplicate-tracking for “load more”                                 */
let loadedArticles = new Set();

/* ------------------------------------------------------------------ */
/* DOM BOOTSTRAP                                                      */
document.addEventListener("DOMContentLoaded", () => {
  loadAllNews();

  document.getElementById("refresh").addEventListener("click", () => {
    clearAll();
    loadedArticles.clear();
    loadAllNews();
  });

  document.getElementById("more-news").addEventListener("click", () => {
    loadMoreNews();
  });

  sections.forEach((s) => {
    const btn = document.getElementById(`more-${s.id}`);
    if (btn) btn.addEventListener("click", () => loadMoreForSection(s));
  });

  document.getElementById("year").textContent = new Date().getFullYear();
});

/* ------------------------------------------------------------------ */
/* LINK VALIDATION – unchanged from original                           */
async function validateLink(url) {
  if (!url || url === "#" || url.length < 10) return false;

  const blockedDomains = [
    "wikipedia.org",
    "hospitalitydesign.com",
    "localhost",
    "127.0.0.1",
    "example.com",
    "test.com"
  ];
  if (blockedDomains.some((d) => url.toLowerCase().includes(d))) return false;

  try {
    const { protocol } = new URL(url);
    if (!["http:", "https:"].includes(protocol)) return false;
  } catch {
    return false;
  }

  const invalidPatterns = [
    /192\.168\./,
    /10\./,
    /placeholder/i,
    /^https?:\/\/[^/]*\/$/,
    /123456789/,
    /987654321/,
    /404|not.found|page.not.found/i,
    /sorry.+doesn.t.exist/i
  ];
  if (invalidPatterns.some((re) => re.test(url))) return false;

  const trusted = [
    "smashingmagazine.com",
    "creativebloq.com",
    "uxcollective.cc",
    "printmag.com",
    "artforum.com",
    "commarts.com",
    "creativeboom.com",
    "creativereview.co.uk",
    "uxdesignweekly.com",
    "designernews.co",
    "blog.behance.net",
    "dribbble.com",
    "blog.adobe.com",
    "fastcompany.com",
    "core77.com",
    "designboom.com",
    "dezeen.com"
  ];
  if (trusted.some((d) => url.includes(d))) return true;

  try {
    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), 4000);
    await fetch(url, { method: "HEAD", mode: "no-cors", signal: controller.signal });
    clearTimeout(to);
    return true;
  } catch {
    return false;
  }
}

// Three-pass JSON validator
function validateAndParseJSON(rawResponse, sectionId) {
  const schema = {
    required: ['headline', 'summary', 'url'],
    optional: ['paywall']
  };
  
  // Helper function to validate an item against schema
  function validateItem(item) {
    if (!item || typeof item !== 'object') return false;
    return schema.required.every(field => 
      item.hasOwnProperty(field) && 
      typeof item[field] === 'string' && 
      item[field].trim().length > 0
    );
  }
  
  // Helper function to repair common item issues
  function repairItem(item) {
    const repaired = { ...item };
    
    // Ensure required fields exist with defaults
    repaired.headline = repaired.headline || repaired.title || "Breaking News";
    repaired.summary = repaired.summary || repaired.description || "Click to read more.";
    repaired.url = repaired.url || repaired.link || "#";
    repaired.paywall = repaired.paywall || false;
    
    // Clean up fields and fix truncated URLs
    repaired.headline = String(repaired.headline).trim().substring(0, 200);
    repaired.summary = String(repaired.summary).trim().substring(0, 500);
    repaired.url = String(repaired.url).trim().replace(/…$/, ''); // Remove trailing ellipsis
    
    // Fix obviously truncated URLs
    if (repaired.url.length < 20 || repaired.url.endsWith('...') || repaired.url.endsWith('…')) {
      repaired.url = "#";
    }
    
    return repaired;
  }
  
  // PASS 1: Strict parse - fail fast
  try {
    const parsed = JSON.parse(rawResponse);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(validateItem)) {
      console.log(`Pass 1 success for ${sectionId}: Perfect JSON`);
      return parsed;
    }
  } catch (e) {
    console.log(`Pass 1 failed for ${sectionId}:`, e.message);
  }
  
  // PASS 2: Auto-repair common quirks
  try {
    let repairedResponse = rawResponse.trim();
    
    // Remove code fences more aggressively
    if (repairedResponse.includes('```')) {
      repairedResponse = repairedResponse.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    }
    
    // Handle multiple JSON objects (like the design section issue)
    if (repairedResponse.includes('}{')) {
      // Multiple objects - convert to array
      const objects = repairedResponse.split(/}\s*{/).map((obj, index, arr) => {
        if (index === 0) return obj + '}';
        if (index === arr.length - 1) return '{' + obj;
        return '{' + obj + '}';
      });
      repairedResponse = '[' + objects.join(',') + ']';
    }
    
    // Fix common JSON issues
    repairedResponse = repairedResponse
      .replace(/'/g, '"')  // Single to double quotes
      .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
      .replace(/[\u201C\u201D]/g, '"') // Smart quotes to regular quotes
      .replace(/[\u2018\u2019]/g, "'") // Smart single quotes
      .replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3') // Quote unquoted keys
      .replace(/:\s*'([^']*)'/g, ': "$1"') // Fix single-quoted values
      .replace(/…/g, '') // Remove ellipsis that truncates URLs
      .trim();
    
    const parsed = JSON.parse(repairedResponse);
    if (Array.isArray(parsed)) {
      const repairedItems = parsed.map(repairItem).filter(validateItem);
      if (repairedItems.length > 0) {
        console.log(`Pass 2 success for ${sectionId}: Auto-repaired JSON`);
        return repairedItems;
      }
    }
  } catch (e) {
    console.log(`Pass 2 failed for ${sectionId}:`, e.message);
  }
  
  // PASS 3: Lenient extraction + schema rebuild
  try {
    console.log(`Pass 3 attempting for ${sectionId}: Lenient extraction`);
    
    // Extract the largest JSON-like block
    const jsonMatch = rawResponse.match(/[\[{][\s\S]*[\]}]/);
    if (!jsonMatch) {
      throw new Error("No JSON-like structure found");
    }
    
    let extracted = jsonMatch[0];
    
    // More aggressive repairs for Pass 3
    extracted = extracted
      .replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3') // Quote unquoted keys
      .replace(/:\s*'([^']*)'/g, ': "$1"') // Fix single-quoted values
      .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
      .replace(/\n|\r/g, ' ') // Remove line breaks
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/…/g, '') // Remove ellipsis
      .replace(/}{/g, '},{'); // Fix multiple objects
    
    // If it looks like multiple objects, wrap in array
    if (extracted.match(/^\{.*\}\s*\{.*\}$/)) {
      extracted = '[' + extracted.replace(/\}\s*\{/g, '},{') + ']';
    }
    
    const parsed = JSON.parse(extracted);
    let items = Array.isArray(parsed) ? parsed : [parsed];
    
    // Build schema-compliant items from whatever we parsed
    const rebuiltItems = items.map(item => {
      if (typeof item === 'string') {
        // If it's just a string, try to make it a headline
        return {
          headline: item.substring(0, 100),
          summary: "Click to read more about this story.",
          url: "#",
          paywall: false
        };
      }
      return repairItem(item);
    }).filter(validateItem);
    
    if (rebuiltItems.length > 0) {
      console.log(`Pass 3 success for ${sectionId}: Salvaged ${rebuiltItems.length} items`);
      return rebuiltItems;
    }
    
  } catch (e) {
    console.log(`Pass 3 failed for ${sectionId}:`, e.message);
  }
  
  // Final fallback: return empty array
  console.warn(`All passes failed for ${sectionId}, returning empty array`);
  return [];
}

/* ------------------------------------------------------------------ */
/* PAYWALL CHECK – unchanged                                           */
function isPaywallSite(url) {
  const paywall = [
    "nytimes.com","wsj.com","washingtonpost.com","ft.com","financialtimes.com",
    "economist.com","newyorker.com","theatlantic.com","wired.com","bloomberg.com",
    "reuters.com","apnews.com","latimes.com","chicagotribune.com","bostonglobe.com",
    "seattletimes.com","denverpost.com","sfgate.com","mercurynews.com"
  ];
  return paywall.some((d) => url.toLowerCase().includes(d));
}

/* ------------------------------------------------------------------ */
/* CLIPBOARD HELPER – unchanged                                        */
function copyToClipboard(url, button) {
  navigator.clipboard.writeText(url).then(() => {
    const orig = button.innerHTML;
    button.innerHTML = "✓ Copied!";
    button.classList.add("text-green-600");
    setTimeout(() => {
      button.innerHTML = orig;
      button.classList.remove("text-green-600");
    }, 2000);
  }).catch(() => {
    // fallback for older browsers
    const ta = document.createElement("textarea");
    ta.value = url;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  });
}
  function clearAll() {
    document.querySelectorAll("[data-feed]").forEach((el) => (el.innerHTML = ""));
  }
  async function loadAllNews() {
    for (const s of sections) await loadSection(s);
    document.getElementById("updated").textContent = format(new Date(), "PPpp");
    document.getElementById("more-news").style.display = "block";
  }
  async function loadMoreForSection(section) {
    const btn = document.getElementById(`more-${section.id}`);
    const txt = btn.textContent;
    btn.textContent = "Loading...";
    btn.disabled = true;
    await loadSection(section, true);
    btn.textContent = txt;
    btn.disabled = false;
  }
  async function loadMoreNews() {
    const btn = document.getElementById("more-news");
    btn.textContent = "Loading more news...";
    btn.disabled = true;
    for (const s of sections) await loadSection(s, true);
    btn.textContent = "Load More News (All Sections)";
    btn.disabled = false;
    document.getElementById("updated").textContent = format(new Date(), "PPpp");
  }
/* ------------------------------------------------------------------ */
/* SECTION LOADER – hybrid fetch to /api/aggregate                    */
async function loadSection({ id, prompt }, isMoreNews = false) {
  const feed = document.querySelector(`#${id} [data-feed]`);
  if (!feed) return;

  if (!isMoreNews) feed.innerHTML = '<p class="text-gray-500">Loading...</p>';

  const body = {
    section: id,
    count: 5,
    offset: isMoreNews ? feed.children.length : 0,
    prompt: isMoreNews
      ? prompt +
        " IMPORTANT: Provide DIFFERENT articles than previous requests. Vary your sources and topics within the category."
      : prompt
  };

  try {
    const resp = await fetch("/api/aggregate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!resp.ok)
      throw new Error(`API error: ${resp.status} ${resp.statusText}`);

    /* Hybrid endpoint already returns proper JSON array */
    const { items: rawItems } = await resp.json();
/* Run the three-pass repair layer.  
       If it ever returns [], fall back to rawItems.      */
    const cleanItems =
      validateAndParseJSON(JSON.stringify(rawItems), id) || rawItems;

    /* Link validation + fallback */
    const validated = [];
    for (const it of cleanItems) {
      const ok = await validateLink(it.url);
      validated.push(
        ok
          ? it
          : {
              ...it,
              url: "#",
              summary: it.summary + " (Original link unavailable)"
            }
      );
    }

    if (!isMoreNews) feed.innerHTML = "";

    if (validated.length === 0) {
      if (!isMoreNews)
        feed.innerHTML =
          '<p class="text-gray-500">No stories found for this section.</p>';
      return;
    }

    /* Deduplicate across the session */
    const fresh = validated.filter((it) => {
      const key = `${(it.url || "#").toLowerCase()}-${(
        it.headline || ""
      ).toLowerCase()}`;
      if (loadedArticles.has(key)) return false;
      loadedArticles.add(key);
      return true;
    });

    renderCards(feed, fresh);
  } catch (err) {
    console.error("Error fetching section", id, err);
    if (!isMoreNews)
      feed.innerHTML =
        '<p class="text-red-600">Failed to load news — please try again later.</p>';
  }
}

/* ------------------------------------------------------------------ */
/* RENDERER – unchanged                                                */
function renderCards(container, items) {
  items.forEach((item) => {
    const headline = item.headline || item.title || "Untitled Story";
    const summary =
      item.summary || item.description || "No summary available.";
    const url = item.url || item.link || "#";

    const card = document.createElement("article");
    card.className =
      "bg-white p-4 rounded-2xl shadow hover:shadow-lg transition border flex flex-col";
    card.innerHTML = `
      <h3 class="font-semibold text-lg mb-2">${headline}</h3>
      <p class="text-sm flex-grow text-gray-700">${summary}</p>
      <a href="${url}" target="_blank" rel="noopener" class="mt-3 inline-flex items-center text-indigo-600 hover:underline text-sm">
        Read more
        <svg xmlns="http://www.w3.org/2000/svg" class="ml-1 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>`;
    container.appendChild(card);
  });
}