// pages/api/extract-webtext.js

/**
 * Basic web scraper that fetches HTML and extracts main text content.
 * Uses regex to strip tags, scripts, and styles.
 */
export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { url } = req.body || {};
    if (!url) {
        return res.status(400).json({ error: "Missing URL" });
    }

    try {
        // 1. Fetch HTML with robust headers
        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
                "Cache-Control": "no-cache",
                "Pragma": "no-cache",
                "Sec-Fetch-Dest": "document",
                "Sec-Fetch-Mode": "navigate",
                "Sec-Fetch-Site": "none",
                "Sec-Fetch-User": "?1",
                "Upgrade-Insecure-Requests": "1"
            },
        });

        if (!response.ok) {
            if (response.status === 403 || response.status === 401) {
                return res.status(403).json({ error: "Access Denied", details: "This website protects its content from automated access." });
            }
            throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
        }

        const html = await response.text();

        // 2. Extract Title
        // Try <title> tag
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        let title = titleMatch ? titleMatch[1].trim() : "";

        if (!title) {
            // Try h1
            const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
            if (h1Match) title = h1Match[1].trim();
        }

        if (!title) {
            title = new URL(url).hostname;
        }

        // 3. Extract & Clean Text
        let dirty = html;

        // Remove scripts and styles
        dirty = dirty.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
        dirty = dirty.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
        dirty = dirty.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, "");
        dirty = dirty.replace(/<header\b[^>]*>[\s\S]*?<\/header>/gi, "");
        dirty = dirty.replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, "");
        dirty = dirty.replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, "");

        // Simple tag stripping
        let text = dirty.replace(/<[^>]+>/g, " ");

        // Decode HTML entities (basic ones)
        text = text
            .replace(/&nbsp;/g, " ")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'");

        // Clean whitespace
        text = text.replace(/\s+/g, " ").trim();

        // Filter length
        if (text.length < 50) {
            return res.status(400).json({ error: "Could not extract enough readable text from this page." });
        }

        // Truncate if purely massive
        if (text.length > 50000) {
            text = text.slice(0, 50000);
        }

        return res.status(200).json({
            title,
            text,
            url,
        });
    } catch (err) {
        console.error("extract-webtext error:", err);
        return res.status(500).json({ error: "Failed to extract content", details: err.message });
    }
}
