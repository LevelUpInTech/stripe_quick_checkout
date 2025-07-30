const http = require('http');

http.createServer((req, res) => {
  res.write('Node is alive ✅');
  res.end();
}).listen(3000, () => {
  console.log('🟢 Test server running on http://localhost:3000');
});
