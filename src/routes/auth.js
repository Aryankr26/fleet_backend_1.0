const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../prismaClient');
const { sign } = require('../utils/jwt');

const router = express.Router();

// Signup with role
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email & password required' });
    
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'User already exists' });
    
    const hash = await bcrypt.hash(password, 10);
    const userRole = ['owner', 'supervisor', 'driver', 'admin'].includes(role) ? role : 'owner';
    
    const user = await prisma.user.create({ 
      data: { email, password: hash, name, role: userRole } 
    });
    
    const token = sign({ id: user.id, email: user.email, role: user.role });
    res.json({ 
      token, 
      user: { id: user.id, email: user.email, name: user.name, role: user.role } 
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login with role
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email & password required' });
    
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    
    // If role is specified, check if user has that role
    if (role && user.role !== role && user.role !== 'admin') {
      return res.status(403).json({ error: `You don't have ${role} access` });
    }
    
    const token = sign({ id: user.id, email: user.email, role: user.role });
    res.json({ 
      token, 
      user: { id: user.id, email: user.email, name: user.name, role: user.role } 
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user profile
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    
    const { verify } = require('../utils/jwt');
    const token = authHeader.split(' ')[1];
    const payload = verify(token);
    if (!payload) return res.status(401).json({ error: 'Invalid token' });
    
    const user = await prisma.user.findUnique({ 
      where: { id: payload.id },
      select: { id: true, email: true, name: true, role: true, createdAt: true }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    res.json({ user });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;