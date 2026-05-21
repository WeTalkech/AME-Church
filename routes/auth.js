const express = require('express');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const { supabase } = require('../database');
const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const { data: users } = await supabase
    .from('church_users')
    .select('*')
    .ilike('username', username)
    .limit(1);

  const user = users?.[0];
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  req.session.userId   = user.id;
  req.session.username = user.username;
  req.session.role     = user.role;

  if (req.accepts('json') && !req.accepts('html')) {
    return res.json({ success: true });
  }
  res.redirect('/admin/dashboard');
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

// GET /api/auth/status
router.get('/status', (req, res) => {
  res.json({
    loggedIn: !!(req.session && req.session.userId),
    username: req.session?.username || null,
    role:     req.session?.role     || null,
  });
});

module.exports = router;
