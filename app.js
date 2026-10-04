const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); }
const pages=[...document.querySelectorAll('.page')], navItems=[...document.querySelectorAll('.nav-item')], toast=document.getElementById('toast'), modal=document.getElementById('modal'), modalContent=document.getElementById('modalContent');
const hour=new Date().getHours();
const greetings=hour<11?'Good morning, Valerie.':hour<17?'Good afternoon, Valerie.':'Good evening, Valerie.';
document.getElementById('greeting').textContent=greetings;
const quotes=['Are we productive, or beautifully pretending?','Need a tiny reset before round two?','One class at a time. You’ve got this.'];
document.getElementById('quote').textContent=quotes[Math.floor(Math.random()*quotes.length)];
const d=new Date();
document.getElementById('todayDate').textContent=d.toLocaleDateString('en-US',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).toUpperCase();
function haptic(type='light'){if(tg?.HapticFeedback)tg.HapticFeedback.impactOccurred(type)}
function showToast(msg){toast.textContent=msg;toast.classList.add('show');haptic();clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>toast.classList.remove('show'),1600)}
function openPage(name){pages.forEach(p=>p.classList.toggle('active',p.dataset.view===name));navItems.forEach(n=>n.classList.toggle('active',n.dataset.page===name));window.scrollTo({top:0,behavior:'smooth'});haptic()}
function openModal(title,subtitle,body){modalContent.innerHTML=`<span class="modal-kicker">ACADEMIC</span><h2>${title}</h2><p class="modal-subtitle">${subtitle}</p><div class="modal-body"><p>${body}</p></div><button class="wide-button" id="modalAction">Mark as viewed</button>`;modal.classList.add('show');modal.setAttribute('aria-hidden','false');haptic('medium');document.getElementById('modalAction').onclick=()=>{closeModal();showToast('Saved ✓')}}
function closeModal(){modal.classList.remove('show');modal.setAttribute('aria-hidden','true')}
document.addEventListener('click',e=>{const page=e.target.closest('[data-page]');if(page){openPage(page.dataset.page);return}const tb=e.target.closest('[data-toast]');if(tb){showToast(tb.dataset.toast);return}const detail=e.target.closest('[data-detail]');if(detail){const [a,b,c,d]=detail.dataset.detail.split('|');openModal(a,b,`${c}<br><br>${d}`)}});
document.getElementById('closeModal').onclick=closeModal;modal.addEventListener('click',e=>{if(e.target===modal)closeModal()});
document.getElementById('confirmAttendance').addEventListener('click',e=>{e.stopPropagation();const b=e.currentTarget,t=document.getElementById('attendanceText');b.textContent='Confirmed';b.classList.add('confirmed');t.textContent='Attendance Confirmed';showToast('Attendance confirmed ✓')});
document.getElementById('scheduleToggle').addEventListener('click',()=>{const row=document.getElementById('attendanceRow'),open=row.style.display!=='none';row.style.display=open?'none':'flex';document.getElementById('scheduleToggle').setAttribute('aria-expanded',String(!open))});
document.getElementById('absenceSubmit').addEventListener('click',()=>showToast('Absence request submitted ✓'));
window.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});
