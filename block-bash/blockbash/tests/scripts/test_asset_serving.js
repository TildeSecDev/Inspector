// test_asset_serving.js
// This script checks if the backend is serving the RPG assets correctly.
// It tries to fetch logic.js and validate.js and logs the result.

const http = require('http');

const BASE_URL = 'http://localhost:3002'; // Change port if your backend uses a different one
const ASSETS = [
  '/ws/workshop_asset?lesson_id=rpg&file=logic.js',
  '/ws/workshop_asset?lesson_id=rpg&file=validate.js',
  '/ws/workshop_asset?lesson_id=rpg&file=style.css',
];

function checkAsset(path) {
  return new Promise((resolve) => {
    http.get(BASE_URL + path, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          path,
          status: res.statusCode,
          contentType: res.headers['content-type'],
          length: data.length
        });
      });
    }).on('error', (e) => {
      resolve({ path, error: e.message });
    });
  });
}

(async () => {
  for (const asset of ASSETS) {
    const result = await checkAsset(asset);
    if (result.error) {
      console.error(`[ERROR] ${asset}: ${result.error}`);
    } else {
      console.log(`[OK] ${asset}: status ${result.status}, type ${result.contentType}, length ${result.length}`);
    }
  }
})();
