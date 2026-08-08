/* Transcendent Life in Christ — site behaviour.
   Everything here is progressive: the page is fully readable without it. */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------- masthead + mobile nav */

  var masthead = document.querySelector(".masthead");
  var nav = document.getElementById("primary-nav");
  var toggle = document.querySelector(".nav-toggle");

  if (masthead) {
    var setStuck = function () {
      masthead.classList.toggle("is-stuck", window.scrollY > 24);
    };
    setStuck();
    window.addEventListener("scroll", setStuck, { passive: true });
  }

  function closeNav() {
    if (!nav || !toggle) return;
    nav.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    document.body.style.removeProperty("overflow");
  }

  if (nav && toggle) {
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      if (open) {
        closeNav();
      } else {
        nav.classList.add("is-open");
        toggle.setAttribute("aria-expanded", "true");
        document.body.style.overflow = "hidden";
      }
    });

    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) closeNav();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeNav();
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 900) closeNav();
    });
  }

  /* --------------------------------------------------------- scroll reveal */

  var revealables = document.querySelectorAll(".reveal");

  if (!("IntersectionObserver" in window) || reduceMotion) {
    revealables.forEach(function (el) {
      el.classList.add("is-in");
    });
  } else {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          revealObserver.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 }
    );
    revealables.forEach(function (el) {
      revealObserver.observe(el);
    });
  }

  /* ------------------------------------------------------------- scrollspy */

  var spyLinks = Array.prototype.filter.call(
    document.querySelectorAll(".nav__link"),
    function (link) {
      var href = link.getAttribute("href") || "";
      return href.charAt(0) === "#" && document.querySelector(href);
    }
  );

  if (spyLinks.length && "IntersectionObserver" in window) {
    var visible = {};
    var syncSpy = function () {
      var current = null;
      spyLinks.forEach(function (link) {
        var id = link.getAttribute("href").slice(1);
        if (visible[id] && !current) current = link;
      });
      spyLinks.forEach(function (link) {
        if (link === current) {
          link.setAttribute("aria-current", "true");
        } else {
          link.removeAttribute("aria-current");
        }
      });
    };

    var spyObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          visible[entry.target.id] = entry.isIntersecting;
        });
        syncSpy();
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );

    spyLinks.forEach(function (link) {
      spyObserver.observe(document.querySelector(link.getAttribute("href")));
    });
  }

  /* ------------------------------------------------- reading progress bar */

  var progress = document.querySelector(".progress");
  var article = document.querySelector(".prose");

  if (progress && article) {
    var updateProgress = function () {
      var start = article.offsetTop;
      var span = article.offsetHeight - window.innerHeight * 0.4;
      var seen = window.scrollY - start + window.innerHeight * 0.4;
      var ratio = span > 0 ? seen / span : 0;
      progress.style.transform =
        "scaleX(" + Math.min(1, Math.max(0, ratio)).toFixed(4) + ")";
    };
    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
  }

  /* -------------------------------------------------------------- the form
     No backend is wired up yet, so the form hands the message to the
     visitor's own mail client. Point form[data-endpoint] at a form service
     (Formspree, Basin, Netlify) to collect submissions on the server instead. */

  var form = document.querySelector(".form");

  if (form) {
    form.addEventListener("submit", function (e) {
      var endpoint = form.getAttribute("data-endpoint");
      if (endpoint) return; // let the browser post it normally

      e.preventDefault();
      var status = form.querySelector(".form__status");
      var data = new FormData(form);
      var name = (data.get("name") || "").toString().trim();
      var email = (data.get("email") || "").toString().trim();
      var topic = (data.get("topic") || "").toString().trim();
      var message = (data.get("message") || "").toString().trim();

      var body = [
        "Name: " + name,
        "Email: " + email,
        "Reason for writing: " + topic,
        "",
        message
      ].join("\n");

      var to = form.getAttribute("data-mailto") || "";
      window.location.href =
        "mailto:" +
        to +
        "?subject=" +
        encodeURIComponent(topic + " — " + name) +
        "&body=" +
        encodeURIComponent(body);

      if (status) {
        status.textContent = "Opening your email app…";
      }
    });
  }

  /* ------------------------------------------------------------ small bits */

  var year = document.querySelector("[data-year]");
  if (year) year.textContent = new Date().getFullYear();
})();
