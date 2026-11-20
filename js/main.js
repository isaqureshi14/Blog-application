/* ==========================================================================
   BlogVerse — Client Logic
   - Dual-tone theme toggle (Light / Dark) with localStorage persistence
   - Mobile navigation drawer
   - Category filtering
   - Image preview on upload
   - Mock form & dashboard interactions
   ========================================================================== */

(function () {
  'use strict';

  /* ── Theme ─────────────────────────────────────────────────────────────── */
  const THEME_KEY = 'bv_theme';

  const SUN_SVG = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg><span>Light</span>`;
  const MOON_SVG = `<svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg><span>Dark</span>`;

  function getTheme() {
    return localStorage.getItem(THEME_KEY) ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }

  function applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem(THEME_KEY, theme);
    document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
      btn.innerHTML = theme === 'dark' ? SUN_SVG : MOON_SVG;
    });
  }

  // Apply theme immediately before first paint to avoid flash
  applyTheme(getTheme());

  /* ── DOMContentLoaded ───────────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', () => {

    // Theme toggle
    document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        applyTheme(current === 'dark' ? 'light' : 'dark');
      });
    });

    // Mobile navigation
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    if (menuBtn && navLinks) {
      menuBtn.addEventListener('click', () => navLinks.classList.toggle('show'));
      // Close on outside click
      document.addEventListener('click', e => {
        if (!navLinks.contains(e.target) && !menuBtn.contains(e.target)) {
          navLinks.classList.remove('show');
        }
      });
    }

    // Category filter
    const filterPills = document.querySelectorAll('.filter-pill');
    const postRows = document.querySelectorAll('.post-row');
    if (filterPills.length) {
      filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
          filterPills.forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
          const cat = pill.dataset.category;
          postRows.forEach(row => {
            row.style.display = (cat === 'all' || row.dataset.category === cat) ? 'grid' : 'none';
          });
        });
      });
    }

    // Cover image preview
    const imgInput = document.getElementById('featuredImageInput');
    const imgPreview = document.getElementById('imgPreviewContainer');
    if (imgInput && imgPreview) {
      imgInput.addEventListener('change', function () {
        const file = this.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
          imgPreview.innerHTML = `<img src="${e.target.result}" alt="Cover preview" style="width:100%;height:160px;object-fit:cover;display:block;filter:grayscale(20%);">`;
        };
        reader.readAsDataURL(file);
      });
    }

    // Forms — mock submit
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', e => {
        e.preventDefault();
        alert('Signed in successfully. Redirecting to Dashboard...');
        window.location.href = 'dashboard.html';
      });
    }

    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
      registerForm.addEventListener('submit', e => {
        e.preventDefault();
        alert('Account created. Please sign in.');
        window.location.href = 'login.html';
      });
    }

    const blogForm = document.getElementById('createBlogForm');
    if (blogForm) {
      blogForm.addEventListener('submit', e => {
        e.preventDefault();
        alert('Article published successfully.');
        window.location.href = 'dashboard.html';
      });
    }

    // Dashboard — delete row
    document.querySelectorAll('.action-btn.delete').forEach(btn => {
      btn.addEventListener('click', function () {
        const row = this.closest('tr');
        const title = row?.querySelector('.td-title')?.textContent.trim() || 'this article';
        if (confirm(`Delete "${title}"? This cannot be undone.`)) {
          row.style.opacity = '0';
          row.style.transition = 'opacity 0.2s ease';
          setTimeout(() => row.remove(), 220);
        }
      });
    });

    // Newsletter subscribe (mock)
    const newsletterForm = document.getElementById('newsletterForm');
    if (newsletterForm) {
      newsletterForm.addEventListener('submit', e => {
        e.preventDefault();
        alert('Subscribed! You will receive our next edition.');
        newsletterForm.reset();
      });
    }
  });

})();
