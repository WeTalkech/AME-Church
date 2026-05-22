// ============================================================
// Gallery Page — album grid + photo lightbox
// ============================================================

let allAlbums = [];
let albumPhotos = [];   // photos in the currently open album
let lightboxIndex = 0;
let offset = 0;
const LIMIT = 18;
let total = 0;

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

async function initGallery() {
  loadAlbums(true);
}

async function loadAlbums(reset = false) {
  const grid = document.getElementById('gallery-grid');
  const emptyState = document.getElementById('empty-state');
  const loadMoreWrapper = document.getElementById('load-more-wrapper');

  if (reset) {
    grid.innerHTML = '<div class="loading-container"><div class="spinner"></div></div>';
    offset = 0;
    allAlbums = [];
  }

  try {
    const data = await fetch(`/api/gallery/albums?limit=${LIMIT}&offset=${offset}`).then(r => r.json());
    const albums = data.albums || [];
    total = data.total || 0;
    offset += albums.length;
    allAlbums = reset ? albums : [...allAlbums, ...albums];

    renderAlbumGrid(allAlbums);

    const countEl = document.getElementById('photo-count');
    if (countEl) countEl.textContent = total ? `${total} album${total !== 1 ? 's' : ''}` : '';

    loadMoreWrapper.style.display = offset < total ? 'block' : 'none';

    if (!allAlbums.length) {
      grid.style.display = 'none';
      emptyState.style.display = 'block';
    } else {
      grid.style.display = 'grid';
      emptyState.style.display = 'none';
    }
  } catch {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">⚠️</div><h3>Failed to load gallery</h3></div>';
  }
}

function renderAlbumGrid(albums) {
  const grid = document.getElementById('gallery-grid');
  if (!albums.length) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🔍</div><h3>No albums match your search</h3></div>';
    return;
  }
  grid.innerHTML = albums.map((album, i) => `
    <div class="gallery-item" onclick="openAlbum(${i})" tabindex="0" onkeydown="if(event.key==='Enter')openAlbum(${i})" style="cursor:pointer;">
      <div class="gallery-img-wrap">
        ${album.image_url
          ? `<img src="${escHtml(album.image_url)}" alt="${escHtml(album.title)}" loading="lazy" />`
          : `<div class="gallery-placeholder"><i class="fa fa-images"></i></div>`}
        <div class="gallery-overlay">
          <i class="fa fa-folder-open gallery-zoom-icon"></i>
        </div>
        <div style="position:absolute;bottom:8px;right:8px;background:rgba(0,0,0,0.55);color:#fff;font-size:0.75rem;padding:3px 8px;border-radius:20px;pointer-events:none;">
          <i class="fa fa-image" style="font-size:0.7rem;margin-right:4px;"></i>${album.photo_count} photo${album.photo_count !== 1 ? 's' : ''}
        </div>
      </div>
      <div class="gallery-caption">
        <div class="gallery-caption-title">${escHtml(album.title)}</div>
        ${album.event_title ? `<div class="gallery-caption-text" style="display:flex;align-items:center;gap:5px;"><i class="fa fa-calendar" style="font-size:0.75rem;"></i> ${escHtml(album.event_title)}</div>` : ''}
        ${album.excerpt && !album.event_title ? `<div class="gallery-caption-text">${escHtml(album.excerpt)}</div>` : ''}
      </div>
    </div>`).join('');
}

// ---- Search ----
let searchTimer;
document.getElementById('search-input')?.addEventListener('input', (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    const q = e.target.value.toLowerCase().trim();
    const filtered = q
      ? allAlbums.filter(a => (a.title || '').toLowerCase().includes(q) || (a.excerpt || '').toLowerCase().includes(q))
      : allAlbums;
    renderAlbumGrid(filtered);
  }, 250);
});

// ---- Open album → load photos → lightbox ----
async function openAlbum(index) {
  const album = allAlbums[index];
  if (!album) return;

  try {
    const res  = await fetch(`/api/posts/${encodeURIComponent(album.slug)}/images`);
    const json = await res.json();
    const images = json.images || [];

    if (images.length) {
      albumPhotos = images.map(img => ({ image_url: img.image_url, title: album.title }));
    } else if (album.image_url) {
      albumPhotos = [{ image_url: album.image_url, title: album.title }];
    } else {
      return;
    }
  } catch {
    if (album.image_url) {
      albumPhotos = [{ image_url: album.image_url, title: album.title }];
    } else {
      return;
    }
  }

  lightboxIndex = 0;
  showLightboxPhoto();
  document.getElementById('lightbox').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

// ---- Lightbox ----
function closeLightbox() {
  document.getElementById('lightbox').style.display = 'none';
  document.body.style.overflow = '';
  albumPhotos = [];
}

function lightboxNav(dir) {
  lightboxIndex = (lightboxIndex + dir + albumPhotos.length) % albumPhotos.length;
  showLightboxPhoto();
}

function showLightboxPhoto() {
  const photo = albumPhotos[lightboxIndex];
  if (!photo) return;
  const img = document.getElementById('lightbox-img');
  img.src = '';
  img.classList.add('loading');
  img.onload = () => img.classList.remove('loading');
  img.src = photo.image_url || '';
  img.alt = photo.title || '';
  document.getElementById('lightbox-title').textContent   = photo.title || '';
  document.getElementById('lightbox-caption').textContent = albumPhotos.length > 1 ? `${lightboxIndex + 1} of ${albumPhotos.length} photos` : '';
  document.getElementById('lightbox-counter').textContent = '';

  document.querySelector('.lightbox-prev').style.display = albumPhotos.length > 1 ? 'flex' : 'none';
  document.querySelector('.lightbox-next').style.display = albumPhotos.length > 1 ? 'flex' : 'none';
}

// Keyboard nav
document.addEventListener('keydown', (e) => {
  if (document.getElementById('lightbox').style.display !== 'flex') return;
  if (e.key === 'ArrowLeft')  lightboxNav(-1);
  if (e.key === 'ArrowRight') lightboxNav(1);
  if (e.key === 'Escape')     closeLightbox();
});

document.getElementById('load-more')?.addEventListener('click', () => loadAlbums(false));

initGallery();
