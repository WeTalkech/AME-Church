// Admin Hymnal page
let searchTimer = null;
let activeSection = '';

async function loadSections() {
  const data = await fetch('/api/hymn-sections').then(r => r.json()).catch(() => ({ sections: [] }));
  const sections = data.sections || [];
  const dl = document.getElementById('section-options');
  if (dl) dl.innerHTML = sections.map(s => `<option value="${escHtml(s.name)}">`).join('');
  const filter = document.getElementById('section-filter');
  if (filter && sections.length) {
    filter.innerHTML = '<option value="">All categories</option>' +
      sections.map(s => `<option value="${escHtml(s.name)}">${escHtml(s.name)} (${s.count})</option>`).join('');
    filter.style.display = '';
    filter.addEventListener('change', () => {
      activeSection = filter.value;
      loadHymns(document.getElementById('hymn-search').value.trim());
    });
  }
}

async function loadHymns(search = '') {
  const el = document.getElementById('hymn-list');
  el.innerHTML = '<div style="text-align:center;padding:60px;"><div class="spinner" style="margin:0 auto;"></div></div>';

  const params = new URLSearchParams({ limit: '1000' });
  if (search) params.set('search', search);
  if (activeSection) params.set('section', activeSection);
  const url = `/api/admin/hymns?${params}`;
  const data = await fetch(url).then(r => r.json()).catch(() => ({ hymns: [] }));
  const hymns = data.hymns || [];

  document.getElementById('hymn-count').textContent = `${hymns.length} hymn${hymns.length !== 1 ? 's' : ''}`;

  if (!hymns.length) {
    el.innerHTML = `<div style="text-align:center;padding:60px;color:var(--text-light);">
      <div style="font-size:2.5rem;margin-bottom:12px;">🎵</div>
      <p>No hymns found. <button class="btn btn-ghost btn-sm" onclick="openModal()">Add one</button></p>
    </div>`;
    return;
  }

  el.innerHTML = `<table class="admin-table">
    <thead><tr><th style="width:60px;">#</th><th>Title</th><th>Category</th><th>Author</th><th>Lyrics</th><th>Actions</th></tr></thead>
    <tbody>${hymns.map(h => `
      <tr>
        <td style="font-weight:700;color:var(--purple-mid);">${h.number}</td>
        <td style="font-weight:600;color:var(--text-dark);">${escHtml(h.title)}</td>
        <td style="color:var(--text-light);">${escHtml(h.section || 'English')}</td>
        <td style="color:var(--text-light);">${escHtml(h.author || '—')}</td>
        <td>${h.lyrics
          ? '<span class="badge badge-published">Added</span>'
          : '<span class="badge badge-draft">Missing</span>'}</td>
        <td style="display:flex;gap:6px;">
          <button onclick="editHymn(${h.id})" class="btn btn-ghost btn-sm"><i class="fa fa-pen"></i> Edit</button>
          <button onclick="deleteHymn(${h.id}, this)" class="btn btn-danger btn-sm"><i class="fa fa-trash"></i></button>
        </td>
      </tr>`).join('')}
    </tbody>
  </table>`;
}

function openModal(hymn = null) {
  document.getElementById('modal-title').textContent   = hymn ? 'Edit Hymn' : 'Add Hymn';
  document.getElementById('edit-id').value             = hymn ? hymn.id : '';
  document.getElementById('f-number').value            = hymn ? hymn.number : '';
  document.getElementById('f-title').value             = hymn ? hymn.title  : '';
  document.getElementById('f-author').value            = hymn ? (hymn.author || '') : '';
  document.getElementById('f-section').value            = hymn ? (hymn.section || 'English') : (activeSection || 'English');
  document.getElementById('f-lyrics').value            = hymn ? (hymn.lyrics || '') : '';
  document.getElementById('modal-error').style.display = 'none';
  document.getElementById('modal-overlay').classList.add('open');
  document.getElementById('f-number').focus();
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
}

async function editHymn(id) {
  const hymn = await fetch(`/api/hymns/${id}`).then(r => r.json()).catch(() => null);
  if (hymn) openModal(hymn);
}

async function saveHymn() {
  const id     = document.getElementById('edit-id').value;
  const number = document.getElementById('f-number').value.trim();
  const title  = document.getElementById('f-title').value.trim();
  const author = document.getElementById('f-author').value.trim();
  const section = document.getElementById('f-section').value.trim() || 'English';
  const lyrics = document.getElementById('f-lyrics').value.trim();
  const errEl  = document.getElementById('modal-error');

  if (!number || !title) {
    errEl.textContent = 'Hymn number and title are required.';
    errEl.style.display = 'block';
    return;
  }

  const btn = document.getElementById('modal-save-btn');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  const body    = { number: parseInt(number), title, author: author || null, lyrics: lyrics || null, section };
  const url     = id ? `/api/admin/hymns/${id}` : '/api/admin/hymns';
  const method  = id ? 'PUT' : 'POST';

  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  btn.disabled = false;
  btn.textContent = 'Save Hymn';

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    errEl.textContent = err.error || 'Failed to save hymn.';
    errEl.style.display = 'block';
    return;
  }

  closeModal();
  loadHymns(document.getElementById('hymn-search').value.trim());
}

async function deleteHymn(id, btn) {
  if (!confirm('Delete this hymn? This cannot be undone.')) return;
  btn.disabled = true;
  btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i>';
  const res = await fetch(`/api/admin/hymns/${id}`, { method: 'DELETE' });
  if (res.ok) {
    btn.closest('tr').remove();
  } else {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa fa-trash"></i>';
    alert('Failed to delete hymn.');
  }
}

// Close modal on overlay click
document.getElementById('modal-overlay').addEventListener('click', function (e) {
  if (e.target === this) closeModal();
});

// Search
document.getElementById('hymn-search').addEventListener('input', function () {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => loadHymns(this.value.trim()), 300);
});

// Init
(async () => {
  await initAdminNav();
  await loadSections();
  loadHymns();
})();
