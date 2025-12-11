/* script.js — unified script for Home / Cart / Product pages
   Handles: cart storage & rendering, header badge, add-to-cart feedback,
   search suggestions, product click routing, featured carousel, auth fallback,
   and "All products" modal (browse).
*/
document.addEventListener("DOMContentLoaded", () => {
  const CART_KEY = "ts_cart";

  // ---------- safe localStorage helpers ----------
  function safeReadCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
    catch (e) { console.error("readCart error", e); return []; }
  }
  function safeWriteCart(c) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(c)); }
    catch (e) { console.error("writeCart error", e); }
  }

  // ---------- Tooltips init ----------
  function initTooltips() {
    if (!window.bootstrap) return;
    [...document.querySelectorAll('[data-bs-toggle="tooltip"]')].forEach((el) => {
      if (!el._bsTooltip) new bootstrap.Tooltip(el, { customClass: "custom-tooltip" });
    });
  }
  initTooltips();

  // ---------- Featured carousel (keeps your rotation) ----------
  (function initFeaturedCarousel() {
    const track = document.getElementById("carouselTrack");
    if (!track) return;
    const items = Array.from(track.children);
    const indicatorContainer = document.querySelector(".featured-indicators");
    if (!indicatorContainer) return;
    indicatorContainer.innerHTML = "";
    items.forEach((_, i) => {
      const dot = document.createElement("button");
      if (i === 0) dot.classList.add("active");
      indicatorContainer.appendChild(dot);
    });
    const dots = Array.from(indicatorContainer.children);
    let currentIndex = 0;
    function updateIndicators(index) { dots.forEach(d => d.classList.remove("active")); if (dots[index]) dots[index].classList.add("active"); }
    setInterval(() => {
      const first = items.shift();
      items.push(first);
      track.innerHTML = "";
      items.forEach(it => track.appendChild(it));
      currentIndex = (currentIndex + 1) % items.length;
      updateIndicators(currentIndex);
    }, 2200);
  })();

  // ---------- Footer text population ----------
  (function setFooterText() {
    const footerMap = { w1: "Tech-Shop", w2: "Subscribe to our Email alerts to receive early discount offers, and new products info", m1: "Help", k1: "Policies" };
    Object.entries(footerMap).forEach(([id, text]) => { const el = document.getElementById(id); if (el) el.innerHTML = text; });
  })();

  // ---------- Product filtering (category buttons) ----------
  (function productFiltering() {
    const filterButtons = document.querySelectorAll(".button-container button");
    const products = document.querySelectorAll(".custom-col");
    if (!filterButtons.length) return;
    filterButtons.forEach((button) => {
      button.addEventListener("click", () => {
        filterButtons.forEach((btn) => btn.classList.remove("active", "button_first_prod"));
        button.classList.add("active", "button_first_prod");
        const category = button.textContent.trim().toLowerCase();
        products.forEach((product) => {
          if (product.classList.contains("empty-card")) product.style.display = "block";
          else product.style.display = category === "all" || product.dataset.category === category ? "block" : "none";
        });
      });
    });
  })();

  // ---------- Cart rendering & header badge ----------
  const cartItemsContainer = document.getElementById("cart-items");
  const emptyCartEl = document.getElementById("empty-cart");
  const orderSummaryEl = document.getElementById("order-summary");
  const subtotalEl = document.getElementById("subtotal");
  const totalEl = document.getElementById("total");
  const summaryCountEl = document.getElementById("cart-count-summary");

  function updateHeaderBadgeAndSummary() {
    const cartNow = safeReadCart();
    const totalQty = cartNow.reduce((s, i) => s + (Number(i.qty) || 0), 0);
    // may be multiple badges with same id across pages
    document.querySelectorAll("#cart-count").forEach((b) => {
      if (totalQty > 0) { b.style.display = "inline-block"; b.textContent = totalQty; b.classList.add("cart-bounce"); setTimeout(()=> b.classList.remove("cart-bounce"),250); }
      else { b.style.display = "none"; b.textContent = ""; }
    });
    if (summaryCountEl) summaryCountEl.textContent = totalQty;
  }

  function renderCart() {
    if (!cartItemsContainer) return;
    const cartNow = safeReadCart();
    cartItemsContainer.innerHTML = "";
    let discountedTotal = 0, originalTotal = 0;
    cartNow.forEach((item, index) => {
      const price = Number(item.price) || 0;
      const oldPrice = Number(item.oldPrice) || price;
      discountedTotal += price * (Number(item.qty) || 0);
      originalTotal += oldPrice * (Number(item.qty) || 0);

      const row = document.createElement("div");
      row.className = "cart-item d-flex align-items-center justify-content-between border-bottom py-3";
      row.innerHTML = `
        <div class="d-flex align-items-center">
          <img src="${item.img || './placeholder.png'}" alt="${escapeHtml(item.name)}" width="90" class="me-3 rounded">
          <div class="cart-details">
            <h6>${escapeHtml(item.name)}</h6>
            <div class="price">
              <span class="current">₹${price.toLocaleString("en-IN")}</span>
              <span class="original">₹${oldPrice.toLocaleString("en-IN")}</span>
            </div>
            <div class="cart-actions" data-index="${index}">
              <button class="minus-btn" data-index="${index}" aria-label="Decrease quantity">−</button>
              <div class="qty" aria-live="polite">${item.qty}</div>
              <button class="plus-btn" data-index="${index}" aria-label="Increase quantity">+</button>
            </div>
          </div>
        </div>
        <div>
          <button class="remove-btn" data-index="${index}" data-bs-toggle="tooltip" data-bs-placement="bottom" title="Remove Item">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      `;
      cartItemsContainer.appendChild(row);
    });

    const discount = Math.max(0, originalTotal - discountedTotal);
    if (subtotalEl) subtotalEl.textContent = `₹${originalTotal.toLocaleString("en-IN")}`;
    if (totalEl) totalEl.textContent = `₹${discountedTotal.toLocaleString("en-IN")}`;
    const discountEl = document.querySelector(".discount");
    if (discountEl) discountEl.textContent = `-₹${discount.toLocaleString("en-IN")}`;

    if (cartNow.length === 0) {
      if (emptyCartEl) emptyCartEl.style.display = "flex";
      if (cartItemsContainer) cartItemsContainer.style.display = "none";
      if (orderSummaryEl) orderSummaryEl.style.display = "none";
    } else {
      if (emptyCartEl) emptyCartEl.style.display = "none";
      if (cartItemsContainer) cartItemsContainer.style.display = "block";
      if (orderSummaryEl) orderSummaryEl.style.display = "block";
    }

    initTooltips();
    updateHeaderBadgeAndSummary();
  }

  // small helper to escape HTML
  function escapeHtml(s) {
    if (!s) return "";
    return String(s).replace(/[&<>"']/g, (m) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[m]));
  }

  // initial render
  renderCart();

  // animate badge briefly
  function animateCartBadge() {
    const b = document.querySelector("#cart-count");
    if (!b) return;
    b.classList.add("cart-bounce");
    setTimeout(() => b.classList.remove("cart-bounce"), 500);
  }

  // ---------- Add to Cart (delegated) ----------
  document.addEventListener("click", function (e) {
    const btn = e.target.closest && e.target.closest(".add-to-cart");
    if (!btn) return;
    e.preventDefault();

    const id = btn.dataset.id || btn.getAttribute("data-id") || (btn.dataset.name ? hashString(btn.dataset.name) : String(Date.now()));
    const name = btn.dataset.name || btn.getAttribute("data-name") || (btn.closest(".card")?.querySelector(".card-title")?.textContent?.trim() || "Product");
    const price = Number(btn.dataset.price || btn.getAttribute("data-price") || 0) || 0;
    const oldPrice = Number(btn.dataset.oldprice || btn.getAttribute("data-oldprice") || price) || price;
    const img = btn.dataset.image || btn.getAttribute("data-image") || btn.closest(".card")?.querySelector("img")?.src || "./placeholder.png";

    const current = safeReadCart();
    const existing = current.find((i) => String(i.id) === String(id));
    if (existing) existing.qty = Number(existing.qty || 0) + 1;
    else current.push({ id, name, price, oldPrice, img, qty: 1 });

    safeWriteCart(current);

    // Update UI
    try { renderCart(); } catch (err) {}
    animateCartBadge();

    // Button feedback: green + "Added"
    const origInner = btn.innerHTML;
    const origClasses = btn.className;
    btn.classList.add("added-btn");
    btn.innerHTML = '<i class="fas fa-check"></i> Added';
    btn.disabled = true;
    setTimeout(() => {
      btn.innerHTML = origInner;
      btn.className = origClasses;
      btn.disabled = false;
    }, 1100);
  });

  // ---------- cart item actions (plus/minus/remove) ----------
  if (cartItemsContainer) {
    cartItemsContainer.addEventListener("click", (e) => {
      const idxAttr = e.target.dataset.index ?? e.target.closest("[data-index]")?.dataset.index;
      if (idxAttr === undefined) return;
      const idx = Number(idxAttr);
      const current = safeReadCart();
      if (!current[idx]) return;

      if (e.target.classList.contains("minus-btn")) {
        if (current[idx].qty > 1) current[idx].qty--;
        else current.splice(idx, 1);
      } else if (e.target.classList.contains("plus-btn")) {
        current[idx].qty++;
      } else if (e.target.closest(".remove-btn")) {
        current.splice(idx, 1);
      } else return;

      safeWriteCart(current);
      renderCart();
    });
  }

  // ---------- cart sort control ----------
  const cartSort = document.getElementById("cart-sort");
  if (cartSort) {
    cartSort.addEventListener("change", (e) => {
      const val = e.target.value;
      let current = safeReadCart();
      if (val === "price-asc") current.sort((a, b) => a.price - b.price);
      else if (val === "price-desc") current.sort((a, b) => b.price - a.price);
      safeWriteCart(current);
      renderCart();
    });
  }

  // ---------- SEARCH SUGGESTIONS + product routing ----------
  (function searchSuggestions() {
    function collectProducts() {
      const prods = [];
      document.querySelectorAll(".add-to-cart").forEach((btn) => {
        const id = btn.dataset.id || btn.getAttribute("data-id") || "";
        const name = (btn.dataset.name || btn.getAttribute("data-name") || (btn.closest(".card")?.querySelector(".card-title")?.textContent || "")).trim();
        const price = Number(btn.dataset.price || btn.getAttribute("data-price") || 0);
        const oldprice = Number(btn.dataset.oldprice || btn.getAttribute("data-oldprice") || 0);
        const img = btn.dataset.image || btn.getAttribute("data-image") || btn.closest(".card")?.querySelector("img")?.src || "";
        prods.push({ id, name, price, oldprice, img });
      });
      // dedupe
      const unique = [];
      const seen = new Set();
      prods.forEach((p) => {
        const key = String((p.id || p.name) || "").trim().toLowerCase();
        if (!seen.has(key) && p.name) { seen.add(key); unique.push(p); }
      });
      return unique;
    }

    const products = collectProducts();
    const searchInput = document.getElementById("site-search");
    const suggestionsBox = document.getElementById("search-suggestions");

    function renderSuggestions(q) {
      if (!suggestionsBox) return;
      suggestionsBox.innerHTML = "";
      const query = (q || "").toLowerCase().trim();
      const starts = query ? products.filter((p) => p.name.toLowerCase().startsWith(query)) : [];
      const contains = query ? products.filter((p) => !p.name.toLowerCase().startsWith(query) && p.name.toLowerCase().includes(query)) : [];
      const matches = query ? [...starts, ...contains] : products.slice(0, 8);

      if (!matches.length) {
        suggestionsBox.innerHTML = `<div class="list-group-item">No products found</div>`;
        suggestionsBox.style.display = "block";
        return;
      }

      matches.slice(0, 12).forEach((p) => {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "list-group-item list-group-item-action d-flex gap-2 align-items-center";
        item.innerHTML = `<img src="${p.img || './placeholder.png'}" alt="" style="width:48px;height:48px;object-fit:contain;border-radius:6px;margin-right:8px"/>
                          <div style="text-align:left">
                            <div style="font-weight:600">${escapeHtml(p.name)}</div>
                            <div style="font-size:0.85rem;color:#bfbfbf">₹${(p.price || 0).toLocaleString('en-IN')}</div>
                          </div>`;
        item.addEventListener("click", () => {
          const targetUrl = `product_details.html?id=${encodeURIComponent(p.id || p.name)}`;
          window.location.href = targetUrl;
        });
        suggestionsBox.appendChild(item);
      });
      suggestionsBox.style.display = "block";
    }

    if (searchInput) {
      searchInput.addEventListener("input", (e) => renderSuggestions(e.target.value));
      searchInput.addEventListener("focus", () => renderSuggestions(searchInput.value || ""));
      let sel = -1;
      searchInput.addEventListener("keydown", (e) => {
        const items = suggestionsBox?.querySelectorAll(".list-group-item") || [];
        if (!items.length) return;
        if (e.key === "ArrowDown") { e.preventDefault(); sel = Math.min(sel + 1, items.length - 1); highlight(items, sel); }
        else if (e.key === "ArrowUp") { e.preventDefault(); sel = Math.max(sel - 1, 0); highlight(items, sel); }
        else if (e.key === "Enter") { e.preventDefault(); if (sel >= 0 && items[sel]) items[sel].click(); }
      });
      function highlight(items, idx) { items.forEach(i => i.classList.remove("active")); if (items[idx]) items[idx].classList.add("active"); }

      document.addEventListener("click", (ev) => {
        if (!ev.composedPath().includes(searchInput) && !ev.composedPath().includes(suggestionsBox)) {
          if (suggestionsBox) suggestionsBox.style.display = "none";
        }
      });
    }

    // product card click routing (use delegation so any card works)
    document.addEventListener("click", (ev) => {
      const a = ev.target.closest("a[href*='product_details.html']");
      if (!a) return;
      ev.preventDefault();
      // find product id (from nearest add-to-cart or data-id)
      const parent = a.closest(".custom-col") || a.closest(".card") || a.closest("[data-id]");
      const btn = parent?.querySelector(".add-to-cart");
      const id = (btn?.dataset?.id) || parent?.dataset?.id || parent?.querySelector(".card-title")?.textContent?.trim() || "";
      window.location.href = `product_details.html?id=${encodeURIComponent(id)}`;
    });
  })();

  // ---------- small sort control insertion ----------
  (function addSortControls() {
    const container = document.querySelector(".button-container");
    if (!container) return;
    if (document.getElementById("sort-select")) return;
    const wrapper = document.createElement("div");
    wrapper.className = "ms-auto d-flex align-items-center";
    wrapper.style.gap = "8px";
    wrapper.innerHTML = `
      <label style="color:white; font-weight:600; margin-right:6px;">Sort:</label>
      <select id="sort-select" class="form-select form-select-sm" style="width:200px; background:#111; color:#fff; border:1px solid rgba(255,255,255,0.06);">
        <option value="default">Default</option>
        <option value="newest">Newest</option>
        <option value="price-asc">Price: Low → High</option>
        <option value="price-desc">Price: High → Low</option>
      </select>
    `;
    container.appendChild(wrapper);

    document.getElementById("sort-select").addEventListener("change", (e) => {
      applySort(e.target.value);
    });

    function applySort(mode) {
      const productGrid = document.querySelector(".column_small_deci");
      if (!productGrid) return;
      const items = Array.from(productGrid.querySelectorAll(".custom-col"));
      const mapped = items.map((node) => {
        const priceText = node.querySelector(".product_font_head")?.innerText || "";
        const priceMatch = (priceText.match(/₹\s*([\d,]+)/) || [])[1] || "";
        const price = Number(priceMatch.replace(/,/g, "")) || Number(node.querySelector(".add-to-cart")?.dataset.price || 0);
        const newest = Number(node.dataset.newest || node.dataset.id || 0);
        return { node, price, newest };
      });
      if (mode === "price-asc") mapped.sort((a, b) => a.price - b.price);
      else if (mode === "price-desc") mapped.sort((a, b) => b.price - a.price);
      else if (mode === "newest") mapped.sort((a, b) => (b.newest || 0) - (a.newest || 0));
      mapped.forEach((m) => productGrid.appendChild(m.node));
    }
  })();

  // ---------- small helpers ----------
  function hashString(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i), h |= 0; return Math.abs(h); }

  // expose for debugging
  window.__renderCart = renderCart;
  window.renderCart = renderCart; // make accessible globally

  // ---------- Flexible client-side auth (works with your existing exampleModal) ----------
  (function authModule() {
    const USERS_KEY = "ts_users";
    const CURRENT_KEY = "ts_user_current";
    function readUsers(){try{return JSON.parse(localStorage.getItem(USERS_KEY))||[];}catch(e){return[];}}
    function writeUsers(u){try{localStorage.setItem(USERS_KEY,JSON.stringify(u));}catch(e){}}
    function getCurrent(){try{return JSON.parse(localStorage.getItem(CURRENT_KEY))||null;}catch(e){return null;}}
    function setCurrent(email){try{localStorage.setItem(CURRENT_KEY, JSON.stringify({email, since: Date.now()}));}catch(e){}}
    function clearCurrent(){localStorage.removeItem(CURRENT_KEY);}
    function simpleHash(s){let h=0; for(let i=0;i<s.length;i++) h=(h<<5)-h+s.charCodeAt(i), h|=0; return String(h);}

    const authModalEl = document.getElementById("authModal") || document.getElementById("exampleModal");
    const authModal = (authModalEl && window.bootstrap) ? new bootstrap.Modal(authModalEl) : null;
    const userTitle = document.querySelector(".user_font");

    const loginForm = document.getElementById("loginForm");
    const signupForm = document.getElementById("signupForm");

    const fallbackEmailInput = document.getElementById("email");
    const fallbackPasswordInput = document.getElementById("password");
    const fallbackModalButton = authModalEl ? authModalEl.querySelector("button[type='button'], button.btn.w-100") : null;

    function showMsg(m){ try{ alert(m); }catch(e){ console.log(m);} }

    function refreshHeaderUser() {
      const cur = getCurrent();
      const ddCardBody = document.querySelector(".dropdown-menu .card-body");
      if (cur && cur.email) {
        if (userTitle) userTitle.textContent = `Hello, ${cur.email}`;
        if (ddCardBody) {
          ddCardBody.innerHTML = `
            <h5 class="user_font">Hi, ${cur.email}</h5>
            <p class="user_font">Manage your account and orders</p>
            <div class="d-grid gap-2 mt-2">
              <button id="logoutBtn" class="btn btn-outline-light btn-sm">Logout</button>
            </div>
          `;
          const logoutBtn = document.getElementById("logoutBtn");
          if (logoutBtn) logoutBtn.addEventListener("click", () => { clearCurrent(); refreshHeaderUser(); showMsg("Logged out"); });
        }
      } else {
        if (userTitle) userTitle.textContent = `Hello!`;
        if (ddCardBody) {
          ddCardBody.innerHTML = `
            <h4 class="card-title user_font">Hello!</h4>
            <p class="card-text user_font">Access account and manage orders</p>
            <a href="#" class="btn btn_user user_font" data-bs-toggle="modal" data-bs-target="#exampleModal">Login/Signup</a>
            <hr class="text-muted" style="height: 3px" />
            <p class="user_font">Please Login</p>
          `;
        }
      }
    }

    if (signupForm) {
      signupForm.addEventListener("submit", (ev) => {
        ev.preventDefault();
        const email = (document.getElementById("signupEmail")?.value || "").trim().toLowerCase();
        const pw = document.getElementById("signupPassword")?.value || "";
        const pwc = document.getElementById("signupConfirm")?.value || "";
        if (!email || !pw) return showMsg("Email & password required.");
        if (pw !== pwc) return showMsg("Passwords do not match.");
        const users = readUsers();
        if (users.find(u => u.email === email)) return showMsg("Account exists.");
        users.push({ email, pw: simpleHash(pw), created: Date.now() });
        writeUsers(users);
        setCurrent(email);
        refreshHeaderUser();
        if (authModal) authModal.hide();
        showMsg("Account created & logged in.");
      });
    }

    if (loginForm) {
      loginForm.addEventListener("submit", (ev) => {
        ev.preventDefault();
        const email = (document.getElementById("loginEmail")?.value || "").trim().toLowerCase();
        const pw = document.getElementById("loginPassword")?.value || "";
        const users = readUsers();
        const found = users.find(u => u.email === email && u.pw === simpleHash(pw));
        if (!found) return showMsg("Invalid credentials.");
        setCurrent(email);
        refreshHeaderUser();
        if (authModal) authModal.hide();
        showMsg("Logged in.");
      });
    }

    // Fallback (simple modal)
    if (!loginForm && fallbackModalButton && fallbackEmailInput && fallbackPasswordInput) {
      fallbackModalButton.addEventListener("click", (ev) => {
        const email = (fallbackEmailInput.value || "").trim().toLowerCase();
        const pw = fallbackPasswordInput.value || "";
        if (!email || !pw) return showMsg("Please provide email and password.");
        const users = readUsers();
        const found = users.find(u => u.email === email && u.pw === simpleHash(pw));
        if (found) {
          setCurrent(email); refreshHeaderUser();
          if (authModal) authModal.hide();
          showMsg("Logged in successfully.");
          return;
        }
        users.push({ email, pw: simpleHash(pw), created: Date.now() });
        writeUsers(users);
        setCurrent(email); refreshHeaderUser();
        if (authModal) authModal.hide();
        showMsg("No account found — created demo account and logged in.");
      });
    }

    refreshHeaderUser();
    document.addEventListener("click", (e) => {
      if (e.target.closest(".btn-group") || e.target.closest(".dropdown-menu")) refreshHeaderUser();
    });
  })();

  // ensure tooltips and badge updated on page load
  initTooltips();
  updateHeaderBadgeAndSummary();

  // ---------- All Products Modal functionality ----------
  (function initAllProductsModal() {
    function collectAllProducts() {
      const prods = [];
      document.querySelectorAll(".custom-col").forEach((col) => {
        try {
          const btn = col.querySelector(".add-to-cart");
          const id = col.dataset.id || (btn && btn.dataset.id) || "";
          const name = (btn && (btn.dataset.name || btn.getAttribute("data-name"))) || (col.querySelector(".card-title")?.textContent?.trim()) || "";
          const price = Number(btn?.dataset?.price || btn?.getAttribute("data-price") || 0) || 0;
          const oldprice = Number(btn?.dataset?.oldprice || btn?.getAttribute("data-oldprice") || 0) || 0;
          const img = (col.querySelector("img")?.src) || (btn && btn.dataset.image) || "./placeholder.png";
          const desc = col.querySelector(".card-text")?.textContent?.trim() || "";
          if (name) prods.push({ id, name, price, oldprice, img, desc });
        } catch (e) { /* ignore */ }
      });
      const seen = new Set();
      return prods.filter(p => {
        const key = (p.id || p.name || "").toString().trim().toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key); return true;
      });
    }

    function buildList(products) {
      const listEl = document.getElementById("all-products-list");
      if (!listEl) return;
      listEl.innerHTML = "";
      products.forEach((p, i) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "list-group-item list-group-item-action d-flex align-items-center";
        btn.dataset.index = i;
        btn.dataset.id = p.id || "";
        btn.innerHTML = `<img src="${p.img}" alt="" /><div style="text-align:left; width: calc(100% - 64px);"><div style="font-weight:600">${p.name}</div><div style="font-size:0.85rem;color:#bfbfbf">₹${(p.price || 0).toLocaleString('en-IN')}</div></div>`;
        btn.addEventListener("click", () => selectProduct(products, i, btn));
        listEl.appendChild(btn);
      });
      listEl.addEventListener("keydown", (e) => {
        const act = listEl.querySelector(".list-group-item.active");
        const items = Array.from(listEl.querySelectorAll(".list-group-item"));
        if (!items.length) return;
        let idx = items.indexOf(act);
        if (e.key === "ArrowDown") { e.preventDefault(); idx = Math.min(items.length - 1, idx + 1 < 0 ? 0 : idx + 1); items[idx].click(); items[idx].focus(); }
        else if (e.key === "ArrowUp") { e.preventDefault(); idx = Math.max(0, idx - 1); items[idx].click(); items[idx].focus(); }
      });
    }

    function selectProduct(products, index, clickedBtn) {
      const p = products[index];
      if (!p) return;
      const listEl = document.getElementById("all-products-list");
      listEl.querySelectorAll(".list-group-item").forEach(it => it.classList.remove("active"));
      if (clickedBtn) clickedBtn.classList.add("active");
      const setText = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
      const setHTML = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
      const img = document.getElementById("allpd-image"); if (img) img.src = p.img || "./placeholder.png";
      setText("allpd-title", p.name);
      setText("allpd-sub", p.desc || "");
      setText("allpd-price", `₹${(p.price || 0).toLocaleString('en-IN')}`);
      setText("allpd-old", p.oldprice ? `₹${(p.oldprice || 0).toLocaleString('en-IN')}` : "");
      setHTML("allpd-specs", p.desc ? `<ul><li>${p.desc}</li></ul>` : "");
      setText("allpd-description", p.desc || "");
      const addBtn = document.getElementById("allpd-add");
      if (addBtn) {
        addBtn.dataset.id = p.id || p.name;
        addBtn.dataset.name = p.name;
        addBtn.dataset.price = p.price || 0;
        addBtn.dataset.oldprice = p.oldprice || p.price || 0;
        addBtn.dataset.image = p.img || "./placeholder.png";
      }
    }

    function addToCartFromModal(btn) {
      try {
        const id = btn.dataset.id || String(Date.now());
        const name = btn.dataset.name || "Product";
        const price = Number(btn.dataset.price || 0) || 0;
        const oldPrice = Number(btn.dataset.oldprice || price) || price;
        const img = btn.dataset.image || "./placeholder.png";
        const current = JSON.parse(localStorage.getItem("ts_cart") || "[]");
        const existing = current.find(i => String(i.id) === String(id));
        if (existing) existing.qty = Number(existing.qty || 0) + 1;
        else current.push({ id, name, price, oldPrice, img, qty: 1 });
        localStorage.setItem("ts_cart", JSON.stringify(current));
        try { if (typeof renderCart === "function") renderCart(); } catch (e) {}
        try { document.querySelectorAll("#cart-count").forEach((b)=> { b.style.display = "inline-block"; }); } catch(e){}
        const orig = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> Added';
        btn.disabled = true;
        setTimeout(()=> { btn.innerHTML = orig; btn.disabled = false; }, 900);
      } catch (e) { console.error("addToCartFromModal error", e); }
    }

    const trigger = document.querySelector(".browse-all-btn");
    if (trigger) {
      trigger.addEventListener("click", () => {
        const list = collectAllProducts();
        buildList(list);
        setTimeout(() => {
          const firstBtn = document.querySelector("#all-products-list .list-group-item");
          if (firstBtn) firstBtn.click();
        }, 60);
      });
    }

    document.addEventListener("click", (e) => {
      if (e.target && (e.target.id === "allpd-add" || e.target.closest("#allpd-add"))) {
        const btn = e.target.closest("#allpd-add");
        if (btn) addToCartFromModal(btn);
      }
    });

  })();

}); // DOMContentLoaded end
 