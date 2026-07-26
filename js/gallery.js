/**
 * Grayfoner Builders — robust static Pro Gallery controller
 * Works without the original Wix Pro Gallery runtime.
 *
 * - Slideshow / thumbnail galleries (full-bleed slides)
 * - Home strip / multi-image slider
 * - Next / Prev arrows (creates Prev if missing)
 * - Keyboard + touch swipe
 * - Root-safe: does not depend on Wix scroll hacks
 */
(function () {
  "use strict";

  var STYLE_ID = "gf-gallery-runtime-style";

  function qs(root, sel) {
    return (root || document).querySelector(sel);
  }
  function qsa(root, sel) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function injectRuntimeCss() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = [
      ".gf-gallery-host{position:relative!important;overflow:hidden!important;}",
      ".gf-gallery-viewport{position:relative!important;overflow:hidden!important;width:100%!important;height:100%!important;}",
      ".gf-gallery-track{display:flex!important;flex-direction:row!important;flex-wrap:nowrap!important;height:100%!important;will-change:transform;transition:transform .45s ease;}",
      ".gf-gallery-slide{position:relative!important;flex:0 0 auto!important;height:100%!important;overflow:hidden!important;box-sizing:border-box!important;}",
      ".gf-gallery-slide img{width:100%!important;height:100%!important;object-fit:cover!important;max-width:none!important;display:block!important;}",
      ".gf-gallery-slide .gallery-item-wrapper,.gf-gallery-slide [data-hook='item-wrapper'],.gf-gallery-slide .gallery-item-content,.gf-gallery-slide .gallery-item-container{width:100%!important;height:100%!important;position:relative!important;left:0!important;top:0!important;margin:0!important;}",
      ".gf-gallery-arrow{position:absolute!important;top:50%!important;transform:translateY(-50%)!important;z-index:100!important;pointer-events:auto!important;cursor:pointer!important;background:rgba(0,0,0,.28)!important;border:0!important;border-radius:4px!important;width:48px!important;height:64px!important;display:flex!important;align-items:center!important;justify-content:center!important;color:#fff!important;opacity:.95!important;padding:0!important;}",
      ".gf-gallery-arrow:hover{background:rgba(0,0,0,.45)!important;opacity:1!important;}",
      ".gf-gallery-arrow svg,.gf-gallery-arrow path,.gf-gallery-arrow .slideshow-arrow{fill:#fff!important;color:#fff!important;}",
      ".gf-gallery-arrow.prev{left:8px!important;right:auto!important;}",
      ".gf-gallery-arrow.next{right:8px!important;left:auto!important;}",
      ".gf-gallery-host .nav-arrows-container,.gf-gallery-host [data-hook='nav-arrow-next'],.gf-gallery-host [data-hook='nav-arrow-prev']{z-index:100!important;pointer-events:auto!important;cursor:pointer!important;}",
      /* kill common Wix blockers over the gallery */
      ".gf-gallery-host .item-action{pointer-events:none!important;}",
      ".gf-gallery-dots{position:absolute;left:0;right:0;bottom:10px;display:flex;justify-content:center;gap:8px;z-index:90;pointer-events:auto;}",
      ".gf-gallery-dot{width:9px;height:9px;border-radius:50%;border:0;padding:0;background:rgba(255,255,255,.45);cursor:pointer;}",
      ".gf-gallery-dot.active{background:#fff;}",
    ].join("\n");
    document.head.appendChild(style);
  }

  function getScrollEl(root) {
    return (
      qs(root, ".gallery-horizontal-scroll") ||
      qs(root, '[id^="gallery-horizontal-scroll"]') ||
      qs(root, ".gallery-column")
    );
  }

  function getTrack(scroll) {
    return (
      qs(scroll, ".gallery-horizontal-scroll-inner") ||
      scroll.firstElementChild ||
      scroll
    );
  }

  function collectSlides(root, scroll) {
    var scope = scroll || root;
    var groups = qsa(scope, '[data-hook="group-view"]');
    if (groups.length > 1) return groups;

    var items = qsa(scope, '[data-hook="item-container"]');
    if (items.length > 1) {
      // de-dupe by data-idx / data-id
      var seen = {};
      var out = [];
      items.forEach(function (el) {
        var key =
          el.getAttribute("data-idx") ||
          el.getAttribute("data-id") ||
          el.getAttribute("data-hash") ||
          el.id;
        if (!key) key = "i" + out.length;
        if (!seen[key]) {
          seen[key] = true;
          out.push(el);
        }
      });
      if (out.length > 1) return out;
    }

    // Fallback: direct children of track that contain images
    var track = getTrack(scroll);
    var kids = Array.prototype.slice.call(track.children || []);
    kids = kids.filter(function (k) {
      return k.querySelector && k.querySelector("img");
    });
    return kids;
  }

  function measureSlideWidth(host, scroll, slide, mode) {
    var hostW =
      (scroll && (scroll.clientWidth || scroll.offsetWidth)) ||
      (host && (host.clientWidth || host.offsetWidth)) ||
      980;

    if (mode === "slide") return hostW;

    // strip: try group CSS vars / inline width / image natural
    var cs = window.getComputedStyle(slide);
    var gw = parseFloat(cs.getPropertyValue("--group-width")) || 0;
    if (gw > 40) return gw;

    var box =
      slide.matches && slide.matches('[data-hook="item-container"]')
        ? slide
        : qs(slide, '[data-hook="item-container"]') || slide;
    var sw = parseInt((box.style && box.style.width) || "0", 10) || 0;
    if (sw > 40) return sw;

    if (box.offsetWidth > 40) return box.offsetWidth;

    // default strip card
    return Math.min(404, Math.max(280, Math.floor(hostW / 3.5)));
  }

  function makeArrow(direction, existing) {
    var btn = existing || document.createElement("button");
    btn.type = "button";
    btn.className =
      "gf-gallery-arrow " +
      direction +
      " nav-arrows-container " +
      direction;
    btn.setAttribute(
      "data-hook",
      direction === "next" ? "nav-arrow-next" : "nav-arrow-prev"
    );
    btn.setAttribute(
      "aria-label",
      direction === "next" ? "Next Item" : "Previous Item"
    );
    btn.tabIndex = 0;

    // Keep existing SVG if present, else inject chevron
    if (!btn.querySelector("svg")) {
      var flip = direction === "prev" ? ' style="transform:scaleX(-1)"' : "";
      btn.innerHTML =
        '<svg width="23" height="39" viewBox="0 0 23 39"' +
        flip +
        '><path class="slideshow-arrow" fill="#fff" d="M857.005,231.479L858.5,230l18.124,18-18.127,18-1.49-1.48L873.638,248Z" transform="translate(-855 -230)"></path></svg>';
    } else {
      var path = btn.querySelector("path, .slideshow-arrow");
      if (path) {
        path.setAttribute("fill", "#fff");
        path.style.fill = "#fff";
      }
      if (direction === "prev") {
        var svg = btn.querySelector("svg");
        if (svg) svg.style.transform = "scaleX(-1)";
      }
    }
    return btn;
  }

  function buildDots(host, count, goTo) {
    var old = qs(host, ".gf-gallery-dots");
    if (old) old.remove();
    if (count < 2 || count > 24) return null;
    var wrap = document.createElement("div");
    wrap.className = "gf-gallery-dots";
    for (var i = 0; i < count; i++) {
      (function (idx) {
        var d = document.createElement("button");
        d.type = "button";
        d.className = "gf-gallery-dot" + (idx === 0 ? " active" : "");
        d.setAttribute("aria-label", "Go to slide " + (idx + 1));
        d.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          goTo(idx);
        });
        wrap.appendChild(d);
      })(i);
    }
    host.appendChild(wrap);
    return wrap;
  }

  function initOneGallery(root) {
    if (root.getAttribute("data-gf-gallery-ready") === "true") return;

    var parent =
      root.classList.contains("pro-gallery-parent-container")
        ? root
        : qs(root, ".pro-gallery-parent-container") || root;

    var scroll = getScrollEl(root) || getScrollEl(parent);
    if (!scroll) return;

    var slides = collectSlides(root, scroll);
    if (slides.length < 2) return;

    var host =
      qs(root, ".pro-gallery.inline-styles") ||
      qs(root, '[id^="pro-gallery-container"]') ||
      parent ||
      root;

    host.classList.add("gf-gallery-host");

    var height =
      scroll.clientHeight ||
      scroll.offsetHeight ||
      host.clientHeight ||
      parseInt(scroll.style.height, 10) ||
      353;

    // Detect mode
    var isThumb =
      parent.classList.contains("gallery-thumbnails") ||
      host.classList.contains("gallery-thumbnails") ||
      !!qs(root, ".gallery-thumbnails");
    var firstW = measureSlideWidth(host, scroll, slides[0], "strip");
    var hostW = scroll.clientWidth || host.clientWidth || 980;
    var mode =
      isThumb || firstW >= hostW * 0.8 ? "slide" : "strip";

    // Rebuild as transform track
    var track = getTrack(scroll);
    track.classList.add("gf-gallery-track");

    // Ensure slides are direct flex children of track when possible
    // If slides are already under track, re-order/normalize styles
    var widths = [];
    slides.forEach(function (slide, i) {
      // If slide is not under track, leave it (still style in place)
      slide.classList.add("gf-gallery-slide");
      var w = measureSlideWidth(host, scroll, slide, mode);
      if (mode === "slide") w = hostW;
      widths.push(w);

      slide.style.position = "relative";
      slide.style.left = "auto";
      slide.style.top = "auto";
      slide.style.right = "auto";
      slide.style.bottom = "auto";
      slide.style.flex = "0 0 " + w + "px";
      slide.style.width = w + "px";
      slide.style.minWidth = w + "px";
      slide.style.maxWidth = w + "px";
      slide.style.height = height + "px";
      slide.style.display = "block";
      slide.style.opacity = "1";
      slide.style.visibility = "visible";
      slide.style.transform = "none";
      slide.style.margin = "0";
      slide.removeAttribute("aria-hidden");

      // Normalize nested absolute positioning from Wix SSR
      qsa(slide, "[data-hook='item-container'], .gallery-item-container, [data-hook='item-wrapper'], .gallery-item-wrapper, .gallery-item-content, .item-link-wrapper").forEach(function (n) {
        n.style.position = "relative";
        n.style.left = "0";
        n.style.top = "0";
        n.style.width = "100%";
        n.style.height = "100%";
        n.style.margin = "0";
        n.style.opacity = "1";
        n.style.visibility = "visible";
        n.style.display = "block";
      });

      qsa(slide, "img").forEach(function (img) {
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.objectFit = "cover";
        img.style.maxWidth = "none";
        img.loading = img.loading || "lazy";
      });

      // Move under track if orphaned
      if (slide.parentElement !== track) {
        track.appendChild(slide);
      }
    });

    // Remove empty leftover nodes that break flex width
    Array.prototype.slice.call(track.children).forEach(function (child) {
      if (slides.indexOf(child) === -1 && !child.querySelector("img")) {
        // keep structural nodes that are empty wrappers? hide them
        if (!child.classList.contains("gf-gallery-slide")) {
          child.style.display = "none";
        }
      }
    });

    var total = widths.reduce(function (a, b) {
      return a + b;
    }, 0);

    scroll.classList.add("gf-gallery-viewport");
    scroll.style.overflow = "hidden";
    scroll.style.width = "100%";
    scroll.style.height = height + "px";
    scroll.style.position = "relative";
    scroll.scrollLeft = 0;

    track.style.display = "flex";
    track.style.flexDirection = "row";
    track.style.flexWrap = "nowrap";
    track.style.width = total + "px";
    track.style.minWidth = total + "px";
    track.style.height = height + "px";
    track.style.position = "relative";
    track.style.left = "0";
    track.style.top = "0";
    track.style.transform = "translate3d(0,0,0)";
    track.style.transition = "transform 0.45s ease";

    host.style.position = "relative";
    host.style.overflow = "hidden";
    if (!host.style.height && height) {
      // don't force if host already sized by Wix mesh
    }

    // Arrows
    var nextExisting =
      qs(host, '[data-hook="nav-arrow-next"]') ||
      qs(root, '[data-hook="nav-arrow-next"]') ||
      qs(parent, '[data-hook="nav-arrow-next"]');
    var prevExisting =
      qs(host, '[data-hook="nav-arrow-prev"]') ||
      qs(root, '[data-hook="nav-arrow-prev"]');

    var nextBtn = makeArrow("next", nextExisting);
    var prevBtn = makeArrow("prev", prevExisting);

    if (!nextExisting) host.appendChild(nextBtn);
    else {
      nextBtn.classList.add("gf-gallery-arrow", "next");
      // re-parent onto host so it's never clipped/hidden
      if (nextBtn.parentElement !== host) host.appendChild(nextBtn);
    }
    if (!prevExisting) host.appendChild(prevBtn);
    else {
      prevBtn.classList.add("gf-gallery-arrow", "prev");
      if (prevBtn.parentElement !== host) host.appendChild(prevBtn);
    }

    var index = 0;
    var positions = [];
    var acc = 0;
    widths.forEach(function (w) {
      positions.push(acc);
      acc += w;
    });

    var dotsWrap = null;

    function setDots() {
      if (!dotsWrap) return;
      qsa(dotsWrap, ".gf-gallery-dot").forEach(function (d, i) {
        if (i === index) d.classList.add("active");
        else d.classList.remove("active");
      });
    }

    function goTo(i, instant) {
      if (i < 0) i = slides.length - 1;
      if (i >= slides.length) i = 0;
      index = i;
      var x = positions[index] || 0;
      if (instant) {
        track.style.transition = "none";
        track.style.transform = "translate3d(" + -x + "px,0,0)";
        // force reflow
        void track.offsetHeight;
        track.style.transition = "transform 0.45s ease";
      } else {
        track.style.transform = "translate3d(" + -x + "px,0,0)";
      }
      setDots();
    }

    function next() {
      goTo(index + 1);
    }
    function prev() {
      goTo(index - 1);
    }

    function onArrowClick(e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      var t = e.currentTarget;
      if (
        t.getAttribute("data-hook") === "nav-arrow-next" ||
        t.classList.contains("next")
      ) {
        next();
      } else {
        prev();
      }
    }

    [nextBtn, prevBtn].forEach(function (btn) {
      // clone to drop stale Wix handlers if any
      var clean = btn.cloneNode(true);
      clean.className = btn.className;
      if (btn.parentNode) btn.parentNode.replaceChild(clean, btn);
      if (clean.getAttribute("data-hook") === "nav-arrow-next" || clean.classList.contains("next")) {
        nextBtn = clean;
        clean.classList.add("gf-gallery-arrow", "next");
      } else {
        prevBtn = clean;
        clean.classList.add("gf-gallery-arrow", "prev");
      }
      clean.addEventListener("click", onArrowClick, true);
      clean.addEventListener(
        "keydown",
        function (e) {
          if (e.key === "Enter" || e.key === " ") {
            onArrowClick(e);
          }
        },
        true
      );
    });

    dotsWrap = buildDots(host, slides.length, function (i) {
      goTo(i);
    });

    // Keyboard on host
    host.tabIndex = 0;
    host.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      }
    });

    // Touch swipe
    var touchX = null;
    host.addEventListener(
      "touchstart",
      function (e) {
        if (!e.touches || !e.touches.length) return;
        touchX = e.touches[0].clientX;
      },
      { passive: true }
    );
    host.addEventListener(
      "touchend",
      function (e) {
        if (touchX == null || !e.changedTouches || !e.changedTouches.length)
          return;
        var dx = e.changedTouches[0].clientX - touchX;
        touchX = null;
        if (Math.abs(dx) < 40) return;
        if (dx < 0) next();
        else prev();
      },
      { passive: true }
    );

    // Resize
    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        hostW = scroll.clientWidth || host.clientWidth || hostW;
        height =
          scroll.clientHeight ||
          scroll.offsetHeight ||
          host.clientHeight ||
          height;
        total = 0;
        positions = [];
        widths = [];
        slides.forEach(function (slide) {
          var w = mode === "slide" ? hostW : measureSlideWidth(host, scroll, slide, mode);
          if (mode === "slide") w = hostW;
          widths.push(w);
          positions.push(total);
          total += w;
          slide.style.flex = "0 0 " + w + "px";
          slide.style.width = w + "px";
          slide.style.minWidth = w + "px";
          slide.style.maxWidth = w + "px";
          slide.style.height = height + "px";
        });
        track.style.width = total + "px";
        track.style.minWidth = total + "px";
        track.style.height = height + "px";
        scroll.style.height = height + "px";
        goTo(index, true);
      }, 120);
    });

    goTo(0, true);
    root.setAttribute("data-gf-gallery-ready", "true");
    host.setAttribute("data-gf-gallery-ready", "true");
  }

  function findGalleryRoots() {
    var set = [];
    var seen = {};

    function add(el) {
      if (!el || seen[el]) return;
      // Only galleries that actually have a horizontal scroller + multiple images
      var scroll = getScrollEl(el);
      if (!scroll) return;
      var slides = collectSlides(el, scroll);
      if (slides.length < 2) return;
      seen[el] = true;
      set.push(el);
    }

    qsa(document, "[id^='pro-gallery-comp-']").forEach(add);
    qsa(document, ".pro-gallery").forEach(add);
    qsa(document, ".pro-gallery-parent-container").forEach(add);

    // Prefer outermost unique: if A contains B, keep A only
    return set.filter(function (el) {
      return !set.some(function (other) {
        return other !== el && other.contains(el);
      });
    });
  }

  function initAll() {
    injectRuntimeCss();
    var roots = findGalleryRoots();
    roots.forEach(function (root) {
      try {
        initOneGallery(root);
      } catch (err) {
        if (typeof console !== "undefined") {
          console.warn("[gf-gallery] init failed", err);
        }
      }
    });

    // Global capture fallback: any arrow click on page
    document.addEventListener(
      "click",
      function (e) {
        var btn = e.target.closest
          ? e.target.closest(
              '[data-hook="nav-arrow-next"], [data-hook="nav-arrow-prev"], .gf-gallery-arrow, .nav-arrows-container'
            )
          : null;
        if (!btn) return;
        var host = btn.closest
          ? btn.closest("[data-gf-gallery-ready], .gf-gallery-host, .pro-gallery, .pro-gallery-parent-container")
          : null;
        if (!host || host.getAttribute("data-gf-gallery-ready") !== "true") {
          // try init late
          var root =
            (btn.closest && btn.closest("[id^='pro-gallery-comp-'], .pro-gallery")) ||
            null;
          if (root && root.getAttribute("data-gf-gallery-ready") !== "true") {
            try {
              initOneGallery(root);
            } catch (err) {}
          }
        }
      },
      true
    );

    if (typeof console !== "undefined") {
      console.info(
        "[gf-gallery] initialized " + roots.length + " gallery(ies)"
      );
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }
  // Late paint (Wix CSS may change sizes)
  window.addEventListener("load", function () {
    setTimeout(initAll, 50);
  });
})();
