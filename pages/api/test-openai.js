// /pages/api/test-openai.js (mock mode)
export default async function handler(req, res) {
  try {
    // A deterministic mock response so you can continue development without calling OpenAI
    const message = "Hello from the Content Gap Analyzer! (mock response — real OpenAI calls are disabled due to quota)";
    return res.status(200).json({ message });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "mock failed", details: err.message });
  }
}

