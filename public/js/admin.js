// ============================================================
// Admin Panel — Shared JavaScript
// ============================================================

async function initAdminNav() {
  const auth = await fetch('/api/auth/status').then(r => r.json()).catch(() => ({ loggedIn: false }));
  if (!auth.loggedIn) { window.location.href = '/admin/login'; return; }

  const nameEl  = document.getElementById('username-display');
  const avatarEl = document.getElementById('avatar-initial');
  const roleEl  = document.getElementById('user-role-label');

  if (nameEl)   nameEl.textContent   = auth.username || 'Admin';
  if (avatarEl) avatarEl.textContent = (auth.username || 'A')[0].toUpperCase();
  if (roleEl)   roleEl.textContent   = auth.role === 'super_admin' ? 'Super Admin' : 'Editor';

  if (auth.role !== 'super_admin') {
    document.querySelectorAll('.super-admin-only').forEach(el => el.style.display = 'none');
  }

  return auth;
}

function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function togglePw(btn) {
  const input = btn.previousElementSibling;
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  btn.querySelector('i').className = show ? 'fa fa-eye-slash' : 'fa fa-eye';
}

async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/admin/login';
}

async function deletePost(id, btn) {
  if (!confirm('Are you sure you want to delete this post? This cannot be undone.')) return;
  btn.disabled = true;
  btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i>';
  const res = await fetch(`/api/admin/posts/${id}`, { method: 'DELETE' });
  if (res.ok) {
    const row = btn.closest('tr');
    if (row) row.remove();
  } else {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa fa-trash"></i>';
    alert('Failed to delete post.');
  }
}
