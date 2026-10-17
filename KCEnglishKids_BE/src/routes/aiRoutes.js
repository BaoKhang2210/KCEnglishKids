const express = require('express');
const { protect, authorize } = require('../middlewares/authMiddleware');
const controller = require('../controllers/aiController');

function createRateLimit(limit, { now = Date.now, maxUsers = 10000 } = {}) {
  const buckets = new Map();
  return (req, res, next) => {
    const time = now();
    for (const [key, bucket] of buckets) if (bucket.resetAt <= time) buckets.delete(key);
    const key = String(req.user._id);
    let bucket = buckets.get(key);
    if (!bucket) {
      if (buckets.size >= maxUsers) return res.status(503).json({ success: false, message: 'Assistant is busy. Please try again shortly.' });
      bucket = { count: 0, resetAt: time + 60000 };
      buckets.set(key, bucket);
    }
    if (bucket.count >= limit) {
      res.set('Retry-After', String(Math.max(1, Math.ceil((bucket.resetAt - time) / 1000))));
      return res.status(429).json({ success: false, message: 'Please pause before requesting more suggestions.' });
    }
    bucket.count++;
    next();
  };
}

function createAiRouter(handlers = controller) {
  const router = express.Router();
  router.use(protect);
  router.post('/generate-parent-note', authorize('TEACHER', 'ADMIN'), createRateLimit(10), handlers.generateParentNote);
  router.post('/evaluate-pronunciation', authorize('CHILD', 'TEACHER', 'ADMIN'), createRateLimit(30), handlers.evaluatePronunciation);
  return router;
}
module.exports = createAiRouter();
module.exports.createAiRouter = createAiRouter;
module.exports.createRateLimit = createRateLimit;
