function requireAuth(req, res, next) {
  if (req.session && req.session.userId) return next();
  return res.redirect('/admin/login');
}

function requireAuthAPI(req, res, next) {
  if (req.session && req.session.userId) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

function requireSuperAdmin(req, res, next) {
  if (req.session && req.session.userId && req.session.role === 'super_admin') return next();
  return res.status(403).json({ error: 'Super admin access required' });
}

function requireSuperAdminPage(req, res, next) {
  if (!req.session?.userId) return res.redirect('/admin/login');
  if (req.session.role !== 'super_admin') return res.redirect('/admin/dashboard');
  return next();
}

module.exports = { requireAuth, requireAuthAPI, requireSuperAdmin, requireSuperAdminPage };
