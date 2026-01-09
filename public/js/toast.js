document.addEventListener('DOMContentLoaded', () => {
  const flash = document.getElementById('server-flash-global');
  if (!flash) return;

  const error = flash.dataset.error && flash.dataset.error.trim();
  const message = flash.dataset.message && flash.dataset.message.trim();
  const resend = flash.dataset.resend && flash.dataset.resend.trim();
  const text = error || message || '';
  if (!text) return;

  const toast = document.createElement('div');
  toast.className = 'server-toast';
  if (error) toast.classList.add('server-toast--error');

  const textNode = document.createElement('span');
  textNode.textContent = text;
  toast.appendChild(textNode);

  if (resend) {
    const a = document.createElement('a');
    a.href = resend;
    a.textContent = 'Resend';
    a.style.marginLeft = '8px';
    toast.appendChild(a);
  }

  document.body.appendChild(toast);

  // trigger animation
  requestAnimationFrame(() => toast.classList.add('show'));

  // auto-hide after 4s
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
});
