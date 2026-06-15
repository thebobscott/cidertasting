import { useState, useEffect, useCallback, useRef } from "react";

/* ─────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────── */
const POLL_MS = 3000;
// Categories are now host-configured and stored in shared storage as [{id, label, icon}]
// These defaults are only used as suggestions in the UI
const SUGGESTED_CATS = [
  { label: "Label",      icon: "🏷️" },
  { label: "Taste",      icon: "👅" },
  { label: "Smell",      icon: "👃" },
  { label: "Mouth Feel", icon: "💧" },
  { label: "Aftertaste", icon: "✨" },
];

/* ─────────────────────────────────────────
   STORAGE HELPERS
───────────────────────────────────────── */
async function sGet(key) {
  try { const r = await window.storage.get(key, true); return r ? JSON.parse(r.value) : null; }
  catch { return null; }
}
async function sSet(key, val) {
  try { await window.storage.set(key, JSON.stringify(val), true); } catch {}
}
async function sDelete(key) {
  try { await window.storage.delete(key, true); } catch {}
}

/* ─────────────────────────────────────────
   STYLES (injected once)
   Palette: Western Cider Co. — rust-red, espresso brown, warm parchment
───────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;600;700&family=Lora:ital,wght@0,400;0,600;1,400&family=Inter:wght@400;500;600;700&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --rust: #D94E2A;
  --rust-dk: #B03A18;
  --rust-lt: #F2D0C4;
  --brown: #2C1A0E;
  --brown-mid: #5C3820;
  --brown-lt: #8B6048;
  --parchment: #F5F0E8;
  --parchment-dk: #E8DFD0;
  --parchment-pale: #FAF7F2;
  --ink: #231A10;
  --muted: #8B7060;
  --border: #CEC0B0;
  --white: #FEFCFA;
  --radius: 10px;
}
body { background: var(--parchment); font-family: 'Inter', sans-serif; color: var(--ink); min-height: 100vh; }

/* ── HEADER ── */
.hdr { background: var(--rust); position: relative; overflow: hidden; padding: 0; }
.hdr-top-stripe { background: var(--rust); padding: 1.5rem 1.5rem 1.25rem; text-align: center; position: relative; z-index: 1; }
.hdr-rule { height: 3px; background: var(--brown); }
.hdr-rule-thin { height: 1px; background: rgba(0,0,0,.25); margin-top: 2px; }
.hdr-inner { position:relative;z-index:1; }
.hdr-layout { display:flex;align-items:center;justify-content:space-between;gap:1rem; }
.hdr-side { font-family:'Oswald',sans-serif;font-size:clamp(.7rem,2.5vw,1.05rem);font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--white);line-height:1.2;opacity:.92; }
.hdr-center { flex:1;text-align:center; }
.hdr-stamp { display:inline-block;border:3px solid var(--white);padding:.5rem 1.25rem;position:relative; }
.hdr-stamp::before,.hdr-stamp::after { content:'';position:absolute;top:3px;left:3px;right:3px;bottom:3px;border:1px solid rgba(255,255,255,.4); }
.hdr-eyebrow { font-family:'Oswald',sans-serif;font-size:.55rem;font-weight:400;letter-spacing:.25em;text-transform:uppercase;color:rgba(255,255,255,.8);margin-bottom:.2rem; }
.hdr-title { font-family:'Oswald',sans-serif;font-size:clamp(1.1rem,3.5vw,1.7rem);font-weight:700;color:var(--white);letter-spacing:.04em;text-transform:uppercase;line-height:1; }
.hdr-location { font-family:'Oswald',sans-serif;font-size:.55rem;font-weight:400;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.75);margin-top:.2rem; }
.hdr-badge { display:inline-flex;align-items:center;gap:.4rem;margin-top:.9rem;background:var(--brown);border:1px solid rgba(255,255,255,.15);border-radius:2px;padding:.3rem .9rem;font-family:'Oswald',sans-serif;font-size:.72rem;font-weight:600;color:var(--white);letter-spacing:.06em;text-transform:uppercase; }

/* ── MAIN ── */
.main { max-width:1100px;margin:0 auto;padding:1.75rem 1rem 3rem; }

/* ── CARDS ── */
.card { background:var(--white);border:2px solid var(--border);border-radius:var(--radius);padding:1.25rem 1.5rem;margin-bottom:1.25rem;box-shadow:0 1px 4px rgba(44,26,14,.06); }
.card-title { font-family:'Oswald',sans-serif;font-size:.68rem;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);margin-bottom:1rem;display:flex;align-items:center;gap:.4rem;border-bottom:1px solid var(--parchment-dk);padding-bottom:.6rem; }

/* ── LANDING ── */
.land-grid { display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-top:.5rem; }
@media(max-width:500px){ .land-grid{grid-template-columns:1fr;} }
.role-card { border:2px solid var(--border);border-radius:var(--radius);padding:1.5rem 1.25rem;text-align:center;cursor:pointer;transition:border-color .2s,box-shadow .2s,transform .1s;background:var(--parchment-pale); }
.role-card:hover { border-color:var(--brown-mid);box-shadow:0 4px 16px rgba(44,26,14,.14);transform:translateY(-2px); }
.role-card .role-icon { font-size:2.2rem;margin-bottom:.6rem; }
.role-card h3 { font-family:'Oswald',sans-serif;font-size:1.15rem;font-weight:700;color:var(--brown);margin-bottom:.35rem;letter-spacing:.04em;text-transform:uppercase; }
.role-card p { font-size:.78rem;color:var(--muted);line-height:1.5; }
.role-card.host { border-color:var(--rust);background:linear-gradient(135deg,#fdf0ec,var(--parchment-pale)); }
.role-card.host:hover { border-color:var(--rust-dk); }

/* ── TABS ── */
.tabs { display:flex;gap:0;border-bottom:2px solid var(--border);margin-bottom:1.5rem; }
.tab { padding:.55rem 1.1rem;font-family:'Oswald',sans-serif;font-size:.75rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;border:none;background:none;cursor:pointer;border-bottom:3px solid transparent;color:var(--muted);margin-bottom:-2px;transition:color .15s,border-color .15s; }
.tab.active { color:var(--rust);border-bottom-color:var(--rust); }
.tab:hover:not(.active) { color:var(--ink); }

/* ── FORMS ── */
.form-row { display:flex;gap:.6rem;flex-wrap:wrap;align-items:flex-end; }
.field { display:flex;flex-direction:column;gap:.28rem;flex:1;min-width:140px; }
.field label { font-family:'Oswald',sans-serif;font-size:.62rem;font-weight:600;text-transform:uppercase;letter-spacing:.1em;color:var(--muted); }
.field input { border:1.5px solid var(--border);border-radius:var(--radius);padding:.5rem .75rem;font-family:'Inter',sans-serif;font-size:.88rem;color:var(--ink);background:var(--parchment);outline:none;transition:border-color .2s,box-shadow .2s; }
.field input:focus { border-color:var(--rust);box-shadow:0 0 0 3px rgba(217,78,42,.12); }

/* ── BUTTONS ── */
.btn { border:none;border-radius:var(--radius);padding:.55rem 1.2rem;font-family:'Oswald',sans-serif;font-size:.8rem;font-weight:600;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;transition:background .2s,transform .1s;display:inline-flex;align-items:center;gap:.35rem;white-space:nowrap; }
.btn:active { transform:scale(.97); }
.btn-green { background:var(--brown);color:var(--white); }
.btn-green:hover { background:var(--brown-mid); }
.btn-gold { background:var(--rust);color:var(--white); }
.btn-gold:hover { background:var(--rust-dk); }
.btn-ghost { background:none;border:1.5px solid var(--border);color:var(--muted); }
.btn-ghost:hover { border-color:var(--rust);color:var(--rust); }
.btn-sm { padding:.35rem .75rem;font-size:.7rem; }
.btn-danger { background:var(--rust-lt);color:var(--rust-dk);border:1.5px solid #E0B0A0; }
.btn-danger:hover { background:var(--rust);color:white; }
.btn-full { width:100%;justify-content:center; }
.btn:disabled { opacity:.45;cursor:not-allowed;transform:none; }

/* ── CIDER LIST (host) ── */
.cider-chip { display:flex;align-items:center;justify-content:space-between;gap:.6rem;padding:.55rem .85rem;background:var(--parchment);border:1.5px solid var(--parchment-dk);border-left:4px solid var(--rust);border-radius:var(--radius);margin-bottom:.5rem; }
.cider-chip-name { font-family:'Oswald',sans-serif;font-weight:600;font-size:.9rem;color:var(--brown);letter-spacing:.03em;text-transform:uppercase; }
.cider-chip-brew { font-size:.72rem;color:var(--muted);font-family:'Lora',serif;font-style:italic; }
.remove-btn { background:none;border:none;cursor:pointer;color:#C0A898;font-size:.9rem;padding:.2rem .4rem;border-radius:6px;transition:color .15s,background .15s;line-height:1; }
.remove-btn:hover { color:var(--rust-dk);background:var(--rust-lt); }

/* ── TASTER LIST ── */
.taster-pill { display:inline-flex;align-items:center;gap:.35rem;background:var(--parchment-dk);border:1.5px solid var(--border);border-radius:2px;padding:.28rem .75rem;font-family:'Oswald',sans-serif;font-size:.72rem;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--brown);margin:.2rem; }
.taster-dot { width:7px;height:7px;border-radius:50%;background:var(--rust); }

/* ── TASTER SCORECARD ── */
.sc-wrap { overflow-x:auto;border-radius:var(--radius);box-shadow:0 2px 12px rgba(44,26,14,.10);border:2px solid var(--border); }
table { width:100%;border-collapse:collapse;background:var(--white);font-size:.82rem; }
thead tr { background:var(--brown);color:var(--white); }
th { padding:.8rem .65rem;text-align:center;font-family:'Oswald',sans-serif;font-size:.6rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;white-space:nowrap; }
th.cn { text-align:left;min-width:145px;padding-left:1.1rem; }
th.co { background:var(--rust); }
tbody tr { border-bottom:1px solid var(--parchment-dk);transition:background .12s; }
tbody tr:last-child { border-bottom:none; }
tbody tr:hover { background:var(--parchment-pale); }
td { padding:.65rem;text-align:center;vertical-align:middle; }
td.cn { text-align:left;padding-left:1.1rem;font-family:'Oswald',sans-serif;font-weight:600;font-size:.88rem;color:var(--brown);letter-spacing:.02em;text-transform:uppercase; }
td.cn small { display:block;font-family:'Inter',sans-serif;font-size:.6rem;font-weight:400;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);font-style:italic; }

/* ── RATING INPUT ── */
.ri input { width:48px;text-align:center;border:1.5px solid var(--border);border-radius:var(--radius);padding:.3rem;font-family:'Oswald',sans-serif;font-size:.95rem;font-weight:700;outline:none;transition:border-color .2s,background .2s;background:var(--parchment);-moz-appearance:textfield; }
.ri input::-webkit-inner-spin-button,.ri input::-webkit-outer-spin-button{-webkit-appearance:none}
.ri input:focus { border-color:var(--rust);box-shadow:0 0 0 3px rgba(217,78,42,.12); }
.rv-1 input,.rv-2 input{background:#F5E0DC;border-color:#D09088;color:#7A2010}
.rv-3 input,.rv-4 input{background:#F5EAD8;border-color:#C8A868;color:#6A4A10}
.rv-5 input,.rv-6 input{background:#F5F0D8;border-color:#C8C060;color:#5A5010}
.rv-7 input,.rv-8 input{background:#E8F0D8;border-color:#90B860;color:#385010}
.rv-9 input,.rv-10 input{background:#D8ECC8;border-color:#60A840;color:#1A4808}

/* ── OVERALL BADGE ── */
.ob { display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:50%;font-size:.95rem;font-weight:900;border:2.5px solid;font-family:'Oswald',sans-serif; }
.ob-empty{color:#C0B0A0;border-color:#C0B0A0;background:var(--parchment)}
.ob-low{color:#9A2A18;border-color:#9A2A18;background:#F5E0DC}
.ob-mlo{color:#9A6010;border-color:#9A6010;background:#F5EAD0}
.ob-mid{color:#807010;border-color:#807010;background:#F5F0D0}
.ob-mhi{color:#406010;border-color:#406010;background:#E8F0D0}
.ob-hi{color:#1A5008;border-color:#1A5008;background:#D8ECC8}

/* ── RESULTS ── */
.lb-row { display:flex;align-items:center;gap:.85rem;padding:.8rem 1rem;border-radius:var(--radius);margin-bottom:.6rem;background:var(--parchment-pale);border:1.5px solid var(--border);border-left:4px solid var(--parchment-dk);transition:border-left-color .15s,box-shadow .15s; }
.lb-row:hover { box-shadow:0 2px 10px rgba(44,26,14,.08);border-left-color:var(--rust); }
.lb-rank { font-family:'Oswald',sans-serif;font-size:1.5rem;font-weight:700;color:var(--brown-lt);width:32px;text-align:center;flex-shrink:0; }
.lb-rank.gold-rank { color:var(--rust); }
.lb-name { flex:1;min-width:0; }
.lb-name strong { display:block;font-family:'Oswald',sans-serif;font-size:.9rem;font-weight:700;color:var(--brown);letter-spacing:.03em;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
.lb-name span { font-size:.7rem;color:var(--muted);font-family:'Lora',serif;font-style:italic; }
.lb-bar-wrap { flex:1;min-width:80px;max-width:180px; }
.lb-bar-track { background:var(--parchment-dk);border-radius:6px;height:8px;overflow:hidden; }
.lb-bar-fill { height:100%;border-radius:6px;background:var(--rust);transition:width .4s; }
.lb-score { font-family:'Oswald',sans-serif;font-size:1.3rem;font-weight:700;color:var(--brown);width:40px;text-align:right; }

/* ── BREAKDOWN TABLE ── */
.bk-table { width:100%;border-collapse:collapse;font-size:.78rem; }
.bk-table th { padding:.5rem .65rem;text-align:center;background:var(--parchment-dk);font-family:'Oswald',sans-serif;font-size:.58rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);white-space:nowrap; }
.bk-table th:first-child { text-align:left;padding-left:1rem; }
.bk-table td { padding:.5rem .65rem;text-align:center;border-bottom:1px solid var(--parchment-dk);font-weight:500; }
.bk-table td:first-child { text-align:left;padding-left:1rem;font-family:'Oswald',sans-serif;font-weight:600;color:var(--brown);text-transform:uppercase;letter-spacing:.02em; }
.bk-table tr:last-child td { border-bottom:none; }

/* ── SUMMARY STRIP ── */
.sum-strip { display:flex;gap:.75rem;flex-wrap:wrap;margin-top:1.25rem; }
.sum-card { background:var(--white);border:2px solid var(--border);border-radius:var(--radius);padding:.9rem 1.1rem;flex:1;min-width:120px;text-align:center; }
.sum-card .sl { font-family:'Oswald',sans-serif;font-size:.58rem;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);margin-bottom:.25rem; }
.sum-card .sv { font-family:'Oswald',sans-serif;font-size:1.8rem;font-weight:700;color:var(--brown);line-height:1; }
.sum-card.gold-card { background:var(--rust);border-color:var(--rust-dk); }
.sum-card.gold-card .sl,.sum-card.gold-card .sv { color:var(--white); }
.sum-card .sv.sm-text { font-size:.88rem;padding-top:.2rem; }

/* ── TOAST ── */
.toast { position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%);background:var(--brown);color:var(--white);padding:.65rem 1.25rem;border-radius:var(--radius);font-family:'Oswald',sans-serif;font-size:.8rem;font-weight:600;letter-spacing:.06em;text-transform:uppercase;box-shadow:0 4px 20px rgba(0,0,0,.22);z-index:9999;pointer-events:none;animation:fadeup .25s ease; }
@keyframes fadeup { from{opacity:0;transform:translateX(-50%) translateY(8px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }

/* ── CATEGORY TAGS ── */
.cat-chip { display:inline-flex;align-items:center;gap:.4rem;background:var(--parchment);border:1.5px solid var(--border);border-radius:8px;padding:.3rem .7rem;font-family:'Oswald',sans-serif;font-size:.72rem;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--brown);margin:.2rem; }
.cat-chip .cat-remove { background:none;border:none;cursor:pointer;color:#C0A898;font-size:.8rem;margin-left:.1rem;line-height:1;padding:0 .1rem;transition:color .15s; }
.cat-chip .cat-remove:hover { color:var(--rust); }
.suggest-list { display:flex;flex-wrap:wrap;gap:.3rem;margin-top:.6rem; }
.suggest-btn { background:var(--parchment-dk);border:1.5px dashed var(--border);border-radius:8px;padding:.28rem .65rem;font-family:'Oswald',sans-serif;font-size:.68rem;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);cursor:pointer;transition:border-color .15s,color .15s; }
.suggest-btn:hover { border-color:var(--rust);color:var(--rust); }
.suggest-btn:disabled { opacity:.35;cursor:not-allowed; }
.setup-steps { display:flex;gap:.5rem;margin-bottom:1.25rem;flex-wrap:wrap; }
.step-badge { display:inline-flex;align-items:center;gap:.4rem;padding:.3rem .8rem;border-radius:20px;font-family:'Oswald',sans-serif;font-size:.65rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase; }
.step-badge.done { background:var(--parchment-dk);color:var(--brown-lt); }
.step-badge.active { background:var(--rust);color:var(--white); }
.step-badge.pending { background:var(--parchment);border:1.5px solid var(--border);color:var(--muted); }

/* ── MISC ── */
.empty { text-align:center;padding:2.5rem 1rem; }
.empty .ei { font-size:2.5rem;margin-bottom:.6rem; }
.empty h3 { font-family:'Oswald',sans-serif;font-size:1.1rem;color:var(--brown);margin-bottom:.3rem;text-transform:uppercase;letter-spacing:.04em; }
.empty p { font-size:.78rem;color:var(--muted); }
.divider { height:1.5px;background:var(--parchment-dk);margin:1.1rem 0; }
.info-box { background:var(--parchment);border:1.5px solid var(--parchment-dk);border-left:4px solid var(--brown-lt);border-radius:var(--radius);padding:.8rem 1rem;font-size:.8rem;color:var(--brown-mid);display:flex;gap:.5rem;align-items:flex-start;margin-bottom:1rem; }
.warn-box { background:#FDF3EC;border:1.5px solid #E8C0A0;border-left:4px solid var(--rust);border-radius:var(--radius);padding:.8rem 1rem;font-size:.8rem;color:var(--rust-dk);display:flex;gap:.5rem;align-items:flex-start;margin-bottom:1rem; }
.live-dot { display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--rust);animation:pulse 1.5s infinite; }
@keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.8)} }
`;

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
function uid() { return Math.random().toString(36).slice(2, 9); }

function overallScore(scores, ciderId, tasterId, categories) {
  const cats = categories || [];
  const vals = cats.map(c => scores[`${tasterId}_${ciderId}_${c.id}`]).filter(v => v != null && v !== "");
  if (!vals.length) return null;
  return (vals.reduce((a, b) => a + Number(b), 0) / vals.length).toFixed(1);
}

function obClass(score) {
  if (score == null) return "ob-empty";
  const n = parseFloat(score);
  if (n < 3) return "ob-low";
  if (n < 5) return "ob-mlo";
  if (n < 7) return "ob-mid";
  if (n < 9) return "ob-mhi";
  return "ob-hi";
}

function rvClass(val) {
  if (val == null || val === "") return "";
  const n = parseInt(val);
  if (isNaN(n)) return "";
  return `rv-${Math.min(10, Math.max(1, n))}`;
}

/* ─────────────────────────────────────────
   COMPONENTS
───────────────────────────────────────── */

function Header({ role, name }) {
  return (
    <header className="hdr">
      <div className="hdr-top-stripe">
        <div className="hdr-inner">
          <div className="hdr-layout">
            <div className="hdr-side">Easy<br/>Going</div>
            <div className="hdr-center">
              <div className="hdr-stamp">
                <p className="hdr-eyebrow">Tasting Scorecard</p>
                <h1 className="hdr-title">Hard Cider</h1>
                <p className="hdr-location">Summer Tasting</p>
              </div>
            </div>
            <div className="hdr-side">Hard<br/>Cider</div>
          </div>
          {role && (
            <div style={{textAlign:"center"}}>
              <span className="hdr-badge">
                {role === "host" ? "👑 Host" : "🍺 Taster"} · {name}
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="hdr-rule" />
      <div className="hdr-rule-thin" />
    </header>
  );
}

function Toast({ msg }) {
  if (!msg) return null;
  return <div className="toast">{msg}</div>;
}

/* ── LANDING ── */
function Landing({ onRole }) {
  return (
    <div className="main">
      <div className="card">
        <div className="card-title">🍺 Welcome — how are you joining?</div>
        <div className="land-grid">
          <div className="role-card host" onClick={() => onRole("host")}>
            <div className="role-icon">👑</div>
            <h3>I'm the Host</h3>
            <p>Set up the cider list, manage the session, and see everyone's results.</p>
          </div>
          <div className="role-card" onClick={() => onRole("taster")}>
            <div className="role-icon">🍺</div>
            <h3>I'm a Taster</h3>
            <p>Enter your name and score each cider on your own personal card.</p>
          </div>
        </div>
        <p style={{fontSize:'.72rem',color:'var(--muted)',marginTop:'.9rem',textAlign:'center',fontStyle:'italic'}}>
          All scores are shared in real time — everyone uses this same link.
        </p>
      </div>
    </div>
  );
}

/* ── TASTER JOIN ── */
function TasterJoin({ onJoin }) {
  const [name, setName] = useState("");
  const [err, setErr] = useState("");

  async function join() {
    const n = name.trim();
    if (!n) { setErr("Please enter your name."); return; }
    const ciders = await sGet("ciders") || [];
    if (!ciders.length) { setErr("The host hasn't added any ciders yet — check back soon!"); return; }
    const id = uid();
    const tasters = await sGet("tasters") || [];
    tasters.push({ id, name: n, joinedAt: Date.now() });
    await sSet("tasters", tasters);
    onJoin({ id, name: n });
  }

  return (
    <div className="main">
      <div className="card">
        <div className="card-title">🍺 Join the tasting</div>
        <div className="info-box">💡 The host has set up the ciders. Enter your name to get your scorecard.</div>
        <div className="form-row">
          <div className="field">
            <label>Your name</label>
            <input
              value={name}
              onChange={e => { setName(e.target.value); setErr(""); }}
              onKeyDown={e => e.key === "Enter" && join()}
              placeholder="e.g. Sarah"
              autoFocus
            />
          </div>
          <button className="btn btn-green" onClick={join}>Join Tasting →</button>
        </div>
        {err && <p style={{color:"var(--rust)",fontSize:".78rem",marginTop:".6rem"}}>{err}</p>}
      </div>
    </div>
  );
}

/* ── HOST VIEW ── */
function HostView({ hostName, onReset }) {
  const [tab, setTab] = useState("setup");
  const [categories, setCategories] = useState([]); // [{id, label, icon}]
  const [ciders, setCiders] = useState([]);
  const [tasters, setTasters] = useState([]);
  const [scores, setScores] = useState({});
  const [newCatLabel, setNewCatLabel] = useState("");
  const [newName, setNewName] = useState("");
  const [newBrew, setNewBrew] = useState("");
  const [locked, setLocked] = useState(false);
  const [toast, setToast] = useState("");
  const [hostTaster, setHostTaster] = useState(null);
  const pollRef = useRef(null);
  const catInputRef = useRef(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  async function joinAsTaster(currentTasters) {
    const existing = currentTasters || await sGet("tasters") || [];
    const alreadyIn = existing.find(t => t.id && t.id.startsWith("host_"));
    if (alreadyIn) { setHostTaster(alreadyIn); return alreadyIn; }
    const id = "host_" + uid();
    const entry = { id, name: hostName + " (Host)", joinedAt: Date.now() };
    const next = [...existing, entry];
    await sSet("tasters", next);
    setTasters(next);
    setHostTaster(entry);
    return entry;
  }

  const load = useCallback(async () => {
    const c = await sGet("ciders") || [];
    const t = await sGet("tasters") || [];
    const s = await sGet("scores") || {};
    const lk = await sGet("locked");
    const cats = await sGet("categories") || [];
    setCiders(c);
    setTasters(t);
    setScores(s);
    setLocked(!!lk);
    setCategories(cats);
    const ht = t.find(x => x.id && x.id.startsWith("host_"));
    if (ht) setHostTaster(ht);
  }, []);

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, POLL_MS);
    return () => clearInterval(pollRef.current);
  }, [load]);

  // ── Category management ──
  async function addCategory(label, icon) {
    const l = (label || newCatLabel).trim();
    if (!l) return;
    // prevent duplicate labels (case-insensitive)
    if (categories.some(c => c.label.toLowerCase() === l.toLowerCase())) {
      showToast("Category already exists");
      return;
    }
    const ICON_MAP = { "label":"🏷️","taste":"👅","smell":"👃","mouth":"💧","mouth feel":"💧","aftertaste":"✨","finish":"✨","aroma":"🌸","colour":"🎨","color":"🎨","carbonation":"🫧","sweetness":"🍬","bitterness":"😬","alcohol":"🔥","overall":"⭐" };
    const ic = icon || ICON_MAP[l.toLowerCase()] || "📝";
    const next = [...categories, { id: uid(), label: l, icon: ic }];
    await sSet("categories", next);
    setCategories(next);
    setNewCatLabel("");
    if (catInputRef.current) catInputRef.current.focus();
  }

  async function removeCategory(id) {
    const next = categories.filter(c => c.id !== id);
    await sSet("categories", next);
    setCategories(next);
  }

  // ── Cider management ──
  async function addCider() {
    const name = newName.trim();
    if (!name) return;
    const next = [...ciders, { id: uid(), name, brewery: newBrew.trim() }];
    await sSet("ciders", next);
    setCiders(next);
    setNewName(""); setNewBrew("");
    showToast(`"${name}" added`);
  }

  async function removeCider(id) {
    const next = ciders.filter(c => c.id !== id);
    await sSet("ciders", next);
    setCiders(next);
  }

  async function toggleLock() {
    const next = !locked;
    await sSet("locked", next);
    setLocked(next);
    showToast(next ? "🔒 Tasting locked — scores are in!" : "🔓 Tasting reopened");
  }

  async function resetSession() {
    if (!window.confirm("Reset everything? This clears all categories, ciders, tasters, and scores.")) return;
    await sDelete("categories"); await sDelete("ciders"); await sDelete("tasters");
    await sDelete("scores"); await sDelete("locked"); await sDelete("hostName");
    onReset();
  }

  /* Results calculations */
  function ciderAvg(ciderId) {
    if (!tasters.length) return null;
    const vals = tasters.map(t => overallScore(scores, ciderId, t.id, categories)).filter(v => v != null);
    if (!vals.length) return null;
    return (vals.reduce((a, b) => a + parseFloat(b), 0) / vals.length).toFixed(1);
  }

  const ranked = [...ciders].map(c => ({ ...c, avg: ciderAvg(c.id) }))
    .sort((a, b) => (parseFloat(b.avg) || 0) - (parseFloat(a.avg) || 0));

  const topCider = ranked[0];
  const allAvgs = ranked.map(c => parseFloat(c.avg)).filter(v => !isNaN(v));
  const groupAvg = allAvgs.length ? (allAvgs.reduce((a,b)=>a+b,0)/allAvgs.length).toFixed(1) : null;

  return (
    <div className="main">
      <Toast msg={toast} />
      <div className="tabs">
        {[["setup","🛠️ Setup"],["tasters","🍺 Tasters"],["scorecard","🍎 My Scores"],["results","📊 Results"]].map(([k,l])=>(
          <button key={k} className={`tab${tab===k?" active":""}`} onClick={()=>setTab(k)}>{l}</button>
        ))}
      </div>

      {/* ── SETUP TAB ── */}
      {tab === "setup" && (
        <>
          {locked && <div className="warn-box" style={{marginBottom:"1rem"}}>⚠️ Tasting is locked. Unlock it to make changes.</div>}

          {/* STEP 1: Categories */}
          <div className="card">
            <div className="card-title">
              <span style={{background:"var(--rust)",color:"white",borderRadius:"50%",width:"18px",height:"18px",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:".6rem",fontWeight:700,flexShrink:0}}>1</span>
              Define Scoring Categories
            </div>
            {categories.length > 0 && (
              <div style={{marginBottom:"1rem",display:"flex",flexWrap:"wrap",gap:".2rem"}}>
                {categories.map(cat => (
                  <span key={cat.id} className="cat-chip">
                    {cat.icon} {cat.label}
                    {!locked && <button className="cat-remove" onClick={()=>removeCategory(cat.id)} title="Remove">✕</button>}
                  </span>
                ))}
              </div>
            )}
            {!locked && (
              <>
                <div className="form-row">
                  <div className="field">
                    <label>Category Name</label>
                    <input
                      ref={catInputRef}
                      value={newCatLabel}
                      onChange={e=>setNewCatLabel(e.target.value)}
                      onKeyDown={e=>e.key==="Enter"&&addCategory()}
                      placeholder="e.g. Clarity, Balance, Finish…"
                    />
                  </div>
                  <button className="btn btn-green" onClick={()=>addCategory()}>＋ Add</button>
                </div>
                <div style={{marginTop:".75rem"}}>
                  <p style={{fontSize:".62rem",fontFamily:"'Oswald',sans-serif",letterSpacing:".1em",textTransform:"uppercase",color:"var(--muted)",marginBottom:".4rem"}}>Suggestions</p>
                  <div className="suggest-list">
                    {SUGGESTED_CATS.map(s => {
                      const used = categories.some(c => c.label.toLowerCase() === s.label.toLowerCase());
                      return (
                        <button key={s.label} className="suggest-btn" disabled={used || locked} onClick={()=>addCategory(s.label, s.icon)}>
                          {s.icon} {s.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
            {categories.length === 0 && <p style={{fontSize:".75rem",color:"var(--muted)",marginTop:".6rem",fontStyle:"italic"}}>Add at least one category before adding ciders.</p>}
          </div>

          {/* STEP 2: Ciders */}
          <div className="card" style={{opacity: categories.length===0?0.5:1, transition:"opacity .2s"}}>
            <div className="card-title">
              <span style={{background: categories.length>0?"var(--rust)":"var(--border)",color:"white",borderRadius:"50%",width:"18px",height:"18px",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:".6rem",fontWeight:700,flexShrink:0}}>2</span>
              Add Ciders
            </div>
            {!locked && (
              <div className="form-row" style={{marginBottom:"1rem"}}>
                <div className="field">
                  <label>Cider Name</label>
                  <input value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addCider()} placeholder="e.g. Hazy Summer Dry" disabled={locked||categories.length===0} />
                </div>
                <div className="field" style={{maxWidth:"200px"}}>
                  <label>Brewery / Producer</label>
                  <input value={newBrew} onChange={e=>setNewBrew(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addCider()} placeholder="e.g. Orchard House" disabled={locked||categories.length===0} />
                </div>
                <button className="btn btn-green" onClick={addCider} disabled={locked||categories.length===0}>＋ Add</button>
              </div>
            )}
            {ciders.length === 0
              ? <div className="empty" style={{padding:"1.5rem"}}><div className="ei" style={{fontSize:"1.8rem"}}>🍏</div><p>{categories.length===0?"Define categories first.":"No ciders added yet."}</p></div>
              : ciders.map(c => (
                  <div key={c.id} className="cider-chip">
                    <div>
                      <div className="cider-chip-name">{c.name}</div>
                      {c.brewery && <div className="cider-chip-brew">{c.brewery}</div>}
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:".4rem",flexShrink:0}}>
                      <span style={{fontSize:".65rem",color:"var(--muted)",fontStyle:"italic"}}>{categories.map(cat=>cat.icon).join(" ")}</span>
                      {!locked && <button className="remove-btn" onClick={()=>removeCider(c.id)}>✕</button>}
                    </div>
                  </div>
                ))
            }
            {ciders.length > 0 && categories.length > 0 && (
              <p style={{fontSize:".68rem",color:"var(--muted)",marginTop:".75rem",fontStyle:"italic"}}>
                Each cider will be scored on: {categories.map(c=>`${c.icon} ${c.label}`).join(" · ")}
              </p>
            )}
          </div>

          {/* STEP 3: Session control */}
          <div className="card" style={{opacity: ciders.length===0?0.5:1, transition:"opacity .2s"}}>
            <div className="card-title">
              <span style={{background: ciders.length>0?"var(--rust)":"var(--border)",color:"white",borderRadius:"50%",width:"18px",height:"18px",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:".6rem",fontWeight:700,flexShrink:0}}>3</span>
              Session Control
            </div>
            <div className="info-box">💡 Share this page link with tasters. When everyone's ready, lock the session to finalise scores.</div>
            <button className={`btn ${locked?"btn-ghost":"btn-gold"}`} onClick={toggleLock} disabled={ciders.length===0||categories.length===0}>
              {locked ? "🔓 Unlock Tasting" : "🔒 Lock Tasting"}
            </button>
          </div>

          <div className="card" style={{borderColor:"#E8C0A0",borderWidth:"2px"}}>
            <div className="card-title" style={{color:"var(--rust)"}}>⚠️ Danger Zone</div>
            <p style={{fontSize:".8rem",color:"var(--muted)",marginBottom:"1rem",lineHeight:"1.5"}}>
              This will permanently clear all categories, ciders, tasters, and scores and return everyone to the start screen. Only the host can do this.
            </p>
            <button className="btn btn-danger" onClick={resetSession}>↺ Clear Everything &amp; Start Fresh</button>
          </div>
        </>
      )}

      {/* ── TASTERS TAB ── */}
      {tab === "tasters" && (
        <div className="card">
          <div className="card-title">
            <span className="live-dot"></span> Live Taster List
            <span style={{marginLeft:"auto",fontSize:".7rem",color:"var(--muted)"}}>Updates every {POLL_MS/1000}s</span>
          </div>
          {tasters.length === 0
            ? <div className="empty"><div className="ei">👥</div><h3>No one's joined yet</h3><p>Share the link so tasters can join.</p></div>
            : <>
                <p style={{fontSize:".78rem",color:"var(--muted)",marginBottom:".75rem"}}>{tasters.length} taster{tasters.length!==1?"s":""} joined</p>
                <div>{tasters.map(t=>(
                  <div key={t.id} className="taster-pill"><span className="taster-dot"></span>{t.name}</div>
                ))}</div>
              </>
          }
          {tasters.length > 0 && ciders.length > 0 && (
            <>
              <div className="divider"/>
              <div className="card-title">Scoring progress</div>
              {ciders.map(c => {
                const done = tasters.filter(t => overallScore(scores, c.id, t.id) !== null).length;
                const pct = tasters.length ? Math.round(done/tasters.length*100) : 0;
                return (
                  <div key={c.id} style={{marginBottom:".6rem"}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:".75rem",marginBottom:".2rem"}}>
                      <span style={{fontWeight:600,color:"var(--green)"}}>{c.name}</span>
                      <span style={{color:"var(--muted)"}}>{done}/{tasters.length} scored</span>
                    </div>
                    <div className="lb-bar-track">
                      <div className="lb-bar-fill" style={{width:`${pct}%`}}></div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* ── MY SCORECARD TAB (host participates) ── */}
      {tab === "scorecard" && (
        <>
          {!hostTaster ? (
            <div className="card" style={{textAlign:"center",padding:"2rem"}}>
              <div style={{fontSize:"2rem",marginBottom:".75rem"}}>🍺</div>
              <h3 style={{fontFamily:"'Oswald',sans-serif",fontSize:"1rem",color:"var(--brown)",textTransform:"uppercase",letterSpacing:".04em",marginBottom:".5rem"}}>Join as a Taster</h3>
              <p style={{fontSize:".78rem",color:"var(--muted)",marginBottom:"1rem"}}>Add yourself to the scorecard and rate the ciders along with everyone else.</p>
              {ciders.length === 0
                ? <p style={{fontSize:".78rem",color:"var(--rust)"}}>Add some ciders in Setup first.</p>
                : <button className="btn btn-gold btn-full" style={{maxWidth:"240px",margin:"0 auto"}} onClick={()=>joinAsTaster(tasters)}>Join as {hostName}</button>
              }
            </div>
          ) : (
            <>
              {locked && <div className="warn-box" style={{marginBottom:"1rem"}}>🔒 Tasting is locked — scores are final.</div>}
              {ciders.length === 0
                ? <div className="card"><div className="empty"><div className="ei">🍏</div><h3>No ciders yet</h3><p>Add ciders in the Setup tab first.</p></div></div>
                : <div className="sc-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th className="cn">Cider</th>
                          {categories.map(cat=><th key={cat.id}>{cat.icon} {cat.label}</th>)}
                          <th className="co">Overall</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ciders.map((cider, idx) => {
                          const overall = overallScore(scores, cider.id, hostTaster.id, categories);
                          return (
                            <tr key={cider.id}>
                              <td className="cn">
                                <small>No. {idx+1}{cider.brewery?` · ${cider.brewery}`:""}</small>
                                {cider.name}
                              </td>
                              {categories.map(cat => {
                                const key = `${hostTaster.id}_${cider.id}_${cat.id}`;
                                const val = scores[key] ?? "";
                                return (
                                  <td key={cat.id} className={`ri ${rvClass(val)}`}>
                                    <input
                                      type="number" min="1" max="10"
                                      value={val}
                                      placeholder="—"
                                      disabled={locked}
                                      onInput={async e => {
                                        const k = `${hostTaster.id}_${cider.id}_${cat.id}`;
                                        let n = parseInt(e.target.value);
                                        const s = { ...scores };
                                        if (isNaN(n) || e.target.value === "") { s[k] = ""; }
                                        else { s[k] = Math.min(10, Math.max(1, n)); }
                                        setScores(s);
                                        await sSet("scores", s);
                                      }}
                                      onBlur={async e => {
                                        let n = parseInt(e.target.value);
                                        if (!isNaN(n)) {
                                          const k = `${hostTaster.id}_${cider.id}_${cat.id}`;
                                          const s = { ...scores };
                                          s[k] = Math.min(10, Math.max(1, n));
                                          setScores(s);
                                          await sSet("scores", s);
                                        }
                                      }}
                                    />
                                  </td>
                                );
                              })}
                              <td>
                                <span className={`ob ${obClass(overall)}`}>{overall ?? "—"}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
              }
              {ciders.length > 0 && (
                <p style={{fontSize:".7rem",color:"var(--muted)",marginTop:".75rem",textAlign:"center"}}>
                  Rate each cider 1–10 · Scores save automatically
                </p>
              )}
            </>
          )}
        </>
      )}

      {/* ── RESULTS TAB ── */}
      {tab === "results" && (
        <>
          {ciders.length === 0 || tasters.length === 0
            ? <div className="empty"><div className="ei">📊</div><h3>No results yet</h3><p>Add ciders and wait for tasters to score them.</p></div>
            : <>
                <div className="card">
                  <div className="card-title">🏆 Cider Leaderboard</div>
                  {ranked.map((c, i) => {
                    const pct = c.avg ? (parseFloat(c.avg)/10*100).toFixed(0) : 0;
                    return (
                      <div key={c.id} className="lb-row">
                        <div className={`lb-rank${i===0?" gold-rank":""}`}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":i+1}</div>
                        <div className="lb-name">
                          <strong>{c.name}</strong>
                          {c.brewery && <span>{c.brewery}</span>}
                        </div>
                        <div className="lb-bar-wrap">
                          <div className="lb-bar-track"><div className="lb-bar-fill" style={{width:`${pct}%`}}></div></div>
                        </div>
                        <div className="lb-score">{c.avg ?? "—"}</div>
                      </div>
                    );
                  })}
                </div>

                <div className="card" style={{overflowX:"auto"}}>
                  <div className="card-title">📋 Score Breakdown by Taster</div>
                  <table className="bk-table">
                    <thead>
                      <tr>
                        <th>Cider</th>
                        {tasters.map(t=><th key={t.id}>{t.name}</th>)}
                        <th>Avg</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ranked.map(c => (
                        <tr key={c.id}>
                          <td>{c.name}</td>
                          {tasters.map(t => {
                            const s = overallScore(scores, c.id, t.id);
                            return <td key={t.id} style={{fontFamily:"'Oswald',sans-serif",fontWeight:700,color:s?parseFloat(s)>=7?"#406010":parseFloat(s)<=4?"var(--rust)":"var(--ink)":"var(--muted)"}}>{s ?? "—"}</td>;
                          })}
                          <td style={{fontFamily:"'Oswald',sans-serif",fontWeight:900,color:"var(--brown)"}}>{c.avg ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="sum-strip">
                  <div className="sum-card"><div className="sl">Ciders</div><div className="sv">{ciders.length}</div></div>
                  <div className="sum-card"><div className="sl">Tasters</div><div className="sv">{tasters.length}</div></div>
                  <div className="sum-card"><div className="sl">Group Avg</div><div className="sv">{groupAvg ?? "—"}</div></div>
                  {topCider?.avg && <div className="sum-card gold-card"><div className="sl">🏆 Winner</div><div className="sv sm-text">{topCider.name}</div></div>}
                </div>
              </>
          }
        </>
      )}
    </div>
  );
}

/* ── TASTER SCORECARD VIEW ── */
function TasterView({ taster }) {
  const [ciders, setCiders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [scores, setScores] = useState({});
  const [locked, setLocked] = useState(false);
  const [tab, setTab] = useState("score");
  const [toast, setToast] = useState("");
  const pollRef = useRef(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2000); };

  const load = useCallback(async () => {
    const c = await sGet("ciders") || [];
    const s = await sGet("scores") || {};
    const lk = await sGet("locked");
    const cats = await sGet("categories") || [];
    setCiders(c);
    setScores(s);
    setLocked(!!lk);
    setCategories(cats);
  }, []);

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, POLL_MS);
    return () => clearInterval(pollRef.current);
  }, [load]);

  async function updateScore(ciderId, catId, val) {
    const key = `${taster.id}_${ciderId}_${catId}`;
    let n = parseInt(val);
    const s = { ...scores };
    if (isNaN(n) || val === "") { s[key] = ""; }
    else { s[key] = Math.min(10, Math.max(1, n)); }
    setScores(s);
    await sSet("scores", s);
  }

  /* Results */
  const [allTasters, setAllTasters] = useState([]);
  const [allScores, setAllScores] = useState({});
  useEffect(() => {
    if (tab === "results") {
      (async () => {
        const t = await sGet("tasters") || [];
        const s = await sGet("scores") || {};
        setAllTasters(t); setAllScores(s);
      })();
    }
  }, [tab, categories]);

  function ciderAvg(ciderId) {
    const vals = allTasters.map(t => overallScore(allScores, ciderId, t.id, categories)).filter(v=>v!=null);
    if (!vals.length) return null;
    return (vals.reduce((a,b)=>a+parseFloat(b),0)/vals.length).toFixed(1);
  }

  const ranked = [...ciders].map(c=>({...c,avg:ciderAvg(c.id)})).sort((a,b)=>(parseFloat(b.avg)||0)-(parseFloat(a.avg)||0));

  return (
    <div className="main">
      <Toast msg={toast} />
      <div className="tabs">
        <button className={`tab${tab==="score"?" active":""}`} onClick={()=>setTab("score")}>🍎 My Scores</button>
        <button className={`tab${tab==="results"?" active":""}`} onClick={()=>setTab("results")}>📊 Results</button>
      </div>

      {tab === "score" && (
        <>
          {locked && <div className="warn-box" style={{marginBottom:"1rem"}}>🔒 The host has locked the tasting. Scores are final!</div>}
          {ciders.length === 0
            ? <div className="card"><div className="empty"><div className="ei">⏳</div><h3>Waiting for ciders…</h3><p>The host hasn't set up the tasting yet.</p></div></div>
            : <div className="sc-wrap">
                <table>
                  <thead>
                    <tr>
                      <th className="cn">Cider</th>
                      {categories.map(cat=><th key={cat.id}>{cat.icon} {cat.label}</th>)}
                      <th className="co">Overall</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ciders.map((cider, idx) => {
                      const overall = overallScore(scores, cider.id, taster.id, categories);
                      return (
                        <tr key={cider.id}>
                          <td className="cn">
                            <small>No. {idx+1}{cider.brewery?` · ${cider.brewery}`:""}</small>
                            {cider.name}
                          </td>
                          {categories.map(cat => {
                            const key = `${taster.id}_${cider.id}_${cat.id}`;
                            const val = scores[key] ?? "";
                            return (
                              <td key={cat.id} className={`ri ${rvClass(val)}`}>
                                <input
                                  type="number" min="1" max="10"
                                  value={val}
                                  placeholder="—"
                                  disabled={locked}
                                  onInput={e => updateScore(cider.id, cat.id, e.target.value)}
                                  onBlur={e => {
                                    let n = parseInt(e.target.value);
                                    if (!isNaN(n)) updateScore(cider.id, cat.id, Math.min(10,Math.max(1,n)));
                                  }}
                                />
                              </td>
                            );
                          })}
                          <td>
                            <span className={`ob ${obClass(overall)}`}>{overall ?? "—"}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
          }
          {ciders.length > 0 && (
            <p style={{fontSize:".7rem",color:"var(--muted)",marginTop:".75rem",textAlign:"center"}}>
              Rate each cider 1–10 · Scores save automatically
            </p>
          )}
        </>
      )}

      {tab === "results" && (
        <>
          {ranked.length === 0
            ? <div className="card"><div className="empty"><div className="ei">📊</div><p>No scores yet.</p></div></div>
            : <div className="card">
                <div className="card-title">🏆 Group Leaderboard</div>
                {ranked.map((c,i)=>{
                  const pct = c.avg?(parseFloat(c.avg)/10*100).toFixed(0):0;
                  const myScore = overallScore(scores,c.id,taster.id);
                  return (
                    <div key={c.id} className="lb-row">
                      <div className={`lb-rank${i===0?" gold-rank":""}`}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":i+1}</div>
                      <div className="lb-name">
                        <strong>{c.name}</strong>
                        {c.brewery&&<span>{c.brewery}</span>}
                      </div>
                      <div style={{fontSize:".65rem",color:"var(--muted)",whiteSpace:"nowrap"}}>
                        {myScore ? `You: ${myScore}` : "—"}
                      </div>
                      <div className="lb-bar-wrap">
                        <div className="lb-bar-track"><div className="lb-bar-fill" style={{width:`${pct}%`}}></div></div>
                      </div>
                      <div className="lb-score">{c.avg??"—"}</div>
                    </div>
                  );
                })}
              </div>
          }
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   APP ROOT
───────────────────────────────────────── */
export default function App() {
  const [view, setView] = useState("loading"); // loading | landing | host | taster-join | taster
  const [role, setRole] = useState(null);
  const [myName, setMyName] = useState("");
  const [tasterInfo, setTasterInfo] = useState(null);

  useEffect(() => {
    const styleEl = document.createElement("style");
    styleEl.textContent = CSS;
    document.head.appendChild(styleEl);
    return () => document.head.removeChild(styleEl);
  }, []);

  useEffect(() => {
    // Start at landing
    setView("landing");
  }, []);

  function pickRole(r) {
    setRole(r);
    if (r === "host") {
      const n = window.prompt("Enter your name as Host:", "") || "Host";
      setMyName(n);
      sSet("hostName", n);
      setView("host");
    } else {
      setView("taster-join");
    }
  }

  function handleTasterJoin(info) {
    setTasterInfo(info);
    setMyName(info.name);
    setRole("taster");
    setView("taster");
  }

  function handleReset() {
    setView("landing");
    setRole(null);
    setMyName("");
    setTasterInfo(null);
  }

  if (view === "loading") return <Header />;

  return (
    <>
      <Header role={role} name={myName} />
      {view === "landing"     && <Landing onRole={pickRole} />}
      {view === "host"        && <HostView hostName={myName} onReset={handleReset} />}
      {view === "taster-join" && <TasterJoin onJoin={handleTasterJoin} />}
      {view === "taster"      && tasterInfo && <TasterView taster={tasterInfo} />}
      <footer style={{background:"var(--brown)",textAlign:"center",padding:"1.5rem",fontSize:".68rem",color:"rgba(255,255,255,.5)",fontFamily:"'Oswald',sans-serif",letterSpacing:".14em",textTransform:"uppercase"}}>
        Fermented &amp; Enjoyed · Hard Cider Tasting Scorecard
      </footer>
    </>
  );
}
