// api/news.js - Vercel Serverless Function
export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
    // Handle OPTIONS request for CORS
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
  
    // Only allow POST requests
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  
    try {
      const { prompt } = req.body;
  
      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }
  
      const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
      
      if (!OPENAI_API_KEY) {
        return res.status(500).json({ error: 'OpenAI API key not configured' });
      }
  
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
  
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model,
      
          /* 👉 1. web-search settings */
          web_search_options: {
            user_location: {
              type: "approximate",
              country: "US",
              city: "New York",
              region: "NY",
              timezone: "America/New_York",
            },
            search_context_size: "medium",
          },
      
          /* 👉 2. FORCE pure-JSON output */
          response_format: { type: "json_object" },
      
          /* 👉 3. Prompts */
          messages: [
            {
              role: "system",
              content:
                "Return ONLY valid JSON – an array of objects with keys headline, summary, url, paywall (boolean). No markdown.",
            },
            { role: "user", content: prompt },
          ],
        }),
      });
  
      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }
  
      const data = await response.json();
      let content = data.choices?.[0]?.message?.content ?? "[]";
      
      // Clean up code blocks from OpenAI response
      content = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  
      res.status(200).json({ content });
    } catch (error) {
      console.error('Error in news API:', error);
      res.status(500).json({ 
        error: 'Failed to fetch news',
        details: error.message 
      });
    }
  }