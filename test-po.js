const { generate } = require('youtube-po-token-generator');

async function test() {
  console.log('Generating...');
  const t = await generate();
  console.log('Result:', t);
}
test().catch(console.error);
