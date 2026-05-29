export function showToast(text, { error = false, duration = 4000, resendLink = '' } = {}) {
  if (!text) return;

  const toast = document.createElement('div');
  toast.className = 'server-toast';
  if (error) toast.classList.add('server-toast--error');

  const textNode = document.createElement('span');
  textNode.textContent = text;
  toast.appendChild(textNode);

  if (resendLink) {
    const link = document.createElement('a');
    link.href = resendLink;
    link.textContent = 'Resend';
    link.style.marginLeft = '8px';
    toast.appendChild(link);
  }

  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

document.addEventListener('DOMContentLoaded', () => {
  const flash = document.getElementById('server-flash-global');
  if (!flash) return;

  const error = flash.dataset.error && flash.dataset.error.trim();
  const message = flash.dataset.message && flash.dataset.message.trim();
  const resend = flash.dataset.resend && flash.dataset.resend.trim();
  const text = error || message || '';
  if (!text) return;

  showToast(text, { error: Boolean(error), resendLink: resend });
});
