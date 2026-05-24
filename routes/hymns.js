const express = require('express');
const { supabase } = require('../database');
const { requireAuthAPI } = require('../middleware/auth');
const router = express.Router();

// ============================================================
// PUBLIC
// ============================================================

// GET /api/hymns?search=&limit=&offset=
router.get('/hymns', async (req, res) => {
  const { search, limit = 50, offset = 0 } = req.query;
  let query = supabase
    .from('church_hymns')
    .select('id, number, title, author', { count: 'exact' })
    .order('number', { ascending: true })
    .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

  if (search) {
    query = query.or(`title.ilike.%${search}%,author.ilike.%${search}%`);
  }

  const { data, count, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ hymns: data || [], total: count || 0 });
});

// GET /api/hymns/:id — full hymn with lyrics
router.get('/hymns/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('church_hymns')
    .select('*')
    .eq('id', req.params.id)
    .single();
  if (error || !data) return res.status(404).json({ error: 'Hymn not found' });
  res.json(data);
});

// ============================================================
// ADMIN
// ============================================================

// GET /api/admin/hymns
router.get('/admin/hymns', requireAuthAPI, async (req, res) => {
  const { search, limit = 100, offset = 0 } = req.query;
  let query = supabase
    .from('church_hymns')
    .select('id, number, title, author, lyrics', { count: 'exact' })
    .order('number', { ascending: true })
    .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

  if (search) query = query.or(`title.ilike.%${search}%,author.ilike.%${search}%`);

  const { data, count, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ hymns: data || [], total: count || 0 });
});

// POST /api/admin/hymns
router.post('/admin/hymns', requireAuthAPI, async (req, res) => {
  const { number, title, author, lyrics } = req.body;
  if (!number || !title) return res.status(400).json({ error: 'Number and title are required' });

  const { data, error } = await supabase
    .from('church_hymns')
    .insert({ number: parseInt(number), title, author: author || null, lyrics: lyrics || null })
    .select('id')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ id: data.id });
});

// PUT /api/admin/hymns/:id
router.put('/admin/hymns/:id', requireAuthAPI, async (req, res) => {
  const { number, title, author, lyrics } = req.body;

  const { data: existing } = await supabase.from('church_hymns').select('*').eq('id', req.params.id).single();
  if (!existing) return res.status(404).json({ error: 'Hymn not found' });

  const { error } = await supabase.from('church_hymns').update({
    number:     number !== undefined ? parseInt(number) : existing.number,
    title:      title  ?? existing.title,
    author:     author !== undefined ? (author || null) : existing.author,
    lyrics:     lyrics !== undefined ? (lyrics || null) : existing.lyrics,
    updated_at: new Date().toISOString(),
  }).eq('id', req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// DELETE /api/admin/hymns/:id
router.delete('/admin/hymns/:id', requireAuthAPI, async (req, res) => {
  const { error } = await supabase.from('church_hymns').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

module.exports = router;
