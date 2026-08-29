// ============================================================
// A.M.E. ST. Joseph — Shared / Global JavaScript
// ============================================================

// Nav toggle (mobile)
const navToggle = document.getElementById('nav-toggle');
const navLinks  = document.getElementById('nav-links');
if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => {
    navLinks.classList.toggle('open');
  });
  // Close nav on link click
  navLinks.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => navLinks.classList.remove('open'));
  });
}

// Set copyright year
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// Load footer info from public settings helper
// We expose a minimal public endpoint by fetching what we can
async function loadFooterInfo() {
  // Footer info (address, phone, email, social) comes from admin settings.
  // Since settings require auth, we store them in the DB and expose the
  // specific values we need via the contact page details and footer.
  // For the public site, we use the seeded defaults displayed in HTML
  // and update them when the admin changes settings.
  // Actually, let's expose a slim public settings endpoint.
  try {
    const res = await fetch('/api/public/settings');
    if (!res.ok) return;
    const s = await res.json();
    ['footer-address', 'contact-address'].forEach(id => {
      const el = document.getElementById(id);
      if (el && s.address) el.textContent = s.address;
    });
    ['footer-phone', 'contact-phone'].forEach(id => {
      const el = document.getElementById(id);
      if (el && s.phone) el.textContent = s.phone;
    });
    ['footer-email', 'contact-email'].forEach(id => {
      const el = document.getElementById(id);
      if (el && s.email) el.textContent = s.email;
    });
    if (s.facebook_url || s.youtube_url) {
      const socialEl = document.getElementById('footer-social');
      if (socialEl) {
        let html = '';
        if (s.facebook_url) html += `<a href="${s.facebook_url}" target="_blank" rel="noopener" class="social-link"><i class="fab fa-facebook-f"></i></a>`;
        if (s.youtube_url) html += `<a href="${s.youtube_url}" target="_blank" rel="noopener" class="social-link"><i class="fab fa-youtube"></i></a>`;
        socialEl.innerHTML = html;
      }
    }
    // Service times on contact page
    ['ct-sunday-school', 'st-sunday-school'].forEach(id => { const el = document.getElementById(id); if (el && s.service_sunday_school) el.textContent = s.service_sunday_school; });
    ['ct-sunday-morning', 'st-sunday-morning'].forEach(id => { const el = document.getElementById(id); if (el && s.service_sunday_morning) el.textContent = s.service_sunday_morning; });
    ['ct-wednesday', 'st-wednesday'].forEach(id => { const el = document.getElementById(id); if (el && s.service_wednesday) el.textContent = s.service_wednesday; });
    // Sunday service program (homepage) — hidden until content or a PDF is published.
    // Typed content gets its own page; a PDF on its own opens directly.
    const programLink = document.getElementById('service-program-link');
    if (programLink && (s.sunday_program_has_content || s.sunday_program_url)) {
      programLink.href = s.sunday_program_has_content ? '/program' : s.sunday_program_url;
      if (s.sunday_program_has_content) programLink.removeAttribute('target');
      programLink.hidden = false;

      const dateEl = document.getElementById('service-program-date');
      if (dateEl && s.sunday_program_date) {
        const d = new Date(s.sunday_program_date + 'T00:00:00');
        if (!isNaN(d)) {
          dateEl.textContent = 'Program for ' +
            d.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' });
          dateEl.hidden = false;
        }
      }
    }
    if (s.tagline) {
      const tEl = document.getElementById('hero-tagline');
      if (tEl) tEl.textContent = s.tagline;
    }
  } catch (e) { /* silently fail */ }
}

loadFooterInfo();

// ---- Utility: format date ----
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatEventDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00');
  return {
    month: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    day: d.getDate()
  };
}

// ---- Utility: sanitize HTML for display ----
function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ---- Recurrence label helper ----
function formatRecurrence(r) {
  const map = {
    'every-sunday':    'Every Sunday',
    'every-monday':    'Every Monday',
    'every-tuesday':   'Every Tuesday',
    'every-wednesday': 'Every Wednesday',
    'every-thursday':  'Every Thursday',
    'every-friday':    'Every Friday',
    'every-saturday':  'Every Saturday',
  };
  return map[r] || r;
}

// ---- Build post card ----
function buildCard(post) {
  const typeLabels = { sermon: 'Sermon', event: 'Event', update: 'Update', program: 'Program' };
  const dateBadge = !post.recurrence && post.event_date ? (() => {
    const d = formatEventDate(post.event_date);
    return `<div class="event-date-badge"><span class="month">${d.month}</span><span class="day">${d.day}</span></div>`;
  })() : '';

  const dateMetaHtml = post.recurrence
    ? `<span><i class="fa fa-rotate" style="margin-right:4px;"></i>${formatRecurrence(post.recurrence)}</span>`
    : dateBadge
      ? `<span><i class="fa fa-calendar" style="margin-right:4px;"></i>${post.event_date}</span>`
      : `<span><i class="fa fa-calendar" style="margin-right:4px;"></i>${formatDate(post.created_at)}</span>`;

  return `
    <div class="card" style="cursor:pointer;" onclick="openPost('${encodeURIComponent(post.slug)}')">
      <div class="card-image">
        ${post.image_url
          ? `<img src="${escHtml(post.image_url)}" alt="${escHtml(post.title)}" loading="lazy" />`
          : `<div class="card-image-placeholder">${post.type === 'sermon' ? '📖' : post.type === 'event' ? '🗓️' : post.type === 'program' ? '⭐' : '📰'}</div>`}
      </div>
      <div class="card-body">
        <span class="card-type ${post.type}">${typeLabels[post.type] || post.type}</span>
        <h3>${escHtml(post.title)}</h3>
        <p>${escHtml(post.excerpt || '')}</p>
        <div class="card-meta">
          ${dateMetaHtml}
          ${post.event_time ? `<span><i class="fa fa-clock" style="margin-right:4px;"></i>${escHtml(post.event_time)}</span>` : ''}
          ${post.event_location ? `<span><i class="fa fa-location-dot" style="margin-right:4px;"></i>${escHtml(post.event_location)}</span>` : ''}
          ${post.speaker ? `<span><i class="fa fa-microphone" style="margin-right:4px;"></i>${escHtml(post.speaker)}</span>` : ''}
          ${post.scripture ? `<span><i class="fa fa-book" style="margin-right:4px;"></i>${escHtml(post.scripture)}</span>` : ''}
        </div>
        <button class="btn btn-purple btn-sm">Read More <i class="fa fa-arrow-right"></i></button>
      </div>
    </div>`;
}

// ---- Open post in modal ----
async function openPost(slug) {
  const modal = document.getElementById('post-modal');
  if (!modal) return;
  modal.style.display = 'block';
  document.body.style.overflow = 'hidden';

  // Clear any gallery link from a previous open
  modal.querySelectorAll('.modal-gallery-link').forEach(el => el.remove());

  try {
    const post = await fetch(`/api/posts/${decodeURIComponent(slug)}`).then(r => r.json());
    const typeLabels = { sermon: 'Sermon', event: 'Event', update: 'Update', program: 'Program' };

    const titleEl = document.getElementById('modal-title');
    const typeEl  = document.getElementById('modal-type');
    const bodyEl  = document.getElementById('modal-body');
    const metaEl  = document.getElementById('modal-meta');
    const videoEl = document.getElementById('modal-video');

    if (titleEl) titleEl.textContent = post.title;
    if (typeEl)  { typeEl.textContent = typeLabels[post.type] || post.type; typeEl.className = `badge badge-${post.type}`; }
    if (bodyEl)  bodyEl.innerHTML = post.body;

    // Meta
    const metaItems = [];
    if (post.recurrence) metaItems.push(`<span><i class="fa fa-rotate"></i> ${formatRecurrence(post.recurrence)}</span>`);
    else if (post.event_date) metaItems.push(`<span><i class="fa fa-calendar"></i> ${post.event_date}</span>`);
    if (post.event_time) metaItems.push(`<span><i class="fa fa-clock"></i> ${escHtml(post.event_time)}</span>`);
    if (post.event_location) metaItems.push(`<span><i class="fa fa-location-dot"></i> ${escHtml(post.event_location)}</span>`);
    if (post.speaker) metaItems.push(`<span><i class="fa fa-microphone"></i> ${escHtml(post.speaker)}</span>`);
    if (post.scripture) metaItems.push(`<span><i class="fa fa-book"></i> ${escHtml(post.scripture)}</span>`);
    if (metaEl) {
      metaEl.innerHTML = metaItems.join('');
      metaEl.style.display = metaItems.length ? 'flex' : 'none';
    }

    // Video embed
    if (videoEl) {
      if (post.video_url) {
        const embedUrl = getEmbedUrl(post.video_url);
        if (embedUrl) {
          videoEl.style.display = 'block';
          videoEl.innerHTML = `<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;"><iframe src="${embedUrl}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" allowfullscreen loading="lazy"></iframe></div>`;
        } else videoEl.style.display = 'none';
      } else videoEl.style.display = 'none';
    }

    // For past (non-recurring) events, check for linked gallery photos
    if (post.type === 'event' && !post.recurrence && post.event_date) {
      const eventDate = new Date(post.event_date + 'T00:00:00');
      if (eventDate < new Date()) {
        try {
          const galleryData = await fetch(`/api/posts?type=gallery&event_id=${post.id}&limit=1`).then(r => r.json());
          if (galleryData.posts?.length) {
            const linkDiv = document.createElement('div');
            linkDiv.className = 'modal-gallery-link';
            linkDiv.style.cssText = 'padding:16px 32px;background:var(--off-white);border-top:1px solid var(--border);';
            linkDiv.innerHTML = `<a href="/gallery?event=${encodeURIComponent(post.slug)}" class="btn btn-purple btn-sm"><i class="fa fa-images"></i> View Event Photos</a>`;
            if (bodyEl) bodyEl.parentNode.insertBefore(linkDiv, bodyEl);
          }
        } catch(e) { /* no gallery link if check fails */ }
      }
    }
  } catch(e) {
    const bodyEl = document.getElementById('modal-body');
    if (bodyEl) bodyEl.innerHTML = '<p style="color:red;">Failed to load post.</p>';
  }
}

// Close modal on backdrop click
document.addEventListener('click', (e) => {
  const modal = document.getElementById('post-modal');
  if (modal && e.target === modal) {
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }
});

// ---- YouTube/Vimeo embed URL helper ----
function getEmbedUrl(url) {
  if (!url) return null;
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return null;
}
