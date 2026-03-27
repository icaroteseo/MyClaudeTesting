/**
 * D&D 5e Companion - Main App Router
 *
 * Handles module lifecycle: lazy-load, mount, and unmount.
 * Each module in modules/<name>/index.js must export:
 *   mount(container: HTMLElement) → void
 *   unmount() → void
 */

const container = document.getElementById('app');
const navButtons = document.querySelectorAll('[data-module]');

let currentModule = null;
let currentModuleName = null;

async function navigate(moduleName) {
  if (moduleName === currentModuleName) return;

  // Teardown current module
  if (currentModule?.unmount) {
    try { currentModule.unmount(); } catch (e) { console.warn('unmount error:', e); }
  }

  // Update nav state
  navButtons.forEach(btn => {
    const isActive = btn.dataset.module === moduleName;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-current', isActive ? 'page' : 'false');
  });

  // Show loading state
  container.innerHTML = '<div class="module-loading">Loading...</div>';

  try {
    // Lazy-load the module (browser caches after first load)
    const mod = await import(`./modules/${moduleName}/index.js`);

    container.innerHTML = '';
    mod.mount(container);
    currentModule = mod;
    currentModuleName = moduleName;

    // Update URL hash for deep-linking / back-button support
    history.pushState({ module: moduleName }, '', `#${moduleName}`);
  } catch (err) {
    console.error(`Failed to load module: ${moduleName}`, err);
    container.innerHTML = `
      <div class="module-error">
        <p>Failed to load module: <strong>${moduleName}</strong></p>
        <pre>${err.message}</pre>
      </div>`;
  }
}

// Wire up nav buttons
navButtons.forEach(btn => {
  btn.addEventListener('click', () => navigate(btn.dataset.module));
});

// Handle browser back/forward navigation
window.addEventListener('popstate', e => {
  const mod = e.state?.module || 'dice-roller';
  navigate(mod);
});

// Bootstrap: read hash or default to dice-roller
const initialModule = location.hash.slice(1) || 'dice-roller';
navigate(initialModule);
