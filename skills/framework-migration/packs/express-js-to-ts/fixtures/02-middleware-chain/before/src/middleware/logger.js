const stats = { requests: 0 };

function logger(req, res, next) {
  stats.requests += 1;
  res.set('X-Request-Count', String(stats.requests));
  next();
}

module.exports = { logger, stats };
