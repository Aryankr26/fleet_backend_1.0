const jwt = require('jsonwebtoken');
const secret = process.env.JWT_SECRET || 'dev_secret';
const sign = (payload, opts = {}) => jwt.sign(payload, secret, { expiresIn: '7d', ...opts });
const verify = (token) => {
  try { return jwt.verify(token, secret); } catch (e) { return null; }
};
module.exports = { sign, verify };