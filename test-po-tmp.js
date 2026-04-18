const { generate } = require('youtube-po-token-generator');

async function test() {
  process.chdir('/tmp');
  console.log('Generating in /tmp...');
  const t = await generate();
  console.log('Result:', t);
}
test().catch(console.error);
