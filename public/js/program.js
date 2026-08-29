// ============================================================
// Public Sunday Program page
// ============================================================

(async () => {
  const bodyEl    = document.getElementById('program-body');
  const actionsEl = document.getElementById('program-actions');
  const dateEl    = document.getElementById('program-date-line');

  let data;
  try {
    data = await fetch('/api/program').then(r => r.json());
  } catch (e) {
    bodyEl.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div>' +
      '<h3>Unable to load the program</h3><p>Please try again shortly.</p></div>';
    return;
  }

  if (data.date) {
    const d = new Date(data.date + 'T00:00:00');
    if (!isNaN(d)) {
      dateEl.textContent = d.toLocaleDateString('en-ZA',
        { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }
  }

  const content = (data.content || '').trim();

  if (!content && !data.url) {
    bodyEl.innerHTML = '<div class="empty-state"><div class="empty-icon">📄</div>' +
      '<h3>No program published yet</h3><p>Please check back closer to Sunday.</p></div>';
    return;
  }

  if (content) {
    bodyEl.innerHTML = `<div class="program-sheet">${content}</div>`;
  } else {
    bodyEl.innerHTML = '<div class="empty-state"><div class="empty-icon">📄</div>' +
      '<h3>This week\'s program is available as a PDF</h3></div>';
  }

  if (data.url) {
    actionsEl.innerHTML =
      `<a href="${data.url}" target="_blank" rel="noopener" class="btn btn-purple">` +
        '<i class="fa fa-file-pdf"></i> Open the PDF version</a>';
  }
})();
