const revealItems = document.querySelectorAll(".reveal");
const copyButtons = document.querySelectorAll(".copy-btn");
const captions = document.querySelectorAll(".caption-text");

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
    rootMargin: "0px 0px -50px 0px",
  }
);

revealItems.forEach((item) => revealObserver.observe(item));

const showFeedback = (button, message) => {
  const feedback = button.nextElementSibling;
  feedback.textContent = message;
  button.textContent = message === "Legenda copiada!" ? "Copiado" : "Copiar legenda";

  window.setTimeout(() => {
    feedback.textContent = "";
    button.textContent = "Copiar legenda";
  }, 2200);
};

const fallbackCopy = (text) => {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
};

copyButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    const index = Number(button.dataset.copyTarget);
    const text = captions[index].innerText.trim();

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        fallbackCopy(text);
      }

      showFeedback(button, "Legenda copiada!");
    } catch {
      showFeedback(button, "Não foi possível copiar.");
    }
  });
});
