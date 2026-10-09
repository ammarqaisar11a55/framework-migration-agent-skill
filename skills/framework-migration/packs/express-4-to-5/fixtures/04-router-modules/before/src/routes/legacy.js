const express = require('express');

const router = express.Router();

// Old URLs move permanently to the versioned API.
router.get('/items/:id', (req, res) => {
  res.redirect(`/api/v1/items/${req.params.id}`, 301);
});

router.get('/home', (req, res) => {
  res.redirect('back');
});

module.exports = router;
