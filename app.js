const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); tg.setHeaderColor('#09162f'); tg.setBackgroundColor('#09162f'); }

const $ = (s) => document.querySelector(s);
const pages = [...document.querySelectorAll('.page')];
const navItems = [...document.querySelectorAll('.nav-item')];
const toast = $('#toast');
const modal = $('#modal');
const modalContent = $('#modalContent');

function haptic(type='light') { try { tg?.HapticFeedback?.impactOccurred(type); } catch (_) {} }
function showToast(msg) { toast.textContent = msg; toast.classList.add('show'); haptic(); clearTimeout(window.toastTimer); window.toastTimer=setTimeout(()=>toast.classList.remove('show'),1600); }
function openPage(name) { pages.forEach(p=>p.classList.toggle('active',p.dataset.view===name)); navItems.forEach(n=>n.classList.toggle('active',n.dataset.page===name)); window.scrollTo({top:0,behavior:'smooth'}); haptic(); if(name==='schedule') renderCalendar(); }
function closeModal(){ modal.classList.remove('show'); modal.setAttribute('aria-hidden','true'); }
function openModal(html){ modalContent.innerHTML=html; modal.classList.add('show'); modal.setAttribute('aria-hidden','false'); haptic('medium'); }

// Telegram identity: use this for display only. For grades, attendance, permissions, etc. validate initData on your backend.
const tgUser = tg?.initDataUnsafe?.user;
const displayName = tgUser?.first_name || 'Valerie';
const avatar = tgUser?.photo_url || '';
$('#greeting').textContent = `${getGreeting()}, ${displayName}.`;
$('#profileName').textContent = displayName;
$('#avatarInitial').textContent = displayName.charAt(0).toUpperCase();
$('#bigAvatar').textContent = displayName.charAt(0).toUpperCase();
if (avatar) {
  $('#profileMini').style.backgroundImage = `url("${avatar}")`;
  $('#profileMini').classList.add('photo-avatar');
  $('#profileMini').innerHTML = '';
  $('#bigAvatar').style.backgroundImage = `url("${avatar}")`;
  $('#bigAvatar').classList.add('photo-avatar');
  $('#bigAvatar').textContent='';
}

function getGreeting(){ const h=new Date().getHours(); return h<11?'Good morning':h<17?'Good afternoon':'Good evening'; }
const quotes=['One class at a time. You’ve got this.','A little progress still counts.','Ready for today’s lesson?'];
$('#quote').textContent = quotes[Math.floor(Math.random()*quotes.length)];

const today = new Date();
let calendarCursor = new Date(today.getFullYear(), today.getMonth(), 1);
let selectedDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

/*
  FIXED / OFFICIAL SCHEDULES
  --------------------------
  These are the schedules published by the app owner. They are read-only for students
  and are shared by everyone because they live in the app's official configuration.
  Change this list when you want to update the official timetable.

  For a truly secure admin editor, move this data to a backend/database and only allow
  your admin Telegram account to write to it. The client-side list below is suitable
  for a static Mini App prototype and cannot be edited through the student UI.
*/
const FIXED_SCHEDULES = [
  {id:'official-ai-2026-10-04', date:keyOf(today), title:'Kecerdasan Artifisial', teacher:'Miss Isabelle', time:'19.00', duration:60, type:'class', fixed:true}
];

// PERSONAL schedules belong only to the Telegram user who created them.
// Telegram CloudStorage is per-user, so another student will not receive these items.
let personalEvents = {};

// Attendance is per Telegram user. The button remains editable until the class ends.
let attendanceState = {};
function attendanceCloudKey(){ return 'attendance_state_v1'; }
function attendanceKey(ev){ return `${ev.date}_${String(ev.id)}`; }
function attendanceWindow(ev){
  const [h,m] = String(ev.time||'00.00').replace('.',':').split(':').map(Number);
  const start = new Date(`${ev.date}T${String(h).padStart(2,'0')}:${String(m||0).padStart(2,'0')}:00`);
  const end = new Date(start.getTime() + (Number(ev.duration)||60)*60000);
  return {start,end};
}
function attendanceOpen(ev){
  if(!ev?.fixed) return false;
  const {start,end}=attendanceWindow(ev);
  const now=new Date();
  return now>=start && now<=end;
}
function loadAttendance(){
  const fallback=localStorage.getItem('arutala_attendance_state');
  try{ attendanceState=fallback?JSON.parse(fallback):{}; }catch{ attendanceState={}; }
  if(tg?.CloudStorage){
    tg.CloudStorage.getItem(attendanceCloudKey(),(err,value)=>{
      if(!err && value){ try{ attendanceState=JSON.parse(value)||{}; }catch(_){} }
      renderAttendance();
    });
  }
  renderAttendance();
}
function saveAttendance(){
  localStorage.setItem('arutala_attendance_state',JSON.stringify(attendanceState));
  if(tg?.CloudStorage) tg.CloudStorage.setItem(attendanceCloudKey(),JSON.stringify(attendanceState));
}
function renderAttendance(){
  const ev=allEventsFor(keyOf(today)).find(x=>x.fixed);
  const btn=$('#confirmAttendance'); const text=$('#attendanceText');
  if(!btn||!text||!ev) return;
  const key=attendanceKey(ev); const status=attendanceState[key]||'';
  const open=attendanceOpen(ev);
  btn.classList.toggle('confirmed',status==='confirmed');
  btn.classList.toggle('expired',!open);
  btn.classList.add('editable');
  btn.disabled=!open;
  btn.textContent=status==='confirmed'?'Confirmed':'Confirm';
  if(open){
    const end=attendanceWindow(ev).end;
    const hh=String(end.getHours()).padStart(2,'0'), mm=String(end.getMinutes()).padStart(2,'0');
    text.textContent=status==='confirmed'?`Confirmed · change until ${hh}:${mm}`:`Attendance available until ${hh}:${mm}`;
  }else if(new Date()<attendanceWindow(ev).start){
    const st=attendanceWindow(ev).start; const hh=String(st.getHours()).padStart(2,'0'),mm=String(st.getMinutes()).padStart(2,'0');
    text.textContent=`Attendance opens at ${hh}:${mm}`;
  }else{
    text.textContent=status==='confirmed'?'Attendance confirmed':'Attendance closed';
  }
}

function keyOf(d){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function prettyDate(d){ return d.toLocaleDateString('en-US',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).toUpperCase(); }
$('#todayDate').textContent = prettyDate(today);

function fixedEventsFor(dateKey){ return FIXED_SCHEDULES.filter(ev=>ev.date===dateKey); }
function allEventsFor(dateKey){ return [...fixedEventsFor(dateKey), ...(personalEvents[dateKey]||[])]; }

function cloudKey(){
  // CloudStorage is already scoped to the Telegram user. Keep the key stable.
  return 'personal_schedule_events_v2';
}

function loadEvents(){
  const fallback = localStorage.getItem('arutala_personal_events');
  try { personalEvents = fallback ? JSON.parse(fallback) : {}; } catch { personalEvents = {}; }
  if (tg?.CloudStorage) {
    tg.CloudStorage.getItem(cloudKey(), (err, value)=>{
      if(!err && value){
        try { personalEvents=JSON.parse(value)||{}; renderCalendar(); updateHomeEvent(); } catch(_) {}
      } else {
        savePersonalEvents();
      }
      updateHomeEvent();
    });
  }
  updateHomeEvent();
}
function savePersonalEvents(){
  localStorage.setItem('arutala_personal_events', JSON.stringify(personalEvents));
  if(tg?.CloudStorage) tg.CloudStorage.setItem(cloudKey(), JSON.stringify(personalEvents));
}

function renderCalendar(){
  $('#calendarMonth').textContent = calendarCursor.toLocaleDateString('en-US',{month:'long',year:'numeric'});
  const wrap=$('#calendarDays'); wrap.innerHTML='';
  const first = new Date(calendarCursor.getFullYear(),calendarCursor.getMonth(),1);
  const start = (first.getDay()+6)%7;
  const daysInMonth = new Date(calendarCursor.getFullYear(),calendarCursor.getMonth()+1,0).getDate();
  const prevDays = new Date(calendarCursor.getFullYear(),calendarCursor.getMonth(),0).getDate();
  for(let i=0;i<start;i++){
    const b=document.createElement('button'); b.className='muted-day'; b.textContent=prevDays-start+i+1; b.disabled=true; wrap.appendChild(b);
  }
  for(let day=1;day<=daysInMonth;day++){
    const b=document.createElement('button'); const d=new Date(calendarCursor.getFullYear(),calendarCursor.getMonth(),day); const k=keyOf(d);
    b.textContent=day; b.dataset.date=k;
    if(k===keyOf(selectedDate)) b.classList.add('selected');
    if(k===keyOf(today)) b.classList.add('today');
    const dayEvents=allEventsFor(k);
    if(dayEvents.length) b.classList.add('has-event');
    if(fixedEventsFor(k).length) b.classList.add('has-fixed');
    if((personalEvents[k]||[]).length) b.classList.add('has-personal');
    b.addEventListener('click',()=>{selectedDate=d; renderCalendar(); haptic();});
    wrap.appendChild(b);
  }
  const cells=wrap.children.length;
  const remainder=cells%7;
  if(remainder){ for(let i=1;i<=7-remainder;i++){ const b=document.createElement('button'); b.className='muted-day'; b.textContent=i; b.disabled=true; wrap.appendChild(b); } }
  renderEventList();
}
function renderEventList(){
  const list=$('#eventList'); const k=keyOf(selectedDate);
  const dayEvents=allEventsFor(k).slice().sort((a,b)=>a.time.localeCompare(b.time));
  $('#selectedDateTitle').textContent = selectedDate.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
  $('#selectedDateHint').textContent = dayEvents.length ? `${dayEvents.length} schedule${dayEvents.length>1?'s':''}` : 'No schedule yet';
  list.innerHTML='';
  if(!dayEvents.length){ list.innerHTML='<div class="empty-event">No schedule for this date. Add your own schedule with the ＋ button.</div>'; return; }
  dayEvents.forEach(ev=>{
    const b=document.createElement('button'); b.className='event';
    const label=ev.fixed ? 'Official schedule' : 'Your personal schedule';
    b.innerHTML=`<span class="dot ${ev.fixed?'fixed-dot':'personal-dot'}"></span><span><b>${escapeHtml(ev.title)}</b><small>${escapeHtml(ev.teacher||'')}${ev.teacher?' · ':''}${ev.duration?ev.duration+' min · ':''}${label}</small></span><strong>${escapeHtml(ev.time)}</strong>`;
    b.addEventListener('click',()=>openEventDetail(ev,k)); list.appendChild(b);
  });
}
function updateHomeEvent(){
  const list=allEventsFor(keyOf(today)).slice().sort((a,b)=>a.time.localeCompare(b.time));
  const ev=list[0];
  if(!ev){ $('#homeEventTitle').textContent='No class today'; $('#homeEventTeacher').textContent='Your schedule is clear'; $('#homeEventTime').textContent='—'; $('#attendanceText').textContent='No attendance to confirm'; return; }
  $('#homeEventTitle').textContent=ev.title; $('#homeEventTeacher').textContent=ev.teacher||'Schedule'; $('#homeEventTime').textContent=ev.time; $('#attendanceText').textContent=ev.fixed ? 'Official class schedule' : 'Personal schedule';
  renderAttendance();
}

function openEventDetail(ev,k){
  if(ev.fixed){
    openModal(`<span class="modal-kicker">OFFICIAL SCHEDULE</span><h2>${escapeHtml(ev.title)}</h2><p class="modal-subtitle">${escapeHtml(selectedDate.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'}))}</p><div class="modal-body"><p><b>${escapeHtml(ev.time)}</b> · ${escapeHtml(ev.teacher||'No teacher')}</p><p class="readonly-note">This is an official schedule published by Universitas Sembagi Arutala. Students cannot edit or delete it.</p></div><button class="wide-button" id="closeEventInfo">Close</button>`);
    $('#closeEventInfo').onclick=closeModal;
    return;
  }
  openModal(`<span class="modal-kicker">YOUR PERSONAL SCHEDULE</span><h2>${escapeHtml(ev.title)}</h2><p class="modal-subtitle">${escapeHtml(selectedDate.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'}))}</p><div class="modal-body"><p><b>${escapeHtml(ev.time)}</b> · ${escapeHtml(ev.teacher||'No teacher')}</p><p class="readonly-note">Only you can see this schedule on your account.</p></div><button class="wide-button danger-button" id="deleteEvent">Delete my schedule</button>`);
  $('#deleteEvent').onclick=()=>{ personalEvents[k]=(personalEvents[k]||[]).filter(x=>x.id!==ev.id); if(!personalEvents[k].length) delete personalEvents[k]; savePersonalEvents(); closeModal(); renderCalendar(); updateHomeEvent(); showToast('Personal schedule deleted'); };
}
function escapeHtml(s=''){ return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

function addSchedule(){
  const dateValue=keyOf(selectedDate);
  openModal(`<span class="modal-kicker">PERSONAL SCHEDULE</span><h2>Add your schedule</h2><p class="modal-subtitle">This schedule will only be visible to your Telegram account.</p><form id="eventForm" class="event-form"><label>Title<input id="eventTitle" required maxlength="60" placeholder="e.g. Study Session"></label><label>Teacher / note<input id="eventTeacher" maxlength="40" placeholder="e.g. Miss Isabelle or Personal"></label><div class="form-grid"><label>Date<input id="eventDate" type="date" value="${dateValue}" required></label><label>Time<input id="eventTime" type="time" value="19:00" required></label></div><label>Duration<select id="eventDuration"><option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60" selected>60 minutes</option><option value="90">90 minutes</option><option value="120">120 minutes</option></select></label><button class="wide-button" type="submit">Save personal schedule</button></form>`);
  $('#eventForm').addEventListener('submit',e=>{
    e.preventDefault();
    const date=$('#eventDate').value; const title=$('#eventTitle').value.trim(); const teacher=$('#eventTeacher').value.trim(); const time=$('#eventTime').value; const duration=Number($('#eventDuration').value);
    if(!date||!title||!time)return;
    const ev={id:crypto.randomUUID?.()||String(Date.now()),title,teacher,time:time.replace(':','.'),duration,type:'personal',fixed:false};
    (personalEvents[date] ||= []).push(ev); savePersonalEvents();
    selectedDate=new Date(`${date}T12:00:00`); calendarCursor=new Date(selectedDate.getFullYear(),selectedDate.getMonth(),1);
    closeModal(); renderCalendar(); updateHomeEvent(); showToast('Personal schedule added ✓');
  });
}

$('#prevMonth').onclick=()=>{calendarCursor.setMonth(calendarCursor.getMonth()-1); renderCalendar();};
$('#nextMonth').onclick=()=>{calendarCursor.setMonth(calendarCursor.getMonth()+1); renderCalendar();};
$('#addEvent').onclick=addSchedule;
$('#closeModal').onclick=closeModal;
modal.addEventListener('click',e=>{if(e.target===modal)closeModal();});

document.addEventListener('click',e=>{
  const page=e.target.closest('[data-page]'); if(page){openPage(page.dataset.page);return;}
  const detail=e.target.closest('[data-detail]');
  if(detail){
    const [a,b,c,d]=detail.dataset.detail.split('|');
    openModal(`<span class="modal-kicker">ASSIGNMENT</span><h2>${escapeHtml(a)}</h2><p class="modal-subtitle">${escapeHtml(b)} · ${escapeHtml(c)}</p><div class="modal-body"><p>${escapeHtml(d)}</p><div class="submission-box"><span>↑</span><b>Upload your answer</b><small>PDF / JPG / PNG · max 10 MB</small></div></div><button class="wide-button" id="modalAction">Submit assignment</button>`);
    $('#modalAction').onclick=()=>{closeModal();showToast('Assignment saved ✓');};
  }
});

// Assignment filters are interactive.
const filterButtons=[...document.querySelectorAll('.task-filters button')];
filterButtons.forEach(btn=>btn.addEventListener('click',()=>{
  filterButtons.forEach(x=>x.classList.remove('selected')); btn.classList.add('selected');
  const filter=btn.textContent.trim();
  document.querySelectorAll('.task-list .task').forEach(task=>{
    const status=task.querySelector('.status')?.textContent.trim().toUpperCase() || '';
    const show=filter==='All' || (filter==='Upcoming' && status==='UPCOMING') || (filter==='Completed' && status==='COMPLETED');
    task.style.display=show?'flex':'none';
  });
}));


$('#confirmAttendance').addEventListener('click',e=>{
  e.stopPropagation();
  const ev=allEventsFor(keyOf(today)).find(x=>x.fixed);
  if(!ev || !attendanceOpen(ev)) return;
  const key=attendanceKey(ev);
  if(attendanceState[key]==='confirmed'){
    openModal(`<span class="modal-kicker">ATTENDANCE</span><h2>Change attendance?</h2><p class="modal-subtitle">You can still change your attendance until the class ends.</p><button class="wide-button" id="keepAttendance">Keep Confirmed</button><button class="wide-button danger-button" id="undoAttendance">Change to Not Confirmed</button>`);
    $('#keepAttendance').onclick=closeModal;
    $('#undoAttendance').onclick=()=>{ delete attendanceState[key]; saveAttendance(); closeModal(); renderAttendance(); showToast('Attendance changed'); };
  }else{
    attendanceState[key]='confirmed'; saveAttendance(); renderAttendance(); showToast('Attendance confirmed ✓');
  }
});

$('#scheduleToggle').addEventListener('click',()=>{const row=$('#attendanceRow');const open=row.style.display!=='none';row.style.display=open?'none':'flex';});
$('#absenceSubmit').addEventListener('click',()=>showToast('Absence request submitted ✓'));
$('#attendanceHistory').addEventListener('click',()=>{
  openModal(`<span class="modal-kicker">ATTENDANCE HISTORY</span><h2>Attendance history</h2><div class="history-list"><div><b>Kecerdasan Artifisial</b><small>Today · 19.00</small><strong>${Object.values(attendanceState).some(v=>v==='confirmed')?'Confirmed':'Not confirmed'}</strong></div><div><b>Ancient Runes</b><small>Yesterday · 16.00</small><strong>Confirmed</strong></div><div><b>Oneirology</b><small>30 September · 18.00</small><strong>Confirmed</strong></div></div>`);
});
window.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();});

loadEvents();
loadAttendance();
renderCalendar();
