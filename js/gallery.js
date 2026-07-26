/**
 * Grayfoner Builders — static Pro Gallery controls
 * Restores next/prev arrows, keyboard nav, and horizontal sliding
 * for Wix SSR markup after the original Wix JS was removed.
 */
(function () {
  "use strict";

  function qs(el, sel) {
    return el.querySelector(sel);
  }
  function qsa(el, sel) {
    return Array.prototype.slice.call(el.querySelectorAll(sel));
  }

  function uniqueItems(galleryRoot) {
    // Prefer group-view children (one slide each), else item-containers
    var groups = qsa(galleryRoot, '[data-hook="group-view"]');
    if (groups.length > 1) {
      return groups;
    }
    var items = qsa(galleryRoot, '[data-hook="item-container"], .gallery-item-container');
    // De-dupe by data-idx / data-id if SSR duplicated nodes
    var seen = {};
    var out = [];
    items.forEach(function (item) {
      var key =
        item.getAttribute("data-idx") ||
        item.getAttribute("data-id") ||
        item.getAttribute("data-hash") ||
        item.id ||
        Math.random().toString(36);
      if (!seen[key]) {
        seen[key] = true;
        out.push(item);
      }
    });
    return out;
  }

  function ensurePrevButton(container, nextBtn) {
    var existing =
      qs(container, '[data-hook="nav-arrow-prev"]') ||
      qs(container, ".nav-arrows-container.prev");
    if (existing) return existing;

    var prev = document.createElement("button");
    prev.type = "button";
    prev.className = "nav-arrows-container prev gf-nav-prev";
    prev.setAttribute("aria-label", "Previous Item");
    prev.setAttribute("data-hook", "nav-arrow-prev");
    prev.tabIndex = 0;

    // Mirror next button styles when possible
    if (nextBtn) {
      var st = nextBtn.getAttribute("style") || "";
      st = st
        .replace(/right:\s*[^;]+;?/gi, "")
        .replace(/left:\s*[^;]+;?/gi, "");
      prev.setAttribute("style", st + ";left:0px;right:auto;");
      var svg = nextBtn.querySelector("svg");
      if (svg) {
        var clone = svg.cloneNode(true);
        clone.style.transform = "scaleX(-1) scale(1)";
        prev.appendChild(clone);
      } else {
        prev.innerHTML =
          '<svg width="23" height="39" viewBox="0 0 23 39" style="transform:scaleX(-1)"><path class="slideshow-arrow" d="M857.005,231.479L858.5,230l18.124,18-18.127,18-1.49-1.48L873.638,248Z" transform="translate(-855 -230)" fill="currentColor"></path></svg>';
      }
    } else {
      prev.setAttribute(
        "style",
        "position:absolute;left:0;top:calc(50% - 50px);z-index:10;padding:0 38.5px;background:transparent;border:0;cursor:pointer;color:#F2F2F2;"
      );
      prev.innerHTML =
        '<svg width="23" height="39" viewBox="0 0 23 39" style="transform:scaleX(-1)"><path class="slideshow-arrow" d="M857.005,231.479L858.5,230l18.124,18-18.127,18-1.49-1.48L873.638,248Z" transform="translate(-855 -230)" fill="#F2F2F2"></path></svg>';
    }

    container.appendChild(prev);
    return prev;
  }

  function layoutStrip(scroll, items, mode) {
    // mode: 'slide' = one full viewport per item, 'strip' = use existing widths
    var viewportW = scroll.clientWidth || scroll.offsetWidth || 980;
    var viewportH = scroll.clientHeight || scroll.offsetHeight || 353;
    var total = 0;
    var positions = [];

    items.forEach(function (item, i) {
      // Outer node is what we place on the strip (group-view or item-container)
      var box =
        item.matches && item.matches('[data-hook="item-container"]')
          ? item
          : qs(item, '[data-hook="item-container"]') || item;

      var w = viewportW;
      var h = viewportH;

      if (mode === "strip") {
        var sw = box.style && box.style.width ? parseInt(box.style.width, 10) : 0;
        var sh = box.style && box.style.height ? parseInt(box.style.height, 10) : 0;
        // Wix group-view CSS variables
        var cs = window.getComputedStyle(item);
        var gw = parseInt(cs.getPropertyValue("--group-width"), 10) || 0;
        var gh = parseInt(cs.getPropertyValue("--group-height"), 10) || 0;
        if (gw > 40) w = gw;
        else if (sw > 40) w = sw;
        else if (box.offsetWidth > 40) w = box.offsetWidth;
        if (gh > 40) h = gh;
        else if (sh > 40) h = sh;
        else if (box.offsetHeight > 40) h = box.offsetHeight;
      }

      positions.push(total);

      // Position the outer item (group-view) so strip width accumulates correctly
      item.style.position = "absolute";
      item.style.left = total + "px";
      item.style.top = "0px";
      item.style.width = w + "px";
      item.style.height = h + "px";
      item.style.right = "auto";
      item.style.display = "block";
      item.style.opacity = "1";
      item.style.visibility = "visible";
      item.style.margin = "0";
      item.style.padding = "0";

      if (box && box !== item) {
        box.style.position = "relative";
        box.style.left = "0";
        box.style.top = "0";
        box.style.width = w + "px";
        box.style.height = h + "px";
        box.style.display = "block";
        box.style.opacity = "1";
        box.style.visibility = "visible";
      } else if (box) {
        box.style.position = "absolute";
        box.style.left = total + "px";
        box.style.top = "0px";
        box.style.width = w + "px";
        box.style.height = h + "px";
      }

      qsa(item, "img").forEach(function (img) {
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.objectFit = "cover";
        img.style.maxWidth = "none";
      });
      var wrap = qs(item, '[data-hook="item-wrapper"], .gallery-item-wrapper');
      if (wrap) {
        wrap.style.width = "100%";
        wrap.style.height = "100%";
      }

      total += w;
    });

    var inner =
      qs(scroll, ".gallery-horizontal-scroll-inner") || scroll.firstElementChild;
    if (inner) {
      inner.style.position = "relative";
      inner.style.width = total + "px";
      inner.style.height = viewportH + "px";
      inner.style.minWidth = total + "px";
    }

    scroll.style.overflowX = "auto";
    scroll.style.overflowY = "hidden";
    scroll.style.scrollBehavior = "smooth";
    scroll.style.position = scroll.style.position || "relative";
    scroll.style.webkitOverflowScrolling = "touch";
    // Hide scrollbar but keep scroll
    scroll.style.scrollbarWidth = "none";
    scroll.style.msOverflowStyle = "none";

    return { positions: positions, total: total, viewportW: viewportW };
  }

  function initGallery(root) {
    var parent =
      root.classList.contains("pro-gallery-parent-container")
        ? root
        : qs(root, ".pro-gallery-parent-container") || root;

    var scroll =
      qs(root, ".gallery-horizontal-scroll") ||
      qs(root, '[id^="gallery-horizontal-scroll"]') ||
      qs(parent, ".gallery-horizontal-scroll");

    if (!scroll) return;

    var items = uniqueItems(root);
    if (items.length < 2) {
      // Still show controls as disabled / hide next if single
      return;
    }

    var isThumb =
      parent.classList.contains("gallery-thumbnails") ||
      !!qs(root, ".gallery-thumbnails");
    var isSlider =
      parent.classList.contains("gallery-slider") ||
      !!qs(root, ".gallery-slider") ||
      (root.className && String(root.className).indexOf("slider") >= 0);

    // Full-bleed slide for thumbnail galleries / one-row full-width items
    var firstBox =
      qs(items[0], '[data-hook="item-container"]') || items[0];
    var firstW = firstBox.style && firstBox.style.width
      ? parseInt(firstBox.style.width, 10)
      : 0;
    var mode =
      isThumb || firstW >= (scroll.clientWidth || 900) * 0.85
        ? "slide"
        : "strip";

    // Ensure outer containers clip correctly
    var pgContainer =
      qs(root, ".pro-gallery.inline-styles") ||
      qs(root, '[id^="pro-gallery-container"]') ||
      parent;
    if (pgContainer) {
      pgContainer.style.position = pgContainer.style.position || "relative";
      pgContainer.style.overflow = "hidden";
    }
    parent.style.position = parent.style.position || "relative";

    var layout = layoutStrip(scroll, items, mode);
    var index = 0;

    function goTo(i, behavior) {
      if (i < 0) i = items.length - 1;
      if (i >= items.length) i = 0;
      index = i;
      var left = layout.positions[index] || 0;
      if (typeof scroll.scrollTo === "function") {
        scroll.scrollTo({ left: left, behavior: behavior || "smooth" });
      } else {
        scroll.scrollLeft = left;
      }
      // aria
      items.forEach(function (item, j) {
        item.setAttribute("aria-hidden", j === index ? "false" : "true");
      });
    }

    function next() {
      goTo(index + 1);
    }
    function prev() {
      goTo(index - 1);
    }

    var nextBtn =
      qs(root, '[data-hook="nav-arrow-next"]') ||
      qs(root, ".nav-arrows-container.next") ||
      qs(parent, '[data-hook="nav-arrow-next"]') ||
      qs(pgContainer, '[data-hook="nav-arrow-next"]') ||
      qs(root.parentElement || document, '[data-hook="nav-arrow-next"]');

    // Prefer placing prev next to the same parent as the next button
    var arrowHost =
      (nextBtn && nextBtn.parentElement) || pgContainer || parent;
    var prevBtn =
      qs(arrowHost, '[data-hook="nav-arrow-prev"]') ||
      qs(root, '[data-hook="nav-arrow-prev"]') ||
      ensurePrevButton(arrowHost, nextBtn);

    // Style both arrows for static snapshot
    [nextBtn, prevBtn].forEach(function (btn) {
      if (!btn) return;
      btn.style.position = "absolute";
      btn.style.zIndex = "20";
      btn.style.cursor = "pointer";
      btn.style.background = "transparent";
      btn.style.border = "0";
      btn.style.display = "flex";
      btn.style.alignItems = "center";
      btn.style.justifyContent = "center";
      btn.style.pointerEvents = "auto";
      btn.style.color = "#F2F2F2";
      btn.style.opacity = "0.95";
      if (!btn.style.top) btn.style.top = "calc(50% - 28px)";
      var path = btn.querySelector("path, .slideshow-arrow");
      if (path) {
        path.style.fill = "#F2F2F2";
        path.setAttribute("fill", "#F2F2F2");
      }
    });
    if (prevBtn) {
      prevBtn.style.left = "0";
      prevBtn.style.right = "auto";
    }
    if (nextBtn) {
      nextBtn.style.right = "0";
      nextBtn.style.left = "auto";
    }

    function bind(btn, fn) {
      if (!btn) return;
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        fn();
      });
      btn.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          fn();
        }
      });
    }
    bind(nextBtn, next);
    bind(prevBtn, prev);

    // Keyboard when gallery focused / hovered
    root.tabIndex = root.tabIndex >= 0 ? root.tabIndex : 0;
    root.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      }
    });

    // Sync index on manual scroll / swipe
    var scrollTimer;
    scroll.addEventListener(
      "scroll",
      function () {
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(function () {
          var sl = scroll.scrollLeft;
          var best = 0;
          var bestDist = Infinity;
          layout.positions.forEach(function (p, i) {
            var d = Math.abs(p - sl);
            if (d < bestDist) {
              bestDist = d;
              best = i;
            }
          });
          index = best;
        }, 80);
      },
      { passive: true }
    );

    // Click-through on slides should not break nav; optional lightbox-free
    goTo(0, "auto");

    // Re-layout on resize
    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        layout = layoutStrip(scroll, items, mode);
        goTo(index, "auto");
      }, 150);
    });

    root.setAttribute("data-gf-gallery-ready", "true");
  }

  function initAll() {
    var roots = qsa(
      document,
      ".pro-gallery, .pro-gallery-parent-container, [id^='pro-gallery-comp-']"
    );
    // Prefer unique outer roots
    var seen = {};
    roots.forEach(function (root) {
      var id = root.id || root.getAttribute("data-hook") || Math.random();
      // Prefer the element that contains both scroll + arrows
      var candidate = root;
      if (
        !qs(candidate, ".gallery-horizontal-scroll") &&
        root.parentElement &&
        qs(root.parentElement, ".gallery-horizontal-scroll")
      ) {
        candidate = root.parentElement;
      }
      var key = candidate.id || candidate.className + itemsFingerprint(candidate);
      if (seen[key]) return;
      if (!qs(candidate, ".gallery-horizontal-scroll")) return;
      seen[key] = true;
      try {
        initGallery(candidate);
      } catch (err) {
        if (typeof console !== "undefined") {
          console.warn("Gallery init failed", err);
        }
      }
    });
  }

  function itemsFingerprint(el) {
    return String(qsa(el, ".gallery-item-container").length);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }
})();
