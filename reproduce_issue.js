// Node 18+ has global fetch
async function run() {
    const baseUrl = 'http://localhost:3000';
    const videoUrl = 'https://youtu.be/PdBWOSa30GA?si=H2Kfq6r-PPzAwMfC';

    try {
        // 1. Transcribe
        console.log(`Transcribing video: ${videoUrl}`);
        const transRes = await fetch(`${baseUrl}/api/transcribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: videoUrl })
        });

        if (!transRes.ok) {
            console.error("Transcription failed:", await transRes.text());
            return;
        }

        const transJson = await transRes.json();
        const transcript = transJson.transcript || transJson.text;
        const metadata = transJson.metadata;
        console.log(`Transcription success: ${transcript.length} chars`);

        // 2. Create Analysis
        console.log("Creating analysis...");
        const createRes = await fetch(`${baseUrl}/api/create-analysis`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                video_url: videoUrl,
                transcript: transcript,
                metadata: metadata,
                title: metadata?.title || 'Debug Real Video',
                type: 'youtube'
            })
        });

        if (!createRes.ok) {
            console.error("Create failed:", await createRes.text());
            return;
        }

        const createJson = await createRes.json();
        const analysisId = createJson.analysisId || createJson.id;
        console.log("Analysis Created, ID:", analysisId);

        // 3. Generate Gap Analysis
        console.log("Generating Gap Analysis (this may take a moment)...");
        const genRes = await fetch(`${baseUrl}/api/generate-gap-analysis`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ analysisId })
        });

        if (!genRes.ok) {
            console.error("Generate failed:", await genRes.text());
            return;
        }

        const genJson = await genRes.json();
        console.log("Generation Complete.");
        console.log("Parsed Keys:", Object.keys(genJson.parsed || {}));
        if (genJson.parsed) {
            console.log("Suggested Script Length:", genJson.parsed.suggested_script ? genJson.parsed.suggested_script.length : 0);
            console.log("Titles:", genJson.parsed.titles);
            console.log("Keywords:", genJson.parsed.keywords);
        } else {
            console.log("Parsed object is null/undefined");
        }
        console.log("Start of Raw Output:", genJson.raw ? genJson.raw.slice(0, 500) : "No raw output");
        console.log("End of Raw Output:", genJson.raw ? genJson.raw.slice(-500) : "No raw output");

    } catch (err) {
        console.error("Script error:", err);
    }
}

run();
