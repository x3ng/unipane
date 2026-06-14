// Unipane — main.js
// Single-file frontend engine. Will be split into TS modules later.

(function () {
  'use strict';

  // ─── Config ──────────────────────────────────────────────

  let config = null;
  let root = '';

  async function loadConfig() {
    const resp = await fetch(bust('./config.json'));
    if (!resp.ok) throw new Error('Failed to load config.json');
    config = await resp.json();
    root = config.root || '..';
  }

  // ─── State ───────────────────────────────────────────────

  const state = {
    panes: [],        // { id, type, path, title, el }
    activeId: null,
    tree: null,
    showHidden: false,
    pendingHistory: null,  // History to pass to next openFile
  };

  // ─── Router ──────────────────────────────────────────────

  function parseHash() {
    const hash = window.location.hash || '#/';
    if (hash.startsWith('#/file/')) {
      return { type: 'file', path: decodeURIComponent(hash.slice(7)) };
    }
    if (hash.startsWith('#/page/')) {
      return { type: 'page', pageId: hash.slice(7) };
    }
    return { type: 'default' };
  }

  function navigateTo(type, value, history) {
    state.pendingHistory = history || null;
    const newHash = type === 'file'
      ? '#/file/' + encodeURIComponent(value)
      : '#/page/' + value;
    // Force hashchange even if hash is the same
    if (window.location.hash === newHash) {
      handleHashChange();
    } else {
      window.location.hash = newHash;
    }
  }

  function handleHashChange() {
    const route = parseHash();
    if (route.type === 'file') {
      const history = state.pendingHistory;
      state.pendingHistory = null;
      openFile(route.path, history);
    } else if (route.type === 'page') {
      openPage(route.pageId);
    } else {
      openDefault();
    }
  }

  // ─── Sidebar ─────────────────────────────────────────────

  function renderSidebarNav() {
    const nav = document.getElementById('sidebar-nav');
    nav.innerHTML = '';
    if (!config || !config.pages) return;

    Object.keys(config.pages).forEach(id => {
      const page = config.pages[id];
      const el = document.createElement('div');
      el.className = 'nav-item' + (state.activeId === 'page:' + id ? ' active' : '');
      el.textContent = page.title || id;
      el.onclick = () => navigateTo('page', id);
      nav.appendChild(el);
    });
  }

  async function loadFileTree() {
    const url = '/api/tree' + (state.showHidden ? '?hidden=true' : '');
    const resp = await fetch(bust(url));
    if (!resp.ok) return;
    state.tree = await resp.json();
    renderFileTree();
  }

  function renderFileTree() {
    const container = document.getElementById('file-tree');
    container.innerHTML = '';
    if (!state.tree) return;
    state.tree.forEach(item => container.appendChild(createTreeNode(item)));
  }

  function createTreeNode(item) {
    const el = document.createElement('div');

    if (item.type === 'dir') {
      const header = document.createElement('div');
      header.className = 'tree-item dir';
      header.innerHTML = `<span class="icon">▶</span> ${escapeHtml(item.name)}`;

      const children = document.createElement('div');
      children.className = 'tree-children collapsed';

      if (item.children) {
        item.children.forEach(child => children.appendChild(createTreeNode(child)));
      }

      // Single click: toggle expand
      header.onclick = () => {
        const collapsed = children.classList.toggle('collapsed');
        header.querySelector('.icon').textContent = collapsed ? '▶' : '▼';
      };

      // Double click: open directory view
      header.ondblclick = (e) => {
        e.stopPropagation();
        navigateTo('file', item.path + '/');
      };

      el.appendChild(header);
      el.appendChild(children);
    } else {
      const file = document.createElement('div');
      file.className = 'tree-item';
      file.innerHTML = `<span class="icon">${fileIcon(item.name)}</span> ${escapeHtml(item.name)}`;
      file.onclick = () => navigateTo('file', item.path);
      el.appendChild(file);
    }

    return el;
  }

  function fileIcon(name) {
    if (name.endsWith('.md')) return '📝';
    if (name.endsWith('.html') || name.endsWith('.htm')) return '🌐';
    if (/\.(png|jpg|jpeg|gif|svg|webp)$/.test(name)) return '🖼';
    return '📄';
  }

  // ─── Tabs ────────────────────────────────────────────────

  function findPane(id) {
    return state.panes.find(p => p.id === id);
  }

  function activatePane(id) {
    state.activeId = id;
    renderTabs();
    renderContent();
    renderSidebarNav();
  }

  function openFile(path, history) {
    const id = 'file:' + path;
    let pane = findPane(id);
    if (!pane) {
      pane = { id, type: 'file', path, title: basename(path), history: history || [] };
      state.panes.push(pane);
    }
    activatePane(id);
  }

  function openPage(pageId) {
    const id = 'page:' + pageId;
    let pane = findPane(id);
    if (!pane) {
      const page = config.pages[pageId];
      pane = { id, type: 'page', pageId, title: (page && page.title) || pageId };
      state.panes.push(pane);
    }
    activatePane(id);
  }

  function openDefault() {
    if (!config) return;
    const dp = config.defaultPage || 'home';
    // Has extension → treat as file path
    if (dp.includes('.')) {
      openFile(dp);
    } else if (config.pages && config.pages[dp]) {
      openPage(dp);
    }
  }

  function closePane(id) {
    const idx = state.panes.findIndex(p => p.id === id);
    if (idx < 0) return;
    state.panes.splice(idx, 1);
    if (state.activeId === id) {
      if (state.panes.length > 0) {
        const newIdx = Math.min(idx, state.panes.length - 1);
        activatePane(state.panes[newIdx].id);
      } else {
        state.activeId = null;
        renderTabs();
        renderContent();
      }
    } else {
      renderTabs();
    }
  }

  function renderTabs() {
    const bar = document.getElementById('tab-bar');
    bar.innerHTML = '';
    state.panes.forEach(pane => {
      const tab = document.createElement('div');
      tab.className = 'tab' + (pane.id === state.activeId ? ' active' : '');

      const label = document.createElement('span');
      label.textContent = pane.title;
      label.onclick = () => activatePane(pane.id);

      const close = document.createElement('span');
      close.className = 'close';
      close.textContent = '×';
      close.onclick = (e) => {
        e.stopPropagation();
        closePane(pane.id);
      };

      tab.appendChild(label);
      tab.appendChild(close);
      bar.appendChild(tab);
    });
  }

  // ─── Content ─────────────────────────────────────────────

  function renderContent() {
    const container = document.getElementById('content');
    container.innerHTML = '';

    if (!state.activeId) {
      container.innerHTML = '<div class="welcome"><h2>Welcome</h2><p>点击左侧文件或页面开始浏览</p></div>';
      return;
    }

    const pane = findPane(state.activeId);
    if (!pane) return;

    if (pane.type === 'file') {
      renderFileContent(container, pane);
    } else if (pane.type === 'page') {
      renderPageContent(container, pane);
    }
  }

  async function renderFileContent(container, pane) {
    const path = root + '/' + pane.path;
    try {
      // Directory: check if path ends with / or is in tree as dir
      if (pane.path.endsWith('/')) {
        renderDirectoryView(container, pane.path);
        return;
      }

      if (/\.(png|jpg|jpeg|gif|svg|webp)$/i.test(pane.path)) {
        const img = document.createElement('img');
        img.src = bust(path);
        img.style.maxWidth = '100%';
        container.appendChild(img);
        return;
      }

      if (pane.path.endsWith('.html') || pane.path.endsWith('.htm')) {
        const iframe = document.createElement('iframe');
        iframe.src = bust(path);
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        container.appendChild(iframe);
        return;
      }

      const resp = await fetch(bust(path));
      if (!resp.ok) {
        container.textContent = 'Failed to load: ' + resp.status;
        return;
      }
      const text = await resp.text();

      if (pane.path.endsWith('.md')) {
        renderMarkdownView(container, pane.path, text);
      } else {
        const pre = document.createElement('pre');
        pre.textContent = text;
        container.appendChild(pre);
      }
    } catch (e) {
      container.textContent = 'Error: ' + e.message;
    }
  }

  function renderDirectoryView(container, dirPath) {
    // Find directory in tree
    function findDir(items, path) {
      for (const item of items) {
        if (item.path === path && item.type === 'dir') return item;
        if (item.children) {
          const found = findDir(item.children, path);
          if (found) return found;
        }
      }
      return null;
    }

    const dir = findDir(state.tree, dirPath.replace(/\/$/, ''));
    if (!dir) {
      container.textContent = 'Directory not found: ' + dirPath;
      return;
    }

    // Breadcrumb: navigation history
    const pane = findPane(state.activeId);
    if (pane && pane.history && pane.history.length > 0) {
      const breadcrumb = document.createElement('div');
      breadcrumb.className = 'breadcrumb';
      pane.history.forEach((h, i) => {
        if (i > 0) {
          const sep = document.createElement('span');
          sep.className = 'sep';
          sep.textContent = '>';
          breadcrumb.appendChild(sep);
        }
        const link = document.createElement('a');
        link.textContent = h.title;
        link.href = '#';
        link.onclick = (e) => {
          e.preventDefault();
          // Go back to this point in history
          pane.history = pane.history.slice(0, i);
          navigateTo('file', h.path);
        };
        breadcrumb.appendChild(link);
      });
      container.appendChild(breadcrumb);
    }

    // Directory listing
    const list = document.createElement('div');
    list.className = 'dir-list';

    if (dirPath !== '' && dirPath !== '.') {
      const parent = document.createElement('div');
      parent.className = 'tree-item';
      parent.innerHTML = '<span class="icon">📁</span> ..';
      parent.onclick = () => {
        const parentPath = dirPath.replace(/\/$/, '').split('/').slice(0, -1).join('/');
        navigateTo('file', parentPath ? parentPath + '/' : '');
      };
      list.appendChild(parent);
    }

    dir.children.forEach(item => {
      const el = document.createElement('div');
      el.className = 'tree-item' + (item.type === 'dir' ? ' dir' : '');
      el.innerHTML = `<span class="icon">${item.type === 'dir' ? '📁' : fileIcon(item.name)}</span> ${escapeHtml(item.name)}`;
      el.onclick = () => navigateTo('file', item.path + (item.type === 'dir' ? '/' : ''));
      list.appendChild(el);
    });

    container.appendChild(list);
  }

  function renderMarkdownView(container, filePath, text) {
    // Breadcrumb: navigation history
    const pane = findPane(state.activeId);
    if (pane && pane.history && pane.history.length > 0) {
      const breadcrumb = document.createElement('div');
      breadcrumb.className = 'breadcrumb';
      pane.history.forEach((h, i) => {
        if (i > 0) {
          const sep = document.createElement('span');
          sep.className = 'sep';
          sep.textContent = '>';
          breadcrumb.appendChild(sep);
        }
        const link = document.createElement('a');
        link.textContent = h.title;
        link.href = '#';
        link.onclick = (e) => {
          e.preventDefault();
          pane.history = pane.history.slice(0, i);
          navigateTo('file', h.path);
        };
        breadcrumb.appendChild(link);
      });
      container.appendChild(breadcrumb);
    }

    // Toolbar
    const toolbar = document.createElement('div');
    toolbar.style.cssText = 'margin-bottom:12px;display:flex;gap:8px;';

    const editBtn = document.createElement('button');
    editBtn.className = 'sidebar-btn';
    editBtn.textContent = '编辑';
    toolbar.appendChild(editBtn);
    container.appendChild(toolbar);

    // Content
    const div = document.createElement('div');
    div.className = 'md-content';
    div.innerHTML = marked.parse(text);
    container.appendChild(div);

    // Fix relative links to absolute paths (for right-click "open in new tab")
    const dir = filePath.includes('/') ? filePath.substring(0, filePath.lastIndexOf('/')) : '';
    div.querySelectorAll('a[href]').forEach(a => {
      const href = a.getAttribute('href');
      if (!href || href.startsWith('#') || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(href)) return;
      // Resolve relative path to absolute
      let absPath = href;
      if (dir) {
        absPath = dir + '/' + href;
      }
      // Normalize
      const parts = absPath.split('/').filter(Boolean);
      const resolved = [];
      for (const p of parts) {
        if (p === '.') continue;
        if (p === '..') { if (resolved.length > 0) resolved.pop(); continue; }
        resolved.push(p);
      }
      a.setAttribute('href', '#/file/' + encodeURIComponent(resolved.join('/')));
    });

    // Checkbox interaction
    div.querySelectorAll('input[type="checkbox"]').forEach((cb, i) => {
      cb.disabled = false;
      cb.style.cursor = 'pointer';
      cb.addEventListener('change', () => {
        const lines = text.split('\n');
        let count = 0;
        for (let j = 0; j < lines.length; j++) {
          if (/^\s*-\s*\[[ x]\]/.test(lines[j])) {
            if (count === i) {
              lines[j] = cb.checked
                ? lines[j].replace('[ ]', '[x]')
                : lines[j].replace('[x]', '[ ]');
              break;
            }
            count++;
          }
        }
        text = lines.join('\n');
        saveFile(filePath, text);
      });
    });

    // Edit mode
    editBtn.addEventListener('click', () => {
      container.innerHTML = '';
      renderMarkdownEditor(container, filePath, text);
    });
  }

  function renderMarkdownEditor(container, filePath, text) {
    const toolbar = document.createElement('div');
    toolbar.style.cssText = 'margin-bottom:12px;display:flex;gap:8px;';

    const saveBtn = document.createElement('button');
    saveBtn.className = 'sidebar-btn active';
    saveBtn.textContent = '保存';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'sidebar-btn';
    cancelBtn.textContent = '取消';

    toolbar.appendChild(saveBtn);
    toolbar.appendChild(cancelBtn);
    container.appendChild(toolbar);

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.cssText = 'width:100%;height:calc(100vh - 160px);padding:12px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:14px;line-height:1.6;border:1px solid var(--border);border-radius:6px;background:var(--bg);color:var(--text);resize:vertical;';
    container.appendChild(textarea);
    textarea.focus();

    saveBtn.addEventListener('click', async () => {
      const newText = textarea.value;
      await saveFile(filePath, newText);
      container.innerHTML = '';
      renderMarkdownView(container, filePath, newText);
    });

    cancelBtn.addEventListener('click', () => {
      container.innerHTML = '';
      renderMarkdownView(container, filePath, text);
    });
  }

  async function saveFile(path, content) {
    await fetch('/api/file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, content }),
    });
  }

  async function renderPageContent(container, pane) {
    const page = config.pages[pane.pageId];
    if (!page) {
      container.textContent = 'Page not found: ' + pane.pageId;
      return;
    }

    if (!page.widgets || page.widgets.length === 0) {
      container.textContent = 'No widgets configured for this page.';
      return;
    }

    const layout = page.layout || 'stack';
    if (layout === 'grid') {
      container.style.display = 'grid';
      container.style.gridTemplateColumns = 'repeat(auto-fill, minmax(300px, 1fr))';
      container.style.gap = '16px';
    } else {
      container.style.display = 'block';
    }

    for (const w of page.widgets) {
      const card = document.createElement('div');
      card.className = 'widget widget-' + (w.type || 'unknown');
      card.style.border = '1px solid #e0e0e0';
      card.style.borderRadius = '8px';
      card.style.padding = '16px';
      card.style.background = '#fff';

      try {
        await renderWidget(card, w);
      } catch (e) {
        card.textContent = 'Widget error: ' + e.message;
        card.style.color = '#c00';
      }

      container.appendChild(card);
    }
  }

  // ─── Widgets ─────────────────────────────────────────────

  async function renderWidget(el, config) {
    const type = config.type || 'md';
    if (type === 'md') {
      await renderMdWidget(el, config);
    } else {
      el.textContent = 'Unknown widget type: ' + type;
    }
  }

  async function renderMdWidget(el, config) {
    if (!config.source) {
      el.textContent = 'md widget: no source specified';
      return;
    }
    const path = root + '/' + config.source;
    const resp = await fetch(bust(path));
    if (!resp.ok) {
      el.textContent = 'Failed to load: ' + config.source;
      return;
    }
    const text = await resp.text();
    const div = document.createElement('div');
    div.className = 'md-content';
    div.innerHTML = marked.parse(text);
    el.appendChild(div);
  }

  // ─── Helpers ─────────────────────────────────────────────

  function bust(url) {
    return url + (url.includes('?') ? '&' : '?') + '_t=' + Date.now();
  }

  function basename(path) {
    return path.split('/').pop() || path;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ─── Init ────────────────────────────────────────────────

  async function init() {
    try {
      await loadConfig();
    } catch (e) {
      document.getElementById('content').innerHTML =
        '<div class="welcome"><h2>Error</h2><p>Failed to load config: ' + escapeHtml(e.message) + '</p></div>';
      return;
    }

    document.title = config.title || 'Unipane';

    // Load custom CSS (user's own CSS file, always applied)
    if (config.css) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = bust(root + '/' + config.css);
      document.head.appendChild(link);
    }

    renderSidebarNav();
    loadFileTree();

    // Toggle hidden files
    document.getElementById('toggle-hidden').addEventListener('click', () => {
      state.showHidden = !state.showHidden;
      document.getElementById('toggle-hidden').classList.toggle('active', state.showHidden);
      loadFileTree();
    });

    // Theme toggle: auto → light → dark → auto
    const themeBtn = document.getElementById('toggle-theme');
    const saved = localStorage.getItem('unipane-theme');
    if (saved) document.documentElement.dataset.theme = saved;

    function updateThemeBtn() {
      const t = document.documentElement.dataset.theme;
      themeBtn.textContent = t === 'light' ? '☀' : t === 'dark' ? '☾' : '◐';
    }
    updateThemeBtn();

    themeBtn.addEventListener('click', () => {
      const cur = document.documentElement.dataset.theme;
      const next = cur === 'light' ? 'dark' : cur === 'dark' ? '' : 'light';
      if (next) {
        document.documentElement.dataset.theme = next;
        localStorage.setItem('unipane-theme', next);
      } else {
        delete document.documentElement.dataset.theme;
        localStorage.removeItem('unipane-theme');
      }
      updateThemeBtn();
    });

    // CSS theme toggle: default → github → notion → default
    const THEMES = ['default', 'github', 'notion'];
    const cssBtn = document.getElementById('toggle-css');
    let currentCss = localStorage.getItem('unipane-css') || config.theme || 'default';
    let themeLink = null;

    // Always load default.css as base
    const baseLink = document.createElement('link');
    baseLink.rel = 'stylesheet';
    baseLink.href = bust('/.unipane/themes/default.css');
    document.head.appendChild(baseLink);

    function applyCssTheme(name) {
      if (themeLink) themeLink.remove();
      if (name && name !== 'default') {
        themeLink = document.createElement('link');
        themeLink.rel = 'stylesheet';
        themeLink.href = bust('/.unipane/themes/' + name + '.css');
        document.head.appendChild(themeLink);
      }
      cssBtn.textContent = name === 'default' ? 'Aa' : name;
      cssBtn.classList.toggle('active', name !== 'default');
    }

    applyCssTheme(currentCss);

    cssBtn.addEventListener('click', () => {
      const idx = THEMES.indexOf(currentCss);
      currentCss = THEMES[(idx + 1) % THEMES.length];
      localStorage.setItem('unipane-css', currentCss);
      applyCssTheme(currentCss);
    });

    window.addEventListener('hashchange', handleHashChange);

    // Intercept markdown link clicks → hash navigation
    document.getElementById('content').addEventListener('click', (e) => {
      const a = e.target.closest('a');
      if (!a) return;
      const href = decodeURIComponent(a.getAttribute('href'));
      if (!href) return;

      // Internal hash link (#/file/... or #/page/...) — may need manual trigger
      if (href.startsWith('#/')) {
        e.preventDefault();
        // Build history from current pane
        const pane = findPane(state.activeId);
        const newHistory = (pane && pane.history) ? [...pane.history] : [];
        if (pane && pane.path) {
          newHistory.push({ path: pane.path, title: pane.title });
        }
        state.pendingHistory = newHistory;
        if (window.location.hash === href) {
          handleHashChange();
        } else {
          window.location.hash = href;
        }
        return;
      }

      // Anchor: #section → let browser handle
      if (href.startsWith('#')) return;

      // External: has a scheme (http, https, mailto, tel, ftp, etc.)
      if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(href)) {
        e.preventDefault();
        window.open(href, '_blank', 'noopener');
        return;
      }
    });

    handleHashChange();
  }

  init();
})();
