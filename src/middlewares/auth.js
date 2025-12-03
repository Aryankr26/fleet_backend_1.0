const { verify } = require('../utils/jwt');
const prisma = require('../prismaClient');

async function auth(req, res, next) {
  const h = req.headers.authorization;
  if (!h) return res.status(401).json({ error: 'No auth header' });
  const token = h.split(' ')[1];
  const payload = verify(token);
  if (!payload) return res.status(401).json({ error: 'Invalid token' });
  const user = await prisma.user.findUnique({ where: { id: payload.id } });
  if (!user) return res.status(401).json({ error: 'User not found' });
  req.user = user;
  next();
}

module.exports = auth;