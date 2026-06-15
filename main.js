"use strict";
(() => {
  // src/core/pane.ts
  var paneId = 0;
  var Pane = class _Pane {
    // buffer 渲染容器
    constructor(parent = null) {
      this.children = null;
      this.direction = null;
      this.ratio = 1;
      this.buffer = null;
      this.contentEl = null;
      this.id = `pane-${++paneId}`;
      this.parent = parent;
      this.element = document.createElement("div");
      this.element.className = "pane";
      this.element.dataset.paneId = this.id;
    }
    get isLeaf() {
      return this.children === null;
    }
    /** 分割当前 Pane，返回两个子 Pane */
    split(dir, ratio = 0.5) {
      if (!this.isLeaf)
        throw new Error("Cannot split a non-leaf pane");
      const savedBuffer = this.buffer;
      this.buffer = null;
      this.contentEl = null;
      const left = new _Pane(this);
      const right = new _Pane(this);
      left.ratio = ratio;
      right.ratio = 1 - ratio;
      this.children = [left, right];
      this.direction = dir;
      this.element.innerHTML = "";
      this.element.classList.add("pane-split");
      this.element.style.display = "flex";
      this.element.style.flexDirection = dir === "horizontal" ? "row" : "column";
      left.element.style.flex = `${ratio}`;
      right.element.style.flex = `${1 - ratio}`;
      this.element.appendChild(left.element);
      const handle = document.createElement("div");
      handle.className = "pane-resize-handle";
      handle.style.flexShrink = "0";
      this.setupResizeHandle(handle, left, right);
      this.element.appendChild(handle);
      this.element.appendChild(right.element);
      if (savedBuffer) {
        left.showBuffer(savedBuffer, () => {
        });
      }
      return [left, right];
    }
    /** 显示 Buffer，render 回调负责实际渲染 */
    showBuffer(buffer, render) {
      this.buffer = buffer;
      this.element.innerHTML = "";
      this.element.className = "pane";
      const container = document.createElement("div");
      container.className = "buffer-content";
      this.contentEl = container;
      this.element.appendChild(container);
      render(container);
    }
    /** 清除 Buffer，显示空白 */
    clearBuffer() {
      this.buffer = null;
      this.element.innerHTML = "";
      this.element.className = "pane";
      this.contentEl = null;
    }
    /** 关闭当前 Pane */
    close() {
      if (!this.parent || !this.parent.children)
        return;
      const sibling = this.parent.children[0] === this ? this.parent.children[1] : this.parent.children[0];
      const grandparent = this.parent.parent;
      if (grandparent && grandparent.children) {
        const idx = grandparent.children[0] === this.parent ? 0 : 1;
        grandparent.children[idx] = sibling;
        sibling.parent = grandparent;
        this.parent.element.replaceWith(sibling.element);
      } else {
        sibling.parent = null;
        this.parent.element.replaceWith(sibling.element);
      }
    }
    /** 调整分割比例 */
    resize(ratio) {
      if (!this.parent || !this.parent.children)
        return;
      const [left, right] = this.parent.children;
      const isLeft = left === this;
      left.ratio = isLeft ? ratio : 1 - ratio;
      right.ratio = isLeft ? 1 - ratio : ratio;
      left.element.style.flex = `${left.ratio}`;
      right.element.style.flex = `${right.ratio}`;
    }
    setupResizeHandle(handle, left, right) {
      let startPos = 0;
      let startRatio = 0;
      const isHorizontal = this.direction === "horizontal";
      const onMove = (e) => {
        const delta = isHorizontal ? e.clientX - startPos : e.clientY - startPos;
        const containerSize = isHorizontal ? this.element.clientWidth : this.element.clientHeight;
        if (containerSize === 0)
          return;
        const newRatio = Math.max(0.1, Math.min(0.9, startRatio + delta / containerSize));
        left.ratio = newRatio;
        right.ratio = 1 - newRatio;
        left.element.style.flex = `${newRatio}`;
        right.element.style.flex = `${1 - newRatio}`;
        localStorage.setItem(`unipane-pane-${this.id}`, String(newRatio));
      };
      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
      handle.addEventListener("mousedown", (e) => {
        e.preventDefault();
        startPos = isHorizontal ? e.clientX : e.clientY;
        startRatio = left.ratio;
        document.body.style.cursor = isHorizontal ? "col-resize" : "row-resize";
        document.body.style.userSelect = "none";
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
      });
      const saved = localStorage.getItem(`unipane-pane-${this.id}`);
      if (saved) {
        const ratio = parseFloat(saved);
        if (!isNaN(ratio) && ratio > 0.1 && ratio < 0.9) {
          left.ratio = ratio;
          right.ratio = 1 - ratio;
          left.element.style.flex = `${ratio}`;
          right.element.style.flex = `${1 - ratio}`;
        }
      }
    }
    findPaneByBuffer(bufferId) {
      if (this.isLeaf && this.buffer?.id === bufferId)
        return this;
      if (this.children) {
        return this.children[0].findPaneByBuffer(bufferId) || this.children[1].findPaneByBuffer(bufferId);
      }
      return null;
    }
    getLeaves() {
      if (this.isLeaf)
        return [this];
      if (!this.children)
        return [];
      return [...this.children[0].getLeaves(), ...this.children[1].getLeaves()];
    }
  };

  // src/core/buffer.ts
  var Buffer = class {
    constructor(path, mode) {
      this.state = {};
      this.id = path;
      this.path = path;
      this.mode = mode;
    }
  };

  // src/core/mode-registry.ts
  var ModeRegistry = class {
    constructor() {
      this.modes = [];
    }
    register(mode) {
      this.modes.push(mode);
    }
    findMode(path) {
      for (const mode of this.modes) {
        if (mode.match(path))
          return mode;
      }
      return null;
    }
    findModeByName(name) {
      return this.modes.find((m) => m.name === name) || null;
    }
  };

  // src/core/events.ts
  var EventBus = class {
    constructor() {
      this.listeners = /* @__PURE__ */ new Map();
    }
    on(event, callback) {
      if (!this.listeners.has(event)) {
        this.listeners.set(event, /* @__PURE__ */ new Set());
      }
      this.listeners.get(event).add(callback);
    }
    off(event, callback) {
      this.listeners.get(event)?.delete(callback);
    }
    emit(event, data) {
      this.listeners.get(event)?.forEach((cb) => cb(data));
    }
  };

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
  async function saveFile(path, content) {
    const resp = await fetch("/api/file", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, content })
    });
    if (!resp.ok) {
      throw new Error(`Failed to save: ${resp.status}`);
    }
  }

  // src/core/app.ts
  var App = class {
    // 主内容 Pane
    constructor() {
      this.buffers = /* @__PURE__ */ new Map();
      this.config = null;
      this.tree = null;
      this.root = "";
      this.focusedPane = null;
      // 当前聚焦的 Pane
      this.mainPane = null;
      this.rootPane = new Pane();
      this.rootPane.element.id = "root-pane";
      this.modes = new ModeRegistry();
      this.events = new EventBus();
    }
    async init() {
      this.config = await fetchConfig();
      this.root = this.config.root || "";
      this.tree = await fetchTree(false);
      const [sidePane, mainPane] = this.rootPane.split("horizontal", 0.2);
      this.mainPane = mainPane;
      this.renderPane(sidePane, "/", "directory");
      const defaultPath = this.config.defaultPage || "README.md";
      this.renderPane(mainPane, defaultPath);
      this.focusedPane = mainPane;
      if (mainPane.buffer) {
        this.updateModeToolbar(mainPane.buffer);
      }
      const container = document.getElementById("app");
      if (container) {
        container.innerHTML = "";
        container.appendChild(this.rootPane.element);
      }
      this.setupPaneFocus();
    }
    /** 设置 Pane 聚焦监听 */
    setupPaneFocus() {
      const updateFocus = (pane) => {
        console.log("[app] updateFocus called, pane:", pane.id, "buffer:", pane.buffer?.path);
        if (this.focusedPane !== pane) {
          this.focusedPane = pane;
          this.events.emit("focus-changed", pane);
          if (pane.buffer) {
            this.updateModeToolbar(pane.buffer);
          }
        }
      };
      const setupClick = (pane) => {
        if (pane.isLeaf) {
          pane.element.addEventListener("click", (e) => {
            console.log("[app] pane clicked:", pane.id, "target:", e.target.className);
            updateFocus(pane);
          });
        } else if (pane.children) {
          setupClick(pane.children[0]);
          setupClick(pane.children[1]);
        }
      };
      setupClick(this.rootPane);
    }
    /** 打开文件到指定 Pane（默认聚焦的 Pane） */
    openFile(path, targetPane) {
      const pane = targetPane || this.focusedPane;
      if (!pane)
        return;
      const buffer = this.getBuffer(path) || this.createBuffer(path);
      if (!buffer)
        return;
      this.renderPane(pane, path);
      this.events.emit("buffer-changed", buffer);
      this.updateModeToolbar(buffer);
    }
    /** 在指定 Pane 渲染文件 */
    renderPane(pane, path, modeName) {
      const buffer = this.getBuffer(path) || this.createBuffer(path, modeName);
      if (!buffer)
        return;
      pane.showBuffer(buffer, (container) => {
        const ctx = this.makeModeContext(container, buffer, pane);
        buffer.mode.render(ctx);
      });
      this.focusedPane = pane;
      this.events.emit("focus-changed", pane);
    }
    /** 更新 Mode 工具栏 */
    updateModeToolbar(buffer) {
      const modeToolbar = document.getElementById("mode-toolbar");
      if (!modeToolbar) {
        console.log("[app] updateModeToolbar: mode-toolbar element not found");
        return;
      }
      console.log("[app] updateModeToolbar called for buffer:", buffer.path, "mode:", buffer.mode.name);
      modeToolbar.innerHTML = "";
      if (buffer.mode.renderToolbar) {
        buffer.mode.renderToolbar(modeToolbar, buffer, this);
      } else {
        console.log("[app] mode has no renderToolbar");
      }
    }
    getBuffer(path) {
      return this.buffers.get(path);
    }
    createBuffer(path, modeName) {
      const mode = modeName ? this.modes.findModeByName(modeName) : this.modes.findMode(path);
      if (!mode)
        return null;
      const buffer = new Buffer(path, mode);
      this.buffers.set(path, buffer);
      this.events.emit("buffer-created", buffer);
      return buffer;
    }
    closeBuffer(path) {
      const buffer = this.buffers.get(path);
      if (!buffer)
        return;
      for (const leaf of this.rootPane.getLeaves()) {
        if (leaf.buffer === buffer) {
          leaf.clearBuffer();
          break;
        }
      }
      this.buffers.delete(path);
      this.events.emit("buffer-closed", buffer);
    }
    makeModeContext(container, buffer, pane) {
      return {
        buffer,
        pane,
        container,
        openFile: (path) => this.openFile(path, pane),
        saveFile: async (path, content) => {
          await saveFile(path, content);
        },
        app: this
      };
    }
  };

  // src/core/router.ts
  var Router = class {
    constructor(app) {
      this.app = app;
    }
    init() {
      window.addEventListener("hashchange", () => this.handleHash());
      if (window.location.hash) {
        this.handleHash();
      }
    }
    handleHash() {
      const hash = window.location.hash;
      const fileMatch = hash.match(/^#\/file\/(.+)$/);
      if (fileMatch) {
        const path = decodeURIComponent(fileMatch[1]);
        this.app.openFile(path);
        return;
      }
      const pageMatch = hash.match(/^#\/page\/(.+)$/);
      if (pageMatch) {
        console.warn("Page view not yet implemented:", pageMatch[1]);
      }
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

  // src/modes/markdown.ts
  function encodePath(path) {
    return path.split("/").map((segment) => encodeURIComponent(segment)).join("/");
  }
  var markdownMode = {
    name: "markdown",
    match(path) {
      return path.endsWith(".md") || path.endsWith(".markdown");
    },
    render(ctx) {
      const path = ctx.buffer.path;
      fetch(`/${encodePath(path)}`).then((r) => r.ok ? r.text() : Promise.reject(new Error(r.statusText))).then((content) => {
        ctx.buffer.state.rawContent = content;
        renderMarkdownView(ctx, content);
      }).catch((err) => {
        ctx.container.textContent = `\u52A0\u8F7D\u5931\u8D25: ${err.message}`;
      });
    },
    renderToolbar(container, buffer, app) {
      const editBtn = document.createElement("button");
      editBtn.className = "toolbar-btn";
      editBtn.textContent = "\u7F16\u8F91";
      editBtn.title = "\u7F16\u8F91 Markdown";
      editBtn.onclick = () => {
        const pane = app.rootPane.findPaneByBuffer(buffer.path);
        if (pane && buffer.state.rawContent) {
          pane.showBuffer(buffer, (container2) => {
            const ctx = app.makeModeContext(container2, buffer, pane);
            showEditor(buffer.state.rawContent, buffer.path, ctx);
          });
        }
      };
      container.appendChild(editBtn);
    }
  };
  function renderMarkdownView(ctx, content) {
    const div = document.createElement("div");
    div.className = "markdown-body";
    div.innerHTML = DOMPurify.sanitize(marked.parse(content));
    fixLinks(div, ctx.buffer.path);
    setupCheckboxes(div, ctx.buffer.path, ctx);
    ctx.container.appendChild(div);
  }
  function fixLinks(div, filepath) {
    const dir = filepath.includes("/") ? filepath.substring(0, filepath.lastIndexOf("/")) : "";
    div.querySelectorAll("a[href]").forEach((a) => {
      const rawHref = a.getAttribute("href");
      if (!rawHref || rawHref.startsWith("#") || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(rawHref))
        return;
      const href = decodeURIComponent(rawHref);
      let absPath = href;
      if (dir && !href.startsWith("/"))
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
  }
  function setupCheckboxes(div, path, ctx) {
    div.querySelectorAll('input[type="checkbox"]').forEach((cb, i) => {
      const input = cb;
      input.dataset.index = String(i);
      input.addEventListener("change", () => {
        fetch(`/${encodePath(path)}`).then((r) => r.text()).then((content) => {
          let idx = 0;
          const updated = content.replace(/^(\s*)- \[[ xX]\]/gm, (match, indent) => {
            if (idx === i) {
              idx++;
              return `${indent}- ${input.checked ? "[x]" : "[ ]"}`;
            }
            idx++;
            return match;
          });
          ctx.saveFile(path, updated);
        });
      });
    });
  }
  function showEditor(content, path, ctx) {
    const textarea = document.createElement("textarea");
    textarea.className = "md-editor";
    textarea.value = content;
    const btns = document.createElement("div");
    btns.className = "md-editor-btns";
    const saveBtn = document.createElement("button");
    saveBtn.textContent = "\u4FDD\u5B58";
    saveBtn.onclick = async () => {
      await ctx.saveFile(path, textarea.value);
      ctx.buffer.state.rawContent = textarea.value;
      const pane = ctx.app.rootPane.findPaneByBuffer(path);
      if (pane)
        ctx.app.renderPane(pane, path);
    };
    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "\u53D6\u6D88";
    cancelBtn.onclick = () => {
      const pane = ctx.app.rootPane.findPaneByBuffer(path);
      if (pane)
        ctx.app.renderPane(pane, path);
    };
    btns.appendChild(saveBtn);
    btns.appendChild(cancelBtn);
    ctx.container.innerHTML = "";
    ctx.container.appendChild(btns);
    ctx.container.appendChild(textarea);
  }

  // src/modes/image.ts
  function encodePath2(path) {
    return path.split("/").map((segment) => encodeURIComponent(segment)).join("/");
  }
  var imageMode = {
    name: "image",
    match(path) {
      return /\.(png|jpe?g|gif|svg|webp|ico)$/i.test(path);
    },
    render(ctx) {
      const img = document.createElement("img");
      img.src = `/${encodePath2(ctx.buffer.path)}`;
      img.style.maxWidth = "100%";
      img.style.height = "auto";
      img.alt = ctx.buffer.path;
      ctx.container.appendChild(img);
    }
  };

  // src/modes/html.ts
  function encodePath3(path) {
    return path.split("/").map((segment) => encodeURIComponent(segment)).join("/");
  }
  var htmlMode = {
    name: "html",
    match(path) {
      return path.endsWith(".html") || path.endsWith(".htm");
    },
    render(ctx) {
      const iframe = document.createElement("iframe");
      iframe.sandbox = "allow-same-origin allow-scripts";
      iframe.style.width = "100%";
      iframe.style.height = "100%";
      iframe.style.border = "none";
      iframe.src = `/${encodePath3(ctx.buffer.path)}`;
      ctx.container.appendChild(iframe);
    }
  };

  // src/modes/raw.ts
  function encodePath4(path) {
    return path.split("/").map((segment) => encodeURIComponent(segment)).join("/");
  }
  var rawMode = {
    name: "raw",
    match(_path) {
      return true;
    },
    render(ctx) {
      const path = ctx.buffer.path;
      fetch(`/${encodePath4(path)}`).then((r) => r.ok ? r.text() : Promise.reject(new Error(r.statusText))).then((content) => {
        const pre = document.createElement("pre");
        pre.textContent = content;
        pre.style.whiteSpace = "pre-wrap";
        pre.style.wordBreak = "break-word";
        ctx.container.appendChild(pre);
      }).catch((err) => {
        ctx.container.textContent = `\u52A0\u8F7D\u5931\u8D25: ${err.message}`;
      });
    }
  };

  // src/core/util.ts
  function fileIcon(name) {
    const ext = name.split(".").pop()?.toLowerCase() || "";
    if (["md", "txt", "log"].includes(ext))
      return "\u{1F4DD}";
    if (["html", "htm"].includes(ext))
      return "\u{1F310}";
    if (["png", "jpg", "jpeg", "gif", "svg", "webp", "ico"].includes(ext))
      return "\u{1F5BC}\uFE0F";
    if (["js", "ts", "jsx", "tsx", "py", "rb", "go", "rs", "c", "cpp", "h"].includes(ext))
      return "\u{1F4C4}";
    if (["json", "yaml", "yml", "toml", "xml"].includes(ext))
      return "\u{1F4CB}";
    if (["css", "scss", "less"].includes(ext))
      return "\u{1F3A8}";
    if (["sh", "bash", "zsh"].includes(ext))
      return "\u2699\uFE0F";
    return "\u{1F4C4}";
  }

  // src/modes/directory.ts
  var directoryMode = {
    name: "directory",
    match(path) {
      return path.endsWith("/");
    },
    render(ctx) {
      const tree = ctx.app.tree;
      if (!tree) {
        ctx.container.textContent = "File tree not loaded";
        return;
      }
      const dirPath = ctx.buffer.path.replace(/\/$/, "");
      const isRoot = !dirPath;
      const list = document.createElement("div");
      list.className = "dir-tree";
      const items = isRoot ? tree : findDir(tree, dirPath)?.children;
      if (!items) {
        list.textContent = "Directory not found: " + dirPath;
        ctx.container.appendChild(list);
        return;
      }
      if (!isRoot) {
        const parentItem = document.createElement("div");
        parentItem.className = "tree-item";
        parentItem.innerHTML = '<span class="tree-icon">\u{1F4C1}</span> <span class="tree-name">..</span>';
        parentItem.onclick = () => {
          const parentPath = dirPath.split("/").slice(0, -1).join("/");
          const target = parentPath ? parentPath + "/" : "/";
          ctx.app.openFile(target, ctx.pane);
        };
        list.appendChild(parentItem);
      }
      if (!isRoot) {
        const rootItem = document.createElement("div");
        rootItem.className = "tree-item";
        rootItem.innerHTML = '<span class="tree-icon">\u{1F4C1}</span> <span class="tree-name">/</span>';
        rootItem.onclick = () => ctx.app.openFile("/", ctx.pane);
        list.appendChild(rootItem);
      }
      renderTree(list, items, ctx);
      ctx.container.appendChild(list);
    },
    renderToolbar(container, buffer, app) {
      const showHidden = buffer.state.showHidden ?? false;
      const toggleHidden = document.createElement("button");
      toggleHidden.className = "toolbar-btn" + (showHidden ? " active" : "");
      toggleHidden.textContent = ".*";
      toggleHidden.title = showHidden ? "\u9690\u85CF\u70B9\u6587\u4EF6" : "\u663E\u793A\u9690\u85CF\u6587\u4EF6";
      toggleHidden.onclick = async () => {
        buffer.state.showHidden = !showHidden;
        app.tree = await fetchTree(buffer.state.showHidden);
        const pane = app.rootPane.findPaneByBuffer(buffer.path);
        if (pane) {
          app.renderPane(pane, buffer.path);
        }
        app.updateModeToolbar(buffer);
      };
      container.appendChild(toggleHidden);
    }
  };
  function renderTree(container, items, ctx) {
    items.forEach((item) => {
      const row = document.createElement("div");
      row.className = "tree-item";
      if (item.type === "dir") {
        const toggle = document.createElement("span");
        toggle.className = "tree-toggle";
        toggle.textContent = "\u25B6";
        const icon = document.createElement("span");
        icon.className = "tree-icon";
        icon.textContent = "\u{1F4C1}";
        const name = document.createElement("span");
        name.className = "tree-name";
        name.textContent = item.name;
        row.appendChild(toggle);
        row.appendChild(icon);
        row.appendChild(name);
        const children = document.createElement("div");
        children.className = "tree-children collapsed";
        row.onclick = (e) => {
          e.stopPropagation();
          const isExpanded = !children.classList.contains("collapsed");
          if (isExpanded) {
            children.classList.add("collapsed");
            toggle.textContent = "\u25B6";
          } else {
            children.classList.remove("collapsed");
            toggle.textContent = "\u25BC";
            if (children.children.length === 0 && item.children) {
              renderTree(children, item.children, ctx);
            }
          }
        };
        row.ondblclick = (e) => {
          e.stopPropagation();
          ctx.openFile(item.path + "/");
        };
        container.appendChild(row);
        container.appendChild(children);
      } else {
        const icon = document.createElement("span");
        icon.className = "tree-icon";
        icon.textContent = fileIcon(item.name);
        const name = document.createElement("span");
        name.className = "tree-name";
        name.textContent = item.name;
        row.appendChild(icon);
        row.appendChild(name);
        row.onclick = () => ctx.app.openFile(item.path, ctx.app.mainPane || void 0);
        container.appendChild(row);
      }
    });
  }
  function findDir(items, path) {
    for (const item of items) {
      if (item.path === path && item.type === "dir")
        return item;
      if (item.children) {
        const found = findDir(item.children, path);
        if (found)
          return found;
      }
    }
    return null;
  }

  // src/modes/buffer-list.ts
  var bufferListMode = {
    name: "buffer-list",
    match(path) {
      return path === "##buffers";
    },
    render(ctx) {
      const list = document.createElement("div");
      list.className = "buffer-list";
      const title = document.createElement("h3");
      title.textContent = "Open Buffers";
      list.appendChild(title);
      const buffers = Array.from(ctx.app.buffers.values());
      if (buffers.length === 0) {
        const empty = document.createElement("div");
        empty.className = "buffer-list-empty";
        empty.textContent = "No open buffers";
        list.appendChild(empty);
      } else {
        buffers.forEach((buffer) => {
          const item = document.createElement("div");
          item.className = "buffer-list-item";
          const icon = document.createElement("span");
          icon.className = "icon";
          icon.textContent = buffer.path.endsWith("/") ? "\u{1F4C1}" : fileIcon(buffer.path);
          const name = document.createElement("span");
          name.className = "buffer-list-name";
          name.textContent = buffer.path;
          const mode = document.createElement("span");
          mode.className = "buffer-list-mode";
          mode.textContent = `[${buffer.mode.name}]`;
          item.appendChild(icon);
          item.appendChild(name);
          item.appendChild(mode);
          item.onclick = () => ctx.openFile(buffer.path);
          list.appendChild(item);
        });
      }
      ctx.container.appendChild(list);
    }
  };

  // src/main.ts
  async function main() {
    const app = new App();
    app.modes.register(directoryMode);
    app.modes.register(imageMode);
    app.modes.register(htmlMode);
    app.modes.register(markdownMode);
    app.modes.register(bufferListMode);
    app.modes.register(rawMode);
    const theme = new ThemeManager();
    try {
      await app.init();
    } catch (e) {
      const appEl2 = document.getElementById("app");
      if (appEl2) {
        const msg = e instanceof Error ? e.message : String(e);
        appEl2.textContent = `Error: ${msg}`;
      }
      return;
    }
    theme.init(app.config || {});
    setupToolbar(app);
    const toggleTheme = document.getElementById("toggle-theme");
    if (toggleTheme) {
      toggleTheme.addEventListener("click", () => {
        theme.cycleTheme();
        toggleTheme.textContent = theme.getThemeIcon();
      });
      toggleTheme.textContent = theme.getThemeIcon();
    }
    const toggleCss = document.getElementById("toggle-css");
    if (toggleCss) {
      toggleCss.addEventListener("click", () => {
        theme.cycleCssTheme();
        toggleCss.textContent = theme.getCssThemeName();
        toggleCss.classList.toggle("active", theme.isCssThemeActive());
      });
      toggleCss.textContent = theme.getCssThemeName();
      toggleCss.classList.toggle("active", theme.isCssThemeActive());
    }
    const router = new Router(app);
    router.init();
    const appEl = document.getElementById("app");
    if (appEl) {
      appEl.addEventListener("click", (e) => {
        const a = e.target.closest("a");
        if (!a)
          return;
        const href = a.getAttribute("href");
        if (href && href.startsWith("#/")) {
          e.preventDefault();
          const path = decodeURIComponent(href.replace("#/file/", ""));
          app.openFile(path);
        }
      });
    }
  }
  function setupToolbar(app) {
    const currentBuffer = document.getElementById("current-buffer");
    const bufferList = document.getElementById("buffer-list");
    const update = () => {
      if (currentBuffer) {
        currentBuffer.textContent = app.focusedPane?.buffer?.path || "";
      }
      if (bufferList) {
        bufferList.innerHTML = "";
        const buffers = Array.from(app.buffers.values());
        buffers.forEach((buf) => {
          const tag = document.createElement("span");
          tag.className = "buffer-tag" + (buf === app.focusedPane?.buffer ? " active" : "");
          const name = document.createElement("span");
          name.className = "buffer-tag-name";
          name.textContent = buf.path.split("/").pop() || buf.path;
          name.title = buf.path;
          name.onclick = () => {
            const pane = app.rootPane.findPaneByBuffer(buf.path);
            if (pane) {
              app.focusedPane = pane;
              app.events.emit("focus-changed", pane);
              app.updateModeToolbar(buf);
            }
          };
          const close = document.createElement("span");
          close.className = "buffer-tag-close";
          close.textContent = "\xD7";
          close.title = "\u5173\u95ED";
          close.onclick = (e) => {
            e.stopPropagation();
            app.closeBuffer(buf.path);
          };
          tag.appendChild(name);
          tag.appendChild(close);
          bufferList.appendChild(tag);
        });
      }
    };
    app.events.on("buffer-changed", update);
    app.events.on("buffer-created", update);
    app.events.on("buffer-closed", update);
    app.events.on("focus-changed", update);
    update();
  }
  main();
})();
