const buckets = new Map();
module.exports = (req, res, next) => {
  if (!['/child-login', '/teacher-login', '/admin-login', '/child-register', '/lookup-student', '/recovery-begin', '/recovery-complete', '/teacher-recovery-begin', '/teacher-recovery-complete'].includes(req.path)) return next();
  const now = Date.now(), windowMs = 15 * 60 * 1000;
  for (const [key, bucket] of buckets) if (bucket.until <= now) buckets.delete(key);
  const keys = ['ip:' + req.ip];
  const identity = req.body?.identifier || req.body?.email || req.body?.phone || req.body?.childId || req.body?.token;
  if (typeof identity === 'string') keys.push('account:' + identity.trim().toLowerCase().slice(0, 200));
  for (const key of keys) {
    const bucket = buckets.get(key) || { count: 0, until: now + windowMs };
    if (bucket.count >= (key.startsWith('ip:') ? 100 : 15)) {
      res.set('Retry-After', String(Math.ceil((bucket.until - now) / 1000)));
      return res.status(429).json({ success: false, message: 'Bạn thử quá nhiều lần. Vui lòng thử lại sau.' });
    }
  }
  if (buckets.size > 20000) return res.status(429).json({ success: false, message: 'Please try again later.' });
  for (const key of keys) {
    const bucket = buckets.get(key) || { count: 0, until: now + windowMs };
    bucket.count++; buckets.set(key, bucket);
  }
  next();
};
