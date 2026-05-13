const https = require('https');

https.get('https://ibb.co/NdqXvv1G', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const match = data.match(/https:\/\/i\.ibb\.co\/[^"']+/);
    if (match) {
      console.log('FOUND URL:', match[0]);
    } else {
      console.log('NO URL FOUND');
    }
  });
}).on('error', err => {
  console.log('Error: ', err.message);
});
