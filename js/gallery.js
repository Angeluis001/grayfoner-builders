/**
 * Grayfoner Builders — reliable gallery
 *
 * Strategy: do NOT fight Wix Pro Gallery DOM.
 * Extract image URLs from each Pro Gallery, replace the whole gallery
 * host with a simple full-width carousel that keeps images visible.
 */
(function () {
  "use strict";

  var STYLE_ID = "gf-carousel-style";

  function injectCss() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement("style");
    s.id = STYLE_ID;
    s.textContent = [
      ".gf-carousel{position:relative;width:100%;max-width:100%;margin:0 auto;background:#e8e8e8;overflow:hidden;}",
      ".gf-carousel--home{width:100vw;max-width:100vw;margin-left:calc(50% - 50vw);margin-right:calc(50% - 50vw);height:min(48vh,440px);min-height:260px;}",
      ".gf-carousel--page{width:100%;max-width:980px;height:min(52vh,520px);min-height:280px;}",
      ".gf-carousel__viewport{position:relative;width:100%;height:100%;overflow:hidden;}",
      ".gf-carousel__track{display:flex;height:100%;transition:transform .45s ease;will-change:transform;}",
      ".gf-carousel__slide{flex:0 0 100%;width:100%;height:100%;position:relative;}",
      ".gf-carousel__slide img{width:100%;height:100%;object-fit:cover;display:block;}",
      ".gf-carousel__btn{position:absolute;top:50%;transform:translateY(-50%);z-index:5;width:48px;height:64px;border:0;border-radius:4px;background:rgba(0,0,0,.35);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;}",
      ".gf-carousel__btn:hover{background:rgba(0,0,0,.55);}",
      ".gf-carousel__btn--prev{left:10px;}",
      ".gf-carousel__btn--next{right:10px;}",
      ".gf-carousel__btn svg{width:22px;height:36px;fill:#fff;}",
      ".gf-carousel__dots{position:absolute;left:0;right:0;bottom:12px;display:flex;justify-content:center;gap:8px;z-index:5;}",
      ".gf-carousel__dot{width:9px;height:9px;border-radius:50%;border:0;padding:0;background:rgba(255,255,255,.45);cursor:pointer;}",
      ".gf-carousel__dot.is-active{background:#fff;}",
      "@media (max-width:700px){.gf-carousel--home,.gf-carousel--page{min-height:200px;height:38vh;}.gf-carousel__btn{width:40px;height:52px;}}",
    ].join("");
    document.head.appendChild(s);
  }

  function uniqueImages(root) {
    var urls = [];
    var seen = {};
    var nodes = root.querySelectorAll(
      'img[src*="media/"], img[src*="/media/"], source[srcset*="media/"]'
    );
    nodes.forEach(function (node) {
      var src = "";
      if (node.tagName === "SOURCE") {
        var ss = node.getAttribute("srcset") || "";
        src = (ss.split(",")[0] || "").trim().split(/\s+/)[0] || "";
      } else {
        src = node.getAttribute("src") || "";
      }
      if (!src || src.indexOf("media/") === -1) return;
      // skip tiny ui / icons if obvious
      if (/da72cb_|23fd2a2|49c1daac|ff2c0fa|f22d357|emptystate/i.test(src)) return;
      // normalize to root-relative
      var path = src;
      if (path.indexOf("http") === 0) {
        try {
          path = new URL(path).pathname;
        } catch (e) {}
      }
      if (path.charAt(0) !== "/") {
        path = "/" + path.replace(/^\.\//, "");
      }
      // only real photos
      if (!/\.(jpe?g|png|webp)$/i.test(path)) return;
      if (seen[path]) return;
      seen[path] = true;
      urls.push(path);
    });
    return urls;
  }

  function chevron(flip) {
    var t = flip ? ' style="transform:scaleX(-1)"' : "";
    return (
      '<svg viewBox="0 0 23 39"' +
      t +
      ' aria-hidden="true"><path d="M857.005,231.479L858.5,230l18.124,18-18.127,18-1.49-1.48L873.638,248Z" transform="translate(-855 -230)"></path></svg>'
    );
  }

  function buildCarousel(images, variant) {
    var wrap = document.createElement("div");
    wrap.className =
      "gf-carousel " +
      (variant === "home" ? "gf-carousel--home" : "gf-carousel--page");
    wrap.setAttribute("data-gf-carousel", "true");
    wrap.setAttribute("role", "region");
    wrap.setAttribute("aria-label", "Image gallery");
    wrap.tabIndex = 0;

    var viewport = document.createElement("div");
    viewport.className = "gf-carousel__viewport";

    var track = document.createElement("div");
    track.className = "gf-carousel__track";

    images.forEach(function (src, i) {
      var slide = document.createElement("div");
      slide.className = "gf-carousel__slide";
      var img = document.createElement("img");
      img.src = src;
      img.alt = "Project photo " + (i + 1);
      img.loading = i === 0 ? "eager" : "lazy";
      img.decoding = "async";
      slide.appendChild(img);
      track.appendChild(slide);
    });

    viewport.appendChild(track);
    wrap.appendChild(viewport);

    var prev = document.createElement("button");
    prev.type = "button";
    prev.className = "gf-carousel__btn gf-carousel__btn--prev";
    prev.setAttribute("aria-label", "Previous image");
    prev.innerHTML = chevron(true);

    var next = document.createElement("button");
    next.type = "button";
    next.className = "gf-carousel__btn gf-carousel__btn--next";
    next.setAttribute("aria-label", "Next image");
    next.innerHTML = chevron(false);

    wrap.appendChild(prev);
    wrap.appendChild(next);

    var dots = document.createElement("div");
    dots.className = "gf-carousel__dots";
    if (images.length > 1 && images.length <= 24) {
      images.forEach(function (_, i) {
        var d = document.createElement("button");
        d.type = "button";
        d.className = "gf-carousel__dot" + (i === 0 ? " is-active" : "");
        d.setAttribute("aria-label", "Go to image " + (i + 1));
        d.dataset.index = String(i);
        dots.appendChild(d);
      });
      wrap.appendChild(dots);
    }

    var index = 0;
    function goTo(i) {
      if (i < 0) i = images.length - 1;
      if (i >= images.length) i = 0;
      index = i;
      track.style.transform = "translate3d(" + -index * 100 + "%,0,0)";
      Array.prototype.forEach.call(dots.children, function (d, di) {
        if (di === index) d.classList.add("is-active");
        else d.classList.remove("is-active");
      });
    }

    prev.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      goTo(index - 1);
    });
    next.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      goTo(index + 1);
    });
    dots.addEventListener("click", function (e) {
      var t = e.target;
      if (!t.classList || !t.classList.contains("gf-carousel__dot")) return;
      e.preventDefault();
      goTo(parseInt(t.dataset.index, 10) || 0);
    });
    wrap.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goTo(index + 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goTo(index - 1);
      }
    });

    var tx = null;
    wrap.addEventListener(
      "touchstart",
      function (e) {
        if (e.touches && e.touches[0]) tx = e.touches[0].clientX;
      },
      { passive: true }
    );
    wrap.addEventListener(
      "touchend",
      function (e) {
        if (tx == null || !e.changedTouches || !e.changedTouches[0]) return;
        var dx = e.changedTouches[0].clientX - tx;
        tx = null;
        if (Math.abs(dx) < 40) return;
        if (dx < 0) goTo(index + 1);
        else goTo(index - 1);
      },
      { passive: true }
    );

    goTo(0);
    return wrap;
  }

  function findHosts() {
    var hosts = [];
    var seen = {};
    function add(el) {
      if (!el || seen[el]) return;
      seen[el] = true;
      hosts.push(el);
    }
    document
      .querySelectorAll(
        "[id^='pro-gallery-comp-'], .pro-gallery-parent-container, .pro-gallery.inline-styles.slider"
      )
      .forEach(function (el) {
        // prefer outermost gallery block
        var outer =
          el.closest("[id^='comp-'][class*='pro-gallery'], [id^='gallery-wrapper-'], .pro-gallery") ||
          el;
        // climb to a stable host that wraps the slider
        var host =
          el.closest(".pro-gallery-parent-container") ||
          el.closest("[id^='pro-gallery-comp-']") ||
          el.closest("[id^='gallery-wrapper-']") ||
          el;
        add(host);
      });

    // keep outermost only
    return hosts.filter(function (h) {
      return !hosts.some(function (o) {
        return o !== h && o.contains(h);
      });
    });
  }

  function isHomePage() {
    var p = (location.pathname || "/").replace(/\/+$/, "") || "/";
    return p === "/" || p === "/index" || p === "/index.html" || /index\.html$/i.test(p);
  }

  function init() {
    injectCss();
    var hosts = findHosts();
    var home = isHomePage();
    var count = 0;

    hosts.forEach(function (host) {
      if (host.getAttribute("data-gf-replaced") === "1") return;
      var images = uniqueImages(host);
      if (images.length < 1) return;

      var carousel = buildCarousel(images, home ? "home" : "page");
      // Replace the host content / node
      try {
        host.setAttribute("data-gf-replaced", "1");
        var parent = host.parentNode;
        if (parent) {
          parent.replaceChild(carousel, host);
          // Relax Wix mesh constraints so full-width carousel can show
          var el = parent;
          for (var up = 0; up < 6 && el && el !== document.body; up++) {
            el.style.height = "auto";
            el.style.minHeight = "0";
            el.style.maxHeight = "none";
            el.style.overflow = "visible";
            if (home) {
              el.style.width = "100%";
              el.style.maxWidth = "100%";
              el.style.left = "0";
              el.style.marginLeft = "0";
            }
            el = el.parentElement;
          }
        } else {
          host.innerHTML = "";
          host.appendChild(carousel);
        }
        count++;
      } catch (err) {
        try {
          host.innerHTML = "";
          host.appendChild(carousel);
          host.setAttribute("data-gf-replaced", "1");
          count++;
        } catch (e2) {
          if (typeof console !== "undefined") console.warn("[gf-carousel]", e2);
        }
      }
    });

    if (typeof console !== "undefined") {
      console.info("[gf-carousel] replaced " + count + " gallery(ies)");
    }
  }

  // Run ASAP after DOM, and once more after full load if needed
  // (but only replace once thanks to data-gf-replaced)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
  window.addEventListener("load", function () {
    // Only init remaining unreplaced hosts (e.g. late paint)
    init();
  });
})();
