const app = require('../src/app');

// Starts the app on a free port and returns the base URL for requests.
function start() {
  const server = app.listen(0);
  const address = server.address();
  const port = address && typeof address === 'object' ? address.port : 0;
  return { server, base: `http://127.0.0.1:${port}` };
}

module.exports = { start };
