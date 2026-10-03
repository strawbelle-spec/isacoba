const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); }

const app = document.getElementById('app');
const pages = [...document.querySelectorAll('.page')];
const navItems = [...document.querySelectorAll('.nav-item')];
const toast = document.getElementById('toast');
const modal = document.getElementById('modal');
const modalContent = document.getElementById('modalContent');

const now = new Date();
document.getElementById('todayDate').textContent = now.toLocaleDateString('en-US', {weekday:'long', day:'numeric', month:'long', year:'numeric'});
const hour = now.getHours();
document.getElementById('greeting').textContent = `${hour < 11 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'}, Valerie`;

function haptic(type='light') { if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred(type); }
function showToast(message) {
  toast.textContent = message; toast.classList.add('show'); haptic();
  clearTimeout(window.toastTimer); window.toastTimer = setTimeout(() => toast.classList.remove('show'), 1600);
}
function openPage(name) {
  pages.forEach(p => p.classList.toggle('active', p.dataset.view === name));
  navItems.forEach(n => n.classList.toggle('active', n.dataset.page === name));
  window.scrollTo({top:0, behavior:'smooth'});
  haptic();
}
function openModal(title, subtitle, body) {
  modalContent.innerHTML = `<span class="modal-kicker">ACADEMIC</span><h2>${title}</h2><p class="modal-subtitle">${subtitle}</p><div class="modal-body">${body}</div><button class="wide-button" id="modalAction">Mark as viewed</button>`;
  modal.classList.add('show'); modal.setAttribute('aria-hidden','false'); haptic('medium');
  document.getElementById('modalAction').addEventListener('click', () => { closeModal(); showToast('Saved ✓'); });
}
function closeModal() { modal.classList.remove('show'); modal.setAttribute('aria-hidden','true'); }

document.addEventListener('click', e => {
  const pageBtn = e.target.closest('[data-page]');
  if (pageBtn) { openPage(pageBtn.dataset.page); return; }
  const toastBtn = e.target.closest('[data-toast]');
  if (toastBtn) { showToast(toastBtn.dataset.toast); return; }
  const detailBtn = e.target.closest('[data-detail]');
  if (detailBtn) {
    const [a,b,c,d] = detailBtn.dataset.detail.split('|');
    openModal(a, b, `<p>${c}</p><p>${d}</p>`); return;
  }
  if (e.target === modal) closeModal();
});

document.getElementById('closeModal').addEventListener('click', closeModal);
window.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
