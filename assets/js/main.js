(() => {
  const root = document.documentElement;
  const reduce = root.dataset.motion === "off";
  const store = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  gsap.registerPlugin(ScrollTrigger);

  /* Santiago clock */
  const clock = $("#clock");
  const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Santiago", hour: "2-digit", minute: "2-digit", hour12: false });
  const tick = () => (clock.textContent = fmt.format(new Date()));
  tick(); setInterval(tick, 10000);

  /* Split helpers */
  $$("[data-chars]").forEach((el) => {
    el.innerHTML = [...el.textContent].map((c) => `<span class="ch">${c}</span>`).join("");
  });
  $$("[data-words]").forEach((el) => {
    el.setAttribute("aria-label", el.textContent.trim());
    el.innerHTML = el.textContent.trim().split(/\s+/).map((w) => `<span class="w" aria-hidden="true">${w}</span>`).join(" ");
  });

  /* Theme and motion preferences */
  const themeBtn = $("#theme"), themeLabel = $("#theme-label"), meta = $('meta[name="theme-color"]');
  const syncTheme = () => {
    const light = root.dataset.theme === "light";
    themeLabel.textContent = light ? "Dark" : "Light";
    themeBtn.setAttribute("aria-label", light ? "Switch to dark mode" : "Switch to light mode");
    meta.content = light ? "#e4f5e8" : "#163832";
  };
  syncTheme();
  themeBtn.addEventListener("click", () => {
    root.dataset.theme = root.dataset.theme === "light" ? "dark" : "light";
    store("theme", root.dataset.theme);
    syncTheme();
  });
  const motionBtn = $("#motion");
  motionBtn.textContent = reduce ? "Animations: off" : "Animations: on";
  motionBtn.setAttribute("aria-pressed", String(reduce));
  motionBtn.addEventListener("click", () => { store("motion", reduce ? "on" : "off"); location.reload(); });

  /* Smooth scroll */
  let lenis;
  if (!reduce) {
    lenis = new Lenis({ lerp: 0.1 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  $$("[data-scroll]").forEach((a) =>
    a.addEventListener("click", (e) => {
      const t = $(a.getAttribute("href"));
      if (!t) return;
      e.preventDefault();
      const focus = () => { t.setAttribute("tabindex", "-1"); t.focus({ preventScroll: true }); };
      if (lenis) lenis.scrollTo(t, { duration: 1.4, onComplete: focus });
      else { t.scrollIntoView(); focus(); }
    })
  );

  /* Hero: letters react to the cursor with weight and width, smoothed per frame */
  const chars = $$(".name .ch");
  const state = chars.map(() => 0);
  let mx = -9999, my = -9999, usePointer = false;
  addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    usePointer = true; mx = e.clientX; my = e.clientY;
  });
  document.addEventListener("mouseleave", () => { mx = my = -9999; });
  const smooth = (x) => x * x * (3 - 2 * x);
  const heroTick = (time, dt) => {
    if (scrollY > innerHeight * 1.1) return;
    const reach = innerWidth * 0.26;
    const k = 1 - Math.exp(-dt / 1000 * 7);
    chars.forEach((c, i) => {
      let target;
      if (usePointer) {
        const r = c.getBoundingClientRect();
        const d = Math.hypot(mx - (r.left + r.width / 2), (my - (r.top + r.height / 2)) * 0.6);
        target = smooth(Math.max(0, 1 - d / reach));
      } else {
        target = (Math.sin(time * 1.1 + i * 0.55) + 1) / 2 * 0.7;
      }
      state[i] += (target - state[i]) * k;
      const t = state[i];
      c.style.fontVariationSettings = `"wght" ${(900 - t * 700).toFixed(1)}, "wdth" ${(62 + t * 63).toFixed(1)}`;
    });
  };
  if (!reduce) gsap.ticker.add(heroTick);

  /* Hero intro: one orchestrated moment */
  const intro = () => {
    if (reduce) return;
    gsap.set(".name", { visibility: "visible" });
    gsap.timeline({ defaults: { ease: "expo.out" } })
      .fromTo(chars, { yPercent: 118, rotate: 6 }, { yPercent: 0, rotate: 0, duration: 1.5, stagger: 0.045 })
      .to(".hero__top, .hero__bottom", { opacity: 1, duration: 1 }, 0.5);
  };
  document.fonts.ready.then(() => { intro(); ScrollTrigger.refresh(); });
  addEventListener("load", () => ScrollTrigger.refresh());
  $$("img[loading=lazy]").forEach((i) => i.removeAttribute("loading"));

  /* Sheets stack: each one parks when its bottom reaches the viewport and the next slides over it */
  if (!reduce) {
    const stack = $$(".expertise, .skills, .clients");
    const park = () => stack.forEach((s) => {
      s.style.position = "sticky";
      s.style.top = Math.min(0, innerHeight - s.offsetHeight) + "px";
    });
    park();
    addEventListener("resize", () => { park(); ScrollTrigger.refresh(); });
  }

  /* Nav turns dark over the light section */
  ScrollTrigger.create({ trigger: ".expertise", start: "top 40px", end: "bottom 40px", toggleClass: { targets: ".nav", className: "flip" } });

  /* Hero recedes while the next sheet slides over it */
  if (!reduce) {
    gsap.to(".hero__inner", {
      scale: 0.94, yPercent: -6, opacity: 0.35, ease: "none",
      scrollTrigger: { trigger: ".about", start: "top bottom", end: "top top", scrub: true },
    });
  }

  /* Scrubbed word reveal for the about statement, title words rise in */
  if (!reduce) {
    $$(".title").forEach((t) =>
      gsap.from($$(".w", t), {
        yPercent: 60, opacity: 0, rotate: 4, duration: 1, ease: "expo.out", stagger: 0.08,
        scrollTrigger: { trigger: t, start: "top 85%" },
      })
    );
    gsap.from(".row", { yPercent: 40, opacity: 0, clearProps: "opacity,transform", duration: 1, ease: "expo.out", stagger: 0.1, scrollTrigger: { trigger: ".rows", start: "top 80%" } });
    gsap.from(".stack__col", { yPercent: 30, opacity: 0, clearProps: "opacity,transform", duration: 1, ease: "expo.out", stagger: 0.1, scrollTrigger: { trigger: ".stack", start: "top 85%" } });
    gsap.from(".client", { yPercent: 40, opacity: 0, clearProps: "opacity,transform", duration: 1, ease: "expo.out", stagger: 0.07, scrollTrigger: { trigger: ".client-list", start: "top 80%" } });
  }

  /* About: one pinned scene, DESIGNER scrambles into DEVELOPER as you scroll */
  const about = $("#about");
  const slots = $$(".about__word .s");
  const FROM = ["D", "E", "S", "I", "G", "N", "E", "R", ""], TO = [..."DEVELOPER"], GLYPHS = "<>/{}[]=+*#%&01";
  const phases = $$(".phase", about), steps = $$(".about__steps i", about);
  const yearsBox = $(".about__years", about), yearsNum = $("b", yearsBox), word = $(".about__word", about);
  const clamp = (v) => Math.min(1, Math.max(0, v));
  const win = (p, a, b) => clamp((p - a) / (b - a));
  const paint = (p) => {
    slots.forEach((s, i) => {
      const lp = win(p, 0.3 + i * 0.022, 0.42 + i * 0.022);
      const next = lp <= 0 ? FROM[i] : lp >= 1 ? TO[i] : GLYPHS[(i * 5 + Math.floor(lp * 24)) % GLYPHS.length];
      if (s.textContent !== next) s.textContent = next;
    });
    word.style.fontVariationSettings = `"wght" ${(900 - 550 * win(p, 0.72, 1)).toFixed(1)}, "wdth" 100`;
    const vis = [1 - win(p, 0.26, 0.34), win(p, 0.34, 0.4) * (1 - win(p, 0.62, 0.68)), win(p, 0.68, 0.74)];
    phases.forEach((el, i) => {
      el.style.opacity = vis[i];
      el.style.transform = `translateY(${((i === 0 ? -1 : 1) * (i === 0 ? win(p, 0.26, 0.34) : 1 - vis[i]) * 36).toFixed(1)}px)`;
    });
    yearsBox.style.opacity = win(p, 0.28, 0.36);
    yearsNum.textContent = Math.round(12 * win(p, 0.3, 0.6));
    steps.forEach((el, i) => (el.style.transform = `scaleY(${clamp(p * 3 - i)})`));
  };
  if (reduce) {
    about.classList.add("about--static");
    paint(1);
  } else {
    let target = 0, cur = 0;
    ScrollTrigger.create({ trigger: about, start: "top top", end: "+=320%", pin: true, refreshPriority: 1, onUpdate: (s) => (target = s.progress) });
    gsap.ticker.add((t, dt) => {
      cur += (target - cur) * (1 - Math.exp(-dt / 1000 * 9));
      if (Math.abs(target - cur) > 0.0004) paint(cur);
    });
    paint(0);
  }

  /* Skills: AI list rises in */
  if (!reduce) {
    gsap.from(".ai__list li", { yPercent: 50, opacity: 0, duration: 1, ease: "expo.out", stagger: 0.08, clearProps: "opacity,transform", scrollTrigger: { trigger: ".ai__list", start: "top 85%" } });
  }

  /* Tool marquees: scroll drives them. Down moves row one left and row two right, up reverses. */
  const rows = $$(".marquee").map((m) => {
    const track = $(".track", m);
    const n = $$("li", track).length;
    track.append(...$$("li", track).map((li) => li.cloneNode(true)));
    $$("li", track).slice(n).forEach((li) => li.setAttribute("aria-hidden", "true"));
    return { track, dir: +m.dataset.dir, x: 0, target: 0 };
  });
  if (!reduce) {
    let last = scrollY;
    gsap.ticker.add(() => {
      const d = scrollY - last;
      last = scrollY;
      rows.forEach((r) => {
        r.target -= d * r.dir * 0.9;
        r.x += (r.target - r.x) * 0.12;
        const half = r.track.scrollWidth / 2;
        const shift = gsap.utils.wrap(-half, 0, r.x) - r.x;
        r.x += shift; r.target += shift;
        gsap.set(r.track, { x: r.x });
      });
    });
  }

  /* Clients: logo follows the cursor */
  const float = $(".float"), fimg = $("img", float);
  if (fine && !reduce) {
    gsap.set(float, { xPercent: -50, yPercent: -50, scale: 0.6, rotate: -6 });
    const xTo = gsap.quickTo(float, "x", { duration: 0.55, ease: "power3" });
    const yTo = gsap.quickTo(float, "y", { duration: 0.55, ease: "power3" });
    const list = $(".client-list");
    list.addEventListener("pointermove", (e) => { xTo(e.clientX + 40); yTo(e.clientY); });
    $$(".client").forEach((c) => {
      c.addEventListener("pointerenter", () => {
        fimg.src = c.dataset.img;
        gsap.to(float, { opacity: 1, scale: 1, rotate: 0, duration: 0.5, ease: "expo.out", overwrite: "auto" });
      });
    });
    list.addEventListener("pointerleave", () => gsap.to(float, { opacity: 0, scale: 0.6, rotate: -6, duration: 0.4, overwrite: "auto" }));
  }

  /* Magnetic email */
  const mail = $(".mail");
  if (fine && !reduce) {
    const mx2 = gsap.quickTo(mail, "x", { duration: 0.6, ease: "power3" });
    const my2 = gsap.quickTo(mail, "y", { duration: 0.6, ease: "power3" });
    mail.addEventListener("pointermove", (e) => {
      const r = mail.getBoundingClientRect();
      mx2((e.clientX - (r.left + r.width / 2)) * 0.06);
      my2((e.clientY - (r.top + r.height / 2)) * 0.2);
    });
    mail.addEventListener("pointerleave", () => { mx2(0); my2(0); });
  }
})();
