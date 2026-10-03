const tg = window.Telegram?.WebApp;

if (tg) {
  tg.ready();
  tg.expand();
  document.body.style.background = tg.backgroundColor || "#a9c9e9";
}

const date = new Date();
document.getElementById("todayDate").textContent =
  date.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });

const hour = date.getHours();
const greeting = hour < 11 ? "Good morning, Valerie"
  : hour < 17 ? "Good afternoon, Valerie"
  : "Good evening, Valerie";

document.getElementById("greeting").textContent = greeting;

function setActive(el) {
  document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
  el.classList.add("active");
  showToast(el.querySelector("small").textContent);
}

let toastTimer;
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 1500);

  if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred("light");
}
