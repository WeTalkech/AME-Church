const express = require('express');
const bcrypt = require('bcrypt');
const { supabase } = require('../database');
const { requireSuperAdmin } = require('../middleware/auth');
const router = express.Router();

router.use(requireSuperAdmin);

// GET /api/admin/users
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('church_users')
    .select('id, username, role, created_at')
    .order('created_at', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/admin/users
router.post('/', async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });
  if (!['super_admin', 'editor'].includes(role)) return res.status(400).json({ error: 'Role must be super_admin or editor' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  const { data: existing } = await supabase.from('church_users').select('id').ilike('username', username).limit(1);
  if (existing?.length) return res.status(409).json({ error: 'Username already exists' });

  const hash = await bcrypt.hash(password, 10);
  const { data, error } = await supabase.from('church_users').insert({ username, password: hash, role }).select('id, username, role').single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// PUT /api/admin/users/:id/password
router.put('/:id/password', async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  const { data: user } = await supabase.from('church_users').select('id').eq('id', req.params.id).single();
  if (!user) return res.status(404).json({ error: 'User not found' });

  const hash = await bcrypt.hash(password, 10);
  const { error } = await supabase.from('church_users').update({ password: hash }).eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// PUT /api/admin/users/:id/role
router.put('/:id/role', async (req, res) => {
  const { role } = req.body;
  if (!['super_admin', 'editor'].includes(role)) return res.status(400).json({ error: 'Role must be super_admin or editor' });

  if (role === 'editor') {
    const { data: target } = await supabase.from('church_users').select('role').eq('id', req.params.id).single();
    if (target?.role === 'super_admin') {
      const { count } = await supabase.from('church_users').select('*', { count: 'exact', head: true }).eq('role', 'super_admin');
      if (count <= 1) return res.status(400).json({ error: 'Cannot demote the last Super Admin' });
    }
  }

  const { error } = await supabase.from('church_users').update({ role }).eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// DELETE /api/admin/users/:id
router.delete('/:id', async (req, res) => {
  if (parseInt(req.params.id) === req.session.userId) {
    return res.status(400).json({ error: 'You cannot delete your own account' });
  }

  const { data: target } = await supabase.from('church_users').select('role').eq('id', req.params.id).single();
  if (!target) return res.status(404).json({ error: 'User not found' });

  if (target.role === 'super_admin') {
    const { count } = await supabase.from('church_users').select('*', { count: 'exact', head: true }).eq('role', 'super_admin');
    if (count <= 1) return res.status(400).json({ error: 'Cannot delete the last Super Admin' });
  }

  const { error } = await supabase.from('church_users').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

module.exports = router;
