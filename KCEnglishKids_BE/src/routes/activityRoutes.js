const express = require('express');
const router = express.Router();
const { getActivityById } = require('../controllers/activityController');

router.get('/:id', getActivityById);

module.exports = router;
