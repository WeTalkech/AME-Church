// ============================================================
// Admin — Sunday Service Program
// ============================================================

let programUrl  = '';
let programName = '';

// Rich-text helpers (same approach as the post editor)
function fmt(command, value = null) {
  document.execCommand(command, false, value);
  document.getElementById('program-content').focus();
}
function fmtBlock(tag) {
  document.execCommand('formatBlock', false, tag);
  document.getElementById('program-content').focus();
}

function programContent() {
  const raw = document.getElementById('program-content').innerHTML.trim();
  return (raw === '<br>' || raw === '<div><br></div>') ? '' : raw;
}

function showAlert(msg, type) {
  const el = document.getElementById('alert');
  el.textContent = msg;
  el.className = `alert alert-${type}`;
  el.style.display = 'flex';
  if (type === 'success') setTimeout(() => el.style.display = 'none', 3000);
}

function renderCurrent() {
  const box = document.getElementById('current-state');
  const removeBtn = document.getElementById('remove-btn');
  const hasContent = !!programContent();

  if (!programUrl && !hasContent) {
    box.innerHTML = '<div class="program-empty"><i class="fa fa-circle-info"></i> ' +
      'Nothing published yet. The <strong>See Program</strong> button is hidden on the homepage.</div>';
    removeBtn.style.display = 'none';
    return;
  }

  const what = hasContent && programUrl ? 'Typed program + PDF'
             : hasContent               ? 'Typed program'
             :                            'PDF only';

  box.innerHTML =
    '<div class="program-current">' +
      '<span class="pdf-icon"><i class="fa ' + (hasContent ? 'fa-file-lines' : 'fa-file-pdf') + '"></i></span>' +
      '<div style="flex:1;">' +
        '<div style="font-weight:600;color:var(--purple-dark);">Live on the homepage</div>' +
        '<div style="color:var(--text-light);font-size:0.85rem;">' + what +
          (programUrl ? ' — ' + escHtml(programName || 'uploaded PDF') : '') + '</div>' +
      '</div>' +
      (hasContent
        ? '<a href="/program" target="_blank" rel="noopener" class="btn btn-ghost btn-sm">' +
            '<i class="fa fa-arrow-up-right-from-square"></i> View page</a>'
        : '<a href="' + programUrl + '" target="_blank" rel="noopener" class="btn btn-ghost btn-sm">' +
            '<i class="fa fa-arrow-up-right-from-square"></i> Open PDF</a>') +
    '</div>';
  removeBtn.style.display = 'inline-flex';
}

async function loadProgram() {
  await initAdminNav();
  try {
    const data = await fetch('/api/admin/program').then(r => r.json());
    programUrl = data.url || '';
    document.getElementById('program-date').value = data.date || '';
    document.getElementById('program-content').innerHTML = data.content || '';
    programName = programUrl ? decodeURIComponent(programUrl.split('/').pop()) : '';
  } catch (e) {
    showAlert('Could not load the current program.', 'error');
  }
  renderCurrent();
}

async function uploadProgram(file) {
  if (!file) return;
  const hint = document.getElementById('upload-hint');

  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    hint.textContent = 'That is not a PDF. Please choose a PDF file.';
    hint.style.color = '#C62828';
    return;
  }

  hint.textContent = `Uploading ${file.name}…`;
  hint.style.color = '';

  const formData = new FormData();
  formData.append('file', file);

  try {
    const res  = await fetch('/api/admin/upload-pdf', { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');

    programUrl  = data.url;
    programName = data.name || file.name;
    renderCurrent();
    hint.innerHTML = '✓ Uploaded — now click <strong>Save Program</strong> to publish it.';
    hint.style.color = '#9E7B2A';
  } catch (e) {
    hint.textContent = `Error: ${e.message}`;
    hint.style.color = '#C62828';
  }
  document.getElementById('program-file').value = '';
}

async function saveProgram() {
  const date    = document.getElementById('program-date').value;
  const content = programContent();
  const res = await fetch('/api/admin/program', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: programUrl, date, content }),
  });
  if (res.ok) {
    renderCurrent();
    showAlert((programUrl || content)
      ? '✓ Program saved and live on the homepage.'
      : '✓ Program removed from the homepage.', 'success');
    const hint = document.getElementById('upload-hint');
    hint.textContent = 'PDF only, up to 25 MB.';
    hint.style.color = '';
  } else {
    showAlert('Could not save the program.', 'error');
  }
}

function removeProgram() {
  if (!confirm('Remove the current program (typed content and PDF)? The See Program button will disappear from the homepage.')) return;
  programUrl = '';
  programName = '';
  document.getElementById('program-content').innerHTML = '';
  renderCurrent();
  document.getElementById('upload-hint').innerHTML =
    'Removed — click <strong>Save Program</strong> to apply.';
  document.getElementById('upload-hint').style.color = '#9E7B2A';
}

// Drag and drop
const dropZone = document.getElementById('drop-zone');
['dragenter', 'dragover'].forEach(ev =>
  dropZone.addEventListener(ev, e => { e.preventDefault(); dropZone.classList.add('dragover'); }));
['dragleave', 'drop'].forEach(ev =>
  dropZone.addEventListener(ev, e => { e.preventDefault(); dropZone.classList.remove('dragover'); }));
dropZone.addEventListener('drop', e => uploadProgram(e.dataTransfer.files[0]));

loadProgram();
