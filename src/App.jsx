import { useEffect, useMemo, useRef, useState } from "react";

const uid = () => Math.random().toString(36).slice(2, 10);
const today = () => new Date().toISOString().slice(0, 10);
const addDays = (iso, n) => { const d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const daysBetween = (a, b) => Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 86400000);
const PRIORITIES = ["URGENTE", "IMPORTANTE", "NORMAL", "BAJA"];
const STATES = ["Pendiente", "En progreso", "Bloqueada", "Completada"];
const CRM_STATES = ["Contactado", "Respondió", "Negociando", "Cerrado", "Descartado"];
const CATS = ["Productor", "Beatmaker", "Sello", "Medio", "DJ", "Influencer", "Fotógrafo", "Videógrafo", "Diseñador", "Booking", "Promotor", "Festival", "Manager", "Marca/Sponsor", "Otro"];

function useLocal(key, init) {
  const [v, setV] = useState(() => { try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : init; } catch { return init; } });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)); } catch {} }, [key, v]);
  return [v, setV];
}

export default function App() {
  const [db, setDb] = useLocal("dmos_v1", { role: null, artists: [], activeId: null, tasks: [], contacts: [], releases: [], chats: {} });
  const [tab, setTab] = useState("inicio");
  const up = patch => setDb(d => ({ ...d, ...(typeof patch === "function" ? patch(d) : patch) }));
  const artist = db.artists.find(a => a.id === db.activeId) || null;
  // Aislamiento: todo se filtra por artista activo
  const tasks = useMemo(() => db.tasks.filter(t => t.artistId === db.activeId), [db.tasks, db.activeId]);
  const contacts = useMemo(() => db.contacts.filter(c => c.artistId === db.activeId), [db.contacts, db.activeId]);
  const releases = useMemo(() => db.releases.filter(r => r.artistId === db.activeId), [db.releases, db.activeId]);

  if (!db.role) return <Onboarding up={up} />;
  const needsArtist = !artist;
  const nav = [["inicio", "Inicio"], ["artistas", "Artistas"], ["tareas", "Tareas"], ["calendario", "Calendario"], ["lanzamientos", "Lanzamientos"], ["crm", "CRM"], ["ia", "Chat IA"], ["mas", "Más"]];
  const ctx = { tasks, contacts, releases, artist, setTab, up, db };

  return (
    <div className="app">
      <header>
        <div className="logo">DF</div>
        <div className="brand"><b>DELYTEL</b><small>MANAGER OS</small></div>
        <button className="ghost sm" onClick={() => up({ role: db.role === "artista" ? "manager" : "artista" })}>
          Modo: {db.role === "artista" ? "Artista" : "Manager"}
        </button>
      </header>
      {db.role === "manager" && artist && (
        <div className="mut" style={{ marginBottom: 8 }}>Trabajando con: <b style={{ color: "#fff" }}>{artist.name}</b> · <a href="#" onClick={e => { e.preventDefault(); up({ activeId: null }); setTab("artistas"); }} style={{ color: "#6d7cff" }}>cambiar artista</a></div>
      )}
      {needsArtist && tab !== "artistas" && tab !== "mas" ? (
        <div className="card"><h2>¿Con qué artista estamos trabajando?</h2><p className="mut">Selecciona o crea un artista para continuar.</p><button onClick={() => setTab("artistas")}>Elegir artista</button></div>
      ) : (
        <>
          {tab === "inicio" && <Dashboard {...ctx} />}
          {tab === "artistas" && <Artists {...ctx} />}
          {tab === "tareas" && <Tasks {...ctx} />}
          {tab === "calendario" && <Calendar {...ctx} />}
          {tab === "lanzamientos" && <Releases {...ctx} />}
          {tab === "crm" && <CRM {...ctx} />}
          {tab === "ia" && <Chat {...ctx} />}
          {tab === "mas" && <More />}
        </>
      )}
      <nav>{nav.map(([k, l]) => <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>)}</nav>
    </div>
  );
}

function Onboarding({ up }) {
  const [name, setName] = useState("");
  const start = role => {
    if (role === "artista") {
      const id = uid();
      up({ role, artists: [{ id, name: name || "Mi proyecto", genre: "", city: "", country: "", goals: "", bio: "" }], activeId: id });
    } else up({ role });
  };
  return (
    <div className="app">
      <div className="hero"><h1>DELYTEL MANAGER OS</h1><p className="mut">El sistema operativo digital para la carrera del artista.</p></div>
      <div className="card">
        <h2>¿Cómo vas a usar la app?</h2>
        <form onSubmit={e => e.preventDefault()}>
          <input placeholder="Tu nombre artístico (si eres artista)" value={name} onChange={e => setName(e.target.value)} />
          <button onClick={() => start("artista")}>Soy artista · Manager virtual</button>
          <button className="ghost" onClick={() => start("manager")}>Soy manager · Gestiono artistas</button>
        </form>
        <p className="mut">Puedes cambiar de modo después.</p>
      </div>
    </div>
  );
}

function Dashboard({ artist, tasks, contacts, releases, setTab }) {
  const t0 = today();
  const open = tasks.filter(t => t.state !== "Completada");
  const hoy = open.filter(t => t.date && t.date <= t0).sort((a, b) => PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority));
  const nextRel = releases.filter(r => r.date >= t0).sort((a, b) => a.date.localeCompare(b.date));
  const alerts = [];
  open.filter(t => t.date && t.date < t0).forEach(t => alerts.push(`Tarea vencida: "${t.name}" (${t.date}).`));
  contacts.filter(c => !["Cerrado", "Descartado"].includes(c.state) && daysBetween(c.last, t0) >= 7).forEach(c => alerts.push(`${c.name} lleva ${daysBetween(c.last, t0)} días sin seguimiento. Pídele al Chat IA un mensaje.`));
  nextRel.forEach(r => { if (!tasks.some(t => t.releaseId === r.id)) alerts.push(`"${r.song}" no tiene plan de tareas. Genera el calendario en Lanzamientos.`); });
  return (
    <>
      <div className="hero"><h1>Hola {artist.name}</h1><p className="mut">Tu equipo digital para hacer crecer tu carrera.</p></div>
      <div className="grid" style={{ marginBottom: 12 }}>
        {[["Chat IA", "ia"], ["Calendario", "calendario"], ["Lanzamientos", "lanzamientos"], ["Contactos", "crm"]].map(([l, k]) => <button key={k} className="ghost" onClick={() => setTab(k)}>{l}</button>)}
      </div>
      {alerts.length > 0 && <div className="card"><h3>Detecté {alerts.length} cosa(s) para resolver</h3>{alerts.map((a, i) => <div className="alert" key={i} style={{ marginTop: 8 }}>{a}</div>)}</div>}
      <div className="card"><h2>Hoy · {t0}</h2>
        {hoy.length === 0 && <p className="mut">Sin tareas para hoy. Crea una en Tareas.</p>}
        {hoy.map(t => <div className="row" key={t.id}><div className="grow"><b>{t.name}</b><div className="mut">{t.state}</div></div><span className={"pill " + t.priority}>{t.priority}</span></div>)}
      </div>
      <div className="card"><h3>Próximos lanzamientos</h3>
        {nextRel.length === 0 && <p className="mut">Aún no hay lanzamientos.</p>}
        {nextRel.map(r => { const ts = tasks.filter(t => t.releaseId === r.id); const p = ts.length ? Math.round(100 * ts.filter(t => t.state === "Completada").length / ts.length) : 0;
          return <div className="row" key={r.id}><div className="grow"><b>{r.song}</b><div className="mut">{r.date} · faltan {daysBetween(t0, r.date)} días</div><div className="bar"><i style={{ width: p + "%" }} /></div></div><b>{p}%</b></div>; })}
      </div>
      <div className="card"><h3>Resumen</h3><div className="grid"><div className="row"><div><b>{open.length}</b><div className="mut">Tareas abiertas</div></div></div><div className="row"><div><b>{contacts.length}</b><div className="mut">Contactos</div></div></div><div className="row"><div><b>{releases.length}</b><div className="mut">Lanzamientos</div></div></div></div></div>
    </>
  );
}

function Artists({ db, up, setTab }) {
  const [f, setF] = useState({ name: "", genre: "", city: "", country: "Chile", goals: "", bio: "" });
  const isArtist = db.role === "artista";
  const add = e => { e.preventDefault(); if (!f.name.trim()) return; const id = uid(); up(d => ({ artists: [...d.artists, { id, ...f }], activeId: id })); setF({ ...f, name: "", genre: "", goals: "", bio: "" }); };
  const del = id => { if (!confirm("¿Eliminar artista y TODOS sus datos?")) return;
    up(d => ({ artists: d.artists.filter(a => a.id !== id), tasks: d.tasks.filter(t => t.artistId !== id), contacts: d.contacts.filter(c => c.artistId !== id), releases: d.releases.filter(r => r.artistId !== id), activeId: d.activeId === id ? null : d.activeId })); };
  const edit = (id, k, v) => up(d => ({ artists: d.artists.map(a => a.id === id ? { ...a, [k]: v } : a) }));
  return (
    <>
      <h2>{isArtist ? "Mi perfil" : "Mis artistas"}</h2>
      {db.artists.map(a => (
        <div className="card" key={a.id} style={a.id === db.activeId ? { borderColor: "#6d7cff" } : {}}>
          <div className="row" style={{ marginTop: 0 }}><div className="grow"><b>{a.name}</b><div className="mut">{[a.genre, a.city, a.country].filter(Boolean).join(" · ")}</div></div>
            {a.id !== db.activeId && <button className="sm" onClick={() => { up({ activeId: a.id }); setTab("inicio"); }}>Trabajar con él/ella</button>}
            {!isArtist && <button className="sm ghost" onClick={() => del(a.id)}>Eliminar</button>}</div>
          {a.id === db.activeId && <form style={{ marginTop: 8 }} onSubmit={e => e.preventDefault()}>
            {[["name", "Nombre artístico"], ["genre", "Género / estilo"], ["city", "Ciudad"], ["country", "País"]].map(([k, l]) => <input key={k} placeholder={l} value={a[k] || ""} onChange={e => edit(a.id, k, e.target.value)} />)}
            <textarea rows={2} placeholder="Objetivos" value={a.goals || ""} onChange={e => edit(a.id, "goals", e.target.value)} />
            <textarea rows={3} placeholder="Descripción del proyecto, referentes, público objetivo..." value={a.bio || ""} onChange={e => edit(a.id, "bio", e.target.value)} />
          </form>}
        </div>
      ))}
      {!isArtist && <div className="card"><h3>Agregar artista</h3><form onSubmit={add}>
        <input placeholder="Nombre artístico" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
        <input placeholder="Género" value={f.genre} onChange={e => setF({ ...f, genre: e.target.value })} />
        <input placeholder="Ciudad" value={f.city} onChange={e => setF({ ...f, city: e.target.value })} />
        <button>Agregar</button></form></div>}
    </>
  );
}

function Tasks({ db, up, tasks }) {
  const [f, setF] = useState({ name: "", date: today(), priority: "NORMAL", owner: "" });
  const [flt, setFlt] = useState("Abiertas");
  const add = e => { e.preventDefault(); if (!f.name.trim()) return; up(d => ({ tasks: [...d.tasks, { id: uid(), artistId: d.activeId, state: "Pendiente", ...f }] })); setF({ ...f, name: "" }); };
  const setT = (id, p) => up(d => ({ tasks: d.tasks.map(t => t.id === id ? { ...t, ...p } : t) }));
  const list = tasks.filter(t => flt === "Todas" || (flt === "Abiertas" ? t.state !== "Completada" : t.state === "Completada"))
    .sort((a, b) => PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority) || (a.date || "").localeCompare(b.date || ""));
  return (
    <>
      <h2>Tareas</h2>
      <form className="card" onSubmit={add}>
        <input placeholder="Nueva tarea (ej: Portada lista)" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
        <div className="grid"><input type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} />
          <select value={f.priority} onChange={e => setF({ ...f, priority: e.target.value })}>{PRIORITIES.map(p => <option key={p}>{p}</option>)}</select>
          <input placeholder="Responsable" value={f.owner} onChange={e => setF({ ...f, owner: e.target.value })} /></div>
        <button>Agregar tarea</button>
      </form>
      <div style={{ display: "flex", gap: 6 }}>{["Abiertas", "Completadas", "Todas"].map(x => <button key={x} className={"sm " + (flt === x ? "" : "ghost")} onClick={() => setFlt(x)}>{x}</button>)}</div>
      {list.map(t => (
        <div className="row" key={t.id}>
          <div className="grow"><b style={{ textDecoration: t.state === "Completada" ? "line-through" : "none" }}>{t.name}</b><div className="mut">{t.date} {t.owner && "· " + t.owner}</div></div>
          <select value={t.state} onChange={e => setT(t.id, { state: e.target.value })}>{STATES.map(s => <option key={s}>{s}</option>)}</select>
          <span className={"pill " + t.priority}>{t.priority}</span>
          <button className="sm ghost" aria-label="Eliminar" onClick={() => up(d => ({ tasks: d.tasks.filter(x => x.id !== t.id) }))}>✕</button>
        </div>
      ))}
    </>
  );
}

function Calendar({ tasks, releases }) {
  const ev = [...tasks.filter(t => t.date).map(t => ({ d: t.date, t: t.name, k: "Tarea · " + t.state })), ...releases.map(r => ({ d: r.date, t: "🚀 Lanzamiento: " + r.song, k: "Lanzamiento" }))].sort((a, b) => a.d.localeCompare(b.d));
  let last = "";
  return (<><h2>Calendario</h2>{ev.length === 0 && <p className="mut">Nada agendado todavía.</p>}
    {ev.map((e, i) => { const h = e.d !== last; last = e.d; return <div key={i}>{h && <h3 style={{ marginTop: 14 }}>{e.d}{e.d === today() ? " · HOY" : ""}</h3>}<div className="row"><div className="grow"><b>{e.t}</b><div className="mut">{e.k}</div></div></div></div>; })}</>);
}

const PLAN = [
  [-30, "NORMAL", ["Master final", "Portada", "Distribución (subir a distribuidora)", "Definir estrategia"]],
  [-21, "IMPORTANTE", ["Configurar pre-save", "Producir contenido"]],
  [-14, "IMPORTANTE", ["Teasers", "Plan de TikTok", "Plan de Reels"]],
  [-7, "URGENTE", ["Campaña fuerte", "Contactar influencers", "Enviar a prensa"]],
  [0, "URGENTE", ["Publicaciones del día", "Stories", "TikTok", "YouTube"]],
  [7, "NORMAL", ["Análisis de resultados", "Contenido post-lanzamiento", "Segunda campaña", "Seguimiento a contactos"]],
];
function Releases({ db, up, releases, tasks }) {
  const [f, setF] = useState({ song: "", date: addDays(today(), 30), genre: "", budget: "" });
  const add = e => { e.preventDefault(); if (!f.song.trim()) return; up(d => ({ releases: [...d.releases, { id: uid(), artistId: d.activeId, ...f }] })); setF({ ...f, song: "" }); };
  const gen = r => {
    const nt = [];
    PLAN.forEach(([off, priority, items]) => items.forEach(n => nt.push({ id: uid(), artistId: db.activeId, releaseId: r.id, name: `${r.song}: ${n}`, date: addDays(r.date, off), priority, state: "Pendiente", owner: "" })));
    up(d => ({ tasks: [...d.tasks, ...nt] }));
  };
  return (
    <>
      <h2>Release Manager</h2>
      <form className="card" onSubmit={add}>
        <input placeholder="Canción" value={f.song} onChange={e => setF({ ...f, song: e.target.value })} />
        <div className="grid"><input type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} />
          <input placeholder="Género" value={f.genre} onChange={e => setF({ ...f, genre: e.target.value })} />
          <input placeholder="Presupuesto" value={f.budget} onChange={e => setF({ ...f, budget: e.target.value })} /></div>
        <button>Crear lanzamiento</button>
      </form>
      {releases.map(r => { const has = tasks.some(t => t.releaseId === r.id); return (
        <div className="row" key={r.id}><div className="grow"><b>{r.song}</b><div className="mut">{r.date} · {r.genre} {r.budget && "· " + r.budget}</div></div>
          {!has && <button className="sm" onClick={() => gen(r)}>Generar plan (30→+7 días)</button>}
          <button className="sm ghost" onClick={() => up(d => ({ releases: d.releases.filter(x => x.id !== r.id), tasks: d.tasks.filter(t => t.releaseId !== r.id) }))}>✕</button></div>); })}
    </>
  );
}

function CRM({ db, up, contacts }) {
  const [f, setF] = useState({ name: "", category: CATS[0], company: "", instagram: "", email: "", whatsapp: "" });
  const add = e => { e.preventDefault(); if (!f.name.trim()) return; up(d => ({ contacts: [...d.contacts, { id: uid(), artistId: d.activeId, state: "Contactado", last: today(), notes: "", ...f }] })); setF({ ...f, name: "", company: "", instagram: "", email: "", whatsapp: "" }); };
  const set = (id, p) => up(d => ({ contacts: d.contacts.map(c => c.id === id ? { ...c, ...p } : c) }));
  return (
    <>
      <h2>CRM musical</h2>
      <form className="card" onSubmit={add}>
        <div className="grid"><input placeholder="Nombre" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
          <select value={f.category} onChange={e => setF({ ...f, category: e.target.value })}>{CATS.map(c => <option key={c}>{c}</option>)}</select>
          <input placeholder="Empresa" value={f.company} onChange={e => setF({ ...f, company: e.target.value })} />
          <input placeholder="Instagram" value={f.instagram} onChange={e => setF({ ...f, instagram: e.target.value })} />
          <input placeholder="Email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} />
          <input placeholder="WhatsApp" value={f.whatsapp} onChange={e => setF({ ...f, whatsapp: e.target.value })} /></div>
        <button>Agregar contacto</button>
      </form>
      {contacts.map(c => { const dias = daysBetween(c.last, today()); const stale = dias >= 7 && !["Cerrado", "Descartado"].includes(c.state);
        return <div className="row" key={c.id}><div className="grow"><b>{c.name}</b> <span className="mut">· {c.category} {c.company && "· " + c.company}</span>
          <div className="mut">Último contacto: {c.last} {stale && <b style={{ color: "#ffa23c" }}>· ⚠ {dias} días sin seguimiento</b>}</div></div>
          <select value={c.state} onChange={e => set(c.id, { state: e.target.value })}>{CRM_STATES.map(s => <option key={s}>{s}</option>)}</select>
          <button className="sm ghost" onClick={() => set(c.id, { last: today() })}>Contacté hoy</button>
          <button className="sm ghost" onClick={() => up(d => ({ contacts: d.contacts.filter(x => x.id !== c.id) }))}>✕</button></div>; })}
    </>
  );
}

function Chat({ db, up, artist, tasks, contacts, releases }) {
  const msgs = db.chats[artist.id] || [];
  const [txt, setTxt] = useState(""); const [busy, setBusy] = useState(false); const end = useRef();
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length, busy]);
  const save = m => up(d => ({ chats: { ...d.chats, [artist.id]: m } }));
  const send = async e => {
    e.preventDefault(); if (!txt.trim() || busy) return;
    const next = [...msgs, { role: "user", content: txt }]; save(next); setTxt(""); setBusy(true);
    const context = { hoy: today(), rol: db.role, artista: artist, tareas: tasks.filter(t => t.state !== "Completada").slice(0, 40), contactos: contacts.slice(0, 40), lanzamientos: releases };
    try {
      const r = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: next, context }) });
      const j = await r.json(); save([...next, { role: "assistant", content: r.ok ? j.text : "⚠ " + (j.error || "Error") }]);
    } catch { save([...next, { role: "assistant", content: "⚠ No pude conectar con el servidor." }]); }
    setBusy(false);
  };
  const toTask = c => up(d => ({ tasks: [...d.tasks, { id: uid(), artistId: artist.id, name: c.split("\n")[0].slice(0, 80), date: today(), priority: "NORMAL", state: "Pendiente", owner: "" }] }));
  return (
    <>
      <h2>AI Manager · {artist.name}</h2>
      {msgs.length === 0 && <p className="mut">Prueba: “Quiero lanzar una canción”, “¿Qué tenemos pendiente?” o “Prepara un mensaje de seguimiento”.</p>}
      {msgs.map((m, i) => <div key={i} className={"msg " + m.role}>{m.content}{m.role === "assistant" && <div><button className="sm ghost" onClick={() => toTask(m.content)}>+ Crear tarea</button></div>}</div>)}
      {busy && <div className="msg assistant">Pensando…</div>}<div ref={end} />
      <form onSubmit={send} style={{ gridTemplateColumns: "1fr auto", position: "sticky", bottom: 80 }}>
        <input value={txt} onChange={e => setTxt(e.target.value)} placeholder="Escribe a tu manager virtual…" /><button>Enviar</button></form>
    </>
  );
}

function More() {
  const items = ["Analytics", "Research con Internet", "Creative Studio", "File Center", "Music Legal (contratos y Split Sheets)", "Team", "Goals y KPI", "Opportunities", "Personal Care"];
  return (<><h2>Más módulos</h2><p className="mut">Planificados para las siguientes fases del plan maestro.</p>{items.map(i => <div className="row" key={i}><div className="grow">{i}</div><span className="pill NORMAL">PRÓXIMAMENTE</span></div>)}</>);
}
