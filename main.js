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

  function navigateTo(type, value) {
    if (type === 'file') {
      window.location.hash = '#/file/' + encodeURIComponent(value);
    } else if (type === 'page') {
      window.location.hash = '#/page/' + value;
    }
  }

  function handleHashChange() {
    const route = parseHash();
    if (route.type === 'file') {
      openFile(route.path);
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
    const resp = await fetch(bust('/api/tree'));
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

      header.onclick = () => {
        const collapsed = children.classList.toggle('collapsed');
        header.querySelector('.icon').textContent = collapsed ? '▶' : '▼';
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

  function openFile(path) {
    const id = 'file:' + path;
    let pane = findPane(id);
    if (!pane) {
      pane = { id, type: 'file', path, title: basename(path) };
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
        const div = document.createElement('div');
        div.className = 'md-content';
        div.innerHTML = marked.parse(text);
        container.appendChild(div);
      } else {
        const pre = document.createElement('pre');
        pre.textContent = text;
        container.appendChild(pre);
      }
    } catch (e) {
      container.textContent = 'Error: ' + e.message;
    }
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

    renderSidebarNav();
    loadFileTree();

    window.addEventListener('hashchange', handleHashChange);

    // Intercept markdown link clicks → hash navigation
    document.getElementById('content').addEventListener('click', (e) => {
      const a = e.target.closest('a');
      if (!a) return;
      const href = decodeURIComponent(a.getAttribute('href'));
      if (!href) return;

      // Anchor: #section → let browser handle
      if (href.startsWith('#')) return;

      // External: has a scheme (http, https, mailto, tel, ftp, etc.)
      if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(href)) {
        e.preventDefault();
        window.open(href, '_blank', 'noopener');
        return;
      }

      // Local file: relative path → unipane route
      e.preventDefault();
      const pane = findPane(state.activeId);
      let path = href;
      if (pane && pane.type === 'file') {
        const dir = pane.path.includes('/') ? pane.path.substring(0, pane.path.lastIndexOf('/')) : '';
        path = dir ? dir + '/' + href : href;
      }
      // Normalize ./foo and ../bar
      const parts = path.split('/').filter(Boolean);
      const resolved = [];
      for (const p of parts) {
        if (p === '.') continue;
        if (p === '..') { resolved.pop(); continue; }
        resolved.push(p);
      }
      navigateTo('file', resolved.join('/'));
    });

    handleHashChange();
  }

  init();
})();
