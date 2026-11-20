// =====================================================================
// BlogVerse Frontend — API Client & UI Logic
// Connects all pages to the Node.js / Express backend.
// =====================================================================

(function () {
  'use strict';

  /* ── Config ──────────────────────────────────────────────────────── */
  const API_BASE = (typeof window !== 'undefined' && window.location.origin.includes(':5000'))
    ? '/api/v1'
    : 'http://localhost:5000/api/v1';

  /* ── Theme ───────────────────────────────────────────────────────── */
  const THEME_KEY = 'bv_theme';

  const SUN_SVG  = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg><span>Light</span>`;
  const MOON_SVG = `<svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg><span>Dark</span>`;

  function getTheme() {
    return localStorage.getItem(THEME_KEY) ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }

  function applyTheme(theme) {
    if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
    localStorage.setItem(THEME_KEY, theme);
    document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
      btn.innerHTML = theme === 'dark' ? SUN_SVG : MOON_SVG;
    });
  }

  // Apply immediately before first paint
  applyTheme(getTheme());

  /* ── Secure API helper ───────────────────────────────────────────── */
  // Always sends credentials (cookies) and parses JSON.
  // Throws an Error with a user-friendly message on non-2xx responses.
  async function apiFetch(endpoint, options = {}) {
    const defaults = {
      credentials: 'include',          // Send httpOnly JWT cookie
      headers: { 'Content-Type': 'application/json' },
    };

    const config = {
      ...defaults,
      ...options,
      headers: { ...defaults.headers, ...(options.headers || {}) },
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    const res = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg = data.message || `Request failed (${res.status})`;
      throw new Error(msg);
    }

    return data;
  }

  /* ── Toast notifications (non-blocking feedback) ─────────────────── */
  function toast(message, type = 'success') {
    const existing = document.querySelector('.bv-toast');
    if (existing) existing.remove();

    const el = document.createElement('div');
    el.className = 'bv-toast';
    el.setAttribute('role', 'alert');
    el.setAttribute('aria-live', 'polite');
    el.style.cssText = `
      position: fixed; bottom: 1.5rem; right: 1.5rem; z-index: 9999;
      padding: 0.85rem 1.25rem;
      background: ${type === 'error' ? 'var(--near-black,#0a0a0a)' : 'var(--near-black,#0a0a0a)'};
      color: var(--white,#fff);
      font-family: var(--font-mono,'JetBrains Mono',monospace);
      font-size: 0.72rem; letter-spacing: 0.06em;
      border-left: 3px solid ${type === 'error' ? '#ef4444' : '#10b981'};
      max-width: 360px; word-break: break-word;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      animation: bvSlideIn 0.2s ease;
    `;
    el.textContent = message;

    // Inject keyframe once
    if (!document.getElementById('bv-toast-style')) {
      const style = document.createElement('style');
      style.id = 'bv-toast-style';
      style.textContent = `@keyframes bvSlideIn { from { transform: translateY(1rem); opacity: 0; } to { transform: none; opacity: 1; } }`;
      document.head.appendChild(style);
    }

    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }

  /* ── Helpers ─────────────────────────────────────────────────────── */
  function setButtonLoading(btn, loading) {
    if (!btn) return;
    if (loading) {
      btn.dataset.originalText = btn.textContent;
      btn.textContent = 'Please wait…';
      btn.disabled = true;
    } else {
      btn.textContent = btn.dataset.originalText || 'Submit';
      btn.disabled = false;
    }
  }

  function getToken() {
    // The JWT is in an httpOnly cookie — we can't read it from JS (by design).
    // We instead rely on cookies:include in apiFetch.
    // We store a lightweight "is logged in" flag in sessionStorage
    // only to show/hide UI elements — NOT for security decisions.
    return sessionStorage.getItem('bv_logged_in') === '1';
  }

  function setLoggedIn(val) {
    if (val) sessionStorage.setItem('bv_logged_in', '1');
    else      sessionStorage.removeItem('bv_logged_in');
  }

  /* ── Page handlers ────────────────────────────────────────────────── */

  // ---- Login form ----
  async function initLoginForm() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      setButtonLoading(btn, true);

      // Sanitize inputs client-side (server also validates)
      const email    = form.email.value.trim().toLowerCase();
      const password = form.password.value;

      if (!email || !password) {
        toast('Please fill in all fields.', 'error');
        setButtonLoading(btn, false);
        return;
      }

      try {
        const data = await apiFetch('/auth/login', {
          method: 'POST',
          body:   { email, password },
        });

        setLoggedIn(true);
        toast(`Welcome back, ${data.data.user.name}!`);
        setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
      } catch (err) {
        toast(err.message, 'error');
        setButtonLoading(btn, false);
      }
    });
  }

  // ---- Register form ----
  async function initRegisterForm() {
    const form = document.getElementById('registerForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      setButtonLoading(btn, true);

      const name            = form.firstName.value.trim() + ' ' + form.lastName.value.trim();
      const username        = form.username.value.trim().toLowerCase();
      const email           = form.regEmail.value.trim().toLowerCase();
      const password        = form.regPassword.value;
      const confirmPassword = form.confirmPassword ? form.confirmPassword.value : password;

      // Basic client-side checks (server validates fully)
      if (!name.trim() || !username || !email || !password) {
        toast('Please fill in all required fields.', 'error');
        setButtonLoading(btn, false);
        return;
      }

      try {
        const data = await apiFetch('/auth/register', {
          method: 'POST',
          body:   { name, username, email, password, confirmPassword },
        });

        setLoggedIn(true);
        toast('Account created! Welcome to BlogVerse.');
        setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
      } catch (err) {
        toast(err.message, 'error');
        setButtonLoading(btn, false);
      }
    });
  }

  // ---- Create Blog form ----
  async function initCreateBlogForm() {
    const form = document.getElementById('createBlogForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const isPublish = e.submitter && e.submitter.textContent.toLowerCase().includes('publish');
      const btn = e.submitter || form.querySelector('button[type="submit"]');
      setButtonLoading(btn, true);

      const title    = (document.getElementById('postTitle')?.value || '').trim();
      const content  = (document.getElementById('postContent')?.value || '').trim();
      const excerpt  = (document.getElementById('postExcerpt')?.value || '').trim();
      const category = (document.getElementById('postCategory')?.value || '').trim();
      const tags     = (document.getElementById('postTags')?.value || '')
        .split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
      const status   = isPublish ? 'published' : 'draft';

      if (!title || !content || !category) {
        toast('Title, content, and category are required.', 'error');
        setButtonLoading(btn, false);
        return;
      }

      try {
        await apiFetch('/blogs', {
          method: 'POST',
          body:   { title, content, excerpt, category, tags, status },
        });

        toast(status === 'published' ? 'Article published!' : 'Draft saved.');
        setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
      } catch (err) {
        // If 401, redirect to login
        if (err.message.toLowerCase().includes('log in')) {
          window.location.href = 'login.html';
          return;
        }
        toast(err.message, 'error');
        setButtonLoading(btn, false);
      }
    });

    // "Save Draft" button
    const draftBtn = form.querySelector('.save-draft-btn');
    if (draftBtn) {
      draftBtn.addEventListener('click', (e) => {
        document.getElementById('blogStatus')?.setAttribute('value', 'draft');
        form.requestSubmit();
      });
    }
  }

  // ---- Dashboard ----
  async function initDashboard() {
    const postsContainer = document.getElementById('dashPostsBody');
    if (!postsContainer) return;

    // Try loading user's posts from API; on 401, redirect to login
    try {
      const data = await apiFetch('/blogs/my?limit=20');
      const blogs = data.data.blogs;

      if (!blogs || blogs.length === 0) {
        postsContainer.innerHTML = `
          <tr>
            <td colspan="6" style="text-align:center; padding:2rem; color:var(--text-muted); font-family:var(--font-mono); font-size:0.75rem;">
              No articles yet. <a href="create-blog.html" style="color:var(--text-primary); text-decoration:underline;">Write your first post →</a>
            </td>
          </tr>`;
        return;
      }

      postsContainer.innerHTML = blogs.map(b => `
        <tr data-id="${escapeHtml(b._id)}">
          <td class="td-title">${escapeHtml(b.title)}</td>
          <td class="td-category">${escapeHtml(b.category)}</td>
          <td><span class="status-tag ${b.status === 'published' ? 'published' : ''}">${escapeHtml(b.status)}</span></td>
          <td style="font-family:var(--font-mono); font-size:0.75rem; color:var(--text-muted);">${b.status === 'published' ? formatDate(b.updatedAt) : '—'}</td>
          <td style="font-family:var(--font-mono); font-size:0.85rem;">${b.views || 0}</td>
          <td style="text-align:right;">
            <div class="row-actions" style="justify-content:flex-end;">
              <a href="create-blog.html?edit=${escapeHtml(b._id)}" class="btn btn-ghost btn-sm">Edit</a>
              <a href="blog-detail.html?id=${escapeHtml(b._id)}" class="btn btn-ghost btn-sm">View</a>
              <button type="button" class="btn btn-ghost btn-sm action-btn delete" data-id="${escapeHtml(b._id)}">Delete</button>
            </div>
          </td>
        </tr>
      `).join('');

      // Attach delete listeners
      postsContainer.querySelectorAll('.action-btn.delete').forEach(btn => {
        btn.addEventListener('click', async function () {
          const id    = this.dataset.id;
          const title = this.closest('tr')?.querySelector('.td-title')?.textContent.trim();
          if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;

          try {
            await apiFetch(`/blogs/${id}`, { method: 'DELETE' });
            this.closest('tr').remove();
            toast('Article deleted.');
          } catch (err) {
            toast(err.message, 'error');
          }
        });
      });

      // Update stat cards
      const totalEl = document.getElementById('statTotal');
      if (totalEl) totalEl.textContent = data.total || blogs.length;

    } catch (err) {
      if (err.message.toLowerCase().includes('log in') || err.message.includes('401')) {
        window.location.href = 'login.html';
      } else {
        toast(err.message, 'error');
      }
    }
  }

  // ---- Homepage blog feed ----
  async function initHomeFeed() {
    const feedList = document.getElementById('postsFeed');
    if (!feedList) return;

    try {
      const data  = await apiFetch('/blogs?limit=10&sort=-createdAt');
      const blogs = data.data.blogs;

      if (!blogs || blogs.length === 0) {
        feedList.innerHTML = `<p style="padding:2rem 0; color:var(--text-muted); font-size:0.9rem;">No articles published yet.</p>`;
        return;
      }

      feedList.innerHTML = blogs.map(b => `
        <a href="blog-detail.html?id=${escapeHtml(b._id)}" class="post-row" data-category="${escapeHtml(b.category)}">
          <div class="post-row-date">${formatDateShort(b.createdAt)}</div>
          <div class="post-row-body">
            <div class="post-row-category">${escapeHtml(b.category)}</div>
            <div class="post-row-title">${escapeHtml(b.title)}</div>
            <p class="post-row-excerpt">${escapeHtml(b.excerpt || '')}</p>
            <div class="post-row-meta">
              <span class="post-row-author">${escapeHtml(b.author?.name || 'Unknown')}</span>
              <span>${b.readTime || 1} min read</span>
            </div>
          </div>
          ${b.coverImage ? `<img class="post-row-thumb" src="${escapeHtml(b.coverImage)}" alt="">` : ''}
        </a>
      `).join('');

    } catch (err) {
      // Feed load failure is non-critical — keep static demo visible
      console.warn('[BlogVerse] Feed load failed:', err.message);
    }
  }

  // ---- Logout button ----
  function initLogout() {
    document.querySelectorAll('.logout-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
          await apiFetch('/auth/logout', { method: 'POST' });
        } catch (_) { /* ignore */ }
        setLoggedIn(false);
        window.location.href = 'login.html';
      });
    });
  }

  // ---- Blog Detail Page ----
  async function initBlogDetail() {
    const articleContainer = document.getElementById('articleContainer');
    if (!articleContainer) return;

    const params = new URLSearchParams(window.location.search);
    const blogId = params.get('id');
    if (!blogId) return;

    try {
      const res = await apiFetch(`/blogs/${encodeURIComponent(blogId)}`);
      const blog = res.data?.blog;
      if (!blog) return;

      document.title = `${blog.title} — BlogVerse`;

      const catEl = document.getElementById('articleCategory');
      if (catEl) catEl.textContent = blog.category;

      const titleEl = document.getElementById('articleTitle');
      if (titleEl) titleEl.textContent = blog.title;

      const authorEl = document.getElementById('articleAuthor');
      if (authorEl) authorEl.textContent = blog.author?.name || 'Anonymous';

      const bioNameEl = document.getElementById('authorBioName');
      if (bioNameEl) bioNameEl.textContent = blog.author?.name || 'Anonymous';

      const dateEl = document.getElementById('articleDate');
      if (dateEl) dateEl.textContent = formatDate(blog.createdAt);

      const readTimeEl = document.getElementById('articleReadTime');
      if (readTimeEl) readTimeEl.textContent = `${blog.readTime || 1} min read`;

      const viewsEl = document.getElementById('articleViews');
      if (viewsEl) viewsEl.textContent = `${blog.views || 1} views`;

      const coverWrapper = document.getElementById('coverWrapper');
      const coverImg = document.getElementById('articleCover');
      if (blog.coverImage && coverImg) {
        coverImg.src = blog.coverImage;
        coverWrapper.style.display = 'block';
      } else if (!blog.coverImage && coverWrapper) {
        coverWrapper.style.display = 'none';
      }

      const contentEl = document.getElementById('articleContent');
      if (contentEl) {
        contentEl.innerHTML = parseMarkdownToHtml(blog.content);
      }

      const tagsEl = document.getElementById('articleTags');
      if (tagsEl && Array.isArray(blog.tags) && blog.tags.length > 0) {
        tagsEl.innerHTML = blog.tags.map(t => `
          <span style="font-family: var(--font-mono); font-size: 0.65rem; letter-spacing: 0.06em; text-transform: uppercase; padding: 0.3rem 0.6rem; border: 1px solid var(--border); color: var(--text-secondary);">#${escapeHtml(t)}</span>
        `).join('');
      }
    } catch (err) {
      console.warn('[BlogVerse] Failed to fetch article details:', err.message);
    }
  }

  function parseMarkdownToHtml(text) {
    if (!text) return '';
    const safe = escapeHtml(text);
    return safe
      .split('\n\n')
      .map(block => {
        const trimmed = block.trim();
        if (trimmed.startsWith('## ')) {
          return `<h2 style="font-family: var(--font-serif); font-size: 1.85rem; font-weight: 400; margin: 2.5rem 0 1rem; color: var(--text-primary);">${trimmed.slice(3)}</h2>`;
        }
        if (trimmed.startsWith('# ')) {
          return `<h1 style="font-family: var(--font-serif); font-size: 2.2rem; font-weight: 400; margin: 2.5rem 0 1rem; color: var(--text-primary);">${trimmed.slice(2)}</h1>`;
        }
        if (trimmed.startsWith('> ')) {
          return `<blockquote style="margin: 2rem 0; padding: 1.25rem 2rem; border-left: 3px solid var(--text-primary); background: var(--bg-subtle); font-family: var(--font-serif); font-style: italic; font-size: 1.25rem; color: var(--text-primary);">${trimmed.slice(2)}</blockquote>`;
        }
        if (trimmed.startsWith('- ')) {
          const items = trimmed.split('\n').map(li => `<li>${li.replace(/^-\s*/, '')}</li>`).join('');
          return `<ul style="margin: 1.25rem 0 1.25rem 1.5rem; list-style: disc;">${items}</ul>`;
        }
        let p = trimmed
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/`([^`]+)`/g, '<code style="background:var(--bg-inset); padding:0.15rem 0.35rem; font-family:var(--font-mono); font-size:0.88em;">$1</code>');
        return `<p style="margin-bottom: 1.5rem;">${p}</p>`;
      })
      .join('');
  }

  /* ── Security helpers ────────────────────────────────────────────── */

  // Prevent XSS when inserting any server data into the DOM via textContent
  // or innerHTML — always escape HTML entities.
  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatDate(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function formatDateShort(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return `${d.toLocaleString('en', { month: 'short' })} ${d.getDate()}<br>${d.getFullYear()}`;
  }

  /* ── Mobile nav & category filter ───────────────────────────────── */
  function initMobileMenu() {
    const btn      = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    if (!btn || !navLinks) return;

    btn.addEventListener('click', () => navLinks.classList.toggle('show'));
    document.addEventListener('click', e => {
      if (!navLinks.contains(e.target) && !btn.contains(e.target)) {
        navLinks.classList.remove('show');
      }
    });
  }

  function initCategoryFilter() {
    const pills    = document.querySelectorAll('.filter-pill');
    const postRows = document.querySelectorAll('.post-row');
    if (!pills.length) return;

    pills.forEach(pill => {
      pill.addEventListener('click', () => {
        pills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const cat = pill.dataset.category;
        postRows.forEach(row => {
          row.style.display = (cat === 'all' || row.dataset.category === cat) ? 'grid' : 'none';
        });
      });
    });
  }

  function initImagePreview() {
    const input   = document.getElementById('featuredImageInput');
    const preview = document.getElementById('imgPreviewContainer');
    if (!input || !preview) return;

    input.addEventListener('change', function () {
      const file = this.files[0];
      if (!file) return;
      // Only allow image MIME types
      if (!file.type.startsWith('image/')) {
        toast('Please select a valid image file.', 'error');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast('Image must be under 5 MB.', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = e => {
        // Use createElement — never innerHTML with file data
        const img   = document.createElement('img');
        img.src     = e.target.result;
        img.alt     = 'Cover preview';
        img.style.cssText = 'width:100%;height:160px;object-fit:cover;display:block;filter:grayscale(20%);';
        preview.innerHTML = '';
        preview.appendChild(img);
      };
      reader.readAsDataURL(file);
    });
  }

  function initEditorToolbar() {
    // Expose a safe insertText helper for the toolbar buttons
    window.insertText = function (text) {
      const ta = document.getElementById('postContent');
      if (!ta) return;
      const start = ta.selectionStart;
      const end   = ta.selectionEnd;
      ta.value = ta.value.substring(0, start) + text + ta.value.substring(end);
      ta.selectionStart = ta.selectionEnd = start + text.length;
      ta.focus();
    };
  }

  function initNewsletter() {
    const form = document.getElementById('newsletterForm');
    if (!form) return;
    form.addEventListener('submit', e => {
      e.preventDefault();
      toast('Subscribed! Backend newsletter integration coming soon.');
      form.reset();
    });
  }

  /* ── Boot ────────────────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', () => {
    // Theme
    document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        applyTheme(current === 'dark' ? 'light' : 'dark');
      });
    });

    initMobileMenu();
    initCategoryFilter();
    initImagePreview();
    initEditorToolbar();
    initNewsletter();
    initLogout();
    initLoginForm();
    initRegisterForm();
    initCreateBlogForm();
    initDashboard();
    initHomeFeed();
    initBlogDetail();
  });

})();
