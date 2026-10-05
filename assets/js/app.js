/* ==========================================================================
   BUBBLO — storefront behaviour
   Cart, product variants, gallery, campaign countdown, COD checkout,
   Indian mobile validation, order success + tracking, WhatsApp, gift moment.
   No tracking pixels, no payment gateways, no account/login/OTP.
   ========================================================================== */
(function () {
  "use strict";

  var CFG = window.BUBBLO_CONFIG || {};
  var CAT = window.BUBBLO_CATALOG || { cloud: "", products: [] };
  var PREVIEW = !!window.BUBBLO_PREVIEW;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function goTo(url) {
    if (!url) return;
    if (PREVIEW && url.charAt(0) === "#") { window.location.hash = url; }
    else { window.location.href = url; }
  }

  /* ------------------------------ money ---------------------------------- */
  var inrFmt = new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0
  });
  function money(n) { return inrFmt.format(Number(n) || 0); }

  /* ------------------------------ images --------------------------------- */
  function imgUrl(pid, version, w, fmt) {
    var cloud = CAT.cloud || "acqrwkcn";
    return "https://res.cloudinary.com/" + cloud + "/image/upload/" +
      "f_auto,q_auto:good,c_limit,w_" + (w || 800) + "/v" + version + "/" + pid + "." + (fmt || "png");
  }
  function firstImage(variant) { return (variant && variant.images && variant.images[0]) || null; }

  /* ------------------------------ catalog -------------------------------- */
  function productById(id) { return CAT.products.filter(function (p) { return p.id === id; })[0] || null; }
  function variantById(p, vid) {
    if (!p) return null;
    if (!p.variants || !p.variants.length) return null;
    if (!vid) return p.variants[0];
    return p.variants.filter(function (v) { return v.id === vid; })[0] || p.variants[0];
  }
  function lineId(pid, vid) { return pid + "::" + (vid || "default"); }

  /* ------------------------------ storage -------------------------------- */
  var MEM = {};
  function read(key, fb) {
    if (PREVIEW) return (key in MEM) ? MEM[key] : fb;
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fb; }
    catch (e) { return (key in MEM) ? MEM[key] : fb; }
  }
  function write(key, val) {
    if (!PREVIEW) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }
    MEM[key] = val;
  }
  function remove(key) {
    if (!PREVIEW) { try { localStorage.removeItem(key); } catch (e) {} }
    delete MEM[key];
  }

  /* ------------------------------ cart ----------------------------------- */
  function getCart() {
    var c = read(CFG.storage.cart, []);
    if (!Array.isArray(c)) return [];
    return c.filter(function (l) {
      var p = productById(l.productId);
      var v = variantById(p, l.variantId);
      return p && v && l.qty > 0;
    }).map(function (l) { return { productId: l.productId, variantId: variantById(productById(l.productId), l.variantId).id, qty: Math.min(99, Math.max(1, parseInt(l.qty, 10) || 1)) }; });
  }
  function setCart(c) { write(CFG.storage.cart, c); renderCartCount(); }

  function addToCart(pid, vid, qty) {
    var p = productById(pid); var v = variantById(p, vid);
    if (!p || !v) return;
    qty = Math.max(1, parseInt(qty, 10) || 1);
    var c = getCart();
    var id = lineId(p.id, v.id);
    var found = c.filter(function (l) { return lineId(l.productId, l.variantId) === id; })[0];
    if (found) { found.qty = Math.min(99, found.qty + qty); }
    else { c.push({ productId: p.id, variantId: v.id, qty: qty }); }
    setCart(c);
  }
  function setLineQty(pid, vid, qty) {
    var c = getCart(); var id = lineId(pid, vid);
    c = c.map(function (l) { return lineId(l.productId, l.variantId) === id ? { productId: l.productId, variantId: l.variantId, qty: Math.min(99, Math.max(1, qty)) } : l; });
    setCart(c);
  }
  function removeLine(pid, vid) {
    var id = lineId(pid, vid);
    setCart(getCart().filter(function (l) { return lineId(l.productId, l.variantId) !== id; }));
  }
  function cartCount() { return getCart().reduce(function (n, l) { return n + l.qty; }, 0); }
  function cartSubtotal() {
    return getCart().reduce(function (n, l) {
      var v = variantById(productById(l.productId), l.variantId);
      return n + (v ? v.price * l.qty : 0);
    }, 0);
  }
  function cartLines() {
    return getCart().map(function (l) {
      var p = productById(l.productId); var v = variantById(p, l.variantId);
      return { product: p, variant: v, qty: l.qty, lineTotal: v.price * l.qty };
    });
  }

  function renderCartCount() {
    var n = cartCount();
    $$(".js-cart-count").forEach(function (el) {
      el.textContent = n;
      el.hidden = n === 0;
    });
    var live = $(".js-cart-live");
    if (live) live.textContent = n === 1 ? "1 item in cart" : n + " items in cart";
  }

  /* ------------------------------ toast ---------------------------------- */
  function toast(msg) {
    var wrap = $(".toast-wrap");
    if (!wrap) { wrap = document.createElement("div"); wrap.className = "toast-wrap"; wrap.setAttribute("role", "status"); wrap.setAttribute("aria-live", "polite"); document.body.appendChild(wrap); }
    var t = document.createElement("div"); t.className = "toast";
    var ic = document.createElement("span"); ic.className = "ic"; ic.textContent = "✓";
    var tx = document.createElement("span"); tx.textContent = msg;
    t.appendChild(ic); t.appendChild(tx); wrap.appendChild(t);
    setTimeout(function () { t.style.transition = "opacity .3s,transform .3s"; t.style.opacity = "0"; t.style.transform = "translateY(10px)"; setTimeout(function () { t.remove(); }, 320); }, 2600);
  }

  /* ------------------------------ header --------------------------------- */
  function initHeader() {
    var header = $(".header");
    if (header) {
      var onScroll = function () { header.classList.toggle("is-stuck", window.scrollY > 8); };
      onScroll(); window.addEventListener("scroll", onScroll, { passive: true });
    }
    var burger = $(".js-burger"), drawer = $(".js-drawer"), scrim = $(".js-scrim"), closeBtn = $(".js-drawer-close");
    if (!burger || !drawer) return;
    var lastFocus = null;
    function open() {
      lastFocus = document.activeElement;
      drawer.classList.add("open"); scrim.classList.add("open");
      drawer.setAttribute("aria-hidden", "false"); burger.setAttribute("aria-expanded", "true");
      document.body.style.overflow = "hidden";
      var f = drawer.querySelector("a,button"); if (f) f.focus();
    }
    function close() {
      drawer.classList.remove("open"); scrim.classList.remove("open");
      drawer.setAttribute("aria-hidden", "true"); burger.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
      if (lastFocus) lastFocus.focus();
    }
    burger.addEventListener("click", open);
    if (closeBtn) closeBtn.addEventListener("click", close);
    if (scrim) scrim.addEventListener("click", close);
    $$("a", drawer).forEach(function (a) { a.addEventListener("click", close); });
    document.addEventListener("keydown", function (e) {
      if (!drawer.classList.contains("open")) return;
      if (e.key === "Escape") { close(); return; }
      if (e.key === "Tab") {
        var f = $$('a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])', drawer).filter(function (el) { return el.offsetParent !== null; });
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  /* ------------------------------ countdown ------------------------------ */
  var cdTimer = null;
  function initCountdown() {
    var roots = $$(".js-countdown");
    if (!roots.length) return;
    var end = new Date(CFG.campaign && CFG.campaign.end).getTime();
    function pad(n) { return String(n).padStart(2, "0"); }
    function tick() {
      var diff = end - Date.now();
      if (isNaN(end) || diff <= 0) {
        roots.forEach(function (r) {
          r.classList.add("countdown--ended");
          r.innerHTML = '<span class="countdown--ended">Offer ended</span>';
          r.setAttribute("aria-label", "The " + (CFG.campaign.name || "campaign") + " offer has ended.");
        });
        clearInterval(cdTimer);
        return;
      }
      var s = Math.floor(diff / 1000);
      var d = Math.floor(s / 86400); s -= d * 86400;
      var h = Math.floor(s / 3600); s -= h * 3600;
      var m = Math.floor(s / 60); s -= m * 60;
      var parts = [];
      if (d > 0) parts.push(unit(d, "Days"));
      parts.push(unit(h, "Hours"), unit(m, "Mins"), unit(s, "Secs"));
      var html = parts.join("");
      var label = "Offer ends in " + (d > 0 ? d + " days " : "") + h + " hours " + m + " minutes " + s + " seconds.";
      roots.forEach(function (r) { r.innerHTML = html; r.setAttribute("aria-label", label); });
    }
    function unit(v, l) { return '<span class="count-unit"><b>' + pad(v) + '</b><small>' + l + '</small></span>'; }
    tick();
    if (cdTimer) clearInterval(cdTimer);
    cdTimer = setInterval(tick, 1000);
  }

  /* ------------------------------ product cards -------------------------- */
  function cardPriceHtml(v) {
    return '<span class="price__now js-card-price">' + money(v.price) + '</span>' +
      '<span class="price__mrp js-card-mrp">' + money(v.mrp) + '</span>' +
      '<span class="price__off js-card-off">' + v.discount + '% OFF</span>';
  }
  function applyCardVariant(card, product, variant) {
    var img = $(".js-card-img", card);
    var im = firstImage(variant);
    if (img && im) { img.src = imgUrl(im.id, im.version, 600); img.alt = product.name + (variant.label ? " — " + variant.label : "") + " variant"; }
    var pw = $(".js-card-pricewrap", card);
    if (pw) pw.innerHTML = cardPriceHtml(variant);
    var off = $(".js-card-offbadge", card);
    if (off) off.textContent = variant.discount + "% OFF";
    $$(".variant-pill", card).forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-variant") === variant.id)); });
    card.setAttribute("data-current-variant", variant.id);
  }
  function initCards() {
    $$(".js-card").forEach(function (card) {
      var p = productById(card.getAttribute("data-product"));
      if (!p) return;
      var v = variantById(p, card.getAttribute("data-current-variant") || p.defaultVariant);
      applyCardVariant(card, p, v);
      $$(".variant-pill", card).forEach(function (b) {
        b.addEventListener("click", function () {
          var nv = variantById(p, b.getAttribute("data-variant"));
          applyCardVariant(card, p, nv);
        });
      });
      var add = $(".js-add", card);
      if (add) add.addEventListener("click", function (e) {
        e.preventDefault();
        var cur = card.getAttribute("data-current-variant") || p.defaultVariant;
        addToCart(p.id, cur, 1);
        toast(p.name + (p.variants.length > 1 ? " (" + variantById(p, cur).label + ")" : "") + " added to cart");
      });
      $$(".js-view", card).forEach(function (view) {
        view.addEventListener("click", function (e) {
          e.preventDefault();
          var cur = card.getAttribute("data-current-variant") || p.defaultVariant;
          var href = view.getAttribute("data-href");
          if (p.variants.length > 1) {
            if (PREVIEW) { window.__BUBBLO_VARIANT = cur; goTo(href); }
            else { goTo(href + "?variant=" + encodeURIComponent(cur)); }
          } else { goTo(href); }
        });
      });
    });
  }

  /* ------------------------------ product page --------------------------- */
  function initProductPage() {
    var root = $(".js-pdp");
    if (!root) return;
    var p = productById(root.getAttribute("data-product"));
    if (!p) return;

    var params = new URLSearchParams(window.location.search);
    var startVid = params.get("variant") || window.__BUBBLO_VARIANT || p.defaultVariant;
    window.__BUBBLO_VARIANT = null;
    var state = { variant: variantById(p, startVid), qty: 1, index: 0 };

    var mainImg = $(".js-gal-main"), thumbs = $(".js-gal-thumbs"),
        nameEl = $(".js-pdp-name"), tagEl = $(".js-pdp-tag"),
        priceWrap = $(".js-pdp-pricewrap"), posEl = $(".js-pdp-pos"),
        qtyInput = $(".js-qty-input"), live = $(".js-pdp-live");

    function renderVariant() {
      var v = state.variant;
      state.index = 0;
      // images
      var im = v.images[state.index];
      if (mainImg) {
        mainImg.classList.add("swap");
        setTimeout(function () {
          mainImg.src = imgUrl(im.id, im.version, 1000);
          mainImg.alt = p.name + (v.label ? " — " + v.label + " variant" : "") + " — image " + (state.index + 1);
          mainImg.classList.remove("swap");
        }, 140);
      }
      if (thumbs) {
        thumbs.innerHTML = "";
        v.images.forEach(function (im2, i) {
          var b = document.createElement("button");
          b.type = "button"; b.setAttribute("aria-label", "View image " + (i + 1));
          b.setAttribute("aria-current", String(i === state.index));
          var t = document.createElement("img");
          t.src = imgUrl(im2.id, im2.version, 200); t.alt = ""; t.loading = "lazy";
          b.appendChild(t);
          b.addEventListener("click", function () { state.index = i; updateImage(); });
          thumbs.appendChild(b);
        });
      }
      // text + price
      if (nameEl) nameEl.textContent = p.name;
      if (tagEl) tagEl.textContent = p.tag;
      if (posEl) posEl.textContent = p.positioning;
      if (priceWrap) {
        priceWrap.innerHTML = '<span class="price__now">' + money(v.price) + '</span>' +
          '<span class="price__mrp">' + money(v.mrp) + '</span>' +
          '<span class="price__off">' + v.discount + '% OFF</span>';
      }
      // variant buttons
      $$(".js-pdp-variant").forEach(function (b) {
        b.setAttribute("aria-pressed", String(b.getAttribute("data-variant") === v.id));
      });
      // sticky bar
      var sb = $(".js-sticky-price");
      if (sb) sb.textContent = money(v.price);
      // URL sync (shareable, back-button friendly)
      if (p.variants.length > 1 && !PREVIEW) {
        var url = new URL(window.location.href);
        url.searchParams.set("variant", v.id);
        history.replaceState(null, "", url.toString());
      }
      if (live) live.textContent = (v.label ? v.label + " variant selected. " : "") + "Now " + money(v.price) + ", " + v.discount + " percent off.";
      syncStickyBtn();
    }
    function updateImage() {
      var v = state.variant, im = v.images[state.index];
      if (!mainImg) return;
      mainImg.classList.add("swap");
      setTimeout(function () {
        mainImg.src = imgUrl(im.id, im.version, 1000);
        mainImg.alt = p.name + (v.label ? " — " + v.label + " variant" : "") + " — image " + (state.index + 1);
        mainImg.classList.remove("swap");
      }, 140);
      $$(".js-gal-thumbs button").forEach(function (b, i) { b.setAttribute("aria-current", String(i === state.index)); });
    }
    function syncStickyBtn() {
      var b = $(".js-sticky-add");
      if (b) b.textContent = "Add · " + money(state.variant.price);
    }

    $$(".js-pdp-variant").forEach(function (b) {
      b.addEventListener("click", function () { state.variant = variantById(p, b.getAttribute("data-variant")); renderVariant(); });
    });
    $$(".js-qty").forEach(function (b) {
      b.addEventListener("click", function () {
        state.qty = Math.min(99, Math.max(1, state.qty + parseInt(b.getAttribute("data-step"), 10)));
        if (qtyInput) qtyInput.value = state.qty;
      });
    });
    if (qtyInput) qtyInput.addEventListener("change", function () {
      state.qty = Math.min(99, Math.max(1, parseInt(qtyInput.value, 10) || 1)); qtyInput.value = state.qty;
    });

    function doAdd() { addToCart(p.id, state.variant.id, state.qty); toast(p.name + (state.variant.label ? " (" + state.variant.label + ")" : "") + " added to cart"); }
    function doBuy() {
      write("bubblo_buynow_v1", { productId: p.id, variantId: state.variant.id, qty: state.qty });
      var u = root.getAttribute("data-checkout-url") || "../checkout/";
      if (PREVIEW) { window.__BUBBLO_BUYNOW = true; goTo(u); }
      else { goTo(u + "?buynow=1"); }
    }
    $$(".js-pdp-add").forEach(function (b) { b.addEventListener("click", doAdd); });
    $$(".js-pdp-buy").forEach(function (b) { b.addEventListener("click", doBuy); });

    // lightbox
    var lb = $(".js-lightbox");
    if (lb && mainImg) {
      var lbImg = $(".js-lightbox-img", lb);
      mainImg.addEventListener("click", function () { lbImg.src = mainImg.src; lb.classList.add("open"); $(".js-lightbox-close", lb).focus(); });
      function closeLb() { lb.classList.remove("open"); }
      $(".js-lightbox-close", lb).addEventListener("click", closeLb);
      lb.addEventListener("click", function (e) { if (e.target === lb) closeLb(); });
      if (!window.__lbBound) { window.__lbBound = true; document.addEventListener("keydown", function (e) { var l = document.querySelector(".js-lightbox"); if (e.key === "Escape" && l && l.classList.contains("open")) l.classList.remove("open"); }); }
    }

    // swipe on gallery
    if (mainImg) {
      var x0 = null;
      mainImg.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
      mainImg.addEventListener("touchend", function (e) {
        if (x0 === null) return;
        var dx = e.changedTouches[0].clientX - x0; x0 = null;
        if (Math.abs(dx) < 40) return;
        var n = state.variant.images.length;
        state.index = (state.index + (dx < 0 ? 1 : -1) + n) % n;
        updateImage();
      }, { passive: true });
    }

    renderVariant();
  }

  /* ------------------------------ cart page ------------------------------ */
  function initCartPage() {
    var root = $(".js-cart");
    if (!root) return;
    var listEl = $(".js-cart-lines"), emptyEl = $(".js-cart-empty"), layoutEl = $(".js-cart-layout");
    function render() {
      var lines = cartLines();
      renderCartCount();
      if (!lines.length) {
        if (layoutEl) layoutEl.hidden = true;
        if (emptyEl) emptyEl.hidden = false;
        return;
      }
      if (layoutEl) layoutEl.hidden = false;
      if (emptyEl) emptyEl.hidden = true;
      listEl.innerHTML = lines.map(function (l) {
        var im = firstImage(l.variant);
        var vid = l.variant.label ? '<p class="cart-line__variant">Variant: <b>' + l.variant.label + '</b></p>' : "";
        return '<article class="cart-line" data-pid="' + l.product.id + '" data-vid="' + l.variant.id + '">' +
          '<div class="cart-line__media">' + (im ? '<img src="' + imgUrl(im.id, im.version, 240) + '" alt="' + l.product.name + (l.variant.label ? " " + l.variant.label : "") + '" loading="lazy">' : "") + '</div>' +
          '<div><h3 class="cart-line__name">' + l.product.name + '</h3>' + vid +
          '<div class="price"><span class="price__now">' + money(l.variant.price) + '</span><span class="price__mrp">' + money(l.variant.mrp) + '</span><span class="price__off">' + l.variant.discount + '% OFF</span></div></div>' +
          '<div class="cart-line__right">' +
          '<div class="qty" role="group" aria-label="Quantity for ' + l.product.name + '">' +
          '<button type="button" class="js-dec" aria-label="Decrease quantity">−</button>' +
          '<input class="js-qty-input" type="text" inputmode="numeric" value="' + l.qty + '" aria-label="Quantity" readonly>' +
          '<button type="button" class="js-inc" aria-label="Increase quantity">+</button></div>' +
          '<b class="js-line-total">' + money(l.lineTotal) + '</b>' +
          '<button type="button" class="cart-line__remove js-remove">Remove</button></div>' +
          '</article>';
      }).join("");
      var sub = cartSubtotal();
      $(".js-subtotal").textContent = money(sub);
      $(".js-total").textContent = money(sub + shippingFee());
      $(".js-itemcount").textContent = cartCount();
      listEl.querySelectorAll(".cart-line").forEach(function (el) {
        var pid = el.getAttribute("data-pid"), vid = el.getAttribute("data-vid");
        var qin = el.querySelector(".js-qty-input");
        el.querySelector(".js-inc").addEventListener("click", function () { setLineQty(pid, vid, parseInt(qin.value, 10) + 1); render(); });
        el.querySelector(".js-dec").addEventListener("click", function () { setLineQty(pid, vid, parseInt(qin.value, 10) - 1); render(); });
        el.querySelector(".js-remove").addEventListener("click", function () { removeLine(pid, vid); toast("Item removed"); render(); });
      });
    }
    render();
  }

  function shippingFee() { return (CFG.shipping && CFG.shipping.flatRate) ? CFG.shipping.flatRate : 0; }

  /* ------------------------------ phone field ---------------------------- */
  function normalizePhone(digits) { return "+91" + digits; }
  function formatPhone(digits) { return digits.length === 10 ? "+91 " + digits.slice(0, 5) + " " + digits.slice(5) : "+91 " + digits; }
  function initPhone() {
    $$(".js-phone").forEach(function (input) {
      input.addEventListener("input", function () {
        var d = input.value.replace(/\D/g, "");
        if (d.indexOf("91") === 0 && d.length > 10) d = d.slice(2);
        d = d.slice(0, 10);
        input.value = d;
        var prev = input.parentNode.querySelector(".js-phone-preview");
        if (prev) prev.textContent = d.length ? formatPhone(d) : "";
        if (input.getAttribute("aria-invalid") === "true" && d.length === 10) { input.setAttribute("aria-invalid", "false"); clearErr(input); }
      });
      input.addEventListener("keydown", function (e) { if (e.key === "+" || e.key === "-" || e.key === "e") e.preventDefault(); });
      input.addEventListener("paste", function (e) {
        e.preventDefault();
        var t = (e.clipboardData || window.clipboardData).getData("text").replace(/\D/g, "");
        if (t.indexOf("91") === 0 && t.length > 10) t = t.slice(2);
        input.value = t.slice(0, 10);
        input.dispatchEvent(new Event("input"));
      });
    });
  }
  function setErr(input, msg) {
    input.setAttribute("aria-invalid", "true");
    var e = input.parentNode.querySelector(".err") || input.closest(".field") && input.closest(".field").querySelector(".err");
    if (e) { e.textContent = msg; e.classList.add("show"); }
  }
  function clearErr(input) {
    input.setAttribute("aria-invalid", "false");
    var e = input.closest(".field") && input.closest(".field").querySelector(".err");
    if (e) { e.textContent = ""; e.classList.remove("show"); }
  }

  /* ------------------------------ checkout ------------------------------- */
  function initCheckout() {
    var form = $(".js-checkout");
    if (!form) return;
    var params = new URLSearchParams(window.location.search);
    var isBuyNow = PREVIEW ? !!window.__BUBBLO_BUYNOW : (params.get("buynow") === "1");
    if (PREVIEW) window.__BUBBLO_BUYNOW = false;
    var buynow = isBuyNow ? read("bubblo_buynow_v1", null) : null;

    var lines = buynow ? (function () {
      var p = productById(buynow.productId), v = variantById(p, buynow.variantId);
      return p && v ? [{ product: p, variant: v, qty: buynow.qty || 1, lineTotal: v.price * (buynow.qty || 1) }] : [];
    })() : cartLines();

    if (!lines.length) { goTo(form.getAttribute("data-cart-url") || "../cart/"); return; }

    var listEl = $(".js-summary-lines");
    if (listEl) {
      listEl.innerHTML = lines.map(function (l) {
        var im = firstImage(l.variant);
        return '<div class="order-line"><div class="order-line__media">' +
          (im ? '<img src="' + imgUrl(im.id, im.version, 160) + '" alt="" loading="lazy">' : "") + '</div>' +
          '<div><b>' + l.product.name + '</b><div class="muted" style="font-size:.82rem">' +
          (l.variant.label ? "Variant: " + l.variant.label + " · " : "") + "Qty " + l.qty + '</div></div>' +
          '<b>' + money(l.lineTotal) + '</b></div>';
      }).join("");
    }
    var sub = lines.reduce(function (n, l) { return n + l.lineTotal; }, 0);
    $(".js-co-subtotal").textContent = money(sub);
    $(".js-co-total").textContent = money(sub + shippingFee());
    var buyBtnLabel = $(".js-place-order");
    if (buyBtnLabel) buyBtnLabel.textContent = "Place COD Order · " + money(sub + shippingFee());

    // validation
    var fields = {
      name: { el: $(".js-f-name"), test: function (v) { return v.trim().length >= 2; }, msg: "Please enter your full name." },
      mobile: { el: $(".js-phone"), test: function (v) { return /^[6-9]\d{9}$/.test(v); }, msg: "Enter a valid 10-digit Indian mobile number." },
      email: { el: $(".js-f-email"), optional: true, test: function (v) { return v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }, msg: "Enter a valid email or leave it blank." },
      address: { el: $(".js-f-address"), test: function (v) { return v.trim().length >= 6; }, msg: "Please enter your full address." },
      landmark: { el: $(".js-f-landmark"), test: function (v) { return v.trim().length >= 2; }, msg: "Please enter a nearby landmark." },
      pincode: { el: $(".js-f-pincode"), test: function (v) { return /^\d{6}$/.test(v); }, msg: "Enter a valid 6-digit pincode." },
      city: { el: $(".js-f-city"), test: function (v) { return v.trim().length >= 2; }, msg: "Please enter your city." },
      state: { el: $(".js-f-state"), test: function (v) { return v !== ""; }, msg: "Please select your state." }
    };
    Object.keys(fields).forEach(function (k) {
      var f = fields[k]; if (!f.el) return;
      f.el.addEventListener("blur", function () { if (!f.test(f.el.value)) setErr(f.el, f.msg); else clearErr(f.el); });
      f.el.addEventListener("input", function () { if (f.el.getAttribute("aria-invalid") === "true" && f.test(f.el.value)) clearErr(f.el); });
    });
    var pin = $(".js-f-pincode");
    if (pin) pin.addEventListener("input", function () { pin.value = pin.value.replace(/\D/g, "").slice(0, 6); });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = true, firstBad = null;
      Object.keys(fields).forEach(function (k) {
        var f = fields[k]; if (!f.el) return;
        var val = (f.el.value || "").trim();
        if (f.optional && val === "") { clearErr(f.el); return; }
        if (!f.test(f.el.value)) { setErr(f.el, f.msg); ok = false; if (!firstBad) firstBad = f.el; }
        else clearErr(f.el);
      });
      var terms = $(".js-terms");
      if (terms && !terms.checked) { ok = false; toast("Please accept the terms to continue"); if (!firstBad) firstBad = terms; }
      if (!ok) { if (firstBad) firstBad.focus(); return; }

      var mobile = fields.mobile.el.value.replace(/\D/g, "");
      var order = {
        id: genOrderId(),
        createdAt: new Date().toISOString(),
        status: "New Order",
        payment: "COD",
        items: lines.map(function (l) {
          var im = firstImage(l.variant);
          return { productId: l.product.id, variantId: l.variant.id, name: l.product.name, variantLabel: l.variant.label || null, price: l.variant.price, mrp: l.variant.mrp, qty: l.qty, image: im ? imgUrl(im.id, im.version, 240) : null };
        }),
        subtotal: sub,
        total: sub + shippingFee(),
        customer: {
          name: fields.name.el.value.trim(),
          mobile: normalizePhone(mobile),
          mobileDisplay: formatPhone(mobile),
          email: (fields.email.el.value || "").trim(),
          address: fields.address.el.value.trim(),
          landmark: fields.landmark.el.value.trim(),
          pincode: fields.pincode.el.value.trim(),
          city: fields.city.el.value.trim(),
          state: fields.state.el.value
        }
      };

      var submitBtn = $(".js-place-order");
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Placing order…"; }

      submitOrder(order).then(function (res) {
        res.order.emailed = res.emailed;
        write(CFG.storage.lastOrder, res.order);
        var all = read(CFG.storage.orders, []); all.unshift(res.order); write(CFG.storage.orders, all.slice(0, 40));
        if (!buynow) setCart([]);
        remove("bubblo_buynow_v1");
        goTo(form.getAttribute("data-success-url") || "../order-success/");
      }).catch(function () {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Place COD Order"; }
        toast("Something went wrong. Please try again or contact us on WhatsApp.");
      });
    });
  }

  function genOrderId() {
    var d = new Date();
    var ymd = String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0");
    var rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
    return "BB" + ymd + rnd;
  }

  /* --- Order service ------------------------------------------------------
     Every order is emailed to the business inbox (CFG.order.email) through a
     zero-signup form-to-email relay — no server, no account. The customer's
     browser sends it, so it works on static hosting.
     To move to a real backend later, replace the body of submitOrder() with a
     fetch() to your order API and keep the resolved shape { order }.
  ------------------------------------------------------------------------ */
  function submitOrder(order) {
    var url = (CFG.order && CFG.order.emailEndpoint) || "";
    var lines = order.items.map(function (it) {
      return it.name + (it.variantLabel ? " (" + it.variantLabel + ")" : "") + " x" + it.qty + " = " + money(it.price * it.qty);
    }).join("  |  ");
    var payload = {
      _subject: "New BUBBLO Order " + order.id + " — COD " + money(order.total),
      _template: "table",
      _captcha: "false",
      "Order ID": order.id,
      "Payment": "Cash On Delivery",
      "Total": money(order.total),
      "Customer name": order.customer.name,
      "Mobile": order.customer.mobileDisplay + " (" + order.customer.mobile + ")",
      "Customer email": order.customer.email || "-",
      "Address": order.customer.address,
      "Landmark": order.customer.landmark,
      "Pincode": order.customer.pincode,
      "City": order.customer.city,
      "State": order.customer.state,
      "Items": lines
    };
    if (!url) { return Promise.resolve({ order: order, emailed: false }); }
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(payload)
    }).then(function (r) { return r.json().catch(function () { return {}; }); })
      .then(function () { return { order: order, emailed: true }; })
      .catch(function () { return { order: order, emailed: false }; });
  }
  function lookupOrder(orderId, mobileDigits) {
    var all = read(CFG.storage.orders, []);
    var last = read(CFG.storage.lastOrder, null);
    if (last && all.indexOf(last) === -1) all = [last].concat(all);
    var key = (orderId || "").trim().toUpperCase();
    var found = all.filter(function (o) {
      return o && o.id === key && (o.customer.mobile || "").replace(/\D/g, "").slice(-10) === mobileDigits;
    })[0];
    // --- INTEGRATION POINT: replace with a backend tracking fetch() --------
    return Promise.resolve(found || null);
  }

  /* ------------------------------ success -------------------------------- */
  function initSuccess() {
    var root = $(".js-success");
    if (!root) return;
    var order = read(CFG.storage.lastOrder, null);
    if (!order) { root.innerHTML = '<div class="empty-state"><div class="ic">🧾</div><h2>No recent order found</h2><p class="muted">If you just placed an order, please check your order tracking page.</p><a class="btn btn--primary" href="../track-order/">Track an order</a></div>'; return; }
    $(".js-order-id").textContent = order.id;
    $(".js-order-items").innerHTML = order.items.map(function (it) {
      return '<div class="order-line"><div class="order-line__media">' + (it.image ? '<img src="' + it.image + '" alt="" loading="lazy">' : "") + '</div>' +
        '<div><b>' + it.name + '</b><div class="muted" style="font-size:.82rem">' + (it.variantLabel ? "Variant: " + it.variantLabel + " · " : "") + "Qty " + it.qty + '</div></div>' +
        '<b>' + money(it.price * it.qty) + '</b></div>';
    }).join("");
    $(".js-order-total").textContent = money(order.total);
    $(".js-order-payment").textContent = "Cash On Delivery";
    var track = $(".js-track-link");
    if (track) {
      var mob = (order.customer.mobile || "").replace(/\D/g, "").slice(-10);
      if (PREVIEW) { window.__BUBBLO_TRACK = { order: order.id, mobile: mob }; track.href = "#/track-order/"; }
      else { track.href = "../track-order/?order=" + encodeURIComponent(order.id) + "&mobile=" + encodeURIComponent(mob); }
    }
    // WhatsApp copy of the order (guaranteed delivery to the business)
    var waBtn = $(".js-wa-order");
    if (waBtn) {
      var msg = "Hi BUBBLO 👋 I just placed an order.\n" +
        "Order ID: " + order.id + "\n" +
        "Payment: Cash On Delivery\n" +
        "Total: " + money(order.total) + "\n" +
        "Name: " + order.customer.name + "\n" +
        "Mobile: " + order.customer.mobileDisplay + "\n" +
        "Address: " + order.customer.address + ", " + order.customer.landmark + ", " + order.customer.city + ", " + order.customer.state + " - " + order.customer.pincode + "\n" +
        "Items: " + order.items.map(function (it) { return it.name + (it.variantLabel ? " (" + it.variantLabel + ")" : "") + " x" + it.qty; }).join(", ");
      waBtn.href = waUrl(msg);
    }
    var note = $(".js-order-note");
    if (note) note.textContent = order.emailed ? "A copy of your order has been sent to BUBBLO." : "Tap below to send your order to BUBBLO on WhatsApp.";
  }

  /* ------------------------------ tracking ------------------------------- */
  var STATUSES = ["New Order", "Call Pending", "Call Confirmed", "Processing", "Shipped", "Out For Delivery", "Delivered"];
  var TERMINAL = { "Cancelled": "Your order was cancelled.", "RTO": "This order is being returned to us." };
  function initTrack() {
    var form = $(".js-track");
    if (!form) return;
    var result = $(".js-track-result");
    var params = new URLSearchParams(window.location.search);
    var oi = $(".js-t-order"), mi = $(".js-phone");
    var qOrder = params.get("order") || (window.__BUBBLO_TRACK && window.__BUBBLO_TRACK.order);
    var qMobile = params.get("mobile") || (window.__BUBBLO_TRACK && window.__BUBBLO_TRACK.mobile);
    if (qOrder) oi.value = qOrder;
    if (qMobile) { mi.value = String(qMobile).replace(/\D/g, "").slice(-10); mi.dispatchEvent(new Event("input")); }

    function renderOrder(o) {
      var isTerm = TERMINAL[o.status];
      var idx = STATUSES.indexOf(o.status);
      if (idx === -1) idx = 0;
      var tl = STATUSES.map(function (s, i) {
        var cls = i < idx ? "done" : (i === idx ? "current" : "");
        return '<li class="' + cls + '"><b>' + s + '</b><span>' + (i === idx ? "Current status" : (i < idx ? "Completed" : "Pending")) + '</span></li>';
      }).join("");
      var items = o.items.map(function (it) {
        return '<div class="order-line"><div class="order-line__media">' + (it.image ? '<img src="' + it.image + '" alt="" loading="lazy">' : "") + '</div>' +
          '<div><b>' + it.name + '</b><div class="muted" style="font-size:.82rem">' + (it.variantLabel ? "Variant: " + it.variantLabel + " · " : "") + "Qty " + it.qty + '</div></div>' +
          '<b>' + money(it.price * it.qty) + '</b></div>';
      }).join("");
      result.innerHTML = '<div class="panel" style="margin-top:22px"><div class="order-card__row"><span class="muted">Order ID</span><b>' + o.id + '</b></div>' +
        '<div class="order-card__row"><span class="muted">Status</span><b>' + o.status + '</b></div>' +
        '<div class="order-card__row"><span class="muted">Payment</span><b>Cash On Delivery</b></div>' +
        (isTerm ? '<div class="notice notice--warn" style="margin-top:16px">' + isTerm + ' Please contact us on WhatsApp for help.</div>' : '') +
        (o.items && o.items.length ? '<div style="margin-top:18px"><h3 style="font-size:1.05rem">Items</h3>' + items + '</div>' : '') +
        '<div style="margin-top:18px"><h3 style="font-size:1.05rem">' + (isTerm ? "Order status" : "Timeline") + '</h3>' +
        (isTerm ? '' : '<ol class="timeline">' + tl + '</ol>') + '</div>' +
        '<a class="btn btn--wa btn--block" style="margin-top:8px" href="' + waUrl("Hi BUBBLO 👋 I need help with my order " + o.id + ".") + '" target="_blank" rel="noopener">Ask about this order on WhatsApp</a></div>';
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var oid = (oi.value || "").trim();
      var digits = (mi.value || "").replace(/\D/g, "");
      var ok = true;
      if (!oid) { setErr(oi, "Please enter your Order ID."); ok = false; } else clearErr(oi);
      if (!/^[6-9]\d{9}$/.test(digits)) { setErr(mi, "Enter the 10-digit mobile number used for the order."); ok = false; } else clearErr(mi);
      if (!ok) return;
      result.innerHTML = '<div class="panel" style="margin-top:22px;text-align:center"><p class="muted">Looking up your order…</p></div>';
      lookupOrder(oid, digits).then(function (o) {
        if (!o) {
          result.innerHTML = '<div class="panel" style="margin-top:22px"><h3>Order not found</h3><p class="muted">We couldn\'t find an order with that ID and mobile number. Please check the details and try again, or reach us on WhatsApp and we\'ll help.</p>' +
            '<a class="btn btn--wa" href="' + waUrl("Hi BUBBLO 👋 I need help tracking my order.") + '" target="_blank" rel="noopener">Contact on WhatsApp</a></div>';
          return;
        }
        renderOrder(o);
      });
    });
  }

  /* ------------------------------ gift moment ---------------------------- */
  function initGift() {
    var box = $(".js-gift");
    if (!box) return;
    var stage = $(".js-gift-stage");
    function open() {
      if (box.classList.contains("open")) return;
      box.classList.add("open");
      var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) return;
      var host = box.querySelector(".gift-box") || box;
      for (var i = 0; i < 14; i++) {
        var s = document.createElement("span");
        s.className = "spark";
        s.style.setProperty("--dx", (Math.random() * 200 - 100) + "px");
        s.style.animationDelay = (i * 45) + "ms";
        s.style.left = (30 + Math.random() * 40) + "%";
        host.appendChild(s);
      }
      var b = $(".js-gift-bubbles");
      if (b) b.classList.add("burst");
      var hint = $(".js-gift-hint"); if (hint) hint.textContent = "✨ Bubble magic unlocked — now go find your gift.";
    }
    box.addEventListener("click", open);
    box.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
  }

  /* ------------------------------ WhatsApp ------------------------------- */
  function waUrl(msg) {
    var base = (CFG.contact && CFG.contact.whatsappUrl) || "https://wa.me/919528097342";
    var text = msg || (CFG.contact && CFG.contact.prefilledMessage) || "";
    return base + (text ? "?text=" + encodeURIComponent(text) : "");
  }

  /* ------------------------------ boot ----------------------------------- */
  function initPage() {
    renderCartCount();
    initCountdown();
    initCards();
    initProductPage();
    initCartPage();
    initPhone();
    initCheckout();
    initSuccess();
    initTrack();
    initGift();
  }
  function boot() {
    initHeader();
    if (!PREVIEW) initPage();
    // keep cart count fresh across tabs
    window.addEventListener("storage", function (e) { if (e.key === CFG.storage.cart) renderCartCount(); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  // expose a couple of helpers for inline use
  window.BUBBLO = { money: money, waUrl: waUrl, imgUrl: imgUrl, initPage: initPage, renderCartCount: renderCartCount };
})();
