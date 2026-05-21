// ============================================================
// Sermons & Updates Page JavaScript
// ============================================================

let currentFilter = 'all';
let allPosts = [];
let offset = 0;
const LIMIT = 12;
let totalPosts = 0;

// Filter tabs
document.querySelectorAll('.filter-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentFilter = tab.dataset.filter;
    offset = 0;
    loadPosts(true);
  });
});

// Search
let searchTimer;
document.getElementById('search-input')?.addEventListener('input', (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => filterBySearch(e.target.value), 300);
});

function filterBySearch(query) {
  if (!query.trim()) {
    renderPosts(allPosts);
    return;
  }
  const q = query.toLowerCase();
  const filtered = allPosts.filter(p =>
    (p.title || '').toLowerCase().includes(q) ||
    (p.excerpt || '').toLowerCase().includes(q) ||
    (p.scripture || '').toLowerCase().includes(q) ||
    (p.speaker || '').toLowerCase().includes(q)
  );
  renderPosts(filtered, true);
}

function renderPosts(posts, isSearch = false) {
  const grid = document.getElementById('sermons-grid');
  const loadMoreWrapper = document.getElementById('load-more-wrapper');
  if (!posts.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <div class="empty-icon">${currentFilter === 'sermon' ? '📖' : '📰'}</div>
      <h3>${isSearch ? 'No results found' : 'No posts yet'}</h3>
      <p>${isSearch ? 'Try a different search term' : 'Check back soon!'}</p>
    </div>`;
    if (loadMoreWrapper) loadMoreWrapper.style.display = 'none';
    return;
  }
  grid.innerHTML = posts.map(p => buildCard(p)).join('');
  if (loadMoreWrapper) loadMoreWrapper.style.display = !isSearch && offset < totalPosts ? 'block' : 'none';
}

async function loadPosts(reset = false) {
  const grid = document.getElementById('sermons-grid');
  if (reset) { grid.innerHTML = '<div class="loading-container"><div class="spinner"></div></div>'; offset = 0; allPosts = []; }

  try {
    let posts = [], total = 0;
    if (currentFilter === 'all') {
      const [sermons, updates] = await Promise.all([
        fetch(`/api/posts?type=sermon&limit=6&offset=${offset}`).then(r => r.json()),
        fetch(`/api/posts?type=update&limit=6&offset=${offset}`).then(r => r.json()),
      ]);
      posts = [...(sermons.posts || []), ...(updates.posts || [])].sort((a, b) => b.created_at.localeCompare(a.created_at));
      total = (sermons.total || 0) + (updates.total || 0);
    } else {
      const data = await fetch(`/api/posts?type=${currentFilter}&limit=${LIMIT}&offset=${offset}`).then(r => r.json());
      posts = data.posts || [];
      total = data.total || 0;
    }

    totalPosts = total;
    offset += posts.length;
    if (reset) allPosts = posts;
    else allPosts = [...allPosts, ...posts];

    renderPosts(allPosts);
  } catch(e) {
    const grid = document.getElementById('sermons-grid');
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">⚠️</div><h3>Failed to load</h3></div>';
  }
}

document.getElementById('load-more')?.addEventListener('click', () => loadPosts(false));

loadPosts(true);
