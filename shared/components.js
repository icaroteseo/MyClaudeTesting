/**
 * Shared UI component factories.
 */

/**
 * Show a transient toast notification.
 * @param {string} message
 * @param {'info'|'success'|'danger'} [type='info']
 * @param {number} [duration=3000] ms before auto-dismiss
 */
export function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 200ms';
    setTimeout(() => toast.remove(), 200);
  }, duration);
}
