const root = document.documentElement;
const body = document.body;
const languageButtons = document.querySelectorAll("[data-language]");
const translatableNodes = document.querySelectorAll("[data-zh][data-en]");
const menuToggle = document.querySelector(".menu-toggle");
const mobileNav = document.querySelector(".mobile-nav");
const progressBar = document.querySelector(".scroll-progress span");
const navLinks = document.querySelectorAll(".desktop-nav a");
const timelineLinks = document.querySelectorAll("[data-timeline-link]");
const timelineFill = document.querySelector("[data-timeline-fill]");
const timelineCurrent = document.querySelector("[data-timeline-current]");
const toast = document.querySelector(".toast");
const musicToggle = document.querySelector(".music-toggle");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isReviewMode = new URLSearchParams(window.location.search).get("review") === "1";
const emailByLanguage = {
  zh: "wangzimeng0923@163.com",
  en: "wangzimeng0923@gmail.com",
};
let activeLanguage = localStorage.getItem("tia-site-language") || "zh";
let activeSectionId = "chapter-gate";
let toastTimer;
let updateMusicLabel = () => {};

if (body.classList.contains("landing-page")) {
  const routeHash = window.location.hash;
  const storyHashes = new Set(["#profile", "#about", "#education", "#experience"]);
  const workHashes = new Set(["#projects", "#skills", "#contact"]);
  if (storyHashes.has(routeHash)) {
    window.location.replace(`story.html${routeHash}`);
  } else if (workHashes.has(routeHash)) {
    window.location.replace(`work.html${routeHash}`);
  }
}

function getActiveEmail() {
  return emailByLanguage[activeLanguage] || emailByLanguage.zh;
}

function updateEmailLinks() {
  const email = getActiveEmail();
  document.querySelectorAll("[data-email-link]").forEach((link) => {
    link.href = `mailto:${email}`;
  });
  document.querySelectorAll("[data-email-label]").forEach((label) => {
    label.textContent = email;
  });
}

function updateResumeDownloadLinks() {
  const resume = activeLanguage === "en" ? "tia-resume-en.pdf" : "tia-resume-cn.pdf";
  document.querySelectorAll("[data-language-resume]").forEach((link) => {
    link.href = `assets/${resume}`;
  });
}

function updateTimelineCurrent(sectionId = activeSectionId) {
  activeSectionId = sectionId;
  const activeLink = [...timelineLinks].find((link) => link.getAttribute("href") === `#${sectionId}`);
  if (timelineCurrent && activeLink) {
    timelineCurrent.textContent =
      activeLanguage === "zh" ? activeLink.dataset.timelineZh : activeLink.dataset.timelineEn;
  }

  timelineLinks.forEach((link) => {
    const isActive = link.getAttribute("href") === `#${sectionId}`;
    link.classList.toggle("is-active", isActive);
    link.setAttribute("aria-current", isActive ? "true" : "false");
  });
}

function applyLanguage(language) {
  activeLanguage = language;
  root.lang = language === "zh" ? "zh-CN" : "en";
  root.classList.toggle("lang-en", language === "en");

  translatableNodes.forEach((node) => {
    const htmlValue = node.dataset[`${language}Html`];
    const value = node.dataset[language];
    if (htmlValue) {
      node.innerHTML = htmlValue;
    } else if (value) {
      node.textContent = value;
    }
  });

  updateEmailLinks();
  updateResumeDownloadLinks();

  languageButtons.forEach((button) => {
    const isActive = button.dataset.language === language;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  localStorage.setItem("tia-site-language", language);
  updateMusicLabel();
  updateTimelineCurrent();
}

if (musicToggle) {
  const music = new Audio("assets/bgm.m4a");
  const musicState = musicToggle.querySelector(".music-toggle-state");
  let musicEnabled = localStorage.getItem("tia-site-music") !== "off";
  music.loop = true;
  music.volume = 0.35;

  const savedTime = Number(sessionStorage.getItem("tia-site-music-time"));
  if (Number.isFinite(savedTime) && savedTime > 0) {
    music.addEventListener("loadedmetadata", () => {
      if (Number.isFinite(music.duration) && music.duration > 0) {
        music.currentTime = savedTime % music.duration;
      }
    }, { once: true });
  }

  function saveMusicTime() {
    if (Number.isFinite(music.currentTime)) {
      sessionStorage.setItem("tia-site-music-time", String(music.currentTime));
    }
  }

  function tryPlayMusic() {
    if (!musicEnabled) return;
    music.play().then(() => {
      document.removeEventListener("pointerdown", tryPlayMusic);
      document.removeEventListener("keydown", tryPlayMusic);
    }).catch(() => {
      // Browsers may require a user gesture before starting audio.
    });
  }

  updateMusicLabel = () => {
    musicToggle.classList.toggle("is-off", !musicEnabled);
    musicToggle.setAttribute("aria-pressed", String(musicEnabled));
    musicState.textContent = musicEnabled ? "ON" : "OFF";
    const label = activeLanguage === "zh"
      ? (musicEnabled ? "关闭背景音乐" : "开启背景音乐")
      : (musicEnabled ? "Turn background music off" : "Turn background music on");
    musicToggle.setAttribute("aria-label", label);
    musicToggle.title = label;
  };

  musicToggle.addEventListener("click", () => {
    musicEnabled = !musicEnabled;
    localStorage.setItem("tia-site-music", musicEnabled ? "on" : "off");
    updateMusicLabel();
    if (musicEnabled) {
      tryPlayMusic();
    } else {
      music.pause();
      saveMusicTime();
    }
  });

  music.addEventListener("timeupdate", saveMusicTime);
  window.addEventListener("pagehide", saveMusicTime);
  document.addEventListener("pointerdown", tryPlayMusic);
  document.addEventListener("keydown", tryPlayMusic);
  updateMusicLabel();
  tryPlayMusic();
}

languageButtons.forEach((button) => {
  button.addEventListener("click", () => applyLanguage(button.dataset.language));
});

function closeMenu() {
  menuToggle?.setAttribute("aria-expanded", "false");
  mobileNav?.classList.remove("is-open");
  body.classList.remove("menu-open");
}

menuToggle?.addEventListener("click", () => {
  const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!isOpen));
  mobileNav?.classList.toggle("is-open", !isOpen);
  body.classList.toggle("menu-open", !isOpen);
});

mobileNav?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", closeMenu);
});

document.querySelectorAll('a[href$=".html"], a[href*=".html#"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    if (reduceMotion || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (link.getAttribute("target") === "_blank") return;
    const destination = link.getAttribute("href");
    if (!destination) return;
    event.preventDefault();
    body.classList.add("is-leaving");
    window.setTimeout(() => {
      window.location.assign(destination);
    }, 180);
  });
});

function updateScrollProgress() {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollable > 0 ? window.scrollY / scrollable : 0;
  progressBar.style.width = `${Math.min(progress * 100, 100)}%`;
  if (timelineFill) timelineFill.style.width = `${Math.min(progress * 100, 100)}%`;
}

window.addEventListener("scroll", updateScrollProgress, { passive: true });
window.addEventListener("resize", updateScrollProgress);
updateScrollProgress();

const sectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((link) => {
        link.classList.toggle("is-active", link.getAttribute("href") === `#${entry.target.id}`);
      });
      updateTimelineCurrent(entry.target.id);
    });
  },
  {
    rootMargin: "-28% 0px -62% 0px",
    threshold: 0,
  },
);

document.querySelectorAll("main section[id], .hero-about[id]").forEach((section) => sectionObserver.observe(section));

timelineLinks.forEach((link) => {
  link.addEventListener("click", closeMenu);
});

document.querySelectorAll("[data-jump-target]").forEach((element) => {
  const jump = () => {
    const target = document.querySelector(element.dataset.jumpTarget);
    target?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  };

  element.addEventListener("click", jump);
  element.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    jump();
  });
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    });
  },
  {
    rootMargin: "0px 0px -8% 0px",
    threshold: 0.08,
  },
);

document.querySelectorAll(".reveal").forEach((element) => {
  if (reduceMotion) {
    element.classList.add("is-visible");
  } else {
    revealObserver.observe(element);
  }
});

function animateCounter(element) {
  if (element.dataset.animated === "true") return;
  element.dataset.animated = "true";

  const target = Number(element.dataset.countTo || 0);
  const prefix = element.dataset.countPrefix || "";
  const suffix = element.dataset.countSuffix || "";

  if (reduceMotion) {
    element.textContent = `${prefix}${target}${suffix}`;
    return;
  }

  const duration = 950;
  const start = performance.now();

  function frame(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(target * eased);
    element.textContent = `${prefix}${current}${suffix}`;

    if (progress < 1) {
      requestAnimationFrame(frame);
    }
  }

  requestAnimationFrame(frame);
}

const counterObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      animateCounter(entry.target);
      counterObserver.unobserve(entry.target);
    });
  },
  { threshold: 0.75 },
);

document.querySelectorAll("[data-count-to]").forEach((counter) => counterObserver.observe(counter));

function setupInteractiveTilt() {
  if (reduceMotion || window.matchMedia("(pointer: coarse)").matches) return;

  const tiltTargets = document.querySelectorAll(".portrait-collage, .project-visual");

  tiltTargets.forEach((target) => {
    target.addEventListener("pointermove", (event) => {
      const rect = target.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;

      target.style.setProperty("--tilt-x", `${(-y * 4).toFixed(2)}deg`);
      target.style.setProperty("--tilt-y", `${(x * 4).toFixed(2)}deg`);
      target.style.setProperty("--spot-x", `${((x + 0.5) * 100).toFixed(1)}%`);
      target.style.setProperty("--spot-y", `${((y + 0.5) * 100).toFixed(1)}%`);
    });

    target.addEventListener("pointerleave", () => {
      target.style.setProperty("--tilt-x", "0deg");
      target.style.setProperty("--tilt-y", "0deg");
      target.style.setProperty("--spot-x", "50%");
      target.style.setProperty("--spot-y", "50%");
    });
  });

  document.querySelectorAll("[data-gate-world]").forEach((world) => {
    world.querySelectorAll(".gate-route").forEach((route) => {
      const path = route.querySelector(".gate-route-line");
      const note = world.querySelector(
        route.classList.contains("gate-route-story")
          ? ".gate-route-note-story"
          : ".gate-route-note-work"
      );
      if (!path || !note) return;

      const positionNote = () => {
        const point = path.getPointAtLength(path.getTotalLength() * 0.5);
        const svgPoint = path.ownerSVGElement.createSVGPoint();
        svgPoint.x = point.x;
        svgPoint.y = point.y;
        const matrix = path.getScreenCTM();
        if (!matrix) return;
        const screenPoint = svgPoint.matrixTransform(matrix);
        const rect = world.getBoundingClientRect();
        const halfWidth = note.offsetWidth / 2 + 16;
        const x = Math.max(halfWidth, Math.min(rect.width - halfWidth, screenPoint.x - rect.left));
        const y = Math.max(note.offsetHeight + 26, screenPoint.y - rect.top);
        note.style.setProperty("--route-note-x", `${x}px`);
        note.style.setProperty("--route-note-y", `${y}px`);
      };

      route.addEventListener("pointerenter", positionNote);
      route.addEventListener("focus", positionNote);
    });

  });
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2200);
}

function setupExperienceStage() {
  const stage = document.querySelector("[data-experience-stage]");
  if (!stage) return;
  const slides = [...stage.querySelectorAll(":scope > .chapter")];
  if (slides.length < 2) return;

  const rail = document.createElement("nav");
  rail.className = "experience-rail";
  rail.setAttribute("aria-label", "Experience chapters");
  const buttons = slides.map((slide, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "experience-rail-button";
    button.textContent = String(index + 1).padStart(2, "0");
    button.setAttribute("aria-label", slide.querySelector(".chapter-company")?.textContent.trim() || button.textContent);
    button.addEventListener("click", () => goTo(index));
    rail.appendChild(button);
    return button;
  });
  stage.before(rail);
  stage.classList.add("is-stage");
  let current = 0;
  let lastZone = -1;
  const desktop = window.matchMedia("(min-width: 761px) and (pointer: fine)");

  function sizeStage() {
    if (!desktop.matches) {
      stage.style.removeProperty("height");
      return;
    }
    stage.style.height = `${Math.max(slides[current].scrollHeight + 12, 570)}px`;
  }

  function goTo(index) {
    current = Math.max(0, Math.min(slides.length - 1, index));
    slides.forEach((slide, position) => {
      slide.classList.toggle("is-active", position === current);
      slide.classList.toggle("is-past", position < current);
      slide.setAttribute("aria-hidden", String(position !== current && desktop.matches));
      if ("inert" in slide) slide.inert = position !== current && desktop.matches;
    });
    buttons.forEach((button, position) => {
      button.classList.toggle("is-active", position === current);
      button.setAttribute("aria-current", position === current ? "step" : "false");
    });
    rail.style.setProperty("--rail-progress-scale", String(current / (slides.length - 1)));
    requestAnimationFrame(sizeStage);
  }

  stage.addEventListener("pointermove", (event) => {
    if (!desktop.matches || reduceMotion || event.pointerType !== "mouse") return;
    const rect = stage.getBoundingClientRect();
    const zone = Math.min(slides.length - 1, Math.floor(((event.clientY - rect.top) / rect.height) * slides.length));
    if (zone !== lastZone) {
      lastZone = zone;
      goTo(zone);
    }
  });
  stage.addEventListener("pointerleave", () => { lastZone = -1; });
  window.addEventListener("resize", () => {
    goTo(current);
    if (!desktop.matches) slides.forEach((slide) => { slide.inert = false; slide.removeAttribute("aria-hidden"); });
  });
  document.querySelectorAll("[data-language]").forEach((button) => button.addEventListener("click", sizeStage));
  goTo(0);
}

function setupSkillsCarousel() {
  const carousel = document.querySelector("[data-skills-carousel]");
  if (!carousel) return;
  const track = carousel.querySelector(".skills-carousel-track");
  const cards = [...track.querySelectorAll(":scope > .skill-group")];
  const dotsBox = carousel.querySelector("[data-skills-dots]");
  const count = carousel.querySelector("[data-skills-count]");
  const prev = carousel.querySelector("[data-skills-prev]");
  const next = carousel.querySelector("[data-skills-next]");
  if (!cards.length || !dotsBox || !count || !prev || !next) return;

  let current = 0;
  let touchStartX = null;
  const dots = cards.map((_, index) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "skills-carousel-dot";
    dot.addEventListener("click", () => show(index));
    dotsBox.appendChild(dot);
    return dot;
  });

  function updateLabels() {
    const chinese = activeLanguage === "zh";
    carousel.setAttribute("aria-label", chinese ? "能力与工具" : "Capabilities and tools");
    prev.setAttribute("aria-label", chinese ? "上一张能力卡片" : "Previous skill card");
    next.setAttribute("aria-label", chinese ? "下一张能力卡片" : "Next skill card");
    dotsBox.setAttribute("aria-label", chinese ? "选择能力卡片" : "Choose a skill card");
    dots.forEach((dot, index) => {
      const title = cards[index].querySelector("h3")?.textContent.trim() || String(index + 1);
      dot.setAttribute("aria-label", chinese ? `查看${title}` : `Show ${title}`);
    });
  }

  function show(index) {
    current = (index + cards.length) % cards.length;
    track.style.transform = `translate3d(-${current * 100}%, 0, 0)`;
    cards.forEach((card, position) => {
      const active = position === current;
      card.classList.toggle("is-active", active);
      card.setAttribute("aria-hidden", String(!active));
      card.inert = !active;
    });
    dots.forEach((dot, position) => {
      const active = position === current;
      dot.classList.toggle("is-active", active);
      dot.setAttribute("aria-current", active ? "true" : "false");
    });
    count.textContent = `${String(current + 1).padStart(2, "0")} / ${String(cards.length).padStart(2, "0")}`;
  }

  carousel.classList.add("is-ready");
  prev.addEventListener("click", () => show(current - 1));
  next.addEventListener("click", () => show(current + 1));
  carousel.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    show(current + (event.key === "ArrowRight" ? 1 : -1));
  });
  carousel.addEventListener("touchstart", (event) => {
    touchStartX = event.touches[0]?.clientX ?? null;
  }, { passive: true });
  carousel.addEventListener("touchend", (event) => {
    if (touchStartX === null) return;
    const distance = (event.changedTouches[0]?.clientX ?? touchStartX) - touchStartX;
    if (Math.abs(distance) > 40) show(current + (distance < 0 ? 1 : -1));
    touchStartX = null;
  }, { passive: true });
  languageButtons.forEach((button) => button.addEventListener("click", updateLabels));
  updateLabels();
  show(0);
}

document.querySelectorAll("[data-open-dialog]").forEach((button) => {
  button.addEventListener("click", () => {
    const dialog = document.getElementById(button.dataset.openDialog);
    if (!dialog) return;
    dialog.showModal();
    document.body.style.overflow = "hidden";
  });
});

function closeDialog(dialog) {
  dialog.close();
  document.body.style.overflow = "";
}

document.querySelectorAll(".project-dialog").forEach((dialog) => {
  dialog.querySelector("[data-close-dialog]")?.addEventListener("click", () => closeDialog(dialog));
  dialog.addEventListener("close", () => {
    document.body.style.overflow = "";
  });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) closeDialog(dialog);
  });
});

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

document.querySelectorAll("[data-copy-wechat]").forEach((button) => {
  button.addEventListener("click", async () => {
    try {
      await copyText("whos_tiiia");
      showToast(activeLanguage === "zh" ? "微信号已复制" : "WeChat ID copied");
    } catch {
      showToast(activeLanguage === "zh" ? "微信号：whos_tiiia" : "WeChat: whos_tiiia");
    }
  });
});

document.querySelectorAll("[data-copy-send-email]").forEach((button) => {
  button.addEventListener("click", async (event) => {
    event.preventDefault();
    const email = getActiveEmail();
    try {
      await copyText(email);
      showToast(activeLanguage === "zh" ? "邮箱已复制" : "Email copied");
    } catch {
      showToast(email);
    }
    window.setTimeout(() => {
      window.location.href = `mailto:${email}`;
    }, 120);
  });
});

function getReviewLabel(element) {
  if (element.dataset.reviewLabel) return element.dataset.reviewLabel;
  if (element.matches("img")) return element.alt || "Image";
  if (element.matches("button")) return element.textContent.trim() || "Button";
  if (element.matches("a")) return element.textContent.trim() || "Link";
  if (element.matches("h1, h2, h3, h4")) return element.textContent.trim();
  if (element.matches("p")) return element.textContent.trim().slice(0, 72);
  return element.className ? String(element.className).split(" ")[0] : element.tagName.toLowerCase();
}

function getReviewSelector(element) {
  if (element.id) return `#${element.id}`;

  const parts = [];
  let node = element;

  while (node && node !== document.body && parts.length < 4) {
    let part = node.tagName.toLowerCase();

    if (node.id) {
      parts.unshift(`#${node.id}`);
      break;
    }

    const classes = [...node.classList]
      .filter(
        (name) =>
          !name.startsWith("is-") &&
          !name.startsWith("reveal") &&
          !name.startsWith("review-"),
      )
      .slice(0, 2);

    if (classes.length) {
      part += `.${classes.join(".")}`;
    } else {
      const siblings = node.parentElement
        ? [...node.parentElement.children].filter((sibling) => sibling.tagName === node.tagName)
        : [];
      if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(node) + 1})`;
    }

    parts.unshift(part);
    node = node.parentElement;
  }

  return parts.join(" > ");
}

function setupReviewMode() {
  const sectionLabels = {
    "chapter-gate": "Start 主界面",
    about: "About 关于",
    experience: "Experience 工作经历",
    projects: "Selected Projects 精选项目",
    skills: "Skills 能力",
    education: "Education 教育",
    contact: "Contact 联系",
  };

  const sections = document.querySelectorAll("main > section[id]");
  sections.forEach((section, index) => {
    section.dataset.reviewNumber = String(index + 1).padStart(2, "0");
    section.dataset.reviewLabel = sectionLabels[section.id] || section.id;
  });

  const toolbar = document.createElement("div");
  toolbar.className = "review-toolbar";
  toolbar.innerHTML = `
    <strong>批注模式</strong>
    <span>点击页面中的任意元素，复制定位信息</span>
    <button type="button">退出</button>
  `;
  toolbar.querySelector("button").addEventListener("click", () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("review");
    window.location.href = url.toString();
  });
  document.body.appendChild(toolbar);

  const cursorLabel = document.createElement("div");
  cursorLabel.className = "review-cursor-label";
  document.body.appendChild(cursorLabel);

  let highlighted;
  document.body.classList.add("review-mode");

  document.addEventListener("pointerover", (event) => {
    const target = event.target.closest("main *, .site-header *, .mobile-nav *");
    if (!target || target.closest(".review-toolbar")) return;
    highlighted?.classList.remove("review-highlight");
    highlighted = target;
    highlighted.classList.add("review-highlight");
    cursorLabel.textContent = getReviewLabel(target);
  });

  document.addEventListener("pointermove", (event) => {
    cursorLabel.style.transform = `translate(${event.clientX + 14}px, ${event.clientY + 14}px)`;
  });

  document.addEventListener(
    "click",
    async (event) => {
      const target = event.target.closest("main *, .site-header *, .mobile-nav *");
      if (!target || target.closest(".review-toolbar")) return;

      event.preventDefault();
      event.stopPropagation();

      const section = target.closest("section[id], dialog[id]");
      const sectionLabel = section?.dataset.reviewLabel || section?.id || "Page";
      const rect = target.getBoundingClientRect();
      const styles = window.getComputedStyle(target);
      const snippet = [
        `模块：${sectionLabel}`,
        `元素：${getReviewLabel(target)}`,
        `选择器：${getReviewSelector(target)}`,
        `尺寸：${Math.round(rect.width)} x ${Math.round(rect.height)}`,
        `位置：left ${Math.round(rect.left)}px / top ${Math.round(rect.top)}px`,
        `字号：${styles.fontSize} / 背景：${styles.backgroundColor}`,
        `文本：${target.textContent.trim().replace(/\s+/g, " ").slice(0, 120)}`,
        "希望修改：",
      ].join("\n");

      try {
        await copyText(snippet);
        showToast(activeLanguage === "zh" ? "元素定位信息已复制" : "Element details copied");
      } catch {
        showToast(activeLanguage === "zh" ? "复制失败，请在控制台查看" : "Copy failed");
        console.info(snippet);
      }
    },
    true,
  );
}

applyLanguage(activeLanguage);
setupInteractiveTilt();
setupExperienceStage();
setupSkillsCarousel();

if (isReviewMode) setupReviewMode();
