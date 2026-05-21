// ============================================================
// Gallery Page JavaScript — grid + lightbox
// ============================================================

let allPhotos = [];
let visiblePhotos = [];
let lightboxIndex = 0;
let offset = 0;
const LIMIT = 18;
let total = 0;

// Detect ?event=<slug> URL param
const eventSlug = new URLSearchParams(location.search).get('event');
let eventId = null; // resolved from slug on init

async function initGallery() {
  if (eventSlug) {
    try {
      const eventPost = await fetch(`/api/posts/${encodeURIComponent(eventSlug)}`).then(r => r.json());
      if (eventPost && eventPost.id) {
        eventId = eventPost.id;
        // Update page title and banner
        const titleEl = document.getElementById('gallery-page-title');
        const subEl   = document.getElementById('gallery-page-sub');
        const banner  = document.getElementById('event-banner');
        const bannerText = document.getElementById('event-banner-text');
        if (titleEl) titleEl.textContent = 'Event Photos';
        if (subEl)   subEl.textContent   = eventPost.title;
        if (banner)  { banner.style.display = 'flex'; }
        if (bannerText) bannerText.textContent = `Photos from: ${eventPost.title}`;
        document.title = `${eventPost.title} — Gallery`;
      }
    } catch(e) { /* fall back to full gallery */ }
  }
  loadPhotos(true);
}

async function loadPhotos(reset = false) {
  const grid = document.getElementById('gallery-grid');
  const emptyState = document.getElementById('empty-state');
  const loadMoreWrapper = document.getElementById('load-more-wrapper');

  if (reset) {
    grid.innerHTML = '<div class="loading-container"><div class="spinner"></div></div>';
    offset = 0;
    allPhotos = [];
  }

  try {
    const eventParam = eventId ? `&event_id=${eventId}` : '';
    const data = await fetch(`/api/posts?type=gallery&limit=${LIMIT}&offset=${offset}${eventParam}`).then(r => r.json());
    const photos = data.posts || [];
    total = data.total || 0;
    offset += photos.length;

    allPhotos = reset ? photos : [...allPhotos, ...photos];
    visiblePhotos = allPhotos;

    renderGrid(visiblePhotos);

    const countEl = document.getElementById('photo-count');
    if (countEl) countEl.textContent = total ? `${total} photo${total !== 1 ? 's' : ''}` : '';

    loadMoreWrapper.style.display = offset < total ? 'block' : 'none';

    if (!allPhotos.length) {
      grid.style.display = 'none';
      emptyState.style.display = 'block';
      if (eventId) {
        emptyState.querySelector('p').textContent = 'No photos have been uploaded for this event yet.';
      }
    } else {
      grid.style.display = 'grid';
      emptyState.style.display = 'none';
    }
  } catch(e) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">⚠️</div><h3>Failed to load photos</h3></div>';
  }
}

function renderGrid(photos) {
  const grid = document.getElementById('gallery-grid');
  if (!photos.length) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🔍</div><h3>No photos match your search</h3></div>';
    return;
  }
  grid.innerHTML = photos.map((photo, i) => `
    <div class="gallery-item" onclick="openLightbox(${i})" tabindex="0" onkeydown="if(event.key==='Enter')openLightbox(${i})">
      <div class="gallery-img-wrap">
        ${photo.image_url
          ? `<img src="${escHtml(photo.image_url)}" alt="${escHtml(photo.title)}" loading="lazy" />`
          : `<div class="gallery-placeholder"><i class="fa fa-image"></i></div>`}
        <div class="gallery-overlay">
          <i class="fa fa-expand gallery-zoom-icon"></i>
        </div>
      </div>
      ${photo.title || photo.excerpt ? `
        <div class="gallery-caption">
          ${photo.title ? `<div class="gallery-caption-title">${escHtml(photo.title)}</div>` : ''}
          ${photo.excerpt ? `<div class="gallery-caption-text">${escHtml(photo.excerpt)}</div>` : ''}
        </div>` : ''}
    </div>`).join('');
}

// ---- Search ----
let searchTimer;
document.getElementById('search-input')?.addEventListener('input', (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    const q = e.target.value.toLowerCase().trim();
    if (!q) {
      visiblePhotos = allPhotos;
    } else {
      visiblePhotos = allPhotos.filter(p =>
        (p.title || '').toLowerCase().includes(q) ||
        (p.excerpt || '').toLowerCase().includes(q)
      );
    }
    renderGrid(visiblePhotos);
  }, 250);
});

// ---- Lightbox ----
function openLightbox(index) {
  lightboxIndex = index;
  showLightboxPhoto();
  document.getElementById('lightbox').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  document.getElementById('lightbox').style.display = 'none';
  document.body.style.overflow = '';
}

function lightboxNav(dir) {
  lightboxIndex = (lightboxIndex + dir + visiblePhotos.length) % visiblePhotos.length;
  showLightboxPhoto();
}

function showLightboxPhoto() {
  const photo = visiblePhotos[lightboxIndex];
  if (!photo) return;
  const img = document.getElementById('lightbox-img');
  img.src = '';
  img.classList.add('loading');
  img.onload = () => img.classList.remove('loading');
  img.src = photo.image_url || '';
  img.alt = photo.title || '';
  document.getElementById('lightbox-title').textContent   = photo.title   || '';
  document.getElementById('lightbox-caption').textContent = photo.excerpt || '';
  document.getElementById('lightbox-counter').textContent = `${lightboxIndex + 1} / ${visiblePhotos.length}`;

  // Show/hide nav arrows
  document.querySelector('.lightbox-prev').style.display = visiblePhotos.length > 1 ? 'flex' : 'none';
  document.querySelector('.lightbox-next').style.display = visiblePhotos.length > 1 ? 'flex' : 'none';
}

// Keyboard nav
document.addEventListener('keydown', (e) => {
  if (document.getElementById('lightbox').style.display !== 'flex') return;
  if (e.key === 'ArrowLeft')  lightboxNav(-1);
  if (e.key === 'ArrowRight') lightboxNav(1);
  if (e.key === 'Escape')     closeLightbox();
});

document.getElementById('load-more')?.addEventListener('click', () => loadPhotos(false));

initGallery();
