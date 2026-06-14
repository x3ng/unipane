"use strict";
(() => {
  // src/core/api.ts
  var bust = (url) => url + (url.includes("?") ? "&" : "?") + "_t=" + Date.now();
  async function fetchConfig() {
    const resp = await fetch(bust("./config.json"));
    if (!resp.ok)
      throw new Error("Failed to load config.json");
    return resp.json();
  }
  async function fetchTree(showHidden = false) {
    const url = "/api/tree" + (showHidden ? "?hidden=true" : "");
    const resp = await fetch(bust(url));
    if (!resp.ok)
      throw new Error("Failed to load file tree");
    return resp.json();
  }
  async function fetchFile(path) {
    const resp = await fetch(bust(path));
    if (!resp.ok)
      throw new Error(`Failed to load: ${resp.status}`);
    return resp.text();
  }
  async function saveFile(path, content) {
    await fetch("/api/file", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, content })
    });
  }

  // src/core/router.ts
  var Router = class {
    constructor() {
      this.panes = [];
      this.activeId = null;
      this.pendingHistory = null;
      this.config = {};
      this.root = "";
      // Callbacks
      this.onPaneChange = () => {
      };
      this.onContentRender = () => {
      };
    }
    setConfig(config, root) {
      this.config = config;
      this.root = root;
    }
    setCallbacks(onPaneChange, onContentRender) {
      this.onPaneChange = onPaneChange;
      this.onContentRender = onContentRender;
    }
    init() {
      window.addEventListener("hashchange", () => this.handleHashChange());
      this.handleHashChange();
    }
    navigateTo(type, value, history) {
      this.pendingHistory = history || null;
      const newHash = type === "file" ? "#/file/" + encodeURIComponent(value) : "#/page/" + value;
      if (window.location.hash === newHash) {
        this.handleHashChange();
      } else {
        window.location.hash = newHash;
      }
    }
    async handleHashChange() {
      const route = this.parseHash();
      if (route.type === "file") {
        const history = this.pendingHistory;
        this.pendingHistory = null;
        await this.openFile(route.path, history);
      } else if (route.type === "page") {
        this.openPage(route.pageId);
      } else {
        await this.openDefault();
      }
    }
    parseHash() {
      const hash = window.location.hash || "#/";
      if (hash.startsWith("#/file/")) {
        return { type: "file", path: decodeURIComponent(hash.slice(7)) };
      }
      if (hash.startsWith("#/page/")) {
        return { type: "page", pageId: hash.slice(7) };
      }
      return { type: "default" };
    }
    async openFile(path, history) {
      const id = "file:" + path;
      let pane = this.findPane(id);
      if (!pane) {
        pane = { id, type: "file", path, title: this.basename(path), history: history || [] };
        this.panes.push(pane);
      }
      await this.activatePane(id);
    }
    openPage(pageId) {
      const id = "page:" + pageId;
      let pane = this.findPane(id);
      if (!pane) {
        const page = this.config.pages?.[pageId];
        pane = { id, type: "page", pageId, title: page?.title || pageId, history: [] };
        this.panes.push(pane);
      }
      this.activatePane(id);
    }
    async openDefault() {
      const dp = this.config.defaultPage || "home";
      if (dp.includes(".")) {
        await this.openFile(dp);
      } else if (this.config.pages?.[dp]) {
        this.openPage(dp);
      }
    }
    closePane(id) {
      const idx = this.panes.findIndex((p) => p.id === id);
      if (idx < 0)
        return;
      this.panes.splice(idx, 1);
      if (this.activeId === id) {
        if (this.panes.length > 0) {
          const newIdx = Math.min(idx, this.panes.length - 1);
          this.activatePane(this.panes[newIdx].id);
        } else {
          this.activeId = null;
          this.onPaneChange();
        }
      } else {
        this.onPaneChange();
      }
    }
    activatePane(id) {
      this.activeId = id;
      const pane = this.findPane(id);
      if (pane)
        this.onContentRender(pane);
      this.onPaneChange();
    }
    getActivePane() {
      return this.activeId ? this.findPane(this.activeId) : null;
    }
    getPanes() {
      return this.panes;
    }
    getActiveId() {
      return this.activeId;
    }
    findPane(id) {
      return this.panes.find((p) => p.id === id);
    }
    basename(path) {
      return path.split("/").pop() || path;
    }
  };

  // src/core/theme.ts
  var THEMES = ["default", "github", "notion"];
  var ThemeManager = class {
    constructor() {
      this.themeLink = null;
      this.baseLink = null;
      this.currentCss = localStorage.getItem("unipane-css") || "default";
    }
    init(config) {
      this.baseLink = document.createElement("link");
      this.baseLink.rel = "stylesheet";
      this.baseLink.href = bust("/.unipane/themes/default.css");
      document.head.appendChild(this.baseLink);
      const saved = localStorage.getItem("unipane-css");
      this.currentCss = saved || config.theme || "default";
      this.applyCssTheme(this.currentCss);
      const savedTheme = localStorage.getItem("unipane-theme");
      if (savedTheme)
        document.documentElement.dataset.theme = savedTheme;
      if (config.css) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = bust(config.css);
        document.head.appendChild(link);
      }
    }
    cycleTheme() {
      const cur = document.documentElement.dataset.theme;
      const next = cur === "light" ? "dark" : cur === "dark" ? "" : "light";
      if (next) {
        document.documentElement.dataset.theme = next;
        localStorage.setItem("unipane-theme", next);
      } else {
        delete document.documentElement.dataset.theme;
        localStorage.removeItem("unipane-theme");
      }
    }
    getThemeIcon() {
      const t = document.documentElement.dataset.theme;
      return t === "light" ? "\u2600" : t === "dark" ? "\u263E" : "\u25D0";
    }
    cycleCssTheme() {
      const idx = THEMES.indexOf(this.currentCss);
      this.currentCss = THEMES[(idx + 1) % THEMES.length];
      localStorage.setItem("unipane-css", this.currentCss);
      this.applyCssTheme(this.currentCss);
    }
    getCssThemeName() {
      return this.currentCss === "default" ? "Aa" : this.currentCss;
    }
    isCssThemeActive() {
      return this.currentCss !== "default";
    }
    applyCssTheme(name) {
      if (this.themeLink)
        this.themeLink.remove();
      if (name && name !== "default") {
        this.themeLink = document.createElement("link");
        this.themeLink.rel = "stylesheet";
        this.themeLink.href = bust("/.unipane/themes/" + name + ".css");
        document.head.appendChild(this.themeLink);
      }
    }
  };

  // src/core/sidebar.ts
  var Sidebar = class {
    constructor(router, theme) {
      this.tree = [];
      this.showHidden = false;
      this.router = router;
      this.theme = theme;
    }
    async init(config) {
      this.renderNav(config);
      await this.loadTree();
      this.setupResize();
      this.setupToggle();
    }
    renderNav(config) {
      const nav = document.getElementById("sidebar-nav");
      nav.innerHTML = "";
      if (!config.pages)
        return;
      Object.keys(config.pages).forEach((id) => {
        const page = config.pages[id];
        const el = document.createElement("div");
        el.className = "nav-item";
        el.textContent = page.title || id;
        el.onclick = () => this.router.navigateTo("page", id);
        nav.appendChild(el);
      });
    }
    async loadTree() {
      try {
        this.tree = await fetchTree(this.showHidden);
        this.renderTree();
      } catch (e) {
        console.error("Failed to load tree:", e);
      }
    }
    renderTree() {
      const container = document.getElementById("file-tree");
      container.innerHTML = "";
      this.tree.forEach((item) => container.appendChild(this.createTreeNode(item)));
    }
    createTreeNode(item) {
      const el = document.createElement("div");
      if (item.type === "dir") {
        const header = document.createElement("div");
        header.className = "tree-item dir";
        header.innerHTML = `<span class="icon">\u25B6</span> ${this.escapeHtml(item.name)}`;
        const children = document.createElement("div");
        children.className = "tree-children collapsed";
        if (item.children) {
          item.children.forEach((child) => children.appendChild(this.createTreeNode(child)));
        }
        header.onclick = () => {
          const collapsed = children.classList.toggle("collapsed");
          header.querySelector(".icon").textContent = collapsed ? "\u25B6" : "\u25BC";
        };
        header.ondblclick = (e) => {
          e.stopPropagation();
          this.router.navigateTo("file", item.path + "/");
        };
        el.appendChild(header);
        el.appendChild(children);
      } else {
        const file = document.createElement("div");
        file.className = "tree-item";
        file.innerHTML = `<span class="icon">${this.fileIcon(item.name)}</span> ${this.escapeHtml(item.name)}`;
        file.onclick = () => this.router.navigateTo("file", item.path);
        el.appendChild(file);
      }
      return el;
    }
    setupResize() {
      const sidebar = document.getElementById("sidebar");
      const handle = document.getElementById("sidebar-resize");
      if (!sidebar || !handle)
        return;
      let resizing = false;
      const savedWidth = localStorage.getItem("unipane-sidebar-width");
      if (savedWidth)
        sidebar.style.width = savedWidth;
      handle.addEventListener("mousedown", (e) => {
        resizing = true;
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
        e.preventDefault();
      });
      document.addEventListener("mousemove", (e) => {
        if (!resizing)
          return;
        const w = Math.max(150, Math.min(window.innerWidth * 0.5, e.clientX));
        sidebar.style.width = w + "px";
      });
      document.addEventListener("mouseup", () => {
        if (!resizing)
          return;
        resizing = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        localStorage.setItem("unipane-sidebar-width", sidebar.style.width);
      });
    }
    setupToggle() {
      const sidebar = document.getElementById("sidebar");
      const btn = document.getElementById("toggle-sidebar");
      if (!sidebar || !btn)
        return;
      btn.addEventListener("click", () => {
        sidebar.classList.toggle("hidden");
        btn.textContent = sidebar.classList.contains("hidden") ? "\u25B6" : "\u25C0";
      });
    }
    setupHiddenToggle() {
      const btn = document.getElementById("toggle-hidden");
      btn.addEventListener("click", async () => {
        this.showHidden = !this.showHidden;
        btn.classList.toggle("active", this.showHidden);
        await this.loadTree();
      });
    }
    fileIcon(name) {
      if (name.endsWith(".md"))
        return "\u{1F4DD}";
      if (name.endsWith(".html") || name.endsWith(".htm"))
        return "\u{1F310}";
      if (/\.(png|jpg|jpeg|gif|svg|webp)$/i.test(name))
        return "\u{1F5BC}";
      return "\u{1F4C4}";
    }
    escapeHtml(str) {
      const div = document.createElement("div");
      div.textContent = str;
      return div.innerHTML;
    }
  };

  // src/plugins/markdown.ts
  var markdownPlugin = {
    match(filepath) {
      return filepath.endsWith(".md");
    },
    render(ctx) {
      const div = document.createElement("div");
      div.className = "md-content";
      div.innerHTML = marked.parse(ctx.content || "");
      ctx.container.appendChild(div);
      this.fixLinks(div, ctx.filepath);
      this.setupCheckboxes(div, ctx);
      const toolbar = document.createElement("div");
      toolbar.style.cssText = "margin-bottom:12px;display:flex;gap:8px;";
      const editBtn = document.createElement("button");
      editBtn.className = "sidebar-btn";
      editBtn.textContent = "\u7F16\u8F91";
      toolbar.appendChild(editBtn);
      ctx.container.insertBefore(toolbar, div);
      editBtn.addEventListener("click", () => {
        ctx.container.innerHTML = "";
        this.renderEditor(ctx);
      });
    },
    fixLinks(div, filepath) {
      const dir = filepath.includes("/") ? filepath.substring(0, filepath.lastIndexOf("/")) : "";
      div.querySelectorAll("a[href]").forEach((a) => {
        const rawHref = a.getAttribute("href");
        if (!rawHref || rawHref.startsWith("#") || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(rawHref))
          return;
        const href = decodeURIComponent(rawHref);
        let absPath = href;
        if (dir)
          absPath = dir + "/" + href;
        const parts = absPath.split("/").filter(Boolean);
        const resolved = [];
        for (const p of parts) {
          if (p === ".")
            continue;
          if (p === "..") {
            if (resolved.length > 0)
              resolved.pop();
            continue;
          }
          resolved.push(p);
        }
        a.setAttribute("href", "#/file/" + encodeURIComponent(resolved.join("/")));
      });
    },
    setupCheckboxes(div, ctx) {
      div.querySelectorAll('input[type="checkbox"]').forEach((cb, i) => {
        const input = cb;
        input.disabled = false;
        input.style.cursor = "pointer";
        input.addEventListener("change", async () => {
          const lines = (ctx.content || "").split("\n");
          let count = 0;
          for (let j = 0; j < lines.length; j++) {
            if (/^\s*-\s*\[[ x]\]/.test(lines[j])) {
              if (count === i) {
                lines[j] = input.checked ? lines[j].replace("[ ]", "[x]") : lines[j].replace("[x]", "[ ]");
                break;
              }
              count++;
            }
          }
          const newContent = lines.join("\n");
          ctx.content = newContent;
          await ctx.saveFile(ctx.filepath, newContent);
        });
      });
    },
    renderEditor(ctx) {
      const toolbar = document.createElement("div");
      toolbar.style.cssText = "margin-bottom:12px;display:flex;gap:8px;";
      const saveBtn = document.createElement("button");
      saveBtn.className = "sidebar-btn active";
      saveBtn.textContent = "\u4FDD\u5B58";
      const cancelBtn = document.createElement("button");
      cancelBtn.className = "sidebar-btn";
      cancelBtn.textContent = "\u53D6\u6D88";
      toolbar.appendChild(saveBtn);
      toolbar.appendChild(cancelBtn);
      ctx.container.appendChild(toolbar);
      const textarea = document.createElement("textarea");
      textarea.value = ctx.content || "";
      textarea.style.cssText = "width:100%;height:calc(100vh - 160px);padding:12px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:14px;line-height:1.6;border:1px solid var(--border);border-radius:6px;background:var(--bg);color:var(--text);resize:vertical;";
      ctx.container.appendChild(textarea);
      textarea.focus();
      saveBtn.addEventListener("click", async () => {
        const newContent = textarea.value;
        await ctx.saveFile(ctx.filepath, newContent);
        ctx.container.innerHTML = "";
        ctx.content = newContent;
        this.render(ctx);
      });
      cancelBtn.addEventListener("click", () => {
        ctx.container.innerHTML = "";
        this.render(ctx);
      });
    }
  };

  // src/plugins/directory.ts
  var directoryPlugin = {
    match(filepath) {
      return filepath.endsWith("/");
    },
    render(ctx) {
      const tree = window.__unipane_tree;
      if (!tree) {
        ctx.container.textContent = "File tree not loaded";
        return;
      }
      const dirPath = ctx.filepath.replace(/\/$/, "");
      const dir = this.findDir(tree, dirPath);
      if (!dir) {
        ctx.container.textContent = "Directory not found: " + dirPath;
        return;
      }
      const list = document.createElement("div");
      list.className = "dir-list";
      if (dirPath && dirPath !== ".") {
        const parent = document.createElement("div");
        parent.className = "tree-item";
        parent.innerHTML = '<span class="icon">\u{1F4C1}</span> ..';
        parent.onclick = () => {
          const parentPath = dirPath.split("/").slice(0, -1).join("/");
          ctx.openFile(parentPath ? parentPath + "/" : "");
        };
        list.appendChild(parent);
      }
      dir.children?.forEach((item) => {
        const el = document.createElement("div");
        el.className = "tree-item" + (item.type === "dir" ? " dir" : "");
        const icon = item.type === "dir" ? "\u{1F4C1}" : this.fileIcon(item.name);
        el.innerHTML = `<span class="icon">${icon}</span> ${this.escapeHtml(item.name)}`;
        el.onclick = () => ctx.openFile(item.path + (item.type === "dir" ? "/" : ""));
        list.appendChild(el);
      });
      ctx.container.appendChild(list);
    },
    findDir(items, path) {
      for (const item of items) {
        if (item.path === path && item.type === "dir")
          return item;
        if (item.children) {
          const found = this.findDir(item.children, path);
          if (found)
            return found;
        }
      }
      return null;
    },
    fileIcon(name) {
      if (name.endsWith(".md"))
        return "\u{1F4DD}";
      if (name.endsWith(".html") || name.endsWith(".htm"))
        return "\u{1F310}";
      if (/\.(png|jpg|jpeg|gif|svg|webp)$/i.test(name))
        return "\u{1F5BC}";
      return "\u{1F4C4}";
    },
    escapeHtml(str) {
      const div = document.createElement("div");
      div.textContent = str;
      return div.innerHTML;
    }
  };

  // src/plugins/image.ts
  var imagePlugin = {
    match(filepath) {
      return /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(filepath);
    },
    render(ctx) {
      const img = document.createElement("img");
      img.src = bust(ctx.root + "/" + ctx.filepath);
      img.style.maxWidth = "100%";
      ctx.container.appendChild(img);
    }
  };

  // src/plugins/html.ts
  var htmlPlugin = {
    match(filepath) {
      return filepath.endsWith(".html") || filepath.endsWith(".htm");
    },
    render(ctx) {
      const iframe = document.createElement("iframe");
      iframe.src = bust(ctx.root + "/" + ctx.filepath);
      iframe.style.width = "100%";
      iframe.style.height = "100%";
      iframe.style.border = "none";
      ctx.container.appendChild(iframe);
    }
  };

  // src/plugins/raw.ts
  var rawPlugin = {
    match(_filepath) {
      return true;
    },
    render(ctx) {
      const pre = document.createElement("pre");
      pre.textContent = ctx.content || "";
      ctx.container.appendChild(pre);
    }
  };

  // src/main.ts
  var plugins = [
    directoryPlugin,
    imagePlugin,
    htmlPlugin,
    markdownPlugin,
    rawPlugin
    // fallback
  ];
  function findPlugin(filepath) {
    return plugins.find((p) => p.match(filepath)) || rawPlugin;
  }
  async function main() {
    let config;
    try {
      config = await fetchConfig();
    } catch (e) {
      document.getElementById("content").innerHTML = '<div class="welcome"><h2>Error</h2><p>Failed to load config</p></div>';
      return;
    }
    const root = config.root || "..";
    document.title = config.title || "Unipane";
    const router = new Router();
    const theme = new ThemeManager();
    const sidebar = new Sidebar(router, theme);
    router.setConfig(config, root);
    function renderTabs() {
      const bar = document.getElementById("tab-bar");
      bar.innerHTML = "";
      router.getPanes().forEach((pane) => {
        const tab = document.createElement("div");
        tab.className = "tab" + (pane.id === router.getActiveId() ? " active" : "");
        const label = document.createElement("span");
        label.textContent = pane.title;
        label.onclick = () => router.navigateTo(
          pane.type,
          pane.path || pane.pageId || ""
        );
        const close = document.createElement("span");
        close.className = "close";
        close.textContent = "\xD7";
        close.onclick = (e) => {
          e.stopPropagation();
          router.closePane(pane.id);
        };
        tab.appendChild(label);
        tab.appendChild(close);
        bar.appendChild(tab);
      });
    }
    async function renderContent(pane) {
      const container = document.getElementById("content");
      container.innerHTML = "";
      if (pane.type === "file" && pane.path) {
        if (pane.path.endsWith("/")) {
          ;
          window.__unipane_tree = sidebar.tree;
          renderBreadcrumb(container, pane);
          const ctx = makeContext(container, pane);
          directoryPlugin.render(ctx);
          return;
        }
        try {
          const content = await fetchFile(root + "/" + pane.path);
          renderBreadcrumb(container, pane);
          const plugin = findPlugin(pane.path);
          const ctx = makeContext(container, pane, content);
          plugin.render(ctx);
        } catch (e) {
          container.textContent = "Error: " + e.message;
        }
      } else if (pane.type === "page") {
        container.textContent = "Page view not yet implemented";
      }
    }
    function makeContext(container, pane, content) {
      return {
        container,
        filepath: pane.path || "",
        content: content || null,
        root,
        saveFile: async (path, content2) => {
          await saveFile(path, content2);
        },
        openFile: (path, history) => {
          router.navigateTo("file", path, history);
        },
        showBreadcrumb: (items) => {
        }
      };
    }
    function renderBreadcrumb(container, pane) {
      if (!pane.history || pane.history.length === 0)
        return;
      const breadcrumb = document.createElement("div");
      breadcrumb.className = "breadcrumb";
      pane.history.forEach((h, i) => {
        if (i > 0) {
          const sep = document.createElement("span");
          sep.className = "sep";
          sep.textContent = ">";
          breadcrumb.appendChild(sep);
        }
        const link = document.createElement("a");
        link.textContent = h.title;
        link.href = "#";
        link.onclick = (e) => {
          e.preventDefault();
          pane.history = pane.history.slice(0, i);
          router.navigateTo("file", h.path);
        };
        breadcrumb.appendChild(link);
      });
      container.appendChild(breadcrumb);
    }
    router.setCallbacks(renderTabs, renderContent);
    theme.init(config);
    await sidebar.init(config);
    sidebar.setupHiddenToggle();
    document.getElementById("toggle-theme").addEventListener("click", () => {
      theme.cycleTheme();
      document.getElementById("toggle-theme").textContent = theme.getThemeIcon();
    });
    document.getElementById("toggle-theme").textContent = theme.getThemeIcon();
    document.getElementById("toggle-css").addEventListener("click", () => {
      theme.cycleCssTheme();
      const btn = document.getElementById("toggle-css");
      btn.textContent = theme.getCssThemeName();
      btn.classList.toggle("active", theme.isCssThemeActive());
    });
    const cssBtn = document.getElementById("toggle-css");
    cssBtn.textContent = theme.getCssThemeName();
    cssBtn.classList.toggle("active", theme.isCssThemeActive());
    document.getElementById("content").addEventListener("click", (e) => {
      const a = e.target.closest("a");
      if (!a)
        return;
      const href = a.getAttribute("href");
      if (!href)
        return;
      if (href.startsWith("#/")) {
        e.preventDefault();
        const pane = router.getActivePane();
        const newHistory = pane ? [...pane.history] : [];
        if (pane?.path) {
          newHistory.push({ path: pane.path, title: pane.title });
        }
        router.navigateTo("file", decodeURIComponent(href.replace("#/file/", "")), newHistory);
        return;
      }
    });
    router.init();
  }
  main();
})();
