// ===== Dailizza · Стоп-меню админ панелі =====

const $  = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => [...el.querySelectorAll(s)];

let activeCat = "all";
let search = "";
let pendingIds = null;   // уақыт таңдап жатқан id-лар

const fmtPrice = (n) => n.toLocaleString("ru-RU") + " ₸";

function toast(msg){
  const el = $("#toast");
  if(!el) return;
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(el._t);
  el._t = setTimeout(()=> el.classList.remove("show"), 2200);
}

// ===== Логин =====
async function initAuth(){
  if(!sbStop){
    $("#loginErr").textContent = "Supabase қосылмаған (config.js)";
    return;
  }
  const { data } = await sbStop.auth.getSession();
  if(data.session) await showApp();
}

async function doLogin(e){
  e.preventDefault();
  const btn = $("#loginBtn");
  const err = $("#loginErr");
  err.textContent = "";
  btn.disabled = true;
  btn.textContent = "Кіруде...";
  try{
    const { error } = await sbStop.auth.signInWithPassword({
      email: $("#email").value.trim(),
      password: $("#password").value
    });
    if(error) throw error;
    await showApp();
  } catch(ex){
    err.textContent = ex.message === "Invalid login credentials"
      ? "Email немесе пароль қате"
      : (ex.message || "Кіру мүмкін болмады");
  } finally {
    btn.disabled = false;
    btn.textContent = "Кіру";
  }
}

async function doLogout(){
  await sbStop.auth.signOut();
  location.reload();
}

async function showApp(){
  $("#loginScreen").hidden = true;
  $("#loginScreen").style.display = "none";
  $("#app").hidden = false;
  await loadStops();
  renderCats();
  renderList();
  // Басқа құрылғыдан өзгертілсе де жаңарып тұрсын
  setInterval(async ()=>{
    if(await loadStops()){ renderCats(); renderList(); }
  }, 30000);
  document.addEventListener("visibilitychange", async ()=>{
    if(!document.hidden && await loadStops()){ renderCats(); renderList(); }
  });
}

// ===== Көмекші =====
function stoppedCount(){
  return stopCatalog("kz").reduce((n,card)=>
    n + card.ids.filter(x=> isStopped(x.id)).length, 0);
}

function untilText(id){
  const u = stopUntil(id);
  if(u === undefined) return "";
  if(u === null) return "Стопта · қолмен қосылады";
  const left = u - Date.now();
  if(left <= 0) return "";
  const h = Math.floor(left / 3600000);
  const m = Math.round((left % 3600000) / 60000);
  const when = new Date(u).toLocaleTimeString("ru-RU", {hour:"2-digit", minute:"2-digit"});
  return h > 0
    ? `Стопта · ${when}-ге дейін (${h} сағ ${m} мин)`
    : `Стопта · ${when}-ге дейін (${m} мин)`;
}

function visibleCards(){
  const q = search.trim().toLowerCase();
  return stopCatalog("kz")
    .filter(card=> activeCat === "all" || card.cat === activeCat)
    .map(card=>{
      if(!q) return card;
      if(card.title.toLowerCase().includes(q)) return card;
      const ids = card.ids.filter(x=> x.name.toLowerCase().includes(q));
      return ids.length ? { ...card, ids } : null;
    })
    .filter(Boolean);
}

// ===== Категориялар =====
function renderCats(){
  const cards = stopCatalog("kz");
  const wrap = $("#cats");
  const cats = ["all", ...CATS.filter(c=> cards.some(x=> x.cat === c))];
  wrap.innerHTML = cats.map(c=>{
    const n = cards
      .filter(card=> c === "all" || card.cat === c)
      .reduce((s,card)=> s + card.ids.filter(x=> isStopped(x.id)).length, 0);
    const name = c === "all" ? "Барлығы" : (I18N.kz["cat_"+c] || c);
    return `<button class="chip${c===activeCat?" active":""}" data-cat="${c}">
      ${name}${n ? `<span class="n">${n}</span>` : ""}
    </button>`;
  }).join("");
  wrap.querySelectorAll("[data-cat]").forEach(b=>{
    b.onclick = ()=>{ activeCat = b.dataset.cat; renderCats(); renderList(); };
  });
  $("#stopCount").textContent = "Стопта: " + stoppedCount() + " тағам";
}

// ===== Тізім =====
function renderList(){
  const root = $("#list");
  const cards = visibleCards();
  if(!cards.length){
    root.innerHTML = `<p style="text-align:center;color:var(--muted);padding:40px 0">Табылмады</p>`;
    return;
  }

  let html = "";
  let lastCat = null;
  cards.forEach(card=>{
    if(card.cat !== lastCat && activeCat === "all"){
      html += `<div class="cat-title">${I18N.kz["cat_"+card.cat] || card.cat}</div>`;
      lastCat = card.cat;
    }
    const allIds = card.ids.map(x=> x.id);
    const allStopped = allIds.every(isStopped);
    const thumb = card.img
      ? `<img class="card-thumb" src="photos/${encodeURI(card.img)}" alt="" loading="lazy">`
      : `<div class="card-thumb ph">🍴</div>`;
    const allBtn = card.ids.length > 1
      ? `<button class="btn-all${allStopped?" on":""}" data-all="${encodeURIComponent(JSON.stringify(allIds))}" data-title="${card.title}">
           ${allStopped ? "Бәрін қосу" : "Бәрін стопқа"}
         </button>`
      : "";
    const rows = card.ids.map(x=>{
      const off = isStopped(x.id);
      const meta = off ? untilText(x.id) : fmtPrice(x.price);
      return `<div class="row${off?" off":""}">
        <div class="row-info">
          <div class="row-name">${x.name}</div>
          <div class="row-meta">${meta}</div>
        </div>
        <button class="sw${off?" off":""}" data-id="${x.id}" data-title="${x.name}"
                aria-label="${off?"қайта қосу":"стопқа қою"}"></button>
      </div>`;
    }).join("");

    html += `<article class="card">
      <div class="card-head">
        ${thumb}
        <div class="card-name">${card.title}</div>
        ${allBtn}
      </div>
      ${rows}
    </article>`;
  });
  root.innerHTML = html;

  root.querySelectorAll(".sw").forEach(b=>{
    b.onclick = ()=> toggleIds([b.dataset.id], b.dataset.title);
  });
  root.querySelectorAll(".btn-all").forEach(b=>{
    b.onclick = ()=> toggleIds(JSON.parse(decodeURIComponent(b.dataset.all)), b.dataset.title);
  });
}

// ===== Стопқа қою / қайта қосу =====
function toggleIds(ids, title){
  const anyOn = ids.some(id=> !isStopped(id));
  if(anyOn){
    pendingIds = ids;
    $("#durTitle").textContent = title ? `Стопқа: ${title}` : "Стопқа қою";
    $("#durBg").classList.add("open");
  } else {
    applyStop(ids, "clear");
  }
}

async function applyStop(ids, mode){
  try{
    if(mode === "clear"){
      for(const id of ids) await clearStop(id);
      toast(ids.length > 1 ? "Қайта қосылды" : "Қайта қосылды ✓");
    } else {
      for(const id of ids) await setStop(id, mode);
      toast(mode ? "Стопқа қойылды (уақытпен)" : "Стопқа қойылды");
    }
    renderCats();
    renderList();
  } catch(e){
    console.error(e);
    toast("Қате: " + (e.message || "сақталмады"));
    await loadStops();
    renderCats();
    renderList();
  }
}

function durationMs(kind){
  if(kind === "0") return null;                       // қолмен
  if(kind === "morning"){
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d.getTime();
  }
  return Date.now() + (+kind) * 3600000;
}

// ===== Init =====
document.addEventListener("DOMContentLoaded", ()=>{
  $("#loginForm").onsubmit = doLogin;
  $("#logoutBtn").onclick = doLogout;
  $("#search").oninput = (e)=>{ search = e.target.value; renderList(); };

  $$("#durBg .dur-opts button").forEach(b=>{
    b.onclick = ()=>{
      const ids = pendingIds;
      pendingIds = null;
      $("#durBg").classList.remove("open");
      if(ids) applyStop(ids, durationMs(b.dataset.h));
    };
  });
  $("#durCancel").onclick = ()=>{ pendingIds = null; $("#durBg").classList.remove("open"); };
  $("#durBg").onclick = (e)=>{ if(e.target.id === "durBg"){ pendingIds = null; $("#durBg").classList.remove("open"); } };

  initAuth();
});
