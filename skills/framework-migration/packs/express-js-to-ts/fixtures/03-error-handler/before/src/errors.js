function notFound(req, res, next) {
  next(Object.assign(new Error(`No route for ${req.method} ${req.path}`), { status: 404 }));
}

// Express recognises error handlers by their four arguments, so `next` must stay.
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  res.status(status).json({ error: status === 500 ? 'Internal Server Error' : err.message });
}

module.exports = { notFound, errorHandler };
