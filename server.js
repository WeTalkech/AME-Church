require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const compression = require('compression');
const helmet = require('helmet');
const { supabase, seedDatabase } = require('./database');
const SupabaseStore = require('./lib/supabase-store');

const isProd = process.env.NODE_ENV === 'production';

const PORT = (() => {
  const p = parseInt(process.env.PORT || '3000', 10);
  if (isNaN(p) || p < 1 || p > 65535) throw new Error(`Invalid PORT: ${process.env.PORT}`);
  return p;
})();

const SESSION_SECRET = process.env.SESSION_SECRET || (isProd
  ? (() => { throw new Error('SESSION_SECRET env var must be set in production'); })()
  : 'dev-only-secret-change-in-production');

const app = express();

app.set('trust proxy', 1);
app.use(compression());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  store: new SupabaseStore(supabase),
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 8,
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd
  }
}));

// Static files
app.use('/static', express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Routes
const authRouter  = require('./routes/auth');
const postsRouter = require('./routes/posts');
const usersRouter = require('./routes/users');
const hymnsRouter = require('./routes/hymns');
const pagesRouter = require('./routes/pages');

app.use('/api/auth',         authRouter);
app.use('/api/admin/users',  usersRouter);
app.use('/api',              postsRouter);
app.use('/api',              hymnsRouter);
app.use('/',                 pagesRouter);

// 404 handler
app.use((req, res) => {
  if (req.accepts('html')) {
    res.status(404).sendFile(path.join(__dirname, 'views', '404.html'));
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server after seeding
seedDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`A.M.E. ST. Joseph Church website running at http://localhost:${PORT}`);
      console.log(`Admin panel: http://localhost:${PORT}/admin/login`);
    });
  })
  .catch(err => {
    console.error('Failed to seed database:', err.message);
    process.exit(1);
  });
