const { Router } = require('express');
const auth = require('../middleware/auth');

const router = Router();

router.get('/', auth.requireApiKey, auth.loadUser, (req, res) => {
  res.json({ user: res.locals.user });
});

module.exports = router;
