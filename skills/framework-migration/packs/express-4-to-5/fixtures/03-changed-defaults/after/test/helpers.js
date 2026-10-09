const http = require('node:http');
const app = require('../src/app');

// Starts the app on a free port. request() resolves to { status, headers, body }.
function start() {
  const server = app.listen(0);
  const { port } = server.address();
  const request = (method, path, { headers = {}, body } = {}) =>
    new Promise((resolve, reject) => {
      const req = http.request({ host: '127.0.0.1', port, method, path, headers }, (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
      });
      req.on('error', reject);
      if (body !== undefined) req.write(body);
      req.end();
    });
  return { server, request };
}

module.exports = { start };
