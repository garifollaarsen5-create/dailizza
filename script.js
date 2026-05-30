// ===== Supabase (бар болса) =====
let sb = null;
if(typeof SUPABASE_URL !== "undefined" && SUPABASE_URL && typeof supabase !== "undefined"){
  sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// ===== State =====
let lang = localStorage.getItem("dz_lang") || "kz";
let cart = JSON.parse(localStorage.getItem("dz_cart") || "[]");
let activeCat = "doner";
let reviewPhotos = [];

const t = (k) => I18N[lang][k] || k;
const saveCart = () => localStorage.setItem("dz_cart", JSON.stringify(cart));

const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => [...el.querySelectorAll(s)];
const fmt = (n) => n.toLocaleString("ru-RU") + " " + t("tenge");
const imgUrl = (name) => {
  if(!name) return "";
  return "photos/" + encodeURIComponent(name).replace(/%2F/g,"/");
};

function toast(msg){
  const el = $("#toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(el._t);
  el._t = setTimeout(()=> el.classList.remove("show"), 2000);
}

function applyI18n(){
  $$("[data-i]").forEach(el=>{ el.textContent = t(el.dataset.i); });
  $$("[data-ph]").forEach(el=>{ el.placeholder = t(el.dataset.ph); });
  document.documentElement.lang = lang;
  $$(".lang button").forEach(b=> b.classList.toggle("active", b.dataset.lang === lang));
}

// ===== Categories =====
function renderCats(){
  const wrap = $("#cats");
  wrap.innerHTML = "";
  CATS.forEach(c=>{
    if(!MENU.some(m=> m.cat===c)) return;
    const b = document.createElement("button");
    b.className = "chip" + (c===activeCat ? " active" : "");
    b.textContent = t("cat_"+c);
    b.onclick = ()=>{
      activeCat = c;
      $$(".chip").forEach(x=> x.classList.toggle("active", x===b));
      const target = $("#sec-"+c);
      if(target){
        const top = target.getBoundingClientRect().top + window.scrollY - 130;
        window.scrollTo({top, behavior:"smooth"});
      }
    };
    wrap.appendChild(b);
  });
}

// ===== Menu =====
function renderMenu(){
  const root = $("#menu");
  root.innerHTML = "";
  CATS.forEach(cat=>{
    const blocks = MENU.filter(m=> m.cat===cat);
    if(!blocks.length) return;
    const sec = document.createElement("section");
    sec.className = "section";
    sec.id = "sec-"+cat;
    sec.innerHTML = `<h2>${t("cat_"+cat)}</h2><div class="grid"></div>`;
    const grid = sec.querySelector(".grid");
    blocks.forEach(b=>{
      if(b.type==="item")  grid.appendChild(renderItem(b));
      if(b.type==="group") grid.appendChild(renderGroup(b));
      if(b.type==="list")  grid.appendChild(renderList(b));
    });
    root.appendChild(sec);
  });
}

function cartQty(id){ const x = cart.find(c=> c.id===id); return x ? x.qty : 0; }

// Counter or +Add button
function counterHtml(id){
  const q = cartQty(id);
  if(q===0){
    return `<button class="btn-add" data-add="${id}">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
      <span>${t("add")}</span>
    </button>`;
  }
  return `<div class="counter">
    <button data-dec="${id}" aria-label="−">−</button>
    <span class="qn">${q}</span>
    <button data-inc="${id}" aria-label="+">+</button>
  </div>`;
}

function renderItem(it){
  const c = document.createElement("article");
  c.className = "card";
  c.dataset.cat = it.cat;
  const desc = it.desc[lang];

  let footerHtml = "";
  if(it.sizes && it.sizes.length){
    // Бірнеше көлем — әр көлемнің өз бағасы
    footerHtml = `<div class="sizes">` + it.sizes.map(s=>{
      const sid = it.id+"-"+s.label;
      const q = cartQty(sid);
      const counter = q>0
        ? `<div class="sz-counter">
             <button data-dec="${sid}">−</button>
             <span class="qn">${q}</span>
             <button data-inc="${sid}">+</button>
           </div>`
        : "";
      return `<button class="size-btn" data-size="${sid}" data-base="${it.id}" data-label="${s.label}" data-price="${s.price}">
        <span class="sz-l">${s.label}</span>
        <span class="sz-p">${fmt(s.price)}</span>
        ${counter}
      </button>`;
    }).join("") + `</div>`;
  } else {
    footerHtml = `<div class="card-footer">
      <div class="price">${fmt(it.price)}</div>
      ${counterHtml(it.id)}
    </div>`;
  }

  c.innerHTML = `
    <div class="card-img"><img src="${imgUrl(it.img)}" alt="${it.name[lang]}" loading="lazy"></div>
    <div class="card-body">
      <div class="card-title">${it.name[lang]}</div>
      <div class="card-desc">${desc || ""}</div>
      ${footerHtml}
    </div>`;

  // Handlers
  bindCartButtons(c, (id)=>{
    // Жалпы + батырмасы үшін
    if(!it.sizes){
      addToCart({ id:it.id, img:it.img, name:it.name, price:it.price });
    }
  });
  // Size buttons
  c.querySelectorAll(".size-btn").forEach(btn=>{
    btn.addEventListener("click", (e)=>{
      // Counter (-/+) клик жасалса, оны өңдемейміз
      if(e.target.closest(".sz-counter")) return;
      const sid = btn.dataset.size;
      const label = btn.dataset.label;
      const price = +btn.dataset.price;
      const fullName = {
        kz: it.name.kz + " · " + label,
        ru: it.name.ru + " · " + label
      };
      addToCart({ id:sid, img:it.img, name:fullName, price });
    });
  });
  return c;
}

function renderGroup(g){
  const c = document.createElement("article");
  c.className = "group-card";
  c.dataset.cat = g.cat;
  const rows = g.items.map(it=>{
    return `<div class="variant-row">
      <div class="variant-info">
        <div class="variant-name">
          <span>${it.name[lang]}</span>
          <span class="vprice">${fmt(it.price)}</span>
        </div>
        ${it.desc[lang] ? `<div class="variant-desc">${it.desc[lang]}</div>` : ""}
      </div>
      ${counterHtml(it.id)}
    </div>`;
  }).join("");
  c.innerHTML = `
    <div class="group-img"><img src="${imgUrl(g.img)}" alt="${g.title[lang]}" loading="lazy"></div>
    <div class="group-body">
      <h3 class="group-title">${g.title[lang]}</h3>
      ${rows}
    </div>`;
  bindCartButtons(c, (id)=>{
    const it = g.items.find(x=> x.id===id);
    if(it) addToCart({ id:it.id, img:g.img, name:it.name, price:it.price });
  });
  return c;
}

function renderList(b){
  const c = document.createElement("article");
  c.className = "list-block";
  const rows = b.items.map(it=>{
    return `<div class="variant-row">
      <div class="variant-info">
        <div class="variant-name">
          <span>${it.name[lang]}</span>
          <span class="vprice">${fmt(it.price)}</span>
        </div>
        ${it.desc[lang] ? `<div class="variant-desc">${it.desc[lang]}</div>` : ""}
      </div>
      ${counterHtml(it.id)}
    </div>`;
  }).join("");
  c.innerHTML = `<h3>${b.title[lang]}</h3>${rows}`;
  bindCartButtons(c, (id)=>{
    const it = b.items.find(x=> x.id===id);
    if(it) addToCart({ id:it.id, img:null, name:it.name, price:it.price });
  });
  return c;
}

function bindCartButtons(root, onAdd){
  root.querySelectorAll("[data-add]").forEach(b=>{
    b.onclick = ()=> onAdd(b.dataset.add);
  });
  root.querySelectorAll("[data-inc]").forEach(b=>{
    b.onclick = (e)=>{ e.stopPropagation(); incQty(b.dataset.inc); };
  });
  root.querySelectorAll("[data-dec]").forEach(b=>{
    b.onclick = (e)=>{ e.stopPropagation(); decQty(b.dataset.dec); };
  });
}

// ===== Cart =====
function addToCart(item){
  const ex = cart.find(x=> x.id===item.id);
  if(ex){ ex.qty += 1; }
  else  { cart.push({ ...item, qty:1 }); }
  saveCart();
  refreshAll();
  bumpFab();
  toast(item.name[lang]);
}
function incQty(id){
  const x = cart.find(c=> c.id===id);
  if(x){ x.qty += 1; saveCart(); refreshAll(); bumpFab(); }
}
function decQty(id){
  const i = cart.findIndex(c=> c.id===id);
  if(i<0) return;
  cart[i].qty -= 1;
  if(cart[i].qty<=0) cart.splice(i,1);
  saveCart(); refreshAll();
}
function changeQtyIdx(idx, delta){
  cart[idx].qty += delta;
  if(cart[idx].qty <= 0) cart.splice(idx,1);
  saveCart(); refreshAll();
}
function removeItem(idx){ cart.splice(idx,1); saveCart(); refreshAll(); }
function cartTotal(){ return cart.reduce((s,x)=> s + x.price*x.qty, 0); }
function cartCount(){ return cart.reduce((s,x)=> s + x.qty, 0); }

function refreshAll(){
  renderMenu();
  refreshCart();
  refreshFab();
}

function refreshCart(){
  $("#cartCount").textContent = cartCount();
  $("#cartCount").style.display = cartCount() ? "grid" : "none";
  const list = $("#cartList");
  if(!cart.length){
    list.innerHTML = `<div class="cart-empty">${t("cart_empty")}</div>`;
  } else {
    list.innerHTML = cart.map((x,i)=>{
      const img = x.img
        ? `<img src="${imgUrl(x.img)}" alt="">`
        : `<div style="width:100%;height:100%;display:grid;place-items:center;background:var(--green-soft);color:var(--green-3);font-weight:900;font-size:18px">🍴</div>`;
      return `<div class="cart-item">
        <div class="cart-item-img">${img}</div>
        <div class="cart-item-info">
          <div class="cart-item-name">${escapeHtml(x.name[lang])}</div>
          <div class="cart-item-price">${fmt(x.price * x.qty)}</div>
          <div class="qty-row">
            <button class="qty-btn" data-act="dec" data-i="${i}">−</button>
            <span class="qty-num">${x.qty}</span>
            <button class="qty-btn" data-act="inc" data-i="${i}">+</button>
            <button class="remove-btn" data-act="rm" data-i="${i}">✕</button>
          </div>
        </div>
      </div>`;
    }).join("");
  }
  $("#totalVal").textContent = fmt(cartTotal());
  $("#btnCheckout").disabled = !cart.length;

  list.querySelectorAll("[data-act]").forEach(b=>{
    const i = +b.dataset.i;
    if(b.dataset.act==="inc") b.onclick = ()=> changeQtyIdx(i,1);
    if(b.dataset.act==="dec") b.onclick = ()=> changeQtyIdx(i,-1);
    if(b.dataset.act==="rm")  b.onclick = ()=> removeItem(i);
  });
}

// ===== FAB =====
function refreshFab(){
  const fab = $("#fab");
  if(!fab) return;
  const cnt = cartCount();
  if(cnt>0){
    fab.classList.add("show");
    $("#fabBadge").textContent = cnt;
    $("#fabTotal").textContent = fmt(cartTotal());
  } else {
    fab.classList.remove("show");
  }
}
function bumpFab(){
  const fab = $("#fab");
  if(!fab) return;
  fab.classList.remove("bump");
  void fab.offsetWidth;
  fab.classList.add("bump");
}

// ===== Drawer / Modal =====
function openDrawer(){ $("#drawer").classList.add("open"); $("#drawerBg").classList.add("open"); document.body.style.overflow="hidden"; }
function closeDrawer(){ $("#drawer").classList.remove("open"); $("#drawerBg").classList.remove("open"); document.body.style.overflow=""; }
function openOrder(){
  if(!cart.length) return;
  $("#orderBg").classList.add("open"); document.body.style.overflow="hidden";
}
function closeOrder(){ $("#orderBg").classList.remove("open"); document.body.style.overflow=""; }

function setDeliveryType(type){
  $$("#deliveryToggle button").forEach(b=> b.classList.toggle("active", b.dataset.type===type));
  $("#addrField").style.display = type==="delivery" ? "flex" : "none";
  $("#fAddress").required = (type==="delivery");
}

function sendWhatsApp(e){
  e.preventDefault();
  const name = $("#fName").value.trim();
  const phone = $("#fPhone").value.trim();
  const date = $("#fDate").value;
  const time = $("#fTime").value;
  const comment = $("#fComment").value.trim();
  const type = $("#deliveryToggle .active").dataset.type;
  const address = $("#fAddress").value.trim();
  if(!name || !phone || !date || !time || (type==="delivery" && !address)){
    toast(t("fill_required")); return;
  }
  const lines = [];
  lines.push("🍔 *"+t("msg_intro")+"*");
  lines.push("");
  lines.push("*"+t("msg_items")+"*");
  cart.forEach(x=>{
    lines.push(`• ${x.name[lang]} × ${x.qty} = ${fmt(x.price*x.qty)}`);
  });
  lines.push("");
  lines.push("*"+t("msg_total")+"* "+fmt(cartTotal()));
  lines.push("");
  lines.push("*"+t("msg_type")+"* "+ (type==="delivery" ? t("delivery") : t("pickup")));
  if(type==="delivery") lines.push("*"+t("msg_addr")+"* "+address);
  lines.push("*"+t("msg_name")+"* "+name);
  lines.push("*"+t("msg_phone")+"* "+phone);
  lines.push("*"+t("msg_date")+"* "+date);
  lines.push("*"+t("msg_time")+"* "+time);
  if(comment) lines.push("*"+t("msg_comment")+"* "+comment);

  const txt = encodeURIComponent(lines.join("\n"));
  window.open(`https://wa.me/${CONTACT.whatsapp}?text=${txt}`, "_blank");
}

// ===== Reviews =====
function loadReviews(){ return JSON.parse(localStorage.getItem("dz_reviews") || "[]"); }
function saveReviews(arr){ localStorage.setItem("dz_reviews", JSON.stringify(arr)); }

function renderReviews(){
  const list = $("#reviewsList");
  const reviews = loadReviews();
  if(!reviews.length){
    list.innerHTML = `<div class="cart-empty">${t("no_reviews")}</div>`;
    return;
  }
  list.innerHTML = reviews.slice().reverse().map(r=>{
    const initial = (r.name||"?").charAt(0).toUpperCase();
    const photos = (r.photos||[]).map(p=>`<img src="${p}" alt="">`).join("");
    return `<div class="review">
      <div class="review-head">
        <div class="review-avatar">${initial}</div>
        <div>
          <div class="review-name">${escapeHtml(r.name)}</div>
          <div class="review-date">${r.date}</div>
        </div>
      </div>
      <div class="review-text">${escapeHtml(r.text)}</div>
      ${photos ? `<div class="review-photos">${photos}</div>` : ""}
    </div>`;
  }).join("");
}

function escapeHtml(s){
  return (s||"").replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
}

function refreshPhotoPreview(){
  const pv = $("#photoPreview");
  pv.innerHTML = reviewPhotos.map((p,i)=>
    `<div class="pv-wrap">
      <img src="${p}" alt="">
      <button type="button" class="pv-rm" data-i="${i}" aria-label="remove">×</button>
    </div>`
  ).join("");
  pv.querySelectorAll(".pv-rm").forEach(b=>{
    b.onclick = ()=>{ reviewPhotos.splice(+b.dataset.i,1); refreshPhotoPreview(); };
  });
}

function handlePhotoFiles(files){
  const remaining = 4 - reviewPhotos.length;
  if(remaining<=0){ toast("Max 4"); return; }
  [...files].slice(0, remaining).forEach(file=>{
    if(!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (ev)=>{
      const img = new Image();
      img.onload = ()=>{
        const max = 900;
        const ratio = Math.min(max/img.width, max/img.height, 1);
        const w = img.width*ratio, h = img.height*ratio;
        const cv = document.createElement("canvas");
        cv.width = w; cv.height = h;
        cv.getContext("2d").drawImage(img, 0,0,w,h);
        const dataUrl = cv.toDataURL("image/jpeg", 0.78);
        reviewPhotos.push(dataUrl);
        refreshPhotoPreview();
      };
      img.onerror = ()=> toast("Ошибка фото");
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

async function submitReview(e){
  e.preventDefault();
  const name = $("#rName").value.trim();
  const text = $("#rText").value.trim();
  if(!name || !text){ toast(t("fill_required")); return; }

  const btn = e.target.querySelector("button[type=submit]");
  if(btn) btn.disabled = true;

  const today = new Date();
  const dd = today.toLocaleDateString(lang==="kz" ? "kk-KZ" : "ru-RU");
  const review = { name, text, photos:[...reviewPhotos], date: dd };

  // Supabase-ке жіберу (бар болса)
  if(sb){
    try{
      const { error } = await sb.from("reviews").insert([{
        name, text, photos: review.photos, published: true
      }]);
      if(error) throw error;
    } catch(err){
      console.error("Supabase error:", err);
      toast("Қате — жергілікті сақталды");
      // Fallback: localStorage-қа сақтаймыз
      const reviews = loadReviews();
      reviews.push(review);
      saveReviews(reviews);
    }
  } else {
    // Supabase жоқ — тек localStorage
    const reviews = loadReviews();
    reviews.push(review);
    saveReviews(reviews);
  }

  reviewPhotos = [];
  $("#rName").value=""; $("#rText").value="";
  $("#photoPreview").innerHTML = "";
  $("#photoCamera").value = "";
  $("#photoGallery").value = "";
  if(btn) btn.disabled = false;
  await renderReviewsAsync();
  toast(t("review_added"));
}

async function renderReviewsAsync(){
  // Supabase-тен әкелу + localStorage қосу
  const local = loadReviews();
  let pub = [];
  if(sb){
    try{
      const { data } = await sb.from("reviews")
        .select("*").eq("published", true)
        .order("created_at", { ascending: false }).limit(50);
      pub = (data||[]).map(r=> ({
        name: r.name, text: r.text, photos: r.photos||[],
        date: r.created_at ? new Date(r.created_at).toLocaleDateString(lang==="kz"?"kk-KZ":"ru-RU") : ""
      }));
    } catch(e){ console.warn("supabase load fail", e); }
  }
  const list = $("#reviewsList");
  // Жергіліктілер мен жарияланғандарды біріктіру (қайталанбасын деп қарапайым логика)
  const combined = [...pub, ...local.slice().reverse()];
  if(!combined.length){
    list.innerHTML = `<div class="cart-empty">${t("no_reviews")}</div>`;
    return;
  }
  list.innerHTML = combined.slice(0, 12).map(r=>{
    const initial = (r.name||"?").charAt(0).toUpperCase();
    const photos = (r.photos||[]).map(p=>`<img src="${p}" alt="">`).join("");
    return `<div class="review">
      <div class="review-head">
        <div class="review-avatar">${initial}</div>
        <div>
          <div class="review-name">${escapeHtml(r.name)}</div>
          <div class="review-date">${r.date}</div>
        </div>
      </div>
      <div class="review-text">${escapeHtml(r.text)}</div>
      ${photos ? `<div class="review-photos">${photos}</div>` : ""}
    </div>`;
  }).join("");
}

function setLang(l){
  lang = l;
  localStorage.setItem("dz_lang", l);
  applyI18n();
  renderCats();
  renderMenu();
  refreshCart();
  refreshFab();
  renderReviewsAsync();
}

// ===== Init =====
document.addEventListener("DOMContentLoaded", ()=>{
  applyI18n();
  renderCats();
  renderMenu();
  refreshCart();
  refreshFab();
  renderReviewsAsync();

  $$(".lang button").forEach(b=> b.onclick = ()=> setLang(b.dataset.lang));
  $("#openCart").onclick = openDrawer;
  $("#fab").onclick = openDrawer;
  $("#closeCart").onclick = closeDrawer;
  $("#drawerBg").onclick = closeDrawer;
  $("#btnCheckout").onclick = openOrder;
  $("#closeOrder").onclick = closeOrder;
  $("#orderBg").onclick = (e)=> { if(e.target.id==="orderBg") closeOrder(); };
  $("#orderForm").onsubmit = sendWhatsApp;
  $$("#deliveryToggle button").forEach(b=> b.onclick = ()=> setDeliveryType(b.dataset.type));
  setDeliveryType("pickup");

  const today = new Date();
  const iso = today.toISOString().slice(0,10);
  $("#fDate").value = iso;
  $("#fDate").min = iso;

  $("#reviewForm").onsubmit = submitReview;
  $("#photoCamera").onchange = (e)=> handlePhotoFiles(e.target.files);
  $("#photoGallery").onchange = (e)=> handlePhotoFiles(e.target.files);
  $("#btnCamera").onclick = ()=> $("#photoCamera").click();
  $("#btnGallery").onclick = ()=> $("#photoGallery").click();

  $("#heroCta").onclick = ()=> {
    const m = document.getElementById("menu");
    const top = m.getBoundingClientRect().top + window.scrollY - 130;
    window.scrollTo({top, behavior:"smooth"});
  };

  document.addEventListener("keydown", (e)=>{
    if(e.key==="Escape"){ closeDrawer(); closeOrder(); }
  });
});
