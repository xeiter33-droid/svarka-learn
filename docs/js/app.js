(() => {
  const root = document.getElementById("content");
  const nav = document.getElementById("site-nav");
  const toggle = document.getElementById("navToggle");

  function route() {
    const hash = location.hash.replace(/^#\/?/, "") || "";
    const [path] = hash.split("?");
    return path.split("/").filter(Boolean);
  }

  function setActiveNav(parts) {
    const key = parts[0] || "";
    nav.querySelectorAll("a").forEach((a) => {
      const href = (a.getAttribute("href") || "").replace("#/", "") || "";
      const target = href.split("/")[0] || "";
      const current =
        (key === "" && target === "") ||
        (key !== "" && target === key);
      if (current) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
  }

  function toast(msg) {
    let el = document.querySelector(".svarka-toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "svarka-toast";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("is-on");
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove("is-on"), 2600);
  }

  window.SVARKA_EXTRAS = Object.assign(window.SVARKA_EXTRAS || {}, { toast });

  function mount() {
    const parts = route();
    setActiveNav(parts);
    try {
      root.innerHTML = window.LMS.render(parts);
      window.LMS.bind(parts);
    } catch (err) {
      console.error(err);
      root.innerHTML = `
        <div class="page-head">
          <h1>Ошибка</h1>
          <p>${String(err && err.message ? err.message : err)}</p>
          <p><a href="#/" data-nav>На главную</a></p>
        </div>`;
    }
    nav.classList.remove("is-open");
    toggle?.setAttribute("aria-expanded", "false");
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  toggle?.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
  });

  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[data-nav]");
    if (!a) return;
    const href = a.getAttribute("href");
    if (!href || !href.startsWith("#/")) return;
    e.preventDefault();
    if (location.hash !== href) location.hash = href;
    else mount();
  });

  window.addEventListener("hashchange", mount);
  mount();

  /* Content protection: block casual copy, save, view-source shortcuts, image drag/context menu. */
  document.addEventListener("contextmenu", (e) => {
    e.preventDefault();
  });
  document.addEventListener("dragstart", (e) => {
    if (e.target && (e.target.closest("img") || e.target.tagName === "IMG")) {
      e.preventDefault();
    }
  });
  document.addEventListener("keydown", (e) => {
    const key = String(e.key || "").toLowerCase();
    const ctrl = e.ctrlKey || e.metaKey;
    if (!ctrl) return;
    if (["c", "x", "s", "u", "p"].includes(key)) {
      const tag = (e.target && e.target.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      e.preventDefault();
    }
    if (e.shiftKey && key === "i") e.preventDefault();
    if (key === "f12") e.preventDefault();
  });
  document.addEventListener(
    "copy",
    (e) => {
      const tag = (e.target && e.target.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      e.preventDefault();
    },
    true
  );
})();
