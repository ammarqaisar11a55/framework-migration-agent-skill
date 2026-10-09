const express = require('express');

const router = express.Router();
const files = ['logo.svg', 'css/site.css'];

router.get('/', (req, res) => {
  res.json({ files });
});

// Any nested path below the mount point.
router.get('/{*splat}', (req, res) => {
  const name = req.path.slice(1);
  if (!files.includes(name)) return res.status(404).json({ error: `No asset ${name}` });
  res.json({ asset: name });
});

module.exports = router;
