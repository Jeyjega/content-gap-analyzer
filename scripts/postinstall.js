const YtDlpWrap = require('yt-dlp-wrap').default;
const path = require('path');
const fs = require('fs');

// Ensure bin directory exists
const binDir = path.join(__dirname, '..', 'public', 'bin');
if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
}

// Download yt-dlp binary
// We append .exe extension on Windows, though Vercel is Linux usually.
// yt-dlp-wrap handles platform selection for the download URL, but we define the output path.
const binaryName = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
const binaryPath = path.join(binDir, binaryName);

console.log(`Downloading yt-dlp binary to ${binaryPath}...`);

(async () => {
    try {
        await YtDlpWrap.downloadFromGithub(binaryPath);
        console.log('yt-dlp binary downloaded successfully!');

        // Ensure executable permissions on Unix-like systems
        if (process.platform !== 'win32') {
            fs.chmodSync(binaryPath, '755');
        }
    } catch (error) {
        console.error('Failed to download yt-dlp binary:', error);
        process.exit(1);
    }
})();
