// ============================================================
// Homepage JavaScript
// ============================================================

const scriptures = [
  { text: '"For I know the plans I have for you, declares the LORD, plans to prosper you and not to harm you, plans to give you hope and a future."', ref: 'Jeremiah 29:11' },
  { text: '"I can do all things through Christ who strengthens me."', ref: 'Philippians 4:13' },
  { text: '"The LORD is my shepherd; I shall not want."', ref: 'Psalm 23:1' },
  { text: '"Trust in the LORD with all your heart and lean not on your own understanding."', ref: 'Proverbs 3:5' },
  { text: '"Be strong and courageous. Do not be afraid; do not be discouraged, for the LORD your God will be with you wherever you go."', ref: 'Joshua 1:9' },
  { text: '"For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life."', ref: 'John 3:16' },
  { text: '"But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles."', ref: 'Isaiah 40:31' },
];

// Rotate scripture
const s = scriptures[Math.floor(Math.random() * scriptures.length)];
const stEl = document.getElementById('scripture-text');
const srEl = document.getElementById('scripture-ref');
if (stEl) stEl.textContent = s.text;
if (srEl) srEl.textContent = `— ${s.ref}`;

// Load featured sermon
async function loadFeaturedSermon() {
  const el = document.getElementById('featured-sermon');
  if (!el) return;
  try {
    const data = await fetch('/api/posts?type=sermon&featured=1&limit=1').then(r => r.json());
    const post = data.posts[0];
    if (!post) {
      const allSermons = await fetch('/api/posts?type=sermon&limit=1').then(r => r.json());
      if (!allSermons.posts.length) {
        el.innerHTML = '<div class="empty-state"><div class="empty-icon">📖</div><h3>No sermons posted yet</h3></div>';
        return;
      }
      renderSermon(el, allSermons.posts[0]);
      return;
    }
    renderSermon(el, post);
  } catch(e) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">📖</div><h3>Unable to load sermon</h3></div>';
  }
}

function renderSermon(el, post) {
  el.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center;max-width:1000px;margin:0 auto;">
      <div>
        <span class="card-type sermon">Sermon</span>
        <h3 style="color:var(--purple-dark);font-size:1.75rem;margin:12px 0 16px;">${escHtml(post.title)}</h3>
        ${post.scripture ? `<p style="color:var(--gold-dark);font-style:italic;margin-bottom:12px;"><i class="fa fa-book"></i> ${escHtml(post.scripture)}</p>` : ''}
        ${post.speaker  ? `<p style="color:var(--text-light);margin-bottom:16px;"><i class="fa fa-microphone"></i> ${escHtml(post.speaker)}</p>` : ''}
        <p style="color:var(--text-mid);line-height:1.8;margin-bottom:24px;">${escHtml(post.excerpt || '')}</p>
        <button class="btn btn-purple" onclick="openPost('${encodeURIComponent(post.slug)}')">
          ${post.video_url ? '<i class="fa fa-play"></i> Watch Sermon' : '<i class="fa fa-book-open"></i> Read Sermon'}
        </button>
      </div>
      <div style="background:linear-gradient(135deg,var(--purple-mid),var(--purple-dark));border-radius:var(--radius-xl);min-height:320px;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.3);font-size:5rem;overflow:hidden;">
        ${post.image_url ? `<img src="${escHtml(post.image_url)}" alt="" style="width:100%;height:100%;object-fit:cover;" />` : '📖'}
      </div>
    </div>`;
}

// Load upcoming events
async function loadUpcomingEvents() {
  const el = document.getElementById('upcoming-events');
  if (!el) return;
  try {
    const data = await fetch('/api/posts?type=event&limit=3').then(r => r.json());
    if (!data.posts.length) {
      el.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><div class="empty-icon">🗓️</div><h3>No upcoming events</h3></div>';
      return;
    }
    el.innerHTML = data.posts.map(p => buildCard(p)).join('');
  } catch(e) {
    el.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><div class="empty-icon">🗓️</div><h3>Unable to load events</h3></div>';
  }
}

// Load latest updates
async function loadLatestUpdates() {
  const el = document.getElementById('latest-updates');
  if (!el) return;
  try {
    const data = await fetch('/api/posts?type=update&limit=2').then(r => r.json());
    if (!data.posts.length) {
      el.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><div class="empty-icon">📰</div><h3>No updates yet</h3></div>';
      return;
    }
    el.innerHTML = data.posts.map(p => buildCard(p)).join('');
  } catch(e) {
    el.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><div class="empty-icon">📰</div><h3>Unable to load updates</h3></div>';
  }
}

loadFeaturedSermon();
loadUpcomingEvents();
loadLatestUpdates();
