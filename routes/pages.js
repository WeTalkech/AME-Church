const express = require('express');
const path = require('path');
const { supabase } = require('../database');
const { requireAuth, requireSuperAdminPage } = require('../middleware/auth');
const router = express.Router();

const views = (file) => path.join(__dirname, '..', 'views', file);

router.get('/',          (req, res) => res.sendFile(views('index.html')));
router.get('/about',     (req, res) => res.sendFile(views('about.html')));
router.get('/events',    (req, res) => res.sendFile(views('events.html')));
router.get('/sermons',   (req, res) => res.sendFile(views('sermons.html')));
router.get('/contact',   (req, res) => res.sendFile(views('contact.html')));
router.get('/gallery',   (req, res) => res.sendFile(views('gallery.html')));

router.get('/robots.txt', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'robots.txt')));

router.get('/sitemap.xml', async (req, res) => {
  const base = process.env.SITE_URL || `${req.protocol}://${req.get('host')}`;
  const staticPages = ['', '/about', '/events', '/sermons', '/gallery', '/contact'];
  const { data: posts } = await supabase.from('church_posts').select('slug, updated_at').eq('published', 1);

  const urls = [
    ...staticPages.map(p => `  <url><loc>${base}${p}</loc><changefreq>weekly</changefreq></url>`),
    ...(posts || []).map(p => `  <url><loc>${base}/posts/${p.slug}</loc><lastmod>${p.updated_at?.split('T')[0] || ''}</lastmod><changefreq>monthly</changefreq></url>`),
  ];

  res.setHeader('Content-Type', 'application/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`);
});

// Admin pages
router.get('/admin',               requireAuth,           (req, res) => res.redirect('/admin/dashboard'));
router.get('/admin/login',         (req, res) => res.sendFile(views('admin/login.html')));
router.get('/admin/dashboard',     requireAuth,           (req, res) => res.sendFile(views('admin/dashboard.html')));
router.get('/admin/posts',         requireAuth,           (req, res) => res.sendFile(views('admin/posts.html')));
router.get('/admin/posts/new',     requireAuth,           (req, res) => res.sendFile(views('admin/editor.html')));
router.get('/admin/posts/:id/edit',requireAuth,           (req, res) => res.sendFile(views('admin/editor.html')));
router.get('/admin/messages',      requireAuth,           (req, res) => res.sendFile(views('admin/messages.html')));
router.get('/admin/settings',      requireSuperAdminPage, (req, res) => res.sendFile(views('admin/settings.html')));
router.get('/admin/users',         requireSuperAdminPage, (req, res) => res.sendFile(views('admin/users.html')));

module.exports = router;
