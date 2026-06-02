const header = document.querySelector("#siteHeader");
const menuToggle = document.querySelector("#menuToggle");
const navMenu = document.querySelector("#navMenu");
const navLinks = document.querySelectorAll(".nav-menu a");
const backToTop = document.querySelector("#backToTop");
const revealItems = document.querySelectorAll(".reveal");
const sections = document.querySelectorAll("main section[id]");

const closeMenu = () => {
  menuToggle.classList.remove("is-open");
  navMenu.classList.remove("is-open");
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Abrir menu");
};

const toggleMenu = () => {
  const isOpen = navMenu.classList.toggle("is-open");
  menuToggle.classList.toggle("is-open", isOpen);
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Fechar menu" : "Abrir menu");
};

const updateHeader = () => {
  const scrolled = window.scrollY > 24;
  header.classList.toggle("is-scrolled", scrolled);
  backToTop.classList.toggle("is-visible", window.scrollY > 520);
};

menuToggle.addEventListener("click", toggleMenu);

navLinks.forEach((link) => {
  link.addEventListener("click", closeMenu);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeMenu();
  }
});

backToTop.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

window.addEventListener("scroll", updateHeader, { passive: true });
updateHeader();

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.14,
    rootMargin: "0px 0px -60px 0px",
  }
);

revealItems.forEach((item) => revealObserver.observe(item));

const activeSectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;

      navLinks.forEach((link) => {
        link.classList.toggle("is-active", link.getAttribute("href") === `#${entry.target.id}`);
      });
    });
  },
  {
    threshold: 0.45,
  }
);

sections.forEach((section) => activeSectionObserver.observe(section));

document.querySelectorAll(".feature-card, .mini-card, .step-card, .gallery-card").forEach((card) => {
  card.addEventListener("pointermove", (event) => {
    const rect = card.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 5;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * -5;
    card.style.transform = `translateY(-5px) rotateX(${y}deg) rotateY(${x}deg)`;
  });

  card.addEventListener("pointerleave", () => {
    card.style.transform = "";
  });
});
