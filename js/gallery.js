/**
 * Grayfoner Builders — impressive full-image galleries
 *
 * - Extracts ALL photos (img src, srcset, background-image, Wix uri JSON)
 * - Replaces Wix Pro Gallery with a premium carousel
 * - Home: full-viewport hero + autoplay
 * - Deep pages: large gallery, counter, thumbnails, autoplay
 */
(function () {
  "use strict";

  var STYLE_ID = "gf-carousel-style";
  var SKIP_RE =
    /da72cb_|23fd2a2|49c1daac|ff2c0fa|f22d357|emptystate|logo\.png|7e033965f10f4294bd3f10360cc26929/i;

  function injectCss() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement("style");
    s.id = STYLE_ID;
    s.textContent = [
      ".gf-carousel{position:relative;width:100%;margin:0 auto;background:#121212;overflow:hidden;box-shadow:0 18px 50px rgba(0,0,0,.28);}",
      ".gf-carousel--home{width:100vw;max-width:100vw;margin-left:calc(50% - 50vw);margin-right:calc(50% - 50vw);height:calc(100vh - 110px);min-height:420px;max-height:920px;border-radius:0;}",
      ".gf-carousel--page{width:min(100%,1100px);max-width:1100px;height:min(68vh,640px);min-height:360px;border-radius:14px;}",
      ".gf-carousel__shell{display:flex;flex-direction:column;height:100%;}",
      ".gf-carousel__viewport{position:relative;flex:1 1 auto;width:100%;min-height:0;overflow:hidden;background:#121212;}",
      ".gf-carousel__track{display:flex;height:100%;transition:transform .75s cubic-bezier(.22,.61,.36,1);will-change:transform;}",
      ".gf-carousel__slide{flex:0 0 100%;width:100%;height:100%;position:relative;overflow:hidden;background:#121212;display:flex;align-items:center;justify-content:center;}",
      ".gf-carousel__slide img{position:absolute;inset:0;width:100%;height:100%;max-width:100%;max-height:100%;margin:auto;object-fit:contain;object-position:center center;display:block;opacity:0;transform:scale(1.04);transition:opacity .55s ease,transform 5.5s ease;}",
      ".gf-carousel__slide.is-active img{opacity:1;transform:scale(1);}",
      ".gf-carousel--home::after{content:'';position:absolute;left:0;right:0;bottom:0;height:80px;background:linear-gradient(to bottom,transparent,rgba(242,242,242,.95));pointer-events:none;z-index:4;}",
      ".gf-carousel__btn{position:absolute;top:50%;transform:translateY(-50%);z-index:6;width:52px;height:70px;border:0;border-radius:10px;background:rgba(0,0,0,.42);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;transition:background .2s,transform .2s;}",
      ".gf-carousel__btn:hover{background:rgba(0,0,0,.62);transform:translateY(-50%) scale(1.04);}",
      ".gf-carousel__btn--prev{left:14px;}",
      ".gf-carousel__btn--next{right:14px;}",
      ".gf-carousel__btn svg{width:22px;height:36px;fill:#fff;}",
      ".gf-carousel__counter{position:absolute;top:14px;right:16px;z-index:6;padding:6px 12px;border-radius:999px;background:rgba(0,0,0,.45);color:#fff;font:600 12px/1 Raleway,Helvetica,Arial,sans-serif;letter-spacing:.08em;}",
      ".gf-carousel__progress{position:absolute;left:0;right:0;bottom:0;height:3px;background:rgba(255,255,255,.15);z-index:6;}",
      ".gf-carousel__progress>i{display:block;height:100%;width:0;background:linear-gradient(90deg,#c4a35a,#f2e6c4);transition:width linear;}",
      ".gf-carousel__dots{position:absolute;left:0;right:0;bottom:16px;display:flex;justify-content:center;gap:8px;z-index:6;flex-wrap:wrap;padding:0 56px;}",
      ".gf-carousel__dot{width:9px;height:9px;border-radius:50%;border:0;padding:0;background:rgba(255,255,255,.4);cursor:pointer;transition:transform .2s,background .2s;}",
      ".gf-carousel__dot.is-active{background:#fff;transform:scale(1.25);}",
      ".gf-carousel__thumbs{display:flex;gap:8px;padding:10px 12px;overflow-x:auto;background:#0e0e0e;scrollbar-width:thin;}",
      ".gf-carousel__thumbs::-webkit-scrollbar{height:6px;}",
      ".gf-carousel__thumbs::-webkit-scrollbar-thumb{background:#444;border-radius:4px;}",
      ".gf-carousel__thumb{flex:0 0 88px;width:88px;height:64px;border:2px solid transparent;border-radius:8px;overflow:hidden;padding:0;cursor:pointer;opacity:.72;background:#222;transition:opacity .2s,border-color .2s,transform .2s;}",
      ".gf-carousel__thumb img{width:100%;height:100%;object-fit:cover;display:block;}",
      ".gf-carousel__thumb.is-active{opacity:1;border-color:#c4a35a;transform:translateY(-1px);}",
      ".gf-carousel__thumb:hover{opacity:1;}",
      "@media (max-width:800px){",
      ".gf-carousel--home{height:calc(100vh - 96px);min-height:320px;max-height:none;}",
      ".gf-carousel--page{width:100%;max-width:100%;height:min(55vh,480px);min-height:260px;border-radius:0;}",
      ".gf-carousel__btn{width:40px;height:54px;}",
      ".gf-carousel__thumb{flex-basis:72px;width:72px;height:54px;}",
      ".gf-carousel__dots{bottom:12px;}",
      "}",
    ].join("");
    document.head.appendChild(s);
  }

  function normalizePath(src) {
    if (!src) return "";
    var path = String(src).trim().split(/\s+/)[0];
    if (!path) return "";
    // background-image:url(...) remnants
    path = path.replace(/^url\(["']?/, "").replace(/["']?\)$/, "");
    if (path.indexOf("http") === 0) {
      try {
        path = new URL(path).pathname;
      } catch (e) {
        return "";
      }
    }
    // strip query
    path = path.split("?")[0];
    if (path.indexOf("media/") === -1 && path.indexOf("772769_") === -1) return "";
    // ensure /media/ form
    var m = path.match(/(772769_[A-Za-z0-9_~.-]+\.(?:jpe?g|png|webp))/i);
    if (m) path = "/media/" + m[1];
    else if (path.indexOf("/media/") === -1 && path.indexOf("media/") >= 0) {
      path = "/" + path.replace(/^\.\//, "");
    }
    if (path.charAt(0) !== "/") path = "/" + path;
    if (!/\.(jpe?g|png|webp)$/i.test(path)) return "";
    if (SKIP_RE.test(path)) return "";
    return path;
  }

  function uniqueImages(root) {
    var urls = [];
    var seen = {};

    function add(raw) {
      var path = normalizePath(raw);
      if (!path || seen[path]) return;
      seen[path] = true;
      urls.push(path);
    }

    // 1) DOM nodes
    root.querySelectorAll("img[src], source[srcset]").forEach(function (node) {
      if (node.tagName === "SOURCE") {
        var ss = node.getAttribute("srcset") || "";
        ss.split(",").forEach(function (part) {
          add(part.trim().split(/\s+/)[0]);
        });
      } else {
        add(node.getAttribute("src"));
      }
    });

    // 2) Full HTML scan — catches background-image + Wix JSON uris
    var html = root.innerHTML || "";
    var reList = [
      /src=["']([^"']*media\/[^"']+)["']/gi,
      /srcset=["']([^"']+)["']/gi,
      /background-image:\s*url\(([^)]+)\)/gi,
      /background-image:\s*url\(&quot;([^&]+)&quot;\)/gi,
      /&quot;uri&quot;:&quot;([^&]+)&quot;/gi,
      /"uri"\s*:\s*"([^"]+)"/gi,
      /url\(([^)]*media\/[^)]+)\)/gi,
    ];
    reList.forEach(function (re) {
      var m;
      while ((m = re.exec(html))) {
        var val = m[1];
        if (!val) continue;
        if (val.indexOf(",") >= 0 && val.indexOf("media/") >= 0) {
          // srcset multi
          val.split(",").forEach(function (part) {
            add(part.trim().split(/\s+/)[0]);
          });
        } else {
          add(val);
        }
      }
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
    var isHome = variant === "home";
    var wrap = document.createElement("div");
    wrap.className =
      "gf-carousel " + (isHome ? "gf-carousel--home" : "gf-carousel--page");
    wrap.setAttribute("data-gf-carousel", "true");
    wrap.setAttribute("role", "region");
    wrap.setAttribute("aria-label", "Project photo gallery");
    wrap.tabIndex = 0;

    var shell = document.createElement("div");
    shell.className = "gf-carousel__shell";

    var viewport = document.createElement("div");
    viewport.className = "gf-carousel__viewport";

    var track = document.createElement("div");
    track.className = "gf-carousel__track";

    var slides = [];
    images.forEach(function (src, i) {
      var slide = document.createElement("div");
      slide.className = "gf-carousel__slide" + (i === 0 ? " is-active" : "");
      var img = document.createElement("img");
      img.src = src;
      img.alt = "Project photo " + (i + 1) + " of " + images.length;
      img.loading = i === 0 ? "eager" : "lazy";
      img.decoding = "async";
      img.addEventListener("load", function () {
        img.style.objectFit = "contain";
        img.style.objectPosition = "center center";
      });
      slide.appendChild(img);
      track.appendChild(slide);
      slides.push(slide);
    });

    viewport.appendChild(track);

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

    var counter = document.createElement("div");
    counter.className = "gf-carousel__counter";
    counter.textContent = "1 / " + images.length;

    var progress = document.createElement("div");
    progress.className = "gf-carousel__progress";
    var progressBar = document.createElement("i");
    progress.appendChild(progressBar);

    var dots = document.createElement("div");
    dots.className = "gf-carousel__dots";
    if (images.length > 1 && images.length <= 20) {
      images.forEach(function (_, i) {
        var d = document.createElement("button");
        d.type = "button";
        d.className = "gf-carousel__dot" + (i === 0 ? " is-active" : "");
        d.setAttribute("aria-label", "Go to image " + (i + 1));
        d.dataset.index = String(i);
        dots.appendChild(d);
      });
    }

    viewport.appendChild(prev);
    viewport.appendChild(next);
    viewport.appendChild(counter);
    if (dots.children.length) viewport.appendChild(dots);
    viewport.appendChild(progress);
    shell.appendChild(viewport);

    // Thumbnail strip on project pages (impressive navigation)
    var thumbs = null;
    if (!isHome && images.length > 1) {
      thumbs = document.createElement("div");
      thumbs.className = "gf-carousel__thumbs";
      thumbs.setAttribute("aria-label", "Thumbnail navigation");
      images.forEach(function (src, i) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "gf-carousel__thumb" + (i === 0 ? " is-active" : "");
        b.setAttribute("aria-label", "Show photo " + (i + 1));
        b.dataset.index = String(i);
        var timg = document.createElement("img");
        timg.src = src;
        timg.alt = "";
        timg.loading = "lazy";
        b.appendChild(timg);
        thumbs.appendChild(b);
      });
      shell.appendChild(thumbs);
    }

    wrap.appendChild(shell);

    var index = 0;
    // Home: faster; project pages: slower cinematic autoplay
    var autoplayMs = isHome ? 4500 : images.length > 1 ? 5500 : 0;
    var timer = null;
    var progressTimer = null;

    function stopProgress() {
      if (progressTimer) {
        cancelAnimationFrame(progressTimer);
        progressTimer = null;
      }
      progressBar.style.transition = "none";
      progressBar.style.width = "0%";
    }

    function runProgress(ms) {
      stopProgress();
      if (!ms) return;
      // force reflow
      void progressBar.offsetWidth;
      progressBar.style.transition = "width " + ms + "ms linear";
      progressBar.style.width = "100%";
    }

    function stopAutoplay() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      stopProgress();
    }

    function startAutoplay() {
      stopAutoplay();
      if (!autoplayMs || images.length < 2) return;
      runProgress(autoplayMs);
      timer = setInterval(function () {
        goTo(index + 1);
        runProgress(autoplayMs);
      }, autoplayMs);
    }

    function syncThumbs() {
      if (!thumbs) return;
      Array.prototype.forEach.call(thumbs.children, function (t, i) {
        if (i === index) {
          t.classList.add("is-active");
          // keep active thumb in view
          try {
            t.scrollIntoView({
              behavior: "smooth",
              inline: "center",
              block: "nearest",
            });
          } catch (e) {}
        } else t.classList.remove("is-active");
      });
    }

    function goTo(i) {
      if (i < 0) i = images.length - 1;
      if (i >= images.length) i = 0;
      index = i;
      track.style.transform = "translate3d(" + -index * 100 + "%,0,0)";
      slides.forEach(function (slide, si) {
        if (si === index) slide.classList.add("is-active");
        else slide.classList.remove("is-active");
      });
      Array.prototype.forEach.call(dots.children, function (d, di) {
        if (di === index) d.classList.add("is-active");
        else d.classList.remove("is-active");
      });
      counter.textContent = index + 1 + " / " + images.length;
      syncThumbs();
      // Preload neighbors
      [1, 2].forEach(function (off) {
        var n = (index + off) % images.length;
        var preload = new Image();
        preload.src = images[n];
      });
    }

    function userGo(i) {
      goTo(i);
      startAutoplay();
    }

    prev.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      userGo(index - 1);
    });
    next.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      userGo(index + 1);
    });
    dots.addEventListener("click", function (e) {
      var t = e.target.closest
        ? e.target.closest(".gf-carousel__dot")
        : null;
      if (!t) return;
      e.preventDefault();
      userGo(parseInt(t.dataset.index, 10) || 0);
    });
    if (thumbs) {
      thumbs.addEventListener("click", function (e) {
        var t = e.target.closest
          ? e.target.closest(".gf-carousel__thumb")
          : null;
        if (!t) return;
        e.preventDefault();
        userGo(parseInt(t.dataset.index, 10) || 0);
      });
    }
    wrap.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        userGo(index + 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        userGo(index - 1);
      }
    });

    wrap.addEventListener("mouseenter", stopAutoplay);
    wrap.addEventListener("mouseleave", startAutoplay);
    wrap.addEventListener("focusin", stopAutoplay);
    wrap.addEventListener("focusout", function () {
      setTimeout(function () {
        if (!wrap.contains(document.activeElement)) startAutoplay();
      }, 100);
    });

    var tx = null;
    wrap.addEventListener(
      "touchstart",
      function (e) {
        if (e.touches && e.touches[0]) tx = e.touches[0].clientX;
        stopAutoplay();
      },
      { passive: true }
    );
    wrap.addEventListener(
      "touchend",
      function (e) {
        if (tx == null || !e.changedTouches || !e.changedTouches[0]) {
          startAutoplay();
          return;
        }
        var dx = e.changedTouches[0].clientX - tx;
        tx = null;
        if (Math.abs(dx) < 40) {
          startAutoplay();
          return;
        }
        if (dx < 0) userGo(index + 1);
        else userGo(index - 1);
      },
      { passive: true }
    );

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stopAutoplay();
      else startAutoplay();
    });

    goTo(0);
    startAutoplay();
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
        "[id^='pro-gallery-comp-'], .pro-gallery-parent-container, .pro-gallery.inline-styles.slider, [id^='gallery-wrapper-']"
      )
      .forEach(function (el) {
        var host =
          el.closest("[id^='gallery-wrapper-']") ||
          el.closest(".pro-gallery-parent-container") ||
          el.closest("[id^='pro-gallery-comp-']") ||
          el;
        add(host);
      });
    return hosts.filter(function (h) {
      return !hosts.some(function (o) {
        return o !== h && o.contains(h);
      });
    });
  }

  function isHomePage() {
    var p = (location.pathname || "/").replace(/\/+$/, "") || "/";
    return (
      p === "/" ||
      p === "/index" ||
      p === "/index.html" ||
      /index\.html$/i.test(p)
    );
  }

  function init() {
    injectCss();
    var hosts = findHosts();
    var home = isHomePage();
    var count = 0;

    hosts.forEach(function (host) {
      if (host.getAttribute("data-gf-replaced") === "1") return;

      // Prefer scanning a wider scope on project pages so thumbnails count
      var scanRoot = host;
      var pageMain =
        host.closest("main") ||
        host.closest("[id^='PAGE_SECTION']") ||
        host.closest("[id^='comp-']") ||
        host;
      // climb one more for mesh wrappers that hold thumbs + main
      if (pageMain && pageMain.parentElement) {
        var maybe = pageMain.parentElement;
        if (
          (maybe.innerHTML || "").indexOf("pro-gallery") >= 0 ||
          (maybe.innerHTML || "").indexOf("thumbnailItem") >= 0
        ) {
          scanRoot = maybe;
        }
      }
      // On project pages, also merge images from whole document pro-gallery areas
      var images = uniqueImages(scanRoot);
      if (images.length < 2 && scanRoot !== host) {
        images = uniqueImages(host);
      }
      // Last resort: whole main content of page
      if (images.length < 2) {
        var main = document.querySelector("main") || document.body;
        images = uniqueImages(main);
        // Filter out footer/contact only junk — keep 772769 project photos
        images = images.filter(function (u) {
          return /772769_/.test(u);
        });
      }

      if (images.length < 1) return;

      var carousel = buildCarousel(images, home ? "home" : "page");
      try {
        host.setAttribute("data-gf-replaced", "1");
        var parent = host.parentNode;
        if (parent) {
          parent.replaceChild(carousel, host);
          var el = parent;
          for (var up = 0; up < 8 && el && el !== document.body; up++) {
            el.style.height = "auto";
            el.style.maxHeight = "none";
            el.style.overflow = "visible";
            if (el.style.position === "absolute") el.style.position = "relative";
            el.style.width = "100%";
            el.style.maxWidth = "100%";
            el.style.left = "0";
            el.style.marginLeft = "0";
            el.style.minHeight = "0";
            el = el.parentElement;
          }
        } else {
          host.innerHTML = "";
          host.appendChild(carousel);
        }
        count++;
        if (typeof console !== "undefined") {
          console.info(
            "[gf-carousel] " +
              (home ? "home" : "page") +
              " gallery with " +
              images.length +
              " photos"
          );
        }
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
  window.addEventListener("load", function () {
    init();
  });
})();
