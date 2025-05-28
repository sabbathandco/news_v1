/* FreshWave News – curates upbeat stories via OpenAI web‑search preview model */
import { format } from "https://cdn.skypack.dev/date-fns";

// Use environment variable for API key, with fallback for local development
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "your-local-key-here";
const model = "gpt-4o-search-preview";
const location = {
  type: "approximate",
  approximate: {
    country: "US",
    city: "New York",
    region: "NY",
    timezone: "America/New_York"
  }
};

const sections = [
    {
        id: "design",
        prompt:
          "Find 4 recent design industry news from the last 3 days - UX trends, design tools, product launches, creative projects. " +
          "Include design agency news, tool releases, company announcements, design trend reports, creative campaigns. " +
          "AVOID Wikipedia. Focus on design publications and industry news sites. " +
          "For each: headline, summary, direct article URL. " +
          "IMPORTANT: Return ONLY valid JSON without code blocks: [{\"headline\":\"...\",\"summary\":\"...\",\"url\":\"...\",\"paywall\":false}]"
      },
      {
        id: "wellness",
        prompt:
          "Find 5 positive wellness, fitness, mental health, or nutrition stories from the last 3 days. " +
          "Include health studies, fitness trends, wellness product launches, mental health awareness, nutrition research, surf/yoga news. " +
          "AVOID Wikipedia. Focus on wellness publications, fitness magazines, and health news sites. " +
          "For each: headline, summary, direct article URL. " +
          "IMPORTANT: Return ONLY valid JSON without code blocks: [{\"headline\":\"...\",\"summary\":\"...\",\"url\":\"...\",\"paywall\":false}]"
      },
  {
    id: "things-to-do",
    prompt:
      "Find 5 NYC events, restaurant openings, cultural activities, or entertainment news from the last 3 days. " +
      "Include new restaurant openings, cultural events, nightlife news, food trends, entertainment venues. " +
      "AVOID Wikipedia. Focus on NYC lifestyle publications, event listings, food blogs, entertainment news. " +
      "For each: headline, summary, direct article URL. " +
      "IMPORTANT: Return ONLY valid JSON without code blocks: [{\"headline\":\"...\",\"summary\":\"...\",\"url\":\"...\",\"paywall\":false}]"
  },
  {
    id: "local-nyc",
    prompt:
      "Find 5 positive NYC local news stories from the last 3 days - city developments, community news, local business, transportation updates, housing news. " +
      "Include positive developments, community initiatives, local business success, infrastructure improvements. " +
      "AVOID Trump, Israel, Russia, Wikipedia, and national politics. Focus on NYC-specific local news sources. " +
      "For each: headline, summary, direct article URL. " +
      "IMPORTANT: Return ONLY valid JSON without code blocks: [{\"headline\":\"...\",\"summary\":\"...\",\"url\":\"...\",\"paywall\":false}]"
  },
  {
    id: "tech-ai",
    prompt:
      "Find 5 encouraging tech & AI news from the last 3 days - product launches, startup funding, AI breakthroughs, tech company news. " +
      "Include software releases, hardware announcements, AI research, startup news, tech industry developments. " +
      "AVOID Trump, Israel, Russia, Wikipedia. Focus on tech publications, startup news, AI research outlets. " +
      "For each: headline, summary, direct article URL. " +
      "IMPORTANT: Return ONLY valid JSON without code blocks: [{\"headline\":\"...\",\"summary\":\"...\",\"url\":\"...\",\"paywall\":false}]"
  },
  {
    id: "entertainment",
    prompt:
      "Find 4 entertainment & music news from the last 3 days - album releases, movie announcements, streaming news, celebrity projects. " +
      "Include music releases, film/TV announcements, streaming platform news, entertainment industry developments. " +
      "AVOID Wikipedia. Focus on entertainment publications, music blogs, film industry news. " +
      "For each: headline, summary, direct article URL. " +
      "IMPORTANT: Return ONLY valid JSON without code blocks: [{\"headline\":\"...\",\"summary\":\"...\",\"url\":\"...\",\"paywall\":false}]"
  },
  {
    id: "top-stories",
    prompt:
      "Find 6 positive international news stories from the last 3 days - science breakthroughs, environmental progress, economic developments, international cooperation, health advances, technology innovations. " +
      "Include discoveries, policy wins, diplomatic progress, humanitarian efforts, medical breakthroughs, climate solutions. " +
      "AVOID Trump, Israel, Russia, Wikipedia, and negative news. Focus on uplifting, constructive global developments. " +
      "Sources: Reuters, AP News, BBC World, Guardian World, CNN International, positive news outlets. " +
      "For each: headline, summary, direct article URL (complete, not truncated). " +
      "CRITICAL: Return as a JSON ARRAY: [{\"headline\":\"...\",\"summary\":\"...\",\"url\":\"...\",\"paywall\":false}]"
  },
  {
    id: "style-art",
    prompt:
      "Find 4 fashion, art, or cultural news from the last 3 days - fashion brand launches, art exhibition openings, cultural events, style trends, museum announcements, gallery news, fashion week updates. " +
      "Include luxury fashion, contemporary art, cultural institutions, designer collaborations, art fairs, museum exhibitions. " +
      "AVOID Wikipedia. Sources: Vogue, Harper's Bazaar, Artforum, Wallpaper, WWD, Dezeen, BoF, Artnet News. " +
      "For each: headline, summary, direct article URL (complete, not truncated). " +
      "CRITICAL: Return as a JSON ARRAY: [{\"headline\":\"...\",\"summary\":\"...\",\"url\":\"...\",\"paywall\":false}]"
  }
];

let loadedArticles = new Set(); // Track loaded articles to prevent duplicates

document.addEventListener("DOMContentLoaded", () => {
  // Check if API key is available
  if (!OPENAI_API_KEY || OPENAI_API_KEY === "your-local-key-here") {
    console.error("OpenAI API key not found. Please set the OPENAI_API_KEY environment variable.");
    document.querySelectorAll("[data-feed]").forEach(el => {
      el.innerHTML = '<p class="text-red-600">API key not configured. Please check your environment variables.</p>';
    });
    return;
  }

  loadAllNews();
  document.getElementById("refresh").addEventListener("click", () => {
    clearAll();
    loadedArticles.clear(); // Clear tracking when refreshing
    loadAllNews();
  });
  document.getElementById("more-news").addEventListener("click", () => {
    loadMoreNews();
  });
  
  // Add individual section load more buttons
  sections.forEach(section => {
    const button = document.getElementById(`more-${section.id}`);
    if (button) {
      button.addEventListener("click", () => {
        loadMoreForSection(section);
      });
    }
  });
  
  document.getElementById("year").textContent = new Date().getFullYear();
});

// Enhanced link validation system with stricter checks
async function validateLink(url) {
  // Quick validation checks first
  if (!url || url === "#" || url.length < 10) {
    return false;
  }
  
  // Block problematic domains explicitly
  const blockedDomains = [
    'wikipedia.org',
    'hospitalitydesign.com', // Known to return 404s
    'localhost',
    '127.0.0.1',
    'example.com',
    'test.com'
  ];
  
  if (blockedDomains.some(domain => url.toLowerCase().includes(domain))) {
    console.warn('Blocked domain detected:', url);
    return false;
  }
  
  // Basic URL format validation
  try {
    const urlObj = new URL(url);
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return false;
    }
  } catch {
    return false;
  }
  
  // Check for obviously invalid patterns
  const invalidPatterns = [
    /192\.168\./, /10\./, /placeholder/i,
    /^https?:\/\/[^\/]*\/$/, // Just domain root with no path
    /123456789/, /987654321/, // Fake URL patterns
    /404|not.found|page.not.found/i, // Error page indicators
    /sorry.+doesn.t.exist/i, // Error page text
  ];
  
  if (invalidPatterns.some(pattern => pattern.test(url))) {
    console.warn('Invalid URL pattern detected:', url);
    return false;
  }
  
  // Prioritize known good design domains
  const trustedDesignDomains = [
    'smashingmagazine.com', 'creativebloq.com', 'uxcollective.cc',
    'printmag.com', 'artforum.com', 'commarts.com', 'creativeboom.com',
    'creativereview.co.uk', 'uxdesignweekly.com', 'designernews.co',
    'blog.behance.net', 'dribbble.com', 'blog.adobe.com',
    'fastcompany.com', 'core77.com', 'designboom.com', 'dezeen.com'
  ];
  
  if (trustedDesignDomains.some(domain => url.includes(domain))) {
    return true;
  }
  
  // For other domains, do a lightweight check
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    
    const response = await fetch(url, { 
      method: 'HEAD', 
      mode: 'no-cors',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return true;
  } catch (error) {
    // Be more conservative - reject clear network errors
    if (error.name === 'AbortError' || error.message.includes('fetch')) {
      console.warn('Network validation failed for URL:', url);
      return false;
    }
    return true; // Still give benefit of doubt for CORS
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

function isPaywallSite(url) {
  const paywallDomains = [
    'nytimes.com', 'wsj.com', 'washingtonpost.com', 'ft.com', 'financialtimes.com', 'economist.com',
    'newyorker.com', 'theatlantic.com', 'wired.com', 'bloomberg.com', 'reuters.com',
    'apnews.com', 'latimes.com', 'chicagotribune.com', 'bostonglobe.com',
    'seattletimes.com', 'denverpost.com', 'sfgate.com', 'mercurynews.com'
  ];
  
  return paywallDomains.some(domain => url.toLowerCase().includes(domain));
}

// Helper function to copy URL to clipboard
function copyToClipboard(url, button) {
  navigator.clipboard.writeText(url).then(() => {
    const originalText = button.innerHTML;
    button.innerHTML = `✓ Copied!`;
    button.classList.add('text-green-600');
    
    setTimeout(() => {
      button.innerHTML = originalText;
      button.classList.remove('text-green-600');
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy: ', err);
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = url;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    
    const originalText = button.innerHTML;
    button.innerHTML = `✓ Copied!`;
    setTimeout(() => {
      button.innerHTML = originalText;
    }, 2000);
  });
}

function clearAll() {
  document.querySelectorAll("[data-feed]").forEach(el => (el.innerHTML = ""));
}

async function loadAllNews() {
  for (const section of sections) {
    await loadSection(section);
  }
  document.getElementById("updated").textContent = format(new Date(), "PPpp");
  
  // Show the "More News" button after initial load
  document.getElementById("more-news").style.display = "block";
}

async function loadMoreForSection(section) {
  const button = document.getElementById(`more-${section.id}`);
  const originalText = button.textContent;
  
  button.textContent = "Loading...";
  button.disabled = true;
  
  await loadSection(section, true); // Pass true for "more news" mode
  
  button.textContent = originalText;
  button.disabled = false;
}

async function loadMoreNews() {
  const button = document.getElementById("more-news");
  button.textContent = "Loading more news...";
  button.disabled = true;
  
  for (const section of sections) {
    await loadSection(section, true); // Pass true for "more news" mode
  }
  
  button.textContent = "Load More News (All Sections)";
  button.disabled = false;
  document.getElementById("updated").textContent = format(new Date(), "PPpp");
}

async function loadSection({ id, prompt }, isMoreNews = false) {
  const feed = document.querySelector(`#${id} [data-feed]`);
  if (!feed) return;
  
  // Don't show loading state for "more news" - just append
  if (!isMoreNews) {
    feed.innerHTML = '<p class="text-gray-500">Loading...</p>';
  }
  
  // Modify prompt for more news to request different articles
  const modifiedPrompt = isMoreNews ? 
    prompt + " IMPORTANT: Provide DIFFERENT articles than previous requests. Vary your sources and topics within the category." :
    prompt;
  
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model,
        web_search_options: {
          user_location: location,
          search_context_size: "medium"
        },
        messages: [
          { role: "user", content: modifiedPrompt }
        ]
      })
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content ?? "[]";
    
    console.log(`Raw response for ${id}:`, raw); // Debug log
    
    // Use three-pass JSON validator instead of basic parsing
    let items = validateAndParseJSON(raw, id);
    
    // Additional validation: check links and filter invalid ones
    const validatedItems = [];
    for (const item of items) {
      const isValidLink = await validateLink(item.url);
      if (isValidLink) {
        validatedItems.push(item);
      } else {
        console.warn(`Invalid link detected for ${id}:`, item.url);
        // Still include item but mark URL as invalid
        validatedItems.push({
          ...item,
          url: "#",
          summary: item.summary + " (Original link unavailable)"
        });
      }
    }

    // Clear loading state only for initial load
    if (!isMoreNews) {
      feed.innerHTML = "";
    }

    // Validate and display items
    if (validatedItems.length === 0) {
      if (!isMoreNews) {
        feed.innerHTML = '<p class="text-gray-500">No stories found for this section.</p>';
      }
      return;
    }

    // Filter out duplicate articles
    const newItems = validatedItems.filter(item => {
      const url = item.url || item.link || "#";
      const headline = item.headline || item.title || "";
      const key = `${url}-${headline}`.toLowerCase();
      
      if (loadedArticles.has(key)) {
        return false; // Skip duplicate
      }
      loadedArticles.add(key);
      return true;
    });

    newItems.forEach(item => {
      // Validate item structure
      if (!item || typeof item !== 'object') {
        console.warn(`Invalid item in ${id}:`, item);
        return;
      }

      const headline = item.headline || item.title || "Untitled Story";
      const summary = item.summary || item.description || "No summary available.";
      const url = item.url || item.link || "#";

      const card = document.createElement("article");
      card.className = "bg-white p-4 rounded-2xl shadow hover:shadow-lg transition border flex flex-col";
      card.innerHTML = `
        <h3 class="font-semibold text-lg mb-2">${headline}</h3>
        <p class="text-sm flex-grow text-gray-700">${summary}</p>
        <a href="${url}" target="_blank" rel="noopener" class="mt-3 inline-flex items-center text-indigo-600 hover:underline text-sm">
          Read more
          <svg xmlns="http://www.w3.org/2000/svg" class="ml-1 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>`;
      feed.appendChild(card);
    });

  } catch (err) {
    console.error("Error fetching section", id, err);
    feed.innerHTML = '<p class="text-red-600">Failed to load news — please try again later.</p>';
  }
}