const { randomBytes } = require('node:crypto');
const developmentSecret = randomBytes(48).toString('hex');
function jwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') throw new Error('JWT_SECRET must be configured in production.');
  return developmentSecret;
}
module.exports = { jwtSecret };
