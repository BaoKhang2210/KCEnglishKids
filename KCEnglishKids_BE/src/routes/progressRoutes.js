const express = require('express');
const router = express.Router();
const { getChildProgress } = require('../controllers/progressController');

router.get('/:id/progress', getChildProgress);

module.exports = router;
