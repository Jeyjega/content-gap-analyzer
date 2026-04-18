const ytdl = require('@distube/ytdl-core');

async function run() {
  const url = "https://www.youtube.com/watch?v=FjHGZj2IjBs"; // The Oprah video
  try {
    const info = await ytdl.getInfo(url);
    const audioFormats = ytdl.filterFormats(info.formats, "audioonly");
    console.log("Audio formats:", audioFormats.map(f => `${f.itag} ${f.audioBitrate} ${f.mimeType}`));
    
    // Test filter options directly
    const formatH = ytdl.chooseFormat(info.formats, { filter: "audioonly", quality: "highestaudio" });
    console.log("chosen highestaudio:", formatH && formatH.itag);
  } catch (err) {
    console.error("Error:", err.message);
  }
}
run();
