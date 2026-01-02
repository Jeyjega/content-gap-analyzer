// lib/chunkText.js
export function chunkText(text, maxChars = 1000, overlap = 200) {
  if (!text) return [];
  const normalized = text.replace(/\s+/g, " ").trim();
  const chunks = [];
  let start = 0;
  while (start < normalized.length) {
    let end = start + maxChars;
    if (end >= normalized.length) {
      chunks.push(normalized.slice(start).trim());
      break;
    }
    // Try to avoid cutting mid-word — find last space before end
    let slice = normalized.slice(start, end);
    const lastSpace = slice.lastIndexOf(" ");
    if (lastSpace > Math.floor(maxChars * 0.7)) {
      end = start + lastSpace;
      slice = normalized.slice(start, end);
    }
    chunks.push(slice.trim());
    start = end - overlap; // overlap for context
    if (start < 0) start = 0;
  }
  return chunks.map((c) => c.trim()).filter(Boolean);
}
