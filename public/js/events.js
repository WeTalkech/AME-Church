// ============================================================
// Events & Programs Page JavaScript
// ============================================================

let currentFilter = 'all';
let offset = 0;
const LIMIT = 9;
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

async function loadPosts(reset = false) {
  const grid = document.getElementById('events-grid');
  const loadMoreWrapper = document.getElementById('load-more-wrapper');
  if (reset) { grid.innerHTML = '<div class="loading-container"><div class="spinner"></div></div>'; offset = 0; }

  const typeParam = currentFilter === 'all' ? 'type=event&type=program' : `type=${currentFilter}`;
  // Actually API takes a single type. For 'all', fetch both types.
  let posts = [];
  let total = 0;

  try {
    if (currentFilter === 'all') {
      const [events, programs] = await Promise.all([
        fetch(`/api/posts?type=event&limit=${Math.ceil(LIMIT/2)}&offset=${offset}`).then(r => r.json()),
        fetch(`/api/posts?type=program&limit=${Math.floor(LIMIT/2)}&offset=${offset}`).then(r => r.json()),
      ]);
      posts = [...(events.posts || []), ...(programs.posts || [])].sort((a, b) =>
        (b.event_date || b.created_at).localeCompare(a.event_date || a.created_at)
      );
      total = (events.total || 0) + (programs.total || 0);
    } else {
      const data = await fetch(`/api/posts?type=${currentFilter}&limit=${LIMIT}&offset=${offset}`).then(r => r.json());
      posts = data.posts || [];
      total = data.total || 0;
    }

    totalPosts = total;
    offset += posts.length;

    if (reset) grid.innerHTML = '';

    if (!posts.length && reset) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">🗓️</div>
        <h3>No ${currentFilter === 'all' ? 'events or programs' : currentFilter + 's'} posted yet</h3>
        <p>Check back soon!</p>
      </div>`;
      loadMoreWrapper.style.display = 'none';
      return;
    }

    posts.forEach(p => {
      const div = document.createElement('div');
      div.innerHTML = buildCard(p);
      grid.appendChild(div.firstElementChild);
    });

    loadMoreWrapper.style.display = offset < totalPosts ? 'block' : 'none';
  } catch(e) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">⚠️</div><h3>Failed to load posts</h3></div>';
  }
}

document.getElementById('load-more')?.addEventListener('click', () => loadPosts(false));

loadPosts(true);
