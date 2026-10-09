module.exports = {
  timeout: process.env.JOB_TIMEOUT || '2s',
  retries: 3,
  minNode: '>=18.0.0',
};
