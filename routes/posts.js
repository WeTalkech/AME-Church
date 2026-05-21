const express = require('express');
const slugify = require('slugify');
const path = require('path');
const multer = require('multer');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const { supabase } = require('../database');
const { requireAuthAPI, requireSuperAdmin } = require('../middleware/auth');
const router = express.Router();

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many messages sent. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Multer — memory storage (files go to Supabase Storage, not disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only image files are allowed (jpg, png, gif, webp)'));
  }
});

// Email transporter
const mailer = process.env.SMTP_HOST ? nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
}) : null;

async function generateSlug(title) {
  let base = slugify(title, { lower: true, strict: true });
  let slug = base;
  let i = 1;
  while (true) {
    const { data } = await supabase.from('church_posts').select('id').eq('slug', slug).limit(1);
    if (!data?.length) break;
    slug = `${base}-${i++}`;
  }
  return slug;
}

// ============================================================
// PUBLIC ENDPOINTS
// ============================================================

// GET /api/posts
router.get('/posts', async (req, res) => {
  const { type, featured, event_id, limit = 10, offset = 0 } = req.query;

  let query = supabase
    .from('church_posts')
    .select('id, type, title, slug, excerpt, image_url, event_date, event_time, event_location, scripture, speaker, video_url, recurrence, featured, linked_event_id, created_at', { count: 'exact' })
    .eq('published', 1)
    .order('created_at', { ascending: false })
    .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

  if (type)     query = query.eq('type', type);
  if (featured !== undefined) query = query.eq('featured', parseInt(featured));
  if (event_id) {
    const eid = parseInt(event_id);
    if (!isNaN(eid)) query = query.eq('linked_event_id', eid);
  }

  const { data: posts, count, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ posts: posts || [], total: count || 0 });
});

// GET /api/posts/:slug
router.get('/posts/:slug', async (req, res) => {
  const { data: post, error } = await supabase
    .from('church_posts')
    .select('*')
    .eq('slug', req.params.slug)
    .eq('published', 1)
    .single();
  if (error || !post) return res.status(404).json({ error: 'Post not found' });
  res.json(post);
});

// GET /api/public/settings
router.get('/public/settings', async (req, res) => {
  const { data: rows } = await supabase.from('church_site_settings').select('key, value');
  const all = {};
  for (const row of (rows || [])) all[row.key] = row.value;
  const { church_name, tagline, address, phone, email,
          service_sunday_school, service_sunday_morning, service_wednesday,
          facebook_url, youtube_url } = all;
  res.json({ church_name, tagline, address, phone, email,
             service_sunday_school, service_sunday_morning, service_wednesday,
             facebook_url, youtube_url });
});

// POST /api/contact
router.post('/contact', contactLimiter, async (req, res) => {
  const { name, email, phone, subject, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required' });
  }

  const { error } = await supabase.from('church_contact_messages').insert({ name, email, phone: phone || null, subject: subject || null, message });
  if (error) return res.status(500).json({ error: error.message });

  if (mailer && process.env.NOTIFY_EMAIL) {
    const { data: setting } = await supabase.from('church_site_settings').select('value').eq('key', 'church_name').single();
    const churchName = setting?.value || 'Church';
    mailer.sendMail({
      from: `"${churchName} Website" <${process.env.SMTP_USER}>`,
      to: process.env.NOTIFY_EMAIL,
      subject: `New contact form message: ${subject || '(no subject)'}`,
      text: `Name: ${name}\nEmail: ${email}\nPhone: ${phone || '-'}\n\n${message}`,
    }).catch(err => console.error('Email notification failed:', err.message));
  }

  res.json({ success: true, message: 'Your message has been received. We will be in touch soon!' });
});

// ============================================================
// ADMIN ENDPOINTS
// ============================================================

// GET /api/admin/stats
router.get('/admin/stats', requireAuthAPI, async (req, res) => {
  const { data: stats, error } = await supabase.rpc('get_post_stats');
  if (error) return res.status(500).json({ error: error.message });
  const { count: unread } = await supabase.from('church_contact_messages').select('*', { count: 'exact', head: true }).eq('read', 0);
  res.json({ ...stats?.[0], unread_messages: unread || 0 });
});

// GET /api/admin/posts
router.get('/admin/posts', requireAuthAPI, async (req, res) => {
  const { type, limit = 50, offset = 0 } = req.query;

  let query = supabase
    .from('church_posts')
    .select('id, type, title, slug, excerpt, published, featured, event_date, created_at, updated_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

  if (type) query = query.eq('type', type);

  const { data: posts, count, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ posts: posts || [], total: count || 0 });
});

// POST /api/admin/posts
router.post('/admin/posts', requireAuthAPI, async (req, res) => {
  const { type, title, body, excerpt, image_url, event_date, event_time, event_location,
          scripture, speaker, video_url, recurrence, linked_event_id, published, featured } = req.body;

  const validTypes = ['sermon', 'event', 'update', 'program', 'gallery'];
  if (!type || !validTypes.includes(type)) return res.status(400).json({ error: `Type must be one of: ${validTypes.join(', ')}` });
  if (!title || !body) return res.status(400).json({ error: 'Title and body are required' });

  const slug = await generateSlug(title);
  const { data, error } = await supabase.from('church_posts').insert({
    type, title, slug, body,
    excerpt: excerpt || null, image_url: image_url || null,
    event_date: event_date || null, event_time: event_time || null, event_location: event_location || null,
    scripture: scripture || null, speaker: speaker || null, video_url: video_url || null,
    recurrence: recurrence || null,
    linked_event_id: linked_event_id ? parseInt(linked_event_id) : null,
    published: published === false || published === 0 ? 0 : 1,
    featured: featured ? 1 : 0,
  }).select('id, slug').single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ id: data.id, slug: data.slug });
});

// GET /api/admin/posts/:id
router.get('/admin/posts/:id', requireAuthAPI, async (req, res) => {
  const { data: post, error } = await supabase.from('church_posts').select('*').eq('id', req.params.id).single();
  if (error || !post) return res.status(404).json({ error: 'Post not found' });
  res.json(post);
});

// PUT /api/admin/posts/:id
router.put('/admin/posts/:id', requireAuthAPI, async (req, res) => {
  const { title, body, excerpt, image_url, event_date, event_time, event_location,
          scripture, speaker, video_url, recurrence, linked_event_id, published, featured } = req.body;

  const { data: existing } = await supabase.from('church_posts').select('*').eq('id', req.params.id).single();
  if (!existing) return res.status(404).json({ error: 'Post not found' });

  const { error } = await supabase.from('church_posts').update({
    title:           title          ?? existing.title,
    body:            body           ?? existing.body,
    excerpt:         excerpt        ?? existing.excerpt,
    image_url:       image_url      ?? existing.image_url,
    event_date:      event_date     ?? existing.event_date,
    event_time:      event_time     ?? existing.event_time,
    event_location:  event_location ?? existing.event_location,
    scripture:       scripture      ?? existing.scripture,
    speaker:         speaker        ?? existing.speaker,
    video_url:       video_url      ?? existing.video_url,
    recurrence:      recurrence     !== undefined ? (recurrence || null)                         : existing.recurrence,
    linked_event_id: linked_event_id !== undefined ? (linked_event_id ? parseInt(linked_event_id) : null) : existing.linked_event_id,
    published:       published      !== undefined ? (published  ? 1 : 0)                        : existing.published,
    featured:        featured       !== undefined ? (featured   ? 1 : 0)                        : existing.featured,
    updated_at:      new Date().toISOString(),
  }).eq('id', req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// DELETE /api/admin/posts/:id
router.delete('/admin/posts/:id', requireAuthAPI, async (req, res) => {
  const { error } = await supabase.from('church_posts').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// GET /api/admin/settings
router.get('/admin/settings', requireSuperAdmin, async (req, res) => {
  const { data: rows } = await supabase.from('church_site_settings').select('key, value');
  const settings = {};
  for (const row of (rows || [])) settings[row.key] = row.value;
  res.json(settings);
});

// PUT /api/admin/settings
router.put('/admin/settings', requireSuperAdmin, async (req, res) => {
  const updates = Object.entries(req.body).map(([key, value]) => ({ key, value: String(value) }));
  const { error } = await supabase.from('church_site_settings').upsert(updates, { onConflict: 'key' });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// GET /api/admin/messages
router.get('/admin/messages', requireAuthAPI, async (req, res) => {
  const { data, error } = await supabase
    .from('church_contact_messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// PUT /api/admin/messages/:id/read
router.put('/admin/messages/:id/read', requireAuthAPI, async (req, res) => {
  await supabase.from('church_contact_messages').update({ read: 1 }).eq('id', req.params.id);
  res.json({ success: true });
});

// DELETE /api/admin/messages/:id
router.delete('/admin/messages/:id', requireAuthAPI, async (req, res) => {
  await supabase.from('church_contact_messages').delete().eq('id', req.params.id);
  res.json({ success: true });
});

// POST /api/admin/upload — upload to Supabase Storage
router.post('/admin/upload', requireAuthAPI, (req, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const ext = path.extname(req.file.originalname).toLowerCase();
    const filename = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('church-uploads')
      .upload(filename, req.file.buffer, { contentType: req.file.mimetype, upsert: false });

    if (uploadError) return res.status(500).json({ error: uploadError.message });

    const { data: { publicUrl } } = supabase.storage.from('church-uploads').getPublicUrl(filename);
    res.json({ url: publicUrl });
  });
});

// POST /api/admin/change-password
router.post('/admin/change-password', requireAuthAPI, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) return res.status(400).json({ error: 'Both current and new password are required' });
  if (new_password.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' });

  const { data: user } = await supabase.from('church_users').select('*').eq('id', req.session.userId).single();
  if (!user || !(await bcrypt.compare(current_password, user.password))) return res.status(401).json({ error: 'Current password is incorrect' });

  const hash = await bcrypt.hash(new_password, 10);
  await supabase.from('church_users').update({ password: hash }).eq('id', req.session.userId);
  res.json({ success: true });
});

module.exports = router;
