const express = require('express');

const router = express.Router();

// Old URLs move permanently to the versioned API.
router.get('/items/:id', (req, res) => {
  res.redirect(301, `/api/v1/items/${req.params.id}`);
});

router.get('/home', (req, res) => {
  res.redirect(req.get("Referrer") || "/");
});

module.exports = router;
