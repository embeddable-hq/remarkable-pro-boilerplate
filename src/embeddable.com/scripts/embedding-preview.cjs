const http = require('http');
const fs = require('fs');
const html = fs.readFileSync(__dirname + '/embedding-preview.html').toString();
const PORT = 8080;

http
  .createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  })
  .listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
  });
