// ===== Dailizza · Стоп-меню =====
// Стопқа қойылған тағамдар Supabase "stop_items" кестесінде сақталады.
// Бұл файлды негізгі сайт (index.html) та, админ бет (admin.html) те қолданады.

// Ескерту: осы Supabase жобасында otdoner клиентінің "stop_items" кестесі бар.
// Dailizza бөлек кестені қолданады — араласпауы үшін.
const STOP_TABLE = "dz_stop_items";

let sbStop = null;
if(typeof supabase !== "undefined" && typeof SUPABASE_URL !== "undefined" && SUPABASE_URL){
  sbStop = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// item_id -> until (ms) немесе null (қолмен қайта қосылады)
let STOP_MAP = new Map();

function stopSignature(map){
  return [...map.entries()].map(([k,v])=> k+":"+(v===null?"∞":v)).sort().join("|");
}

// Тағам қазір стопта ма?
function isStopped(id){
  if(!STOP_MAP.has(id)) return false;
  const until = STOP_MAP.get(id);
  if(until === null) return true;       // қолмен қойылған
  if(until > Date.now()) return true;   // уақыты әлі бітпеген
  STOP_MAP.delete(id);                  // уақыты бітті — өзі қайта қосылды
  return false;
}

// Стоп аяқталатын уақыт (ms) немесе null
function stopUntil(id){
  return STOP_MAP.has(id) ? STOP_MAP.get(id) : undefined;
}

// Supabase-тен стоп тізімін жүктеу. Өзгеріс болса true қайтарады.
async function loadStops(){
  if(!sbStop) return false;
  try{
    const { data, error } = await sbStop.from(STOP_TABLE).select("item_id, until");
    if(error) throw error;
    const next = new Map();
    (data||[]).forEach(r=>{
      const until = r.until ? new Date(r.until).getTime() : null;
      if(until !== null && until <= Date.now()) return; // уақыты өтіп кеткен
      next.set(r.item_id, until);
    });
    const changed = stopSignature(next) !== stopSignature(STOP_MAP);
    STOP_MAP = next;
    return changed;
  } catch(e){
    console.warn("stop load fail", e);
    return false;
  }
}

// ===== Админ жағы (логин талап етіледі) =====
async function setStop(id, untilMs){
  if(!sbStop) throw new Error("Supabase жоқ");
  const until = untilMs ? new Date(untilMs).toISOString() : null;
  const { error } = await sbStop.from(STOP_TABLE)
    .upsert({ item_id:id, until, updated_at:new Date().toISOString() }, { onConflict:"item_id" });
  if(error) throw error;
  STOP_MAP.set(id, untilMs || null);
}

async function clearStop(id){
  if(!sbStop) throw new Error("Supabase жоқ");
  const { error } = await sbStop.from(STOP_TABLE).delete().eq("item_id", id);
  if(error) throw error;
  STOP_MAP.delete(id);
}

// ===== Мәзірдің "стопқа қойылатын" бірліктері =====
// Әр карточка — бір блок, ішінде корзинаға қосылатын нақты id-лар.
function stopCatalog(lang="kz"){
  const cards = [];
  MENU.forEach(b=>{
    if(b.type === "item"){
      if(b.sizes && b.sizes.length){
        cards.push({
          cat: b.cat, img: b.img, title: b.name[lang],
          ids: b.sizes.map(s=>({
            id: b.id+"-"+s.label,
            name: b.name[lang]+" · "+s.label,
            price: s.price
          }))
        });
      } else {
        cards.push({
          cat: b.cat, img: b.img, title: b.name[lang],
          ids: [{ id:b.id, name:b.name[lang], price:b.price }]
        });
      }
    }
    if(b.type === "group" || b.type === "list"){
      cards.push({
        cat: b.cat, img: b.img || null, title: b.title[lang],
        ids: b.items.map(it=>({ id:it.id, name:it.name[lang], price:it.price }))
      });
    }
  });
  return cards;
}
