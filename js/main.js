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
    return sessionStorage.getItem('bv_logged_in') === '1';
  }

  function setLoggedIn(val) {
    if (val) sessionStorage.setItem('bv_logged_in', '1');
    else {
      sessionStorage.removeItem('bv_logged_in');
      sessionStorage.removeItem('bv_user');
    }
  }

  /* ── Authentication & Route Guards ───────────────────────────────── */
  let currentUserCache = null;

  async function checkAuth() {
    try {
      const res = await apiFetch('/auth/me');
      const user = res.data?.user;
      if (user) {
        currentUserCache = user;
        setLoggedIn(true);
        sessionStorage.setItem('bv_user', JSON.stringify(user));
        return user;
      }
    } catch (_) {
      currentUserCache = null;
      setLoggedIn(false);
    }
    return null;
  }

  async function requireAuth() {
    const user = await checkAuth();
    if (!user) {
      toast('Please log in to continue.', 'error');
      const currentPath = window.location.pathname.split('/').pop() || 'dashboard.html';
      window.location.href = `login.html?redirect=${encodeURIComponent(currentPath)}`;
      return null;
    }
    return user;
  }

  function updateAuthNav(user) {
    const navRight = document.querySelector('.nav-right');
    if (!navRight) return;

    if (user) {
      // Find login / register buttons on public pages and update to auth state
      const loginBtn = navRight.querySelector('a[href="login.html"]');
      const registerBtn = navRight.querySelector('a[href="register.html"]');

      if (loginBtn) {
        loginBtn.textContent = user.name || 'Dashboard';
        loginBtn.href = 'dashboard.html';
      }
      if (registerBtn) {
        registerBtn.textContent = 'Sign out';
        registerBtn.href = '#';
        registerBtn.classList.remove('btn-primary');
        registerBtn.classList.add('btn-ghost', 'logout-btn');
      }
    }
  }

  /* ── Form Alert Helpers ────────────────────────────────────────── */
  function showFormAlert(alertEl, message, isError = true) {
    if (!alertEl) return;
    alertEl.textContent = message;
    alertEl.style.display = 'block';
    alertEl.style.background = isError ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)';
    alertEl.style.borderLeftColor = isError ? '#ef4444' : '#10b981';
    alertEl.style.color = isError ? '#ef4444' : '#10b981';
  }

  function hideFormAlert(alertEl) {
    if (alertEl) {
      alertEl.style.display = 'none';
      alertEl.textContent = '';
    }
  }

  /* ── Page handlers ────────────────────────────────────────────────── */

  // ---- Login form ----
  async function initLoginForm() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    const alertEl = document.getElementById('authAlert');

    // If user is already authenticated, redirect to dashboard or redirect param
    const cachedUser = await checkAuth();
    if (cachedUser) {
      const redirectUrl = new URLSearchParams(window.location.search).get('redirect') || 'dashboard.html';
      window.location.href = redirectUrl;
      return;
    }

    // Prefill remembered email if available
    const savedEmail = localStorage.getItem('bv_remember_email');
    if (savedEmail && form.email) {
      form.email.value = savedEmail;
      const rememberCheckbox = document.getElementById('remember');
      if (rememberCheckbox) rememberCheckbox.checked = true;
    }

    // Clear alert when user types
    form.querySelectorAll('input').forEach(input => {
      input.addEventListener('input', () => {
        hideFormAlert(alertEl);
        input.style.borderColor = '';
      });
    });

    // Wire "Forgot password?"
    const forgotLink = document.getElementById('forgotPwdLink');
    if (forgotLink) {
      forgotLink.addEventListener('click', (e) => {
        e.preventDefault();
        const enteredEmail = form.email ? form.email.value.trim() : '';
        if (enteredEmail) {
          toast(`Password reset instructions would be sent to ${enteredEmail}. (Demo environment: please use alex@blogverse.com / Password123! or register a new account)`);
        } else {
          toast('Please enter your email address to reset password.', 'error');
          if (form.email) form.email.focus();
        }
      });
    }

    // Wire "Continue with Google"
    const googleBtn = document.getElementById('googleSignInBtn');
    if (googleBtn) {
      googleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        toast('Google Sign-In is disabled. Please sign in with your email & password.');
        showFormAlert(alertEl, 'Google Sign-In is disabled. Please enter your email and password below.');
      });
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideFormAlert(alertEl);

      const btn = form.querySelector('button[type="submit"]');
      const email = form.email.value.trim().toLowerCase();
      const password = form.password.value;
      const remember = document.getElementById('remember')?.checked;

      // Reset styling
      form.email.style.borderColor = '';
      form.password.style.borderColor = '';

      // Validation
      if (!email || !password) {
        showFormAlert(alertEl, 'Please enter both your email address and password.');
        toast('Please fill in all fields.', 'error');
        if (!email) form.email.style.borderColor = '#ef4444';
        if (!password) form.password.style.borderColor = '#ef4444';
        return;
      }

      if (password.length < 8) {
        showFormAlert(alertEl, 'Password must be at least 8 characters long.');
        form.password.style.borderColor = '#ef4444';
        toast('Password must be at least 8 characters.', 'error');
        return;
      }

      setButtonLoading(btn, true);

      try {
        const data = await apiFetch('/auth/login', {
          method: 'POST',
          body:   { email, password },
        });

        // Save or remove remembered email
        if (remember) {
          localStorage.setItem('bv_remember_email', email);
        } else {
          localStorage.removeItem('bv_remember_email');
        }

        setLoggedIn(true);
        sessionStorage.setItem('bv_user', JSON.stringify(data.data.user));
        toast(`Welcome back, ${data.data.user.name}!`);

        const redirectUrl = new URLSearchParams(window.location.search).get('redirect') || 'dashboard.html';
        setTimeout(() => { window.location.href = redirectUrl; }, 600);
      } catch (err) {
        form.email.style.borderColor = '#ef4444';
        form.password.style.borderColor = '#ef4444';
        const msg = err.message || 'Incorrect email or password.';
        showFormAlert(alertEl, msg);
        toast(msg, 'error');
        setButtonLoading(btn, false);
      }
    });
  }

  // ---- Register form ----
  async function initRegisterForm() {
    const form = document.getElementById('registerForm');
    if (!form) return;

    const alertEl = document.getElementById('authAlert');

    // If user is already authenticated, redirect to dashboard
    const cachedUser = await checkAuth();
    if (cachedUser) {
      window.location.href = 'dashboard.html';
      return;
    }

    // Real-time password matching check
    const pwdInput = document.getElementById('regPassword');
    const confirmInput = document.getElementById('confirmPassword');

    function checkPasswordMatch() {
      if (!confirmInput.value) {
        confirmInput.style.borderColor = '';
        return;
      }
      if (pwdInput.value !== confirmInput.value) {
        confirmInput.style.borderColor = '#ef4444';
        showFormAlert(alertEl, 'Passwords do not match.');
      } else {
        confirmInput.style.borderColor = '#10b981';
        hideFormAlert(alertEl);
      }
    }

    if (pwdInput && confirmInput) {
      pwdInput.addEventListener('input', checkPasswordMatch);
      confirmInput.addEventListener('input', checkPasswordMatch);
    }

    // Clear alert when user types in any input
    form.querySelectorAll('input').forEach(input => {
      input.addEventListener('input', () => {
        input.style.borderColor = '';
      });
    });

    // Wire Terms & Privacy links
    const termsLink = document.getElementById('termsLink');
    if (termsLink) {
      termsLink.addEventListener('click', (e) => {
        e.preventDefault();
        toast('Terms of Service: You own 100% of the content you publish on BlogVerse.');
      });
    }

    const privacyLink = document.getElementById('privacyLink');
    if (privacyLink) {
      privacyLink.addEventListener('click', (e) => {
        e.preventDefault();
        toast('Privacy Policy: BlogVerse does not track, sell, or profile user data.');
      });
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideFormAlert(alertEl);

      const btn = form.querySelector('button[type="submit"]');

      const firstName       = form.firstName.value.trim();
      const lastName        = form.lastName.value.trim();
      const name            = `${firstName} ${lastName}`.trim();
      const username        = form.username.value.trim().toLowerCase();
      const email           = form.regEmail.value.trim().toLowerCase();
      const password        = form.regPassword.value;
      const confirmPassword = form.confirmPassword ? form.confirmPassword.value : password;

      // Validation
      if (!firstName || !lastName) {
        showFormAlert(alertEl, 'Please provide both your first name and last name.');
        toast('Please enter your full name.', 'error');
        if (!firstName) form.firstName.style.borderColor = '#ef4444';
        if (!lastName) form.lastName.style.borderColor = '#ef4444';
        return;
      }

      if (!username || username.length < 3) {
        showFormAlert(alertEl, 'Username must be at least 3 characters long.');
        form.username.style.borderColor = '#ef4444';
        toast('Username must be at least 3 characters.', 'error');
        return;
      }

      if (!/^[a-z0-9_]+$/.test(username)) {
        showFormAlert(alertEl, 'Username may only contain lowercase letters, numbers, and underscores (no spaces).');
        form.username.style.borderColor = '#ef4444';
        toast('Username may only contain letters, numbers, and underscores.', 'error');
        return;
      }

      if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
        showFormAlert(alertEl, 'Please provide a valid email address.');
        form.regEmail.style.borderColor = '#ef4444';
        toast('Invalid email address.', 'error');
        return;
      }

      if (password.length < 8) {
        showFormAlert(alertEl, 'Password must be at least 8 characters long.');
        form.regPassword.style.borderColor = '#ef4444';
        toast('Password must be at least 8 characters.', 'error');
        return;
      }

      if (password !== confirmPassword) {
        showFormAlert(alertEl, 'Passwords do not match. Please verify your password confirmation.');
        form.confirmPassword.style.borderColor = '#ef4444';
        toast('Passwords do not match.', 'error');
        return;
      }

      setButtonLoading(btn, true);

      try {
        const data = await apiFetch('/auth/register', {
          method: 'POST',
          body:   { name, username, email, password, confirmPassword },
        });

        setLoggedIn(true);
        sessionStorage.setItem('bv_user', JSON.stringify(data.data.user));
        toast('Account created! Welcome to BlogVerse.');
        setTimeout(() => { window.location.href = 'dashboard.html'; }, 600);
      } catch (err) {
        const msg = err.message || 'Registration failed. Please check your details.';
        showFormAlert(alertEl, msg);
        toast(msg, 'error');
        setButtonLoading(btn, false);
      }
    });
  }

  // ---- Create & Update Blog form (CRUD: Create & Update) ----
  async function initCreateBlogForm() {
    const form = document.getElementById('createBlogForm');
    if (!form) return;

    // Route guard: user must be logged in to write or edit
    const user = await requireAuth();
    if (!user) return;

    // Populate author badge in sidebar
    const authorNameEl = document.getElementById('editorAuthorName');
    if (authorNameEl) authorNameEl.textContent = user.name || 'Author';
    const authorUserEl = document.getElementById('editorAuthorUsername');
    if (authorUserEl) authorUserEl.textContent = `@${user.username || 'author'}`;

    const editId = new URLSearchParams(window.location.search).get('edit');

    // Pre-populate if in edit mode
    if (editId) {
      try {
        const res = await apiFetch(`/blogs/${encodeURIComponent(editId)}`);
        const blog = res.data?.blog;
        if (blog) {
          const topbarLabel = document.querySelector('.editor-topbar-label');
          if (topbarLabel) topbarLabel.textContent = 'Edit article';

          const titleInput = document.getElementById('postTitle');
          if (titleInput) titleInput.value = blog.title || '';

          const contentInput = document.getElementById('postContent');
          if (contentInput) contentInput.value = blog.content || '';

          const excerptInput = document.getElementById('postExcerpt');
          if (excerptInput) excerptInput.value = blog.excerpt || '';

          const categorySelect = document.getElementById('postCategory');
          if (categorySelect) categorySelect.value = blog.category || '';

          const tagsInput = document.getElementById('postTags');
          if (tagsInput) tagsInput.value = (blog.tags || []).join(', ');

          const submitBtns = form.querySelectorAll('button[type="submit"]');
          submitBtns.forEach(btn => {
            btn.textContent = blog.status === 'published' ? 'Update published' : 'Update article';
          });
        }
      } catch (err) {
        toast('Failed to load article: ' + err.message, 'error');
      }
    }

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
        if (editId) {
          // UPDATE (U in CRUD)
          await apiFetch(`/blogs/${encodeURIComponent(editId)}`, {
            method: 'PATCH',
            body:   { title, content, excerpt, category, tags, status },
          });
          toast('Article updated successfully!');
        } else {
          // CREATE (C in CRUD)
          await apiFetch('/blogs', {
            method: 'POST',
            body:   { title, content, excerpt, category, tags, status },
          });
          toast(status === 'published' ? 'Article published!' : 'Draft saved.');
        }

        setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
      } catch (err) {
        if (err.message.toLowerCase().includes('log in') || err.message.includes('401')) {
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
      draftBtn.addEventListener('click', () => {
        form.requestSubmit();
      });
    }
  }

  // ---- Dashboard (Protected Route + User Profile + User Blogs Only) ----
  async function initDashboard() {
    const postsContainer = document.getElementById('dashPostsBody');
    if (!postsContainer) return;

    // 1. Protect private dashboard route
    const user = await requireAuth();
    if (!user) return;

    // 2. Populate user profile and sidebar
    const sidebarName = document.getElementById('sidebarUserName');
    if (sidebarName) sidebarName.textContent = user.name || 'Author';

    const sidebarRole = document.getElementById('sidebarUserRole');
    if (sidebarRole) sidebarRole.textContent = `@${user.username} · ${user.role || 'author'}`;

    const profileName = document.getElementById('profileName');
    if (profileName) profileName.textContent = user.name || '—';

    const profileUser = document.getElementById('profileUsername');
    if (profileUser) profileUser.textContent = `@${user.username}`;

    const profileEmail = document.getElementById('profileEmail');
    if (profileEmail) profileEmail.textContent = user.email || '—';

    const profileRole = document.getElementById('profileRole');
    if (profileRole) profileRole.textContent = (user.role || 'author').toUpperCase();

    const profileInitial = document.getElementById('profileAvatarInitial');
    if (profileInitial) profileInitial.textContent = (user.name || 'A').charAt(0).toUpperCase();

    const pageSub = document.getElementById('dashPageSub');
    if (pageSub) pageSub.textContent = `Welcome back, ${user.name}. Here is your publication at a glance.`;

    // 3. Stats helper
    function renderStats(blogList) {
      const totalEl     = document.getElementById('statTotal');
      const viewsEl     = document.getElementById('statViews');
      const publishedEl = document.getElementById('statPublished');
      const draftsEl    = document.getElementById('statDrafts');

      const totalViews = blogList.reduce((acc, b) => acc + (b.views || 0), 0);
      const publishedCount = blogList.filter(b => b.status === 'published').length;
      const draftCount = blogList.filter(b => b.status === 'draft').length;

      if (totalEl) totalEl.textContent = blogList.length;
      if (viewsEl) viewsEl.textContent = totalViews.toLocaleString();
      if (publishedEl) publishedEl.textContent = publishedCount;
      if (draftsEl) draftsEl.textContent = draftCount;
    }

    // 4. Retrieve and display ONLY the logged-in user's blogs
    try {
      const data = await apiFetch('/blogs/my?limit=50&sort=-createdAt');
      let blogs = data.data.blogs || [];

      renderStats(blogs);

      function renderTable() {
        if (!blogs || blogs.length === 0) {
          postsContainer.innerHTML = `
            <tr>
              <td colspan="6" style="text-align:center; padding:2.5rem; color:var(--text-muted); font-family:var(--font-mono); font-size:0.75rem;">
                You haven't written any articles yet. <a href="create-blog.html" style="color:var(--text-primary); text-decoration:underline;">Write your first post →</a>
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
            <td style="font-family:var(--font-mono); font-size:0.85rem;">${(b.views || 0).toLocaleString()}</td>
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
            const row   = this.closest('tr');
            const title = row?.querySelector('.td-title')?.textContent.trim() || 'this article';
            if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;

            try {
              await apiFetch(`/blogs/${id}`, { method: 'DELETE' });
              blogs = blogs.filter(b => b._id !== id);
              renderStats(blogs);
              renderTable();
              toast('Article deleted successfully.');
            } catch (err) {
              toast(err.message, 'error');
            }
          });
        });
      }

      renderTable();

    } catch (err) {
      if (err.message.toLowerCase().includes('log in') || err.message.includes('401')) {
        window.location.href = 'login.html';
      } else {
        toast(err.message, 'error');
      }
    }
  }

  // ---- Homepage blog feed with Search & Category Filters ----
  async function loadHomeFeed(category = 'all', searchQuery = '') {
    const feedList = document.getElementById('postsFeed');
    const countEl = document.querySelector('.feed-count');
    if (!feedList) return;

    try {
      let url = `/blogs?limit=20&sort=-createdAt`;
      if (category && category !== 'all') {
        url += `&category=${encodeURIComponent(category)}`;
      }
      if (searchQuery) {
        url += `&search=${encodeURIComponent(searchQuery)}`;
      }

      const data = await apiFetch(url);
      const blogs = data.data.blogs;

      if (countEl) {
        countEl.textContent = `${blogs.length} article${blogs.length === 1 ? '' : 's'}`;
      }

      if (!blogs || blogs.length === 0) {
        feedList.innerHTML = `<p style="padding:2.5rem 0; color:var(--text-muted); font-size:0.9rem;">No articles match your search or filter criteria.</p>`;
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
      console.warn('[BlogVerse] Feed load failed:', err.message);
    }
  }

  function initHomeFeed() {
    const feedList = document.getElementById('postsFeed');
    if (!feedList) return;

    let activeCategory = 'all';
    let currentSearch = '';
    let debounceTimer = null;

    loadHomeFeed(activeCategory, currentSearch);

    // Category filter pills
    document.querySelectorAll('.filter-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        activeCategory = pill.dataset.category || 'all';
        loadHomeFeed(activeCategory, currentSearch);
      });
    });

    // Live search input with debounce
    const searchInput = document.getElementById('blogSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          currentSearch = e.target.value.trim();
          loadHomeFeed(activeCategory, currentSearch);
        }, 250);
      });
    }
  }

  // ---- Logout button ----
  function initLogout() {
    document.querySelectorAll('.logout-btn').forEach(btn => {
      btn.onclick = async (e) => {
        e.preventDefault();
        try {
          await apiFetch('/auth/logout', { method: 'POST' });
        } catch (_) { /* ignore */ }
        setLoggedIn(false);
        toast('Logged out successfully.');
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 400);
      };
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

      // Edit & Delete actions on blog detail page (CRUD: Update & Delete)
      const editBtn = document.getElementById('editArticleBtn');
      if (editBtn) {
        editBtn.href = `create-blog.html?edit=${encodeURIComponent(blog._id)}`;
        editBtn.style.display = 'inline-flex';
      }

      const deleteBtn = document.getElementById('deleteArticleBtn');
      if (deleteBtn) {
        deleteBtn.style.display = 'inline-flex';
        deleteBtn.onclick = async () => {
          if (!confirm(`Are you sure you want to delete "${blog.title}"?`)) return;
          try {
            await apiFetch(`/blogs/${encodeURIComponent(blog._id)}`, { method: 'DELETE' });
            toast('Article deleted successfully.');
            setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
          } catch (err) {
            toast('Delete failed: ' + err.message, 'error');
          }
        };
      }

      // Share button
      const shareBtn = document.getElementById('shareArticleBtn');
      if (shareBtn) {
        shareBtn.onclick = () => {
          if (navigator.clipboard) {
            navigator.clipboard.writeText(window.location.href);
            toast('Article link copied to clipboard!');
          } else {
            toast(`Article URL: ${window.location.href}`);
          }
        };
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

  function initLegalAndActionLinks() {
    document.querySelectorAll('.site-footer a[href="#"]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const text = link.textContent.trim();
        if (text.includes('RSS')) {
          toast('RSS Feed endpoint: /api/v1/blogs?limit=50 (JSON feed active)');
        } else if (text.includes('Cookie')) {
          toast('Cookie Policy: BlogVerse uses only essential secure httpOnly session cookies.');
        } else if (text.includes('Privacy')) {
          toast('Privacy Policy: BlogVerse collects zero telemetry or third-party tracker data.');
        } else if (text.includes('Terms')) {
          toast('Terms of Service: You own 100% of all published editorial content.');
        }
      });
    });

    // Sidebar settings link in dashboard
    document.querySelectorAll('.dash-nav-link').forEach(link => {
      if (link.textContent.trim().toLowerCase().includes('settings')) {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const profilePanel = document.getElementById('profilePanel');
          if (profilePanel) {
            profilePanel.scrollIntoView({ behavior: 'smooth' });
            toast('Account settings: Standard Author tier active.');
          }
        });
      }
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
    initLegalAndActionLinks();
    initLogout();
    initLoginForm();
    initRegisterForm();
    initCreateBlogForm();
    initDashboard();
    initHomeFeed();
    initBlogDetail();

    // Sync auth status dynamically to update navbar and user states
    checkAuth().then(user => {
      if (user) {
        updateAuthNav(user);
        initLogout();
      }
    });
  });

})();
