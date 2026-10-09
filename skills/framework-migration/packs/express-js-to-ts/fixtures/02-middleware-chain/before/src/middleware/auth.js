const API_KEYS = new Map([['key-ada', 'Ada'], ['key-grace', 'Grace']]);

exports.requireApiKey = (req, res, next) => {
  const key = req.get('x-api-key');
  if (!key || !API_KEYS.has(key)) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  res.locals.apiKey = key;
  next();
};

exports.loadUser = function (req, res, next) {
  res.locals.user = { name: API_KEYS.get(res.locals.apiKey) };
  next();
};
