// ============================================================
// Contact Page JavaScript
// ============================================================

document.getElementById('year').textContent = new Date().getFullYear();

document.getElementById('contact-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn    = document.getElementById('submit-btn');
  const alert  = document.getElementById('form-alert');
  const form   = e.target;

  btn.disabled = true;
  btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Sending...';
  alert.style.display = 'none';

  const body = {
    name:    form.name.value.trim(),
    email:   form.email.value.trim(),
    phone:   form.phone.value.trim(),
    subject: form.subject.value.trim(),
    message: form.message.value.trim(),
  };

  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) {
      alert.textContent = data.message || 'Message sent! We\'ll be in touch soon.';
      alert.className = 'alert alert-success';
      form.reset();
    } else {
      alert.textContent = data.error || 'Something went wrong. Please try again.';
      alert.className = 'alert alert-error';
    }
  } catch(err) {
    alert.textContent = 'Connection error. Please try again.';
    alert.className = 'alert alert-error';
  }

  alert.style.display = 'flex';
  btn.disabled = false;
  btn.innerHTML = '<i class="fa fa-paper-plane"></i> Send Message';
});
