// Hymnal public page
let allHymns = [];
let activeId  = null;
let searchTimer = null;

async function loadHymns(search = '') {
  const url = `/api/hymns?limit=600${search ? '&search=' + encodeURIComponent(search) : ''}`;
  const data = await fetch(url).then(r => r.json()).catch(() => ({ hymns: [] }));
  allHymns = data.hymns || [];
  renderList();
  document.getElementById('hymnal-count').textContent =
    `${allHymns.length} hymn${allHymns.length !== 1 ? 's' : ''}`;
}

function renderList() {
  const el = document.getElementById('hymn-list');
  if (!allHymns.length) {
    el.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-light);">No hymns found.</div>';
    return;
  }
  el.innerHTML = allHymns.map(h => `
    <div class="hymn-list-item${h.id === activeId ? ' active' : ''}" data-id="${h.id}" onclick="selectHymn(${h.id})">
      <span class="hymn-num">${h.number}</span>
      <span class="hymn-name">${escHtml(h.title)}</span>
    </div>
  `).join('');
}

function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

async function selectHymn(id) {
  activeId = id;
  renderList();

  const detail = document.getElementById('hymnal-detail');
  detail.innerHTML = '<div style="text-align:center;padding:60px;"><div class="spinner" style="margin:0 auto;"></div></div>';
  detail.classList.add('visible');

  const hymn = await fetch(`/api/hymns/${id}`).then(r => r.json()).catch(() => null);
  if (!hymn) {
    detail.innerHTML = '<p style="padding:40px;color:var(--text-light);">Failed to load hymn.</p>';
    return;
  }

  detail.innerHTML = `
    <span class="mobile-back" onclick="closeMobileDetail()"><i class="fa fa-arrow-left"></i> Back to list</span>
    <div class="hymn-detail-number">Hymn No. ${hymn.number}</div>
    <div class="hymn-detail-title">${escHtml(hymn.title)}</div>
    ${hymn.author ? `<div class="hymn-detail-author"><i class="fa fa-pen-nib" style="margin-right:6px;"></i>${escHtml(hymn.author)}</div>` : ''}
    ${hymn.lyrics
      ? `<div class="hymn-lyrics">${escHtml(hymn.lyrics)}</div>`
      : `<div class="hymn-no-lyrics"><i class="fa fa-info-circle" style="margin-right:6px;"></i>Lyrics not yet added for this hymn.</div>`
    }
  `;

  // Scroll detail panel to top
  detail.scrollTop = 0;
}

function closeMobileDetail() {
  document.getElementById('hymnal-detail').classList.remove('visible');
}

// Search with debounce
document.getElementById('hymn-search').addEventListener('input', function () {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => loadHymns(this.value.trim()), 300);
});

// Init
loadHymns();
