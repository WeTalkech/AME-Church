// ============================================================
// Post Editor JavaScript
// ============================================================

let postId = null;
let selectedType = null;

// Detect edit mode from URL: /admin/posts/:id/edit
const pathMatch = window.location.pathname.match(/\/admin\/posts\/(\d+)\/edit/);
if (pathMatch) postId = parseInt(pathMatch[1]);

// Detect pre-selected type from query param: ?type=sermon
const typeParam = new URLSearchParams(location.search).get('type');

// ---- Init ----
(async () => {
  await initAdminNav();

  if (postId) {
    // Edit mode
    document.getElementById('editor-title').textContent = 'Edit Post';
    document.getElementById('publish-btn').innerHTML = '<i class="fa fa-save"></i> Update';
    document.getElementById('draft-btn').innerHTML = '<i class="fa fa-file"></i> Save as Draft';
    document.getElementById('delete-wrapper').style.display = 'block';
    loadPost();
  } else {
    // New post mode
    if (typeParam) setType(typeParam);
  }
})();

async function loadPost() {
  try {
    const post = await fetch(`/api/admin/posts/${postId}`).then(r => r.json());
    setType(post.type);
    document.getElementById('title').value       = post.title || '';
    document.getElementById('slug').value        = post.slug  || '';
    document.getElementById('excerpt').value     = post.excerpt || '';
    document.getElementById('body').innerHTML    = post.body  || '';
    document.getElementById('image_url').value   = post.image_url || '';
    document.getElementById('published').checked = !!post.published;
    document.getElementById('featured').checked  = !!post.featured;

    // Sermon fields
    if (document.getElementById('scripture'))   document.getElementById('scripture').value   = post.scripture || '';
    if (document.getElementById('speaker'))     document.getElementById('speaker').value     = post.speaker   || '';
    if (document.getElementById('video_url'))   document.getElementById('video_url').value   = post.video_url || '';

    // Event fields
    if (document.getElementById('is_recurring')) {
      const isRecurring = post.type === 'event' && !!post.recurrence;
      document.getElementById('is_recurring').checked = isRecurring;
      toggleRecurring();
      if (isRecurring) document.getElementById('recurrence').value = post.recurrence;
    }

    // Sermon recurring
    if (document.getElementById('sermon_is_recurring')) {
      const isRecurring = post.type === 'sermon' && !!post.recurrence;
      document.getElementById('sermon_is_recurring').checked = isRecurring;
      toggleSermonRecurring();
      if (isRecurring) document.getElementById('sermon_recurrence').value = post.recurrence;
    }
    if (document.getElementById('event_date'))     document.getElementById('event_date').value     = post.event_date     || '';
    if (document.getElementById('event_time'))     document.getElementById('event_time').value     = post.event_time     || '';
    if (document.getElementById('event_location')) document.getElementById('event_location').value = post.event_location || '';

    // Gallery fields
    if (post.type === 'gallery') {
      await loadEventsDropdown();
      if (post.linked_event_id) document.getElementById('linked_event_id').value = post.linked_event_id;
    }

    // Image preview
    if (post.image_url) previewImage(post.image_url);
  } catch(e) {
    showAlert('Failed to load post.', 'error');
  }
}

// ---- Recurring event toggle ----
function toggleRecurring() {
  const isRecurring = document.getElementById('is_recurring').checked;
  document.getElementById('event_date').style.display  = isRecurring ? 'none' : 'block';
  document.getElementById('recurrence').style.display  = isRecurring ? 'block' : 'none';
  if (!isRecurring) document.getElementById('recurrence').value = '';
  else document.getElementById('event_date').value = '';
}

// ---- Recurring sermon toggle ----
function toggleSermonRecurring() {
  const isRecurring = document.getElementById('sermon_is_recurring').checked;
  document.getElementById('sermon_recurrence').style.display = isRecurring ? 'block' : 'none';
  if (!isRecurring) document.getElementById('sermon_recurrence').value = '';
}

// ---- Type selection ----
let eventsLoaded = false;

function setType(type) {
  selectedType = type;
  document.querySelectorAll('.type-btn').forEach(btn => {
    btn.classList.toggle('btn-primary', btn.dataset.type === type);
    btn.classList.toggle('btn-ghost',   btn.dataset.type !== type);
  });

  // Show/hide conditional fields
  document.getElementById('fields-sermon').classList.toggle('show', type === 'sermon');
  document.getElementById('fields-event').classList.toggle('show',  type === 'event');
  document.getElementById('fields-gallery').classList.toggle('show', type === 'gallery');

  if (type === 'gallery' && !eventsLoaded) loadEventsDropdown();
}

async function loadEventsDropdown() {
  eventsLoaded = true;
  const sel = document.getElementById('linked_event_id');
  try {
    const data = await fetch('/api/admin/posts?type=event&limit=100').then(r => r.json());
    const events = (data.posts || []).sort((a, b) => (b.event_date || b.created_at).localeCompare(a.event_date || a.created_at));
    const current = sel.value;
    // Keep the placeholder option, then add events
    sel.innerHTML = '<option value="">— No event —</option>';
    events.forEach(e => {
      const opt = document.createElement('option');
      opt.value = e.id;
      opt.textContent = `${e.title}${e.event_date ? ' (' + e.event_date + ')' : ''}`;
      sel.appendChild(opt);
    });
    if (current) sel.value = current;
  } catch(e) { /* dropdown stays with placeholder */ }
}

// ---- Slug auto-generation ----
function autoSlug() {
  if (postId) return; // Don't change slug when editing
  const title = document.getElementById('title').value;
  const slug = title.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  document.getElementById('slug').value = slug;
}

// ---- Rich text toolbar ----
function fmt(command, value = null) {
  document.execCommand(command, false, value);
  document.getElementById('body').focus();
}
function fmtBlock(tag) {
  document.execCommand('formatBlock', false, tag);
  document.getElementById('body').focus();
}
function insertLink() {
  const url = prompt('Enter URL:');
  if (url) document.execCommand('createLink', false, url);
  document.getElementById('body').focus();
}

// ---- Image preview ----
document.getElementById('image_url')?.addEventListener('input', (e) => previewImage(e.target.value));
function previewImage(url) {
  const preview = document.getElementById('image-preview');
  const img = document.getElementById('preview-img');
  if (!url) { preview.style.display = 'none'; return; }
  img.src = url;
  img.onerror = () => { preview.style.display = 'none'; };
  img.onload  = () => { preview.style.display = 'block'; };
}

// ---- Image upload ----
async function uploadImage(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  const label = document.getElementById('upload-label-text');
  const icon  = document.getElementById('upload-icon');
  const hint  = document.getElementById('upload-hint');

  label.textContent = 'Uploading...';
  icon.className = 'fa fa-spinner fa-spin';
  hint.textContent = '';

  const formData = new FormData();
  formData.append('image', file);

  try {
    const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Upload failed');
    }
    const data = await res.json();
    document.getElementById('image_url').value = data.url;
    previewImage(data.url);
    label.textContent = file.name;
    icon.className = 'fa fa-check';
    hint.textContent = 'Image uploaded successfully.';
  } catch(e) {
    label.textContent = 'Choose image (JPG, PNG, GIF, WebP)';
    icon.className = 'fa fa-upload';
    hint.textContent = `Error: ${e.message}`;
  }
  // Reset input so the same file can be re-selected if needed
  input.value = '';
}

function clearImage() {
  document.getElementById('image_url').value = '';
  document.getElementById('image-preview').style.display = 'none';
  document.getElementById('preview-img').src = '';
  document.getElementById('upload-label-text').textContent = 'Choose image (JPG, PNG, GIF, WebP)';
  document.getElementById('upload-icon').className = 'fa fa-upload';
  document.getElementById('upload-hint').textContent = 'Max 10 MB. Uploads are saved to the server.';
}

// ---- Save post ----
async function savePost(published) {
  if (!selectedType) { showAlert('Please select a post type.', 'error'); return; }
  const title = document.getElementById('title').value.trim();
  const body  = document.getElementById('body').innerHTML.trim();
  if (!title) { showAlert('Title is required.', 'error'); return; }
  if (!body || body === '<br>' || body === '') { showAlert('Content is required.', 'error'); return; }

  const payload = {
    type:    selectedType,
    title,
    body,
    excerpt:        document.getElementById('excerpt').value.trim()        || null,
    image_url:      document.getElementById('image_url').value.trim()      || null,
    published:      published,
    featured:       document.getElementById('featured').checked ? 1 : 0,
    scripture:      document.getElementById('scripture')?.value.trim()     || null,
    speaker:        document.getElementById('speaker')?.value.trim()       || null,
    video_url:      document.getElementById('video_url')?.value.trim()     || null,
    recurrence:      selectedType === 'sermon'
      ? (document.getElementById('sermon_is_recurring')?.checked ? (document.getElementById('sermon_recurrence')?.value || null) : null)
      : (document.getElementById('is_recurring')?.checked ? (document.getElementById('recurrence')?.value || null) : null),
    event_date:      document.getElementById('is_recurring')?.checked ? null : (document.getElementById('event_date')?.value || null),
    event_time:      document.getElementById('event_time')?.value.trim()     || null,
    event_location:  document.getElementById('event_location')?.value.trim() || null,
    linked_event_id: document.getElementById('linked_event_id')?.value || null,
  };

  const publishBtn = document.getElementById('publish-btn');
  const draftBtn   = document.getElementById('draft-btn');
  publishBtn.disabled = true;
  draftBtn.disabled   = true;

  try {
    let res;
    if (postId) {
      res = await fetch(`/api/admin/posts/${postId}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    } else {
      res = await fetch('/api/admin/posts', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    }

    if (res.ok) {
      const data = await res.json();
      if (!postId && data.id) {
        // Redirect to edit page after create
        window.location.href = `/admin/posts/${data.id}/edit`;
        return;
      }
      showAlert(published ? '✓ Post published!' : '✓ Saved as draft!', 'success');
    } else {
      const err = await res.json();
      showAlert(err.error || 'Failed to save post.', 'error');
    }
  } catch(e) {
    showAlert('Connection error. Please try again.', 'error');
  }

  publishBtn.disabled = false;
  draftBtn.disabled   = false;
}

async function deleteCurrentPost() {
  if (!postId) return;
  if (!confirm('Delete this post permanently? This cannot be undone.')) return;
  const res = await fetch(`/api/admin/posts/${postId}`, { method: 'DELETE' });
  if (res.ok) window.location.href = '/admin/posts';
  else showAlert('Failed to delete post.', 'error');
}

function showAlert(msg, type) {
  const el = document.getElementById('alert');
  el.textContent = msg;
  el.className = `alert alert-${type}`;
  el.style.display = 'flex';
  if (type === 'success') setTimeout(() => el.style.display = 'none', 4000);
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
