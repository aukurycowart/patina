/*
  VAULT — UI Prototype v0.1
  ─────────────────────────
  Single-file interactive reference build for the Vault spec (movies · shows · books · games).
  Mock data, in-memory state only. Toggle "Spec IDs" in the sidebar to overlay requirement
  annotations (LIB-/LOG-/SRCH-/LST-/STAT-/NAV-) on the relevant UI.

  Divergences from the real build: no persistence, generated CSS covers instead of provider
  art, markdown reviews rendered as plain text, search hits a mock in-memory provider.
*/

import { useState, useEffect, useMemo, useRef, createContext, useContext } from "react";
import {
  Home as HomeIcon, LayoutGrid, CalendarDays, List as ListIcon, BarChart3,
  Search, Star, Plus, Check, X, ChevronLeft, Film, Tv, BookOpen, Gamepad2,
  Heart, Repeat, Clock, Table as TableIcon, ArrowUp, ArrowDown, Tag as TagIcon,
  ListOrdered, Trash2, RefreshCw, Eye,
} from "lucide-react";

/* ───────────────────────────── design system ───────────────────────────── */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

:root{
  --bg:#101014; --surface:#17171D; --surface2:#1F1F27; --border:#2A2A33;
  --text:#E8E6E3; --dim:#8E8C95; --accent:#E0B458; --accent-soft:rgba(224,180,88,.12);
  --serif:'Fraunces',Georgia,'Times New Roman',serif;
  --ui:'Inter',system-ui,-apple-system,'Segoe UI',sans-serif;
  --mono:'JetBrains Mono',ui-monospace,'SF Mono',Menlo,monospace;
}
*,*::before,*::after{box-sizing:border-box}
.vault{min-height:100vh;display:flex;color:var(--text);font-family:var(--ui);font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased;background:radial-gradient(1100px 520px at 80% -12%,rgba(224,180,88,.05),transparent 60%),var(--bg)}
.vault ::selection{background:rgba(224,180,88,.28)}
.vault :focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:4px}
.vault button{font-family:inherit;color:inherit}
.vault input,.vault select,.vault textarea{font-family:inherit}
.vault h1,.vault h2,.vault p{margin:0}
.serif{font-family:var(--serif)}
.mono{font-family:var(--mono)}
.dimtxt{color:var(--dim)}
.vault ::-webkit-scrollbar{width:10px;height:10px}
.vault ::-webkit-scrollbar-thumb{background:#2A2A33;border-radius:99px;border:2px solid var(--bg)}
.vault ::-webkit-scrollbar-track{background:transparent}

/* buttons */
.btn{display:inline-flex;align-items:center;gap:7px;padding:8px 14px;border-radius:8px;border:1px solid var(--border);background:var(--surface2);color:var(--text);font-size:13px;font-weight:500;cursor:pointer;white-space:nowrap;transition:border-color .15s,background .15s,transform .05s}
.btn:hover{border-color:#3A3A45;background:#24242E}
.btn:active{transform:translateY(1px)}
.btn-accent{background:var(--accent);border-color:var(--accent);color:#171712;font-weight:600}
.btn-accent:hover{background:#E9C26F;border-color:#E9C26F}
.btn-ghost{background:transparent;border-color:transparent;color:var(--dim)}
.btn-ghost:hover{color:var(--text);background:var(--surface2);border-color:transparent}
.btn-sm{padding:5px 10px;font-size:12px;border-radius:7px}
.iconbtn{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;flex-shrink:0;border-radius:8px;border:1px solid var(--border);background:var(--surface2);color:var(--dim);cursor:pointer;transition:color .15s,border-color .15s}
.iconbtn:hover{color:var(--text);border-color:#3A3A45}
.iconbtn.on{color:var(--accent);border-color:rgba(224,180,88,.45);background:var(--accent-soft)}

/* fields */
.field{padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:13px;min-width:0;color-scheme:dark}
.field:focus{outline:none;border-color:rgba(224,180,88,.55)}
textarea.field{resize:vertical;min-height:84px;line-height:1.55}
select.field{appearance:none;-webkit-appearance:none;padding-right:30px;cursor:pointer;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path d='M1 1l4 4 4-4' stroke='%238E8C95' stroke-width='1.5' fill='none' stroke-linecap='round'/></svg>");background-repeat:no-repeat;background-position:right 10px center}
select.field option,select.pillsel option{background:#1F1F27;color:#E8E6E3;text-transform:none;letter-spacing:0}
.lab{display:flex;align-items:center;gap:8px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--dim);margin-bottom:6px;font-weight:600}

/* pills · chips · annotations */
.pill{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:999px;font-size:10.5px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;border:1px solid;white-space:nowrap}
.pillsel{appearance:none;-webkit-appearance:none;border-radius:999px;padding:3px 22px 3px 10px;font-size:10.5px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;border:1px solid;cursor:pointer;background-color:transparent;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='8' height='5' viewBox='0 0 8 5'><path d='M1 1l3 3 3-3' stroke='%238E8C95' stroke-width='1.4' fill='none' stroke-linecap='round'/></svg>");background-repeat:no-repeat;background-position:right 8px center}
.chip{display:inline-flex;align-items:center;gap:6px;padding:5px 11px;border-radius:999px;border:1px solid var(--border);background:transparent;color:var(--dim);font-size:12px;font-weight:500;cursor:pointer;white-space:nowrap;transition:color .15s,border-color .15s,background .15s}
.chip:hover{color:var(--text);border-color:#3A3A45}
.chip.on{color:var(--accent);border-color:rgba(224,180,88,.5);background:var(--accent-soft)}
.chip .ct{font-family:var(--mono);font-size:10px;opacity:.75}
.anno{display:inline-flex;align-items:center;padding:1px 7px;border-radius:5px;border:1px dashed rgba(224,180,88,.5);background:rgba(224,180,88,.08);color:var(--accent);font-family:var(--mono);font-size:10px;font-weight:400;letter-spacing:.04em;text-transform:none;vertical-align:middle;white-space:nowrap}

/* sidebar */
.side{width:212px;flex-shrink:0;border-right:1px solid var(--border);background:rgba(13,13,17,.55);padding:22px 14px 16px;display:flex;flex-direction:column;gap:3px;position:sticky;top:0;height:100vh}
.wordmark{font-family:var(--serif);font-size:21px;letter-spacing:.34em;font-weight:500;padding:2px 10px 20px;user-select:none}
.wordmark b{color:var(--accent);font-weight:600}
.navbtn{display:flex;align-items:center;gap:11px;width:100%;padding:9px 11px;border-radius:9px;border:none;background:transparent;color:var(--dim);font-size:13.5px;font-weight:500;cursor:pointer;position:relative;text-align:left;transition:color .15s,background .15s}
.navbtn:hover{color:var(--text);background:var(--surface)}
.navbtn.on{color:var(--text);background:var(--surface2)}
.navbtn.on::before{content:'';position:absolute;left:0;top:9px;bottom:9px;width:2.5px;border-radius:2px;background:var(--accent)}
.navbtn .ct{margin-left:auto;font-family:var(--mono);font-size:10.5px;color:var(--dim);background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:1px 6px}
.sidefoot{margin-top:auto;display:flex;flex-direction:column;gap:12px;padding:14px 10px 2px;border-top:1px solid var(--border)}
.sidefoot .ver{font-family:var(--mono);font-size:9.5px;color:var(--dim);letter-spacing:.08em}

/* page scaffolding */
.main{flex:1;min-width:0}
.page{max-width:1240px;margin:0 auto;padding:34px 38px 90px}
.pagehead{margin-bottom:24px}
.pagehead h1{font-family:var(--serif);font-size:28px;font-weight:500;letter-spacing:.01em;display:flex;align-items:center;gap:10px}
.pagehead .sub{color:var(--dim);font-size:13px;margin-top:4px}
.sect{display:flex;align-items:center;gap:10px;margin:30px 0 14px;font-size:11.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--dim);font-weight:600}
.sect::after{content:'';flex:1;height:1px;background:var(--border)}

/* toolbar + tag rows */
.toolbar{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-bottom:14px}
.tagrow{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-bottom:18px}

/* poster grid */
.pgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(148px,1fr));gap:18px 16px}
.pcard{position:relative;border-radius:10px;cursor:pointer;outline-offset:3px;transition:transform .18s ease}
.pcard:hover{transform:translateY(-3px)}
.pcard .ov{position:absolute;inset:0;border-radius:10px;background:linear-gradient(180deg,rgba(10,10,14,.55) 0%,rgba(10,10,14,0) 34%,rgba(10,10,14,0) 46%,rgba(10,10,14,.88) 100%);opacity:0;transition:opacity .18s ease;display:flex;flex-direction:column;justify-content:space-between;padding:9px}
.pcard:hover .ov,.pcard:focus-within .ov,.pcard:focus-visible .ov{opacity:1}
.ovtop{display:flex;justify-content:flex-start}
.ovtitle{font-family:var(--serif);font-size:14.5px;line-height:1.25;margin-bottom:3px}
.ovmeta{display:flex;align-items:center;gap:8px;font-family:var(--mono);font-size:10.5px;color:#C9C7CE;margin-bottom:8px}
.ovactions{display:flex;align-items:center;gap:7px}
.favdot{position:absolute;top:8px;right:8px;color:var(--accent);filter:drop-shadow(0 1px 4px rgba(0,0,0,.7));z-index:2}

/* generated covers */
.cover{display:block;position:relative;width:100%;aspect-ratio:2/3;border-radius:10px;overflow:hidden;background:var(--surface2)}
.cover .vig{position:absolute;inset:0;background:radial-gradient(120% 90% at 50% 18%,rgba(255,255,255,.10),transparent 52%),linear-gradient(180deg,rgba(0,0,0,.06),rgba(0,0,0,.42) 88%)}
.cover .ttl{position:absolute;left:10px;right:10px;bottom:10px;font-family:var(--serif);font-weight:500;font-size:15px;line-height:1.18;letter-spacing:.045em;text-transform:uppercase;color:rgba(255,255,255,.94);text-shadow:0 1px 8px rgba(0,0,0,.55)}
.cover .yr{position:absolute;top:9px;left:10px;font-family:var(--mono);font-size:9.5px;letter-spacing:.12em;color:rgba(255,255,255,.66)}
.cover.scan::after{content:'';position:absolute;inset:0;background:repeating-linear-gradient(180deg,rgba(255,255,255,.045) 0 1px,transparent 1px 4px);mix-blend-mode:overlay;pointer-events:none}
.cover.slash::before{content:'';position:absolute;inset:-30%;background:linear-gradient(115deg,transparent 42%,rgba(255,255,255,.10) 46%,transparent 52%);pointer-events:none}
.cover.book{background:var(--surface);padding:11%}
.cover.book .jacket{position:relative;display:block;width:100%;height:100%;border-radius:3px;overflow:hidden;box-shadow:0 6px 18px rgba(0,0,0,.5)}
.cover.book .spine{position:absolute;left:7%;top:0;bottom:0;width:1.5px;background:rgba(0,0,0,.35)}
.cover.book .jt{position:absolute;left:14%;right:9%;top:13%;font-family:var(--serif);font-size:13.5px;line-height:1.22;letter-spacing:.02em;color:rgba(255,255,255,.93)}
.cover.book .ja{position:absolute;left:14%;right:9%;bottom:10%;font-family:var(--mono);font-size:8.5px;letter-spacing:.13em;text-transform:uppercase;color:rgba(255,255,255,.62)}
.cover.mini{border-radius:6px;border:1px solid var(--border)}
.cover .ini{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:var(--serif);font-size:17px;color:rgba(255,255,255,.85)}

/* detail hero */
.dhero{position:relative;margin:-34px -38px 30px;padding:26px 38px 30px;overflow:hidden}
.dhero .bgfx{position:absolute;inset:0;opacity:.85;pointer-events:none}
.dhero .backbtn{position:relative;margin-bottom:46px}
.dhero .row{position:relative;display:flex;gap:28px;align-items:flex-end}
.posterlg{width:198px;flex-shrink:0;box-shadow:0 18px 44px rgba(0,0,0,.55);border-radius:12px}
.posterlg .cover{border-radius:12px}
.dtitle{font-family:var(--serif);font-size:40px;font-weight:500;line-height:1.05;letter-spacing:.005em;margin:6px 0 10px}
.dmeta{display:flex;align-items:center;flex-wrap:wrap;gap:7px;font-family:var(--mono);font-size:11.5px;color:#C5C3CA}
.dmeta .sep{opacity:.45}
.actrow{display:flex;align-items:flex-end;gap:16px;flex-wrap:wrap;margin:4px 0 8px}

/* progress */
.progrow{display:flex;align-items:center;gap:12px;max-width:560px}
.proglab{font-family:var(--mono);font-size:11px;color:var(--dim);white-space:nowrap}
.pgnum{width:74px;text-align:right;font-family:var(--mono)}
.bar{flex:1;height:6px;border-radius:4px;background:var(--surface2);overflow:hidden;min-width:60px}
.bar i{display:block;height:100%;border-radius:4px;background:linear-gradient(90deg,#C29A3F,var(--accent))}

/* log history cards */
.histcard{background:var(--surface);border:1px solid var(--border);border-radius:11px;padding:13px 15px;margin-bottom:10px}
.histhead{display:flex;align-items:center;gap:9px;flex-wrap:wrap;font-family:var(--mono);font-size:11px;color:var(--dim)}
.histbody{margin-top:9px;font-size:13.5px;line-height:1.55;color:#CFCDD4;max-width:72ch}
.histnote{margin-top:8px;font-family:var(--mono);font-size:11.5px;color:var(--dim)}

/* diary timeline */
.tlrow{position:relative;display:flex;gap:16px;padding:5px 0 13px}
.tlrow::before{content:'';position:absolute;left:27px;top:0;bottom:0;width:1px;background:var(--border)}
.datebox{position:relative;z-index:1;width:54px;flex-shrink:0;text-align:center;background:var(--bg);align-self:flex-start;padding:3px 0 6px}
.datebox .d{font-family:var(--mono);font-size:16px;color:var(--text)}
.datebox .m{font-family:var(--mono);font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:var(--dim)}
.tlcard{flex:1;min-width:0;display:flex;gap:12px;background:var(--surface);border:1px solid var(--border);border-radius:11px;padding:11px 13px;cursor:pointer;transition:transform .15s,border-color .15s}
.tlcard:hover{transform:translateX(2px);border-color:#3A3A45}
.tlthumb{width:44px;flex-shrink:0}
.tlt{display:flex;align-items:center;gap:7px;font-family:var(--serif);font-size:15px}
.tlmeta{display:flex;align-items:center;gap:9px;margin:3px 0 5px;font-family:var(--mono);font-size:10.5px;color:var(--dim)}
.clamp2{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:12.5px;line-height:1.5;color:#B9B7BE}

/* spoiler shroud (LOG-007) */
.spoil{position:relative;display:block}
.spoil .stext{display:block;filter:blur(7px);user-select:none;transition:filter .25s}
.spoil.open .stext{filter:none;user-select:auto}
.revealchip{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:99px;border:1px solid var(--accent);background:rgba(16,16,20,.88);color:var(--accent);font-size:10.5px;font-weight:600;letter-spacing:.04em;cursor:pointer;z-index:2}

/* dialogs */
.backdrop{position:fixed;inset:0;background:rgba(8,8,11,.66);backdrop-filter:blur(3px);display:flex;justify-content:center;align-items:flex-start;padding:9vh 18px 18px;z-index:60;overflow-y:auto}
.dialog{width:480px;max-width:100%;background:var(--surface);border:1px solid #32323C;border-radius:14px;box-shadow:0 24px 80px rgba(0,0,0,.6);display:flex;flex-direction:column;max-height:84vh}
.dhead{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid var(--border)}
.dttl{font-family:var(--serif);font-size:16.5px}
.dbody{padding:16px;display:flex;flex-direction:column;gap:15px;overflow-y:auto}
.dfoot{display:flex;align-items:center;gap:9px;padding:13px 16px;border-top:1px solid var(--border)}
.frow{display:flex;gap:12px}
.frow>*{flex:1;min-width:0}
.fcol{display:flex;flex-direction:column;gap:6px}

/* command palette */
.pal{width:660px}
.pin{display:flex;align-items:center;gap:10px;padding:13px 16px;border-bottom:1px solid var(--border)}
.pin input{flex:1;background:transparent;border:none;outline:none;color:var(--text);font-size:15px;font-family:var(--ui)}
.typechips{display:flex;align-items:center;gap:7px;flex-wrap:wrap;padding:11px 16px;border-bottom:1px solid var(--border)}
.palbody{max-height:54vh;overflow-y:auto;padding:6px 8px 10px}
.palhint{padding:26px 18px;text-align:center;color:var(--dim);font-size:12.5px;line-height:1.6}
.pgroup{display:flex;align-items:center;gap:9px;margin:12px 10px 6px;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--dim);font-weight:600}
.prow{display:flex;align-items:center;gap:11px;width:100%;padding:8px 10px;border:none;border-radius:9px;background:transparent;color:var(--text);cursor:pointer;text-align:left;font-family:var(--ui)}
.prow:hover{background:var(--surface2)}
.prow .thumb{width:30px;flex-shrink:0}
.prow .pt{font-family:var(--serif);font-size:14px}
.prow .pm{font-family:var(--mono);font-size:10.5px;color:var(--dim);margin-top:1px}
.palfoot{display:flex;align-items:center;gap:8px;padding:10px 16px;border-top:1px solid var(--border);font-family:var(--mono);font-size:10px;color:var(--dim)}
kbd{font-family:var(--mono);font-size:9.5px;color:var(--dim);background:var(--surface2);border:1px solid var(--border);border-bottom-width:2px;border-radius:5px;padding:2px 6px;letter-spacing:.06em}
.spin{animation:spin 1s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}

/* table view */
.vtable{width:100%;border-collapse:collapse;font-size:13px}
.vtable th{text-align:left;font-size:10.5px;letter-spacing:.13em;text-transform:uppercase;color:var(--dim);font-weight:600;padding:8px 10px;border-bottom:1px solid var(--border)}
.vtable td{padding:9px 10px;border-bottom:1px solid #1E1E26;vertical-align:middle}
.vtable tbody tr{cursor:pointer}
.vtable tbody tr:hover{background:var(--surface)}
.tthumb{display:block;width:30px}

/* switch */
.swrow{display:inline-flex;align-items:center;gap:9px;cursor:pointer;user-select:none}
.sw{position:relative;width:34px;height:19px;border-radius:99px;border:1px solid var(--border);background:var(--surface2);cursor:pointer;flex-shrink:0;transition:background .15s,border-color .15s;padding:0}
.sw::after{content:'';position:absolute;top:2px;left:2px;width:13px;height:13px;border-radius:50%;background:var(--dim);transition:transform .15s,background .15s}
.sw.on{background:var(--accent-soft);border-color:var(--accent)}
.sw.on::after{transform:translateX(15px);background:var(--accent)}
.swlabel{font-size:12px;color:var(--dim)}

/* toasts */
.toasts{position:fixed;right:18px;bottom:18px;display:flex;flex-direction:column;gap:8px;z-index:90}
.toast{background:var(--surface);border:1px solid var(--border);border-left:2px solid var(--accent);border-radius:9px;padding:10px 14px;font-size:12.5px;box-shadow:0 10px 30px rgba(0,0,0,.45);animation:tin .22s ease}
@keyframes tin{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}

/* activity heatmap */
.hmwrap{overflow-x:auto;padding-bottom:4px}
.hmonths{display:flex;font-family:var(--mono);font-size:9.5px;color:var(--dim);margin-bottom:5px}
.hm{display:flex;gap:3px}
.hmcol{display:flex;flex-direction:column;gap:3px}
.hmc{width:10px;height:10px;border-radius:2.5px}
.hmlegend{display:flex;align-items:center;gap:5px;margin-top:9px;font-family:var(--mono);font-size:9.5px;color:var(--dim)}

/* popover menu */
.menuwrap{position:relative}
.menu{position:absolute;top:calc(100% + 7px);right:0;min-width:200px;background:var(--surface);border:1px solid #32323C;border-radius:11px;box-shadow:0 16px 48px rgba(0,0,0,.55);padding:6px;z-index:40}
.menuhead{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--dim);font-weight:600;padding:7px 9px 5px}
.menuitem{display:flex;align-items:center;gap:9px;width:100%;padding:7px 9px;border:none;border-radius:7px;background:transparent;color:var(--text);font-size:12.5px;cursor:pointer;text-align:left;font-family:var(--ui)}
.menuitem:hover{background:var(--surface2)}
.clickaway{position:fixed;inset:0;z-index:30}

/* stats */
.statgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px;margin-bottom:14px}
.card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px 18px}
.card.wide{grid-column:1/-1}
.cardhead{display:flex;align-items:center;gap:9px;font-size:11px;letter-spacing:.13em;text-transform:uppercase;color:var(--dim);font-weight:600;margin-bottom:14px}
.bignum{font-family:var(--serif);font-size:34px;line-height:1}
.tcount{display:flex;align-items:center;gap:13px}
.tcount .ic{width:38px;height:38px;border-radius:10px;background:var(--surface2);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;color:var(--accent);flex-shrink:0}
.hist{display:flex;align-items:flex-end;gap:6px;height:120px}
.hcol{flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;height:100%;justify-content:flex-end}
.hbar{width:100%;border-radius:4px 4px 2px 2px;background:linear-gradient(180deg,var(--accent),#9A7A33);min-height:2px}
.hlab{font-family:var(--mono);font-size:9px;color:var(--dim)}
.toprow{display:grid;grid-template-columns:minmax(0,1fr) 110px 26px;align-items:center;gap:10px;padding:5px 0}
.toprow .nm{font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tbwrap{height:5px;border-radius:3px;background:var(--surface2);overflow:hidden}
.tb{display:block;height:100%;border-radius:3px;background:var(--accent)}
.toprow .ct{font-family:var(--mono);font-size:10.5px;color:var(--dim);text-align:right}

/* home */
.greet{font-family:var(--serif);font-size:30px;font-weight:500}
.datesub{font-family:var(--mono);font-size:11px;color:var(--dim);letter-spacing:.1em;text-transform:uppercase;margin-top:5px}
.herosearch{display:flex;align-items:center;gap:11px;width:100%;max-width:560px;margin-top:20px;padding:12px 15px;border-radius:12px;border:1px solid var(--border);background:var(--surface);color:var(--dim);font-size:13.5px;cursor:pointer;font-family:var(--ui);transition:border-color .15s,color .15s}
.herosearch:hover{border-color:var(--accent);color:var(--text)}
.herosearch kbd{margin-left:auto}
.cshelf{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:12px}
.ccard{display:flex;gap:12px;align-items:center;background:var(--surface);border:1px solid var(--border);border-radius:11px;padding:11px 13px;cursor:pointer;transition:border-color .15s}
.ccard:hover{border-color:#3A3A45}
.cthumb{width:52px;flex-shrink:0}
.recrow{display:flex;align-items:center;gap:12px;padding:8px 4px;border-bottom:1px solid #1B1B22;cursor:pointer}
.recrow:hover{background:var(--surface)}
.favstrip{display:grid;grid-template-columns:repeat(auto-fill,minmax(108px,1fr));gap:12px}

/* lists */
.lgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px}
.lcard{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:15px 16px;cursor:pointer;transition:border-color .15s,transform .15s}
.lcard:hover{border-color:#3A3A45;transform:translateY(-2px)}
.fan{display:flex;height:84px;margin-bottom:12px;padding-left:8px}
.fitem{display:block;width:56px;margin-left:-22px;border-radius:6px;overflow:hidden;box-shadow:-6px 4px 14px rgba(0,0,0,.4);transform:rotate(-2deg)}
.fitem:first-child{margin-left:0}
.fitem:nth-child(even){transform:rotate(2.5deg)}
.lrow{display:flex;align-items:center;gap:13px;padding:10px 6px;border-bottom:1px solid #1B1B22}
.posnum{font-family:var(--mono);font-size:26px;color:var(--accent);width:34px;text-align:center;flex-shrink:0;opacity:.9}
.lthumb{display:block;width:38px;flex-shrink:0}
.lnote{font-size:12px;color:var(--dim);font-style:italic;margin-top:2px}

/* empty states */
.empty{display:flex;flex-direction:column;align-items:center;gap:9px;text-align:center;border:1.5px dashed var(--border);border-radius:14px;padding:44px 20px;margin:18px 0;color:var(--dim)}
.empty .et{font-family:var(--serif);font-size:18px;color:var(--text);display:flex;align-items:center;gap:8px}

.btn:disabled,.iconbtn:disabled{opacity:.35;cursor:default}

/* responsive */
@media (max-width:1020px){
  .side{width:64px;padding:18px 10px}
  .nlabel,.navbtn .ct,.wmfull,.swlabel,.sidefoot .ver{display:none}
  .navbtn{justify-content:center;padding:10px 0}
  .wordmark{text-align:center;font-size:17px}
  .sidefoot{align-items:center}
  .page{padding:24px 20px 80px}
  .dhero{margin:-24px -20px 24px;padding:22px 20px 24px}
  .dtitle{font-size:30px}
  .posterlg{width:140px}
}
@media (max-width:560px){
  .pgrid{grid-template-columns:repeat(auto-fill,minmax(118px,1fr));gap:13px 11px}
  .datebox{width:46px}
  .tlrow::before{left:23px}
  .frow{flex-direction:column}
  .dhero .row{flex-direction:column;align-items:flex-start;gap:16px}
  .posterlg{width:120px}
}
@media (prefers-reduced-motion:reduce){
  *,*::before,*::after{transition:none!important;animation:none!important}
  .pcard:hover,.tlcard:hover,.lcard:hover{transform:none}
}
`;

/* ───────────────────────── constants & helpers ───────────────────────── */

const TYPES = ["movie", "show", "book", "game"];
const TYPE_LABEL = { movie: "Film", show: "Show", book: "Book", game: "Game" };
const TYPE_PLURAL = { movie: "Films", show: "Shows", book: "Books", game: "Games" };
const TYPE_ICON = { movie: Film, show: Tv, book: BookOpen, game: Gamepad2 };

const STATUSES = ["wishlist", "backlog", "in_progress", "completed", "dropped"];
const STATUS_META = {
  wishlist:    { label: "Wishlist",    color: "#9D8CD6" },
  backlog:     { label: "Backlog",     color: "#8A93A6" },
  in_progress: { label: "In Progress", color: "#5E9BD6" },
  completed:   { label: "Completed",   color: "#79B791" },
  dropped:     { label: "Dropped",     color: "#C97A7A" },
};
const QUALIFIERS = {
  finished: "Finished",
  hundred_percent: "100% · Mastered",
  replayed: "Replayed",
  abandoned_late: "Abandoned Late",
};
const REDO_LABEL = { movie: "Rewatch", show: "Rewatch", book: "Reread", game: "Replay" };
const SRC = { movie: "TMDB", show: "TMDB", book: "Open Library", game: "IGDB" };

const P = (d) => new Date(d + "T12:00:00");
const MO = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MO_FULL = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DW_FULL = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const fmtDay = (d) => { const x = P(d); return `${MO[x.getMonth()]} ${x.getDate()}`; };
const fmtFull = (d) => { const x = P(d); return `${MO[x.getMonth()]} ${x.getDate()}, ${x.getFullYear()}`; };
const fmtMonth = (ym) => { const [y, m] = ym.split("-"); return `${MO_FULL[+m - 1]} ${y}`; };
const todayISO = () => {
  const x = new Date();
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};
let __id = 0;
const uid = () => `u${++__id}_${Math.random().toString(36).slice(2, 7)}`;
const seed01 = (s) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 1000) / 1000;
};
const creatorRole = (m) => Object.keys(m.creators)[0];
const primaryCreator = (m) => Object.values(m.creators)[0];
const metaBits = (m) => {
  if (m.type === "movie") return `${m.runtime} min`;
  if (m.type === "show") return `${m.seasons} season${m.seasons > 1 ? "s" : ""} · ${m.episodes} eps`;
  if (m.type === "book") return `${m.pages} pp`;
  return `${m.platforms.join(" / ")} · ~${m.ttb} h main`;
};
const playMinsFor = (logs, mediaId) =>
  logs.filter((l) => l.mediaId === mediaId && l.sessionMinutes).reduce((a, l) => a + l.sessionMinutes, 0);

/* ─────────────── mock data — stands in for TMDB / IGDB / Open Library ─────────────── */

const MEDIA = [
  { id: "m1", type: "movie", title: "Heat", year: 1995, creators: { Director: "Michael Mann" }, genres: ["Crime", "Thriller"], runtime: 170, palette: ["#27435F", "#0D1622"], synopsis: "A meticulous thief and the detective hunting him circle each other across Los Angeles, two professionals who understand each other better than anyone else in their lives." },
  { id: "m2", type: "movie", title: "Aftersun", year: 2022, creators: { Director: "Charlotte Wells" }, genres: ["Drama"], runtime: 102, palette: ["#C98A4B", "#46365C"], synopsis: "A woman sifts through camcorder memories of a childhood holiday in Turkey, searching the edges of the frame for the father she only partly knew." },
  { id: "m3", type: "movie", title: "Dune: Part Two", year: 2024, creators: { Director: "Denis Villeneuve" }, genres: ["Science Fiction", "Adventure"], runtime: 166, palette: ["#B07B3E", "#2E1F14"], synopsis: "Paul Atreides joins the Fremen of Arrakis and rides his growing legend toward a war he has foreseen and fears." },
  { id: "m4", type: "movie", title: "The Zone of Interest", year: 2023, creators: { Director: "Jonathan Glazer" }, genres: ["Drama", "History"], runtime: 105, palette: ["#6E7B6C", "#1C211C"], synopsis: "A commandant's family tends an immaculate garden home built against the wall of Auschwitz, the horror present only as sound." },
  { id: "m5", type: "movie", title: "In the Mood for Love", year: 2000, creators: { Director: "Wong Kar-wai" }, genres: ["Romance", "Drama"], runtime: 98, palette: ["#7E2F35", "#2A4138"], synopsis: "Two neighbors in 1962 Hong Kong, each betrayed by an absent spouse, fall into a restrained, unconsummated intimacy." },
  { id: "s1", type: "show", title: "Severance", year: 2022, creators: { Creator: "Dan Erickson" }, genres: ["Science Fiction", "Thriller"], seasons: 2, episodes: 19, palette: ["#4A7A6F", "#0F1A1E"], synopsis: "Office workers undergo a procedure that splits their memories between work and home — until the two halves begin to reach for each other." },
  { id: "s2", type: "show", title: "Andor", year: 2022, creators: { Creator: "Tony Gilroy" }, genres: ["Science Fiction", "Drama"], seasons: 2, episodes: 24, palette: ["#9A5A33", "#1A2430"], synopsis: "A thief is radicalized step by step into the rebellion, in a Star Wars story about what insurgency actually costs." },
  { id: "s3", type: "show", title: "The Bear", year: 2022, creators: { Creator: "Christopher Storer" }, genres: ["Drama", "Comedy"], seasons: 3, episodes: 28, palette: ["#2F4FA3", "#13182B"], synopsis: "A fine-dining chef returns home to run his late brother's Chicago sandwich shop and inherits its chaos, debts, and family." },
  { id: "s4", type: "show", title: "Twin Peaks: The Return", year: 2017, creators: { Creator: "David Lynch" }, genres: ["Mystery", "Drama"], seasons: 1, episodes: 18, palette: ["#7A2230", "#1A0F14"], synopsis: "Twenty-five years on, Agent Cooper's long way back to Twin Peaks bends television into something stranger and sadder." },
  { id: "b1", type: "book", title: "Blood Meridian", year: 1985, creators: { Author: "Cormac McCarthy" }, genres: ["Western", "Literary"], pages: 351, palette: ["#8A3A2A", "#2B1A12"], synopsis: "A teenage drifter falls in with a scalp-hunting expedition along the Mexican border, presided over by the enormous and terrifying Judge Holden." },
  { id: "b2", type: "book", title: "Piranesi", year: 2020, creators: { Author: "Susanna Clarke" }, genres: ["Fantasy", "Mystery"], pages: 245, palette: ["#4E7997", "#152330"], synopsis: "A man lives alone in an infinite house of halls and tides, certain he understands his world completely — and he is wrong." },
  { id: "b3", type: "book", title: "The Left Hand of Darkness", year: 1969, creators: { Author: "Ursula K. Le Guin" }, genres: ["Science Fiction"], pages: 304, palette: ["#8FA8BC", "#1E2A36"], synopsis: "An envoy from a human coalition arrives on a planet of ambisexual people, where winter and politics are equally unforgiving." },
  { id: "b4", type: "book", title: "Stoner", year: 1965, creators: { Author: "John Williams" }, genres: ["Literary"], pages: 278, palette: ["#8E7B4F", "#241F14"], synopsis: "The quiet life of a Missouri farm boy who becomes a literature professor, rendered with devastating plainness." },
  { id: "g1", type: "game", title: "Disco Elysium", year: 2019, creators: { Developer: "ZA/UM" }, genres: ["RPG", "Detective"], platforms: ["PC"], ttb: 30, palette: ["#B66A4F", "#27333F"], synopsis: "An amnesiac detective wakes up in a trashed hostel room and must reassemble his case, his politics, and himself." },
  { id: "g2", type: "game", title: "Hades", year: 2020, creators: { Developer: "Supergiant Games" }, genres: ["Roguelike", "Action"], platforms: ["PC", "Switch"], ttb: 22, palette: ["#A33A3A", "#1F1426"], synopsis: "The prince of the underworld fights his way out of his father's realm, dying and learning, again and again." },
  { id: "g3", type: "game", title: "Outer Wilds", year: 2019, creators: { Developer: "Mobius Digital" }, genres: ["Adventure", "Puzzle"], platforms: ["PC", "PS5"], ttb: 17, palette: ["#C2703D", "#1B2740"], synopsis: "A four-eyed astronaut in a backyard space program explores a solar system stuck in a 22-minute loop ending in supernova." },
  { id: "g4", type: "game", title: "Elden Ring", year: 2022, creators: { Developer: "FromSoftware" }, genres: ["Action RPG"], platforms: ["PC", "PS5"], ttb: 60, palette: ["#A8893F", "#161A12"], synopsis: "A Tarnished returns to the Lands Between to gather the shards of a shattered ring and claim a broken order." },
  /* search-only extras (not in the library until added) */
  { id: "x1", type: "movie", title: "Collateral", year: 2004, creators: { Director: "Michael Mann" }, genres: ["Crime", "Thriller"], runtime: 120, palette: ["#5E6E7E", "#15191E"], synopsis: "A Los Angeles cab driver's night shift is hijacked by a contract killer working down a list." },
  { id: "x2", type: "book", title: "Suttree", year: 1979, creators: { Author: "Cormac McCarthy" }, genres: ["Literary"], pages: 471, palette: ["#566B4F", "#181D14"], synopsis: "A man who has renounced his family lives on a houseboat on the Tennessee River among Knoxville's outcasts." },
  { id: "x3", type: "game", title: "Citizen Sleeper", year: 2022, creators: { Developer: "Jump Over the Age" }, genres: ["RPG"], platforms: ["PC", "Switch"], ttb: 8, palette: ["#C25E7A", "#1B2030"], synopsis: "A digitized mind in a leased body scrapes out cycles of survival on a crumbling ring station." },
  { id: "x4", type: "show", title: "Mr. Robot", year: 2015, creators: { Creator: "Sam Esmail" }, genres: ["Drama", "Thriller"], seasons: 4, episodes: 45, palette: ["#B03030", "#101418"], synopsis: "A vulnerable cybersecurity engineer is recruited by an anarchist to take down the corporation he's paid to protect." },
  { id: "x5", type: "movie", title: "Sicario", year: 2015, creators: { Director: "Denis Villeneuve" }, genres: ["Crime", "Thriller"], runtime: 121, palette: ["#9A8A5E", "#1C1A14"], synopsis: "An FBI agent volunteers for a cartel task force and learns how far outside the law it operates." },
  { id: "x6", type: "book", title: "The Passenger", year: 2022, creators: { Author: "Cormac McCarthy" }, genres: ["Literary"], pages: 383, palette: ["#46647A", "#0F161D"], synopsis: "A salvage diver finds a sunken jet with a body missing and surfaces into grief and surveillance." },
];

const E = (id, mediaId, status, extra = {}) => ({
  id, mediaId, status,
  qualifier: null, rating: null, ratingManualAt: null, favorite: false,
  tags: [], progress: {}, startedAt: null, finishedAt: null,
  ...extra,
});

const ENTRIES = [
  E("e1", "m1", "completed", { qualifier: "finished", rating: 10, favorite: true, tags: ["heist", "los-angeles"], addedAt: "2025-08-02", startedAt: "2025-08-10", finishedAt: "2025-08-10" }),
  E("e2", "m2", "completed", { qualifier: "finished", rating: 8, tags: ["a24"], addedAt: "2025-10-28", finishedAt: "2025-11-02" }),
  E("e3", "m3", "completed", { qualifier: "finished", rating: 9, favorite: true, tags: ["epic", "imax"], addedAt: "2026-02-20", finishedAt: "2026-03-15" }),
  E("e4", "m4", "backlog", { addedAt: "2026-04-12" }),
  E("e5", "m5", "wishlist", { addedAt: "2026-05-22" }),
  E("e6", "s1", "in_progress", { rating: 9, tags: ["workplace", "sci-fi"], progress: { episodes: 16 }, addedAt: "2025-02-14", startedAt: "2025-02-15" }),
  E("e7", "s2", "completed", { qualifier: "finished", rating: 9, tags: ["star-wars"], addedAt: "2025-11-20", finishedAt: "2025-12-14" }),
  E("e8", "s3", "dropped", { qualifier: "abandoned_late", rating: 6, addedAt: "2026-01-05", startedAt: "2026-01-08" }),
  E("e9", "s4", "backlog", { addedAt: "2026-05-30" }),
  E("e10", "b1", "in_progress", { tags: ["western", "mccarthy"], progress: { pages: 212 }, addedAt: "2026-05-10", startedAt: "2026-05-14" }),
  E("e11", "b2", "completed", { qualifier: "finished", rating: 9, favorite: true, tags: ["locked-room"], addedAt: "2026-01-02", finishedAt: "2026-01-19" }),
  E("e12", "b3", "completed", { qualifier: "finished", rating: 8, ratingManualAt: "2025-07-06", tags: ["hugo-winner"], addedAt: "2025-06-18", finishedAt: "2025-07-06" }),
  E("e13", "b4", "backlog", { addedAt: "2026-03-02" }),
  E("e14", "g1", "completed", { qualifier: "finished", rating: 10, favorite: true, tags: ["rpg", "detective"], addedAt: "2025-09-12", startedAt: "2025-09-14", finishedAt: "2025-10-05" }),
  E("e15", "g2", "completed", { qualifier: "hundred_percent", rating: 9, tags: ["roguelike"], addedAt: "2026-02-08", startedAt: "2026-02-12", finishedAt: "2026-02-27" }),
  E("e16", "g3", "in_progress", { tags: ["space"], addedAt: "2026-05-28", startedAt: "2026-06-01" }),
  E("e17", "g4", "backlog", { addedAt: "2026-04-20" }),
];

const L = (id, mediaId, date, extra = {}) => ({
  id, mediaId, date,
  endDate: null, rating: null, isRedo: false,
  review: null, hasSpoilers: false, sessionMinutes: null, note: null,
  ...extra,
});

const LOGS = [ /* newest first */
  L("l4", "m3", "2026-06-09", { isRedo: true, note: "IMAX rewatch with Sam." }),
  L("l19", "g3", "2026-06-08", { sessionMinutes: 130, note: "Nomai text trail through Brittle Hollow. No spoilers, but the quantum moon is doing things." }),
  L("l8", "s1", "2026-06-07", { note: "S2E9. Theories multiplying. Saving the finale for the weekend." }),
  L("l11", "b1", "2026-06-04", { note: "p. 212. The judge's campfire speech on war. Had to put it down and stare at a wall." }),
  L("l18", "g3", "2026-06-01", { sessionMinutes: 85, note: "First loop out past the village. The Hourglass Twins are already my favorite thing in the system." }),
  L("l7", "s1", "2026-05-18", { note: "S2E7. The ORTBO episode is the show at its funniest and most sinister at once." }),
  L("l2", "m1", "2026-03-22", { rating: 10, isRedo: true, review: "Even better knowing where every thread lands. The shootout still sounds like the inside of a metal drum." }),
  L("l3", "m3", "2026-03-15", { rating: 9, review: "Spectacle with actual dread underneath it. The black-and-white arena sequence is the best stretch of studio filmmaking in years." }),
  L("l17", "g2", "2026-02-27", { sessionMinutes: 150, rating: 9, review: "The loop is the story and the story justifies the loop. Best roguelike onboarding ever made." }),
  L("l16", "g2", "2026-02-20", { sessionMinutes: 200, note: "Cleared a heat-8 run with the rail." }),
  L("l10", "s3", "2026-02-11", { rating: 6, review: "Respect the craft, but three seasons of being yelled at is enough. Dropping it two episodes into S3." }),
  L("l6", "b2", "2026-01-19", { rating: 9, hasSpoilers: true, review: "The reveal that the Other has been wiping his memory the whole time lands because Piranesi never stops being kind. The journals-as-evidence structure is perfect." }),
  L("l9", "s2", "2025-12-14", { rating: 9, review: "The prison arc is as good as television gets." }),
  L("l5", "m2", "2025-11-02", { rating: 8, review: "Quiet for eighty minutes and then it caves your chest in. The final dance sequence recontextualizes everything before it." }),
  L("l15", "g1", "2025-10-05", { sessionMinutes: 160, rating: 10, review: "Nothing else is structured like this — a detective game where the central mystery is your own ruined self. The writing carries every system." }),
  L("l14", "g1", "2025-09-28", { sessionMinutes: 210 }),
  L("l13", "g1", "2025-09-21", { sessionMinutes: 240, note: "Failed every Authority check and somehow that's the better story." }),
  L("l12", "g1", "2025-09-14", { sessionMinutes: 180, note: "Rolled a thought-cabinet build. The Hanged Man case opens strong." }),
  L("l1", "m1", "2025-08-10", { rating: 9, review: "The diner scene alone earns the runtime. Everything is procedure until suddenly it's grief." }),
];

const LISTS = [
  { id: "L1", name: "Desert Island Eight", ranked: true, note: "If the boat sinks, these come with me.", items: [
    { mediaId: "g1", note: "The one I would replay forever." },
    { mediaId: "m1" },
    { mediaId: "b2", note: "Comfort and mystery in one volume." },
    { mediaId: "s2" },
    { mediaId: "b3" },
    { mediaId: "g3", note: "Cheating — you can only play it once." },
  ] },
  { id: "L2", name: "2026 Watchlist", ranked: false, note: "Queued for this year.", items: [
    { mediaId: "m4", note: "Steeling myself." },
    { mediaId: "m5", note: "Criterion 4K." },
    { mediaId: "s4", note: "18 hours of whatever this is." },
    { mediaId: "g4", note: "Waiting for a free month." },
  ] },
  { id: "L3", name: "Short & Perfect", ranked: false, note: "Under four hours or 250 pages. No filler.", items: [
    { mediaId: "m2" },
    { mediaId: "m5" },
    { mediaId: "b2" },
  ] },
];

/* ───────────────────────────── primitives ───────────────────────────── */

const SpecCtx = createContext(false);

function Anno({ id }) {
  const on = useContext(SpecCtx);
  if (!on) return null;
  return <span className="anno">{id}</span>;
}

function Pill({ status }) {
  const s = STATUS_META[status];
  return (
    <span className="pill" style={{ color: s.color, borderColor: s.color + "66", background: s.color + "14" }}>
      {s.label}
    </span>
  );
}

function PillSelect({ value, onChange }) {
  const s = STATUS_META[value];
  return (
    <select
      className="pillsel"
      value={value}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      onChange={(e) => { e.stopPropagation(); onChange(e.target.value); }}
      style={{ color: s.color, borderColor: s.color + "66", background: s.color + "14" }}
    >
      {STATUSES.map((st) => <option key={st} value={st}>{STATUS_META[st].label}</option>)}
    </select>
  );
}

function Stars({ v, size = 13 }) {
  if (v == null) return <span style={{ fontFamily: "var(--mono)", fontSize: size - 2, color: "var(--dim)" }}>—</span>;
  return (
    <span style={{ display: "inline-flex", gap: 1.5 }} title={`${(v / 2).toFixed(1)} / 5`}>
      {[0, 1, 2, 3, 4].map((i) => {
        const frac = Math.max(0, Math.min(2, v - i * 2)) / 2;
        return (
          <span key={i} style={{ position: "relative", width: size, height: size, display: "inline-block" }}>
            <Star size={size} color="#3A3A45" style={{ position: "absolute", inset: 0 }} />
            <span style={{ position: "absolute", inset: 0, width: `${frac * 100}%`, overflow: "hidden" }}>
              <Star size={size} color="#E0B458" fill="#E0B458" />
            </span>
          </span>
        );
      })}
    </span>
  );
}

function StarInput({ value, onChange, size = 21 }) {
  const [hover, setHover] = useState(null);
  const ref = useRef(null);
  const fromEvent = (e) => {
    const r = ref.current.getBoundingClientRect();
    const x = e.clientX - r.left;
    return Math.max(1, Math.min(10, Math.floor((x / r.width) * 10) + 1));
  };
  const shown = hover != null ? hover : value;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
      <div
        ref={ref}
        role="slider"
        tabIndex={0}
        aria-valuemin={1}
        aria-valuemax={10}
        aria-valuenow={value || 0}
        aria-valuetext={value ? `${value / 2} stars` : "unrated"}
        style={{ display: "inline-flex", gap: 2, cursor: "pointer", borderRadius: 6 }}
        onMouseMove={(e) => setHover(fromEvent(e))}
        onMouseLeave={() => setHover(null)}
        onClick={(e) => onChange(fromEvent(e))}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); onChange(Math.min(10, (value || 0) + 1)); }
          if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); onChange(Math.max(1, (value || 2) - 1)); }
        }}
      >
        {[0, 1, 2, 3, 4].map((i) => {
          const frac = Math.max(0, Math.min(2, (shown || 0) - i * 2)) / 2;
          return (
            <span key={i} style={{ position: "relative", width: size, height: size, display: "inline-block" }}>
              <Star size={size} color="#3A3A45" style={{ position: "absolute", inset: 0 }} />
              <span style={{ position: "absolute", inset: 0, width: `${frac * 100}%`, overflow: "hidden" }}>
                <Star size={size} color="#E0B458" fill="#E0B458" />
              </span>
            </span>
          );
        })}
      </div>
      <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: shown ? "var(--accent)" : "var(--dim)", width: 26 }}>
        {shown ? (shown / 2).toFixed(1) : "—"}
      </span>
      {value != null && (
        <button className="iconbtn" style={{ width: 24, height: 24 }} title="Clear rating" onClick={() => onChange(null)}>
          <X size={12} />
        </button>
      )}
    </div>
  );
}

function Cover({ media: m, mini }) {
  const [c1, c2] = m.palette;
  const grad = `linear-gradient(160deg, ${c1} 0%, ${c2} 78%)`;
  if (m.type === "book" && !mini) {
    return (
      <span className="cover book">
        <span className="jacket" style={{ background: grad }}>
          <span className="spine" />
          <span className="jt">{m.title}</span>
          <span className="ja">{primaryCreator(m)}</span>
        </span>
      </span>
    );
  }
  const cls = "cover" + (m.type === "show" ? " scan" : "") + (m.type === "game" ? " slash" : "") + (mini ? " mini" : "");
  return (
    <span className={cls} style={{ background: grad }}>
      {mini ? (
        <span className="ini">{m.title[0]}</span>
      ) : (
        <>
          <span className="vig" />
          <span className="yr">{m.year}</span>
          <span className="ttl">{m.title}</span>
        </>
      )}
    </span>
  );
}

function Switch({ on, onChange, label }) {
  return (
    <span className="swrow" onClick={() => onChange(!on)}>
      <button
        type="button"
        className={"sw" + (on ? " on" : "")}
        role="switch"
        aria-checked={on}
        onClick={(e) => { e.stopPropagation(); onChange(!on); }}
      />
      {label && <span className="swlabel">{label}</span>}
    </span>
  );
}

function EmptyState({ title, sub, action, onAction }) {
  return (
    <div className="empty">
      <Search size={22} />
      <div className="et">{title} <Anno id="NAV-003" /></div>
      {sub && <div style={{ fontSize: 12.5, maxWidth: 380, lineHeight: 1.55 }}>{sub}</div>}
      {action && <button className="btn" style={{ marginTop: 6 }} onClick={onAction}>{action}</button>}
    </div>
  );
}

function Sect({ children }) {
  return <div className="sect">{children}</div>;
}

function Spoiler({ children }) {
  const [open, setOpen] = useState(false);
  return (
    <span className={"spoil" + (open ? " open" : "")}>
      <span className="stext" aria-hidden={!open}>{children}</span>
      {!open && (
        <button className="revealchip" onClick={(e) => { e.stopPropagation(); setOpen(true); }}>
          <Eye size={11} /> Spoiler — reveal
        </button>
      )}
    </span>
  );
}

function Toasts({ items }) {
  return (
    <div className="toasts">
      {items.map((t) => <div key={t.id} className="toast">{t.msg}</div>)}
    </div>
  );
}

/* ─────────────────── command palette (SRCH-001 … SRCH-006) ─────────────────── */

function CommandPalette({ S, api, nav, onClose }) {
  const [q, setQ] = useState("");
  const [tf, setTf] = useState(null);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState([]);
  const token = useRef(0);
  const inputRef = useRef(null);

  useEffect(() => { if (inputRef.current) inputRef.current.focus(); }, []);

  useEffect(() => {
    const my = ++token.current;                  /* each keystroke supersedes the last (SRCH-006) */
    if (!q.trim()) { setResults([]); setBusy(false); return; }
    setBusy(true);
    const t = setTimeout(() => {                 /* debounce + mock provider latency (SRCH-005) */
      if (token.current !== my) return;          /* stale response — discard */
      const needle = q.trim().toLowerCase();
      setResults(S.media.filter((m) =>
        (!tf || m.type === tf) &&
        (m.title.toLowerCase().includes(needle) || primaryCreator(m).toLowerCase().includes(needle))
      ));
      setBusy(false);
    }, 480);
    return () => clearTimeout(t);
  }, [q, tf, S.media]);

  const groups = TYPES.map((t) => ({ t, items: results.filter((m) => m.type === t) })).filter((g) => g.items.length);

  return (
    <div className="backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dialog pal">
        <div className="pin">
          <Search size={16} color="var(--dim)" />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search movies, shows, books, games…" />
          {busy && <RefreshCw size={14} className="spin" color="var(--dim)" />}
          <kbd>esc</kbd>
        </div>
        <div className="typechips">
          <button className={"chip" + (tf == null ? " on" : "")} onClick={() => setTf(null)}>All</button>
          {TYPES.map((t) => {
            const I = TYPE_ICON[t];
            return (
              <button key={t} className={"chip" + (tf === t ? " on" : "")} onClick={() => setTf(tf === t ? null : t)}>
                <I size={11} /> {TYPE_PLURAL[t]}
              </button>
            );
          })}
          <Anno id="SRCH-003" />
        </div>
        <div className="palbody">
          {!q.trim() && (
            <div className="palhint">
              Type to search the mock providers. Results arrive after a simulated network delay;<br />
              superseded requests are discarded so stale responses never overwrite newer ones.
            </div>
          )}
          {q.trim() && !busy && results.length === 0 && (
            <div className="palhint">
              No results for “{q}”.<br />
              <button className="btn btn-sm" style={{ marginTop: 12 }} onClick={() => api.toast("Manual entry (SRCH-012) is priority C — out of scope for v1")}>
                Create manually
              </button>
            </div>
          )}
          {groups.map((g) => (
            <div key={g.t}>
              <div className="pgroup">{TYPE_PLURAL[g.t]} <Anno id="SRCH-002" /></div>
              {g.items.map((m) => {
                const inLib = S.entryByMedia[m.id];
                return (
                  <button key={m.id} className="prow" onClick={() => { if (inLib) { nav({ name: "media", id: m.id }); onClose(); } }}>
                    <span className="thumb"><Cover media={m} mini /></span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span className="pt" style={{ display: "block" }}>{m.title}</span>
                      <span className="pm" style={{ display: "block" }}>{m.year} · {primaryCreator(m)}</span>
                    </span>
                    {inLib ? (
                      <span className="pill" style={{ color: "var(--dim)", borderColor: "var(--border)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <Check size={10} /> In library
                      </span>
                    ) : (
                      <span
                        className="btn btn-sm"
                        onClick={(e) => { e.stopPropagation(); api.addToLibrary(m.id); }}
                      >
                        <Plus size={12} /> Add
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className="palfoot">
          Mock providers: TMDB · IGDB · Open Library
          <span style={{ marginLeft: "auto", display: "inline-flex", gap: 6, alignItems: "center" }}>
            <Anno id="SRCH-004" /><Anno id="SRCH-005" /><Anno id="SRCH-006" /><kbd>⌘K</kbd>
          </span>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── log dialog (LOG-001) ───────────────────────── */

function LogModal({ media: m, entry: e, api, onClose }) {
  const [date, setDate] = useState(todayISO());
  const [hasEnd, setHasEnd] = useState(false);
  const [endDate, setEndDate] = useState(todayISO());
  const [status, setStatus] = useState(e.status);
  const [rating, setRating] = useState(null);
  const [redo, setRedo] = useState(false);
  const [review, setReview] = useState("");
  const [spoilers, setSpoilers] = useState(false);
  const [mins, setMins] = useState("");
  const [note, setNote] = useState("");

  const save = () => {
    api.saveLog({
      mediaId: m.id,
      date,
      endDate: hasEnd ? endDate : null,
      status,
      rating,
      isRedo: redo,
      review: review.trim() || null,
      hasSpoilers: spoilers,
      sessionMinutes: m.type === "game" && mins ? +mins : null,
      note: note.trim() || null,
    });
    onClose();
  };

  return (
    <div className="backdrop" onMouseDown={(ev) => { if (ev.target === ev.currentTarget) onClose(); }}>
      <div className="dialog">
        <div className="dhead">
          <span style={{ width: 26 }}><Cover media={m} mini /></span>
          <div>
            <div className="dttl">Log · {m.title}</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--dim)" }}>{TYPE_LABEL[m.type]} · {m.year}</div>
          </div>
          <button className="iconbtn" style={{ marginLeft: "auto" }} onClick={onClose}><X size={14} /></button>
        </div>
        <div className="dbody">
          <div className="frow">
            <div className="fcol">
              <label className="lab">Date</label>
              <input type="date" className="field" value={date} onChange={(ev) => setDate(ev.target.value)} />
            </div>
            <div className="fcol">
              <label className="lab">End date <Anno id="LOG-005" /></label>
              {hasEnd ? (
                <div style={{ display: "flex", gap: 6 }}>
                  <input type="date" className="field" style={{ flex: 1 }} value={endDate} onChange={(ev) => setEndDate(ev.target.value)} />
                  <button className="iconbtn" onClick={() => setHasEnd(false)}><X size={13} /></button>
                </div>
              ) : (
                <button className="btn" onClick={() => setHasEnd(true)}>+ Add range</button>
              )}
            </div>
          </div>
          <div className="frow">
            <div className="fcol">
              <label className="lab">Status <Anno id="LIB-008" /></label>
              <select className="field" value={status} onChange={(ev) => setStatus(ev.target.value)}>
                {STATUSES.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
              </select>
            </div>
            <div className="fcol">
              <label className="lab">Rating <Anno id="LOG-003" /> <Anno id="LOG-004" /></label>
              <StarInput value={rating} onChange={setRating} />
              <span style={{ fontSize: 10.5, color: "var(--dim)" }}>Syncs to the library rating unless manually overridden later.</span>
            </div>
          </div>
          <label className="swrow" style={{ gap: 8 }}>
            <input type="checkbox" checked={redo} onChange={(ev) => setRedo(ev.target.checked)} style={{ accentColor: "var(--accent)" }} />
            <Repeat size={13} color="var(--dim)" />
            <span style={{ fontSize: 12.5 }}>This was a {REDO_LABEL[m.type].toLowerCase()}</span>
          </label>
          <div className="fcol">
            <label className="lab">Review · markdown <Anno id="LOG-006" /></label>
            <textarea
              className="field"
              rows={4}
              value={review}
              onChange={(ev) => setReview(ev.target.value)}
              placeholder="(rendered as plain text in this prototype)"
              style={{ resize: "vertical", fontFamily: "var(--ui)" }}
            />
          </div>
          <div className="frow" style={{ alignItems: "flex-end" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7, flex: "initial" }}>
              <Switch on={spoilers} onChange={setSpoilers} label="Contains spoilers" />
              <Anno id="LOG-007" />
            </span>
            {m.type === "game" && (
              <div className="fcol" style={{ marginLeft: "auto", maxWidth: 150, flex: "initial" }}>
                <label className="lab">Session minutes</label>
                <input type="number" min="0" className="field" value={mins} onChange={(ev) => setMins(ev.target.value)} placeholder="e.g. 90" />
              </div>
            )}
          </div>
          <div className="fcol">
            <label className="lab">Progress note</label>
            <input
              className="field"
              value={note}
              onChange={(ev) => setNote(ev.target.value)}
              placeholder={m.type === "book" ? "e.g. p. 212" : m.type === "show" ? "e.g. S2E7" : "optional"}
            />
          </div>
        </div>
        <div className="dfoot">
          <Anno id="LOG-001" /><Anno id="LOG-010" />
          <button className="btn" style={{ marginLeft: "auto" }} onClick={onClose}>Cancel</button>
          <button className="btn btn-accent" onClick={save}><Check size={13} /> Save log</button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────── views ───────────────────────────── */

function progressInfo(S, e) {
  const m = S.mediaById[e.mediaId];
  if (m.type === "book") {
    const p = e.progress.pages || 0;
    return { pct: Math.min(1, p / m.pages), label: `p. ${p} / ${m.pages}` };
  }
  if (m.type === "show") {
    const p = e.progress.episodes || 0;
    return { pct: Math.min(1, p / m.episodes), label: `${p} / ${m.episodes} eps` };
  }
  if (m.type === "game") {
    const mins = playMinsFor(S.logs, m.id);
    const h = Math.floor(mins / 60), mm = mins % 60;
    return { pct: Math.min(1, mins / 60 / m.ttb), label: mins ? `${h}h ${mm}m logged` : "no sessions yet" };
  }
  return { pct: 0, label: "" };
}

function HomeView({ S, api, nav, openPalette, openLog }) {
  const h = new Date().getHours();
  const greet = h < 5 ? "Up late" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  const now = new Date();
  const cont = S.entries.filter((e) => e.status === "in_progress");
  const recent = S.logs.slice(0, 5);
  const favs = S.entries.filter((e) => e.favorite);
  return (
    <>
      <div className="greet">{greet}.</div>
      <div className="datesub">{DW_FULL[now.getDay()]}, {MO_FULL[now.getMonth()]} {now.getDate()}, {now.getFullYear()}</div>
      <button className="herosearch" onClick={openPalette}>
        <Search size={15} /> Search & add anything… <Anno id="NAV-001" /> <kbd>⌘K</kbd>
      </button>

      <Sect>Continuing</Sect>
      {cont.length === 0 ? (
        <EmptyState title="Nothing in progress" sub="Set something to In Progress and it will live here." />
      ) : (
        <div className="cshelf">
          {cont.map((e) => {
            const m = S.mediaById[e.mediaId];
            const pi = progressInfo(S, e);
            return (
              <div key={e.id} className="ccard" onClick={() => nav({ name: "media", id: m.id })}>
                <span className="cthumb"><Cover media={m} mini /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 14.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.title}</div>
                  <div className="bar" style={{ margin: "7px 0 5px" }}><i style={{ width: `${pi.pct * 100}%` }} /></div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--dim)" }}>{pi.label}</div>
                </div>
                <button className="btn btn-sm" onClick={(ev) => { ev.stopPropagation(); openLog(m.id); }}>Log</button>
              </div>
            );
          })}
        </div>
      )}

      <Sect>Recent logs</Sect>
      {recent.map((l) => {
        const m = S.mediaById[l.mediaId];
        return (
          <div key={l.id} className="recrow" onClick={() => nav({ name: "media", id: m.id })}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--dim)", width: 64, flexShrink: 0 }}>{fmtDay(l.date)}</span>
            <span style={{ width: 26, flexShrink: 0 }}><Cover media={m} mini /></span>
            <span style={{ fontFamily: "var(--serif)", fontSize: 14, flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.title}</span>
            <Stars v={l.rating} size={11} />
          </div>
        );
      })}

      {favs.length > 0 && (
        <>
          <Sect>Favorites <Anno id="LIB-016" /></Sect>
          <div className="favstrip">
            {favs.map((e) => {
              const m = S.mediaById[e.mediaId];
              return (
                <div key={e.id} onClick={() => nav({ name: "media", id: m.id })} style={{ cursor: "pointer" }}>
                  <Cover media={m} />
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}

function PosterCard({ S, e, m, api, nav, openLog }) {
  return (
    <div
      className="pcard"
      tabIndex={0}
      role="button"
      onClick={() => nav({ name: "media", id: m.id })}
      onKeyDown={(ev) => { if (ev.key === "Enter") nav({ name: "media", id: m.id }); }}
    >
      <Cover media={m} />
      {e.favorite && <span className="favdot"><Heart size={13} fill="currentColor" /></span>}
      <div className="ov">
        <div className="ovtop">
          <PillSelect value={e.status} onChange={(v) => api.applyStatus(e.id, v)} />
        </div>
        <div>
          <div className="ovtitle">{m.title}</div>
          <div className="ovmeta">{m.year} <Stars v={e.rating} size={11} /></div>
          <div className="ovactions">
            <button className="btn btn-sm" onClick={(ev) => { ev.stopPropagation(); openLog(m.id); }}><Plus size={11} /> Log</button>
            <button
              className={"iconbtn" + (e.favorite ? " on" : "")}
              style={{ width: 27, height: 27 }}
              title="Favorite"
              onClick={(ev) => { ev.stopPropagation(); api.toggleFav(e.id); }}
            >
              <Heart size={12} fill={e.favorite ? "currentColor" : "none"} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LibraryView({ S, api, nav, openLog }) {
  const [tf, setTf] = useState(null);
  const [sf, setSf] = useState("all");
  const [gf, setGf] = useState("all");
  const [ry, setRy] = useState("all");
  const [rf, setRf] = useState(0);
  const [tagSel, setTagSel] = useState([]);
  const [sort, setSort] = useState("added");
  const [dir, setDir] = useState("desc");
  const [view, setView] = useState("grid");

  const lastAct = useMemo(() => {
    const acc = {};
    for (const l of S.logs) if (!acc[l.mediaId] || l.date > acc[l.mediaId]) acc[l.mediaId] = l.date;
    return acc;
  }, [S.logs]);

  const tagCounts = useMemo(() => {
    const c = {};
    for (const e of S.entries) for (const t of e.tags) c[t] = (c[t] || 0) + 1;
    return Object.entries(c).sort((a, b) => b[1] - a[1]);
  }, [S.entries]);

  const genres = useMemo(() => {
    const g = new Set();
    for (const e of S.entries) for (const x of S.mediaById[e.mediaId].genres) g.add(x);
    return [...g].sort();
  }, [S.entries, S.mediaById]);

  const relYears = useMemo(() => {
    const ys = new Set();
    for (const e of S.entries) ys.add(S.mediaById[e.mediaId].year);
    return [...ys].sort((a, b) => b - a);
  }, [S.entries, S.mediaById]);

  const rows = useMemo(() => {
    let r = S.entries.map((e) => ({ e, m: S.mediaById[e.mediaId] }));
    if (tf) r = r.filter(({ m }) => m.type === tf);
    if (sf !== "all") r = r.filter(({ e }) => e.status === sf);
    if (gf !== "all") r = r.filter(({ m }) => m.genres.includes(gf));
    if (ry !== "all") r = r.filter(({ m }) => m.year === +ry);
    if (rf > 0) r = r.filter(({ e }) => (e.rating || 0) >= rf);
    if (tagSel.length) r = r.filter(({ e }) => tagSel.every((t) => e.tags.includes(t)));
    const cmp = {
      added: (a, b) => a.e.addedAt.localeCompare(b.e.addedAt),
      release: (a, b) => a.m.year - b.m.year,
      rating: (a, b) => (a.e.rating || 0) - (b.e.rating || 0),
      title: (a, b) => a.m.title.localeCompare(b.m.title),
      activity: (a, b) => (lastAct[a.m.id] || a.e.addedAt).localeCompare(lastAct[b.m.id] || b.e.addedAt),
    }[sort];
    r.sort(cmp);
    if (dir === "desc") r.reverse();
    return r;
  }, [S.entries, S.mediaById, tf, sf, gf, ry, rf, tagSel, sort, dir, lastAct]);

  const clearAll = () => { setTf(null); setSf("all"); setGf("all"); setRy("all"); setRf(0); setTagSel([]); };

  return (
    <>
      <div className="pagehead">
        <h1>Library</h1>
        <div className="sub">{rows.length} of {S.entries.length} titles</div>
      </div>
      <div className="toolbar">
        <button className={"chip" + (tf == null ? " on" : "")} onClick={() => setTf(null)}>All</button>
        {TYPES.map((t) => {
          const I = TYPE_ICON[t];
          const n = S.entries.filter((e) => S.mediaById[e.mediaId].type === t).length;
          return (
            <button key={t} className={"chip" + (tf === t ? " on" : "")} onClick={() => setTf(tf === t ? null : t)}>
              <I size={11} /> {TYPE_PLURAL[t]} <span className="ct">{n}</span>
            </button>
          );
        })}
        <select className="field" style={{ width: "auto" }} value={sf} onChange={(e) => setSf(e.target.value)}>
          <option value="all">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
        </select>
        <select className="field" style={{ width: "auto" }} value={gf} onChange={(e) => setGf(e.target.value)}>
          <option value="all">All genres</option>
          {genres.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <select className="field" style={{ width: "auto" }} value={ry} onChange={(e) => setRy(e.target.value)}>
          <option value="all">All years</option>
          {relYears.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select className="field" style={{ width: "auto" }} value={rf} onChange={(e) => setRf(+e.target.value)}>
          <option value={0}>Any rating</option>
          <option value={6}>≥ 3★</option>
          <option value={7}>≥ 3.5★</option>
          <option value={8}>≥ 4★</option>
          <option value={9}>≥ 4.5★</option>
          <option value={10}>5★ only</option>
        </select>
        <select className="field" style={{ width: "auto" }} value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="added">Date added</option>
          <option value="release">Release date</option>
          <option value="rating">Rating</option>
          <option value="title">Title</option>
          <option value="activity">Last activity</option>
        </select>
        <button className="iconbtn" title={dir === "desc" ? "Descending" : "Ascending"} onClick={() => setDir(dir === "desc" ? "asc" : "desc")}>
          {dir === "desc" ? <ArrowDown size={13} /> : <ArrowUp size={13} />}
        </button>
        <Anno id="LIB-010" /><Anno id="LIB-011" />
        <span style={{ marginLeft: "auto", display: "inline-flex", gap: 5, alignItems: "center" }}>
          <Anno id="LIB-009" />
          <button className={"iconbtn" + (view === "grid" ? " on" : "")} title="Grid view" onClick={() => setView("grid")}><LayoutGrid size={14} /></button>
          <button className={"iconbtn" + (view === "table" ? " on" : "")} title="Table view" onClick={() => setView("table")}><TableIcon size={14} /></button>
        </span>
      </div>
      {tagCounts.length > 0 && (
        <div className="tagrow">
          <TagIcon size={12} color="var(--dim)" />
          {tagCounts.map(([t, n]) => (
            <button
              key={t}
              className={"chip" + (tagSel.includes(t) ? " on" : "")}
              onClick={() => setTagSel(tagSel.includes(t) ? tagSel.filter((x) => x !== t) : [...tagSel, t])}
            >
              {t} <span className="ct">{n}</span>
            </button>
          ))}
          <Anno id="LST-005" /><Anno id="LST-006" />
        </div>
      )}
      {rows.length === 0 ? (
        <EmptyState title="Nothing matches these filters" sub="Loosen one of the filters above, or clear them all." action="Clear filters" onAction={clearAll} />
      ) : view === "grid" ? (
        <div className="pgrid">
          {rows.map(({ e, m }) => <PosterCard key={e.id} S={S} e={e} m={m} api={api} nav={nav} openLog={openLog} />)}
        </div>
      ) : (
        <table className="vtable">
          <thead>
            <tr><th></th><th>Title</th><th>Type</th><th>Status</th><th>Rating</th><th>Progress</th><th>Added</th></tr>
          </thead>
          <tbody>
            {rows.map(({ e, m }) => (
              <tr key={e.id} onClick={() => nav({ name: "media", id: m.id })}>
                <td style={{ width: 38 }}><span className="tthumb"><Cover media={m} mini /></span></td>
                <td>
                  <span style={{ fontFamily: "var(--serif)", fontSize: 14 }}>{m.title}</span>{" "}
                  <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--dim)" }}>{m.year}</span>
                </td>
                <td style={{ color: "var(--dim)" }}>{TYPE_LABEL[m.type]}</td>
                <td><PillSelect value={e.status} onChange={(v) => api.applyStatus(e.id, v)} /></td>
                <td><Stars v={e.rating} size={12} /></td>
                <td style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--dim)" }}>{e.status === "in_progress" ? progressInfo(S, e).label : "—"}</td>
                <td style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--dim)" }}>{fmtDay(e.addedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

function DetailView({ S, api, nav, back, openLog, id }) {
  const m = S.mediaById[id];
  const e = S.entryByMedia[id];
  const [tagIn, setTagIn] = useState("");
  const [listOpen, setListOpen] = useState(false);
  if (!m) return <EmptyState title="Title not found" />;
  const logs = S.logs.filter((l) => l.mediaId === id);
  const [c1, c2] = m.palette;
  const I = TYPE_ICON[m.type];
  return (
    <>
      <div className="dhero">
        <div className="bgfx" style={{ background: `linear-gradient(180deg, rgba(16,16,20,.12), #101014 96%), linear-gradient(150deg, ${c1} 0%, ${c2} 58%, #101014 100%)` }} />
        <button className="btn btn-ghost backbtn" onClick={back}><ChevronLeft size={14} /> Back</button>
        <div className="row">
          <div className="posterlg"><Cover media={m} /></div>
          <div style={{ minWidth: 0, paddingBottom: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--dim)" }}>
              <I size={12} /> {TYPE_LABEL[m.type]}
            </div>
            <h1 className="dtitle">{m.title}</h1>
            <div className="dmeta">
              <span>{m.year}</span><span className="sep">·</span>
              <span>{creatorRole(m)} — {primaryCreator(m)}</span><span className="sep">·</span>
              <span>{metaBits(m)}</span><span className="sep">·</span>
              <span>{m.genres.join(" / ")}</span>
            </div>
          </div>
        </div>
      </div>

      {!e ? (
        <EmptyState
          title="Not in your library yet"
          sub="Add it to set a status, rate it, and start logging."
          action="Add to library"
          onAction={() => api.addToLibrary(m.id)}
        />
      ) : (
        <>
          <div className="actrow">
            <div className="fcol">
              <label className="lab">Status <Anno id="LIB-008" /></label>
              <select className="field" value={e.status} onChange={(ev) => api.applyStatus(e.id, ev.target.value)}>
                {STATUSES.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
              </select>
            </div>
            {(e.status === "completed" || e.status === "dropped") && (
              <div className="fcol">
                <label className="lab">How it ended <Anno id="LIB-006" /></label>
                <select className="field" value={e.qualifier || ""} onChange={(ev) => api.setQualifier(e.id, ev.target.value || null)}>
                  <option value="">—</option>
                  {Object.entries(QUALIFIERS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            )}
            <div className="fcol">
              <label className="lab">Your rating</label>
              <StarInput value={e.rating} onChange={(v) => api.rate(e.id, v)} />
            </div>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
              <button className={"iconbtn" + (e.favorite ? " on" : "")} title="Favorite (max 4 per type)" onClick={() => api.toggleFav(e.id)}>
                <Heart size={14} fill={e.favorite ? "currentColor" : "none"} />
              </button>
              <Anno id="LIB-016" />
              <div className="menuwrap">
                <button className="iconbtn" title="Add to list" onClick={() => setListOpen(!listOpen)}><ListIcon size={14} /></button>
                {listOpen && (
                  <>
                    <div className="clickaway" onClick={() => setListOpen(false)} />
                    <div className="menu">
                      <div className="menuhead">Add to list</div>
                      {S.lists.map((Lx) => {
                        const inc = Lx.items.some((it) => it.mediaId === m.id);
                        return (
                          <button key={Lx.id} className="menuitem" onClick={() => api.toggleList(Lx.id, m.id)}>
                            <Check size={12} color={inc ? "var(--accent)" : "transparent"} /> {Lx.name}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
              <button className="iconbtn" title={`Refresh metadata from ${SRC[m.type]}`} onClick={() => api.refresh(m)}><RefreshCw size={14} /></button>
              <Anno id="LIB-014" />
              <button className="btn btn-accent" onClick={() => openLog(m.id)}><Plus size={13} /> Log</button>
            </div>
          </div>

          {m.type !== "movie" && (
            <>
              <Sect>Progress <Anno id="LIB-015" />{m.type === "game" && <Anno id="LOG-011" />}</Sect>
              {m.type === "book" && (
                <div className="progrow">
                  <input
                    type="number" min="0" max={m.pages} className="field pgnum"
                    value={e.progress.pages || 0}
                    onChange={(ev) => api.updateProgress(e.id, { pages: Math.max(0, Math.min(m.pages, +ev.target.value || 0)) })}
                  />
                  <span className="proglab">/ {m.pages} pp</span>
                  <div className="bar"><i style={{ width: `${Math.min(1, (e.progress.pages || 0) / m.pages) * 100}%` }} /></div>
                  <span className="proglab">{Math.round(Math.min(1, (e.progress.pages || 0) / m.pages) * 100)}%</span>
                </div>
              )}
              {m.type === "show" && (
                <div className="progrow">
                  <input
                    type="number" min="0" max={m.episodes} className="field pgnum"
                    value={e.progress.episodes || 0}
                    onChange={(ev) => api.updateProgress(e.id, { episodes: Math.max(0, Math.min(m.episodes, +ev.target.value || 0)) })}
                  />
                  <span className="proglab">/ {m.episodes} eps</span>
                  <div className="bar"><i style={{ width: `${Math.min(1, (e.progress.episodes || 0) / m.episodes) * 100}%` }} /></div>
                  <span className="proglab">{Math.round(Math.min(1, (e.progress.episodes || 0) / m.episodes) * 100)}%</span>
                </div>
              )}
              {m.type === "game" && (() => {
                const mins = playMinsFor(S.logs, m.id);
                const n = S.logs.filter((l) => l.mediaId === m.id && l.sessionMinutes).length;
                return mins ? (
                  <div className="progrow">
                    <Clock size={13} color="var(--accent)" />
                    <span style={{ fontFamily: "var(--mono)", fontSize: 12 }}>
                      {Math.floor(mins / 60)}h {mins % 60}m across {n} session{n > 1 ? "s" : ""}
                    </span>
                    <span className="proglab">~{m.ttb} h main story</span>
                    <div className="bar"><i style={{ width: `${Math.min(100, (mins / 60 / m.ttb) * 100)}%` }} /></div>
                  </div>
                ) : (
                  <div style={{ color: "var(--dim)", fontSize: 12.5 }}>No sessions logged yet — playtime derives from logs.</div>
                );
              })()}
            </>
          )}

          <Sect>Tags</Sect>
          <div className="tagrow">
            {e.tags.map((t) => (
              <span key={t} className="chip on" style={{ cursor: "default" }}>
                <TagIcon size={11} /> {t}
                <button
                  onClick={() => api.removeTag(e.id, t)}
                  style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: 0, display: "inline-flex" }}
                >
                  <X size={11} />
                </button>
              </span>
            ))}
            <input
              className="field"
              style={{ width: 130, padding: "5px 10px", fontSize: 12 }}
              value={tagIn}
              onChange={(ev) => setTagIn(ev.target.value)}
              onKeyDown={(ev) => {
                if (ev.key === "Enter" && tagIn.trim()) {
                  api.addTag(e.id, tagIn.trim().toLowerCase().replace(/\s+/g, "-"));
                  setTagIn("");
                }
              }}
              placeholder="Add tag ↵"
            />
          </div>

          <Sect>About</Sect>
          <p style={{ maxWidth: "70ch", lineHeight: 1.65, fontSize: 14, color: "#CFCDD4", margin: 0 }}>{m.synopsis}</p>
          <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--dim)", marginTop: 8 }}>Source: {SRC[m.type]} (mock)</div>

          <Sect>History <Anno id="LOG-008" /></Sect>
          {logs.length === 0 ? (
            <div style={{ color: "var(--dim)", fontSize: 12.5 }}>Nothing logged yet.</div>
          ) : logs.map((l) => (
            <div key={l.id} className="histcard">
              <div className="histhead">
                <span>{fmtFull(l.date)}{l.endDate ? ` → ${fmtFull(l.endDate)}` : ""}</span>
                {l.isRedo && (
                  <span className="pill" style={{ color: "var(--accent)", borderColor: "#E0B45866", background: "var(--accent-soft)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <Repeat size={10} /> {REDO_LABEL[m.type]}
                  </span>
                )}
                {l.sessionMinutes && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Clock size={11} /> {l.sessionMinutes}m</span>
                )}
                <span style={{ marginLeft: "auto" }}><Stars v={l.rating} size={12} /></span>
              </div>
              {l.review && (
                <div className="histbody">{l.hasSpoilers ? <Spoiler>{l.review}</Spoiler> : l.review}</div>
              )}
              {l.note && <div className="histnote">{l.note}</div>}
            </div>
          ))}
        </>
      )}
    </>
  );
}

function DiaryView({ S, nav }) {
  const [yf, setYf] = useState("all");
  const [tf, setTf] = useState(null);
  const years = useMemo(() => [...new Set(S.logs.map((l) => l.date.slice(0, 4)))].sort().reverse(), [S.logs]);
  const logs = useMemo(() => {
    let r = [...S.logs].sort((a, b) => b.date.localeCompare(a.date));
    if (yf !== "all") r = r.filter((l) => l.date.startsWith(yf));
    if (tf) r = r.filter((l) => S.mediaById[l.mediaId].type === tf);
    return r;
  }, [S.logs, S.mediaById, yf, tf]);
  const months = useMemo(() => {
    const out = [];
    for (const l of logs) {
      const k = l.date.slice(0, 7);
      if (!out.length || out[out.length - 1].k !== k) out.push({ k, items: [] });
      out[out.length - 1].items.push(l);
    }
    return out;
  }, [logs]);
  return (
    <>
      <div className="pagehead">
        <h1>Diary <Anno id="LOG-009" /></h1>
        <div className="sub">Everything you've logged, in order.</div>
      </div>
      <div className="toolbar">
        <button className={"chip" + (yf === "all" ? " on" : "")} onClick={() => setYf("all")}>All years</button>
        {years.map((y) => <button key={y} className={"chip" + (yf === y ? " on" : "")} onClick={() => setYf(y)}>{y}</button>)}
        <span style={{ width: 10 }} />
        <button className={"chip" + (tf == null ? " on" : "")} onClick={() => setTf(null)}>All types</button>
        {TYPES.map((t) => {
          const I = TYPE_ICON[t];
          return (
            <button key={t} className={"chip" + (tf === t ? " on" : "")} onClick={() => setTf(tf === t ? null : t)}>
              <I size={11} /> {TYPE_PLURAL[t]}
            </button>
          );
        })}
      </div>
      {months.length === 0 && (
        <EmptyState title="Nothing logged yet" sub="Log something from any title page and it lands here, newest first." />
      )}
      {months.map((mo) => (
        <div key={mo.k}>
          <Sect>{fmtMonth(mo.k)}</Sect>
          <div>
            {mo.items.map((l) => {
              const m = S.mediaById[l.mediaId];
              const d = P(l.date);
              const I = TYPE_ICON[m.type];
              return (
                <div key={l.id} className="tlrow">
                  <div className="datebox">
                    <div className="d">{d.getDate()}</div>
                    <div className="m">{MO[d.getMonth()]}</div>
                  </div>
                  <div className="tlcard" onClick={() => nav({ name: "media", id: m.id })}>
                    <span className="tlthumb"><Cover media={m} mini /></span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="tlt">
                        {m.title}
                        <I size={12} color="var(--dim)" />
                        {l.isRedo && <Repeat size={12} color="var(--accent)" />}
                      </div>
                      <div className="tlmeta">
                        <Stars v={l.rating} size={11} />
                        {l.sessionMinutes && <span>{l.sessionMinutes}m</span>}
                        {l.endDate && <span>→ {fmtDay(l.endDate)}</span>}
                      </div>
                      {(l.review || l.note) && (
                        <div className="clamp2">
                          {l.review
                            ? (l.hasSpoilers ? <Spoiler>{l.review}</Spoiler> : l.review)
                            : <span style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--dim)" }}>{l.note}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}

function ListsView({ S, api, nav }) {
  const [name, setName] = useState("");
  return (
    <>
      <div className="pagehead"><h1>Lists</h1><div className="sub">Ordered or loose. Mixed types welcome.</div></div>
      <div style={{ display: "flex", gap: 9, alignItems: "center", marginBottom: 22, maxWidth: 460 }}>
        <input
          className="field"
          style={{ flex: 1 }}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) { api.createList(name.trim()); setName(""); } }}
          placeholder="New list name…"
        />
        <button
          className="btn btn-accent"
          disabled={!name.trim()}
          onClick={() => { api.createList(name.trim()); setName(""); }}
        >
          <Plus size={13} /> Create
        </button>
        <Anno id="LST-001" />
      </div>
      {S.lists.length === 0 ? (
        <EmptyState title="No lists yet" sub="Make one above, then add titles from any detail page." />
      ) : (
        <div className="lgrid">
          {S.lists.map((Lx) => (
            <div key={Lx.id} className="lcard" onClick={() => nav({ name: "list", id: Lx.id })}>
              <div className="fan">
                {Lx.items.slice(0, 4).map((it) => (
                  <span key={it.mediaId} className="fitem"><Cover media={S.mediaById[it.mediaId]} mini /></span>
                ))}
              </div>
              <div style={{ fontFamily: "var(--serif)", fontSize: 17 }}>{Lx.name}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                {Lx.ranked && (
                  <span className="pill" style={{ color: "var(--accent)", borderColor: "#E0B45866", background: "var(--accent-soft)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <ListOrdered size={10} /> Ranked
                  </span>
                )}
                <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--dim)" }}>{Lx.items.length} items</span>
              </div>
              {Lx.note && <div className="lnote">{Lx.note}</div>}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function ListDetail({ S, api, nav, back, id }) {
  const Lx = S.lists.find((x) => x.id === id);
  const [editing, setEditing] = useState(false);
  const [nm, setNm] = useState(Lx ? Lx.name : "");
  const [confirmDel, setConfirmDel] = useState(false);
  const [descEdit, setDescEdit] = useState(false);
  const [desc, setDesc] = useState("");
  const [noteFor, setNoteFor] = useState(null);
  const [noteDraft, setNoteDraft] = useState("");
  if (!Lx) return <EmptyState title="List not found" />;
  const commit = () => { if (nm.trim()) api.renameList(Lx.id, nm.trim()); setEditing(false); };
  return (
    <>
      <button className="btn btn-ghost" style={{ marginBottom: 16 }} onClick={back}><ChevronLeft size={14} /> Back to lists</button>
      <div className="pagehead">
        {editing ? (
          <input
            className="field"
            autoFocus
            value={nm}
            onChange={(e) => setNm(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === "Enter") commit(); }}
            style={{ fontFamily: "var(--serif)", fontSize: 24, maxWidth: 420 }}
          />
        ) : (
          <h1 style={{ cursor: "text" }} title="Click to rename" onClick={() => { setNm(Lx.name); setEditing(true); }}>{Lx.name}</h1>
        )}
        {descEdit ? (
          <input
            className="field"
            autoFocus
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            onBlur={() => { api.setListNote(Lx.id, desc.trim()); setDescEdit(false); }}
            onKeyDown={(e) => { if (e.key === "Enter") { api.setListNote(Lx.id, desc.trim()); setDescEdit(false); } }}
            placeholder="Describe this list…"
            style={{ marginTop: 6, maxWidth: 420, fontSize: 12.5 }}
          />
        ) : (
          <div className="sub" style={{ cursor: "text" }} title="Click to edit description" onClick={() => { setDesc(Lx.note || ""); setDescEdit(true); }}>
            {Lx.note || <span style={{ opacity: 0.6 }}>Add a description…</span>}
          </div>
        )}
      </div>
      <div className="toolbar" style={{ marginBottom: 20 }}>
        <Switch on={Lx.ranked} onChange={(v) => api.setListRanked(Lx.id, v)} label="Ranked" />
        <Anno id="LST-002" /><Anno id="LST-003" /><Anno id="LST-004" />
        <span style={{ marginLeft: "auto", display: "inline-flex", gap: 8 }}>
          {confirmDel ? (
            <>
              <button className="btn" style={{ color: "#C97A7A", borderColor: "#C97A7A66" }} onClick={() => { api.deleteList(Lx.id); back(); }}>
                Confirm delete
              </button>
              <button className="btn" onClick={() => setConfirmDel(false)}>Cancel</button>
            </>
          ) : (
            <button className="iconbtn" title="Delete list" onClick={() => setConfirmDel(true)}><Trash2 size={14} /></button>
          )}
        </span>
      </div>
      {Lx.items.length === 0 ? (
        <div style={{ color: "var(--dim)", fontSize: 12.5 }}>Nothing here yet — add from any title page.</div>
      ) : Lx.items.map((it, i) => {
        const m = S.mediaById[it.mediaId];
        return (
          <div key={it.mediaId} className="lrow">
            <span className="posnum">{Lx.ranked ? i + 1 : "·"}</span>
            <span className="lthumb"><Cover media={m} mini /></span>
            <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => nav({ name: "media", id: m.id })}>
              <span style={{ fontFamily: "var(--serif)", fontSize: 15 }}>{m.title}</span>{" "}
              <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--dim)" }}>{m.year} · {TYPE_LABEL[m.type]}</span>
              {noteFor === it.mediaId ? (
                <input
                  className="field"
                  autoFocus
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onBlur={() => { api.setListItemNote(Lx.id, it.mediaId, noteDraft.trim()); setNoteFor(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { api.setListItemNote(Lx.id, it.mediaId, noteDraft.trim()); setNoteFor(null); } }}
                  placeholder="Note for this entry… ↵"
                  style={{ marginTop: 4, fontSize: 12, padding: "4px 9px", maxWidth: 360, display: "block", width: "100%" }}
                />
              ) : (
                <div
                  className="lnote"
                  style={{ cursor: "text" }}
                  title="Click to edit note"
                  onClick={(e) => { e.stopPropagation(); setNoteDraft(it.note || ""); setNoteFor(it.mediaId); }}
                >
                  {it.note || <span style={{ opacity: 0.55 }}>Add a note…</span>}
                </div>
              )}
            </div>
            {Lx.ranked && (
              <>
                <button className="iconbtn" style={{ width: 27, height: 27 }} disabled={i === 0} onClick={() => api.moveListItem(Lx.id, i, -1)} title="Move up"><ArrowUp size={12} /></button>
                <button className="iconbtn" style={{ width: 27, height: 27 }} disabled={i === Lx.items.length - 1} onClick={() => api.moveListItem(Lx.id, i, 1)} title="Move down"><ArrowDown size={12} /></button>
              </>
            )}
            <button className="iconbtn" style={{ width: 27, height: 27 }} onClick={() => api.removeListItem(Lx.id, it.mediaId)} title="Remove"><X size={12} /></button>
          </div>
        );
      })}
    </>
  );
}

function Heatmap({ logs, year }) {
  const { weeks, monthLabels } = useMemo(() => {
    const counts = {};
    for (const l of logs) if (l.date.startsWith(year)) counts[l.date] = (counts[l.date] || 0) + 2;
    const days = [];
    const d = P(`${year}-01-01`);
    const end = P(`${year}-12-31`);
    while (d <= end) {
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      let v = counts[iso] || 0;
      if (!v) {
        const n = seed01(iso);
        if (n > 0.93) v = 2; else if (n > 0.8) v = 1;
      }
      days.push({ iso, dow: d.getDay(), m: d.getMonth(), v: Math.min(4, v), c: (counts[iso] || 0) / 2 });
      d.setDate(d.getDate() + 1);
    }
    const weeks = [];
    let col = new Array(days[0].dow).fill(null);
    for (const day of days) {
      col.push(day);
      if (col.length === 7) { weeks.push(col); col = []; }
    }
    if (col.length) { while (col.length < 7) col.push(null); weeks.push(col); }
    const monthLabels = weeks.map((w, i) => {
      const first = w.find(Boolean);
      if (!first) return "";
      const prev = i > 0 ? weeks[i - 1].find(Boolean) : null;
      return !prev || prev.m !== first.m ? MO[first.m] : "";
    });
    return { weeks, monthLabels };
  }, [logs, year]);
  const LV = ["var(--surface2)", "rgba(224,180,88,.25)", "rgba(224,180,88,.45)", "rgba(224,180,88,.68)", "var(--accent)"];
  return (
    <div className="hmwrap">
      <div className="hmonths">
        {monthLabels.map((lab, i) => <span key={i} style={{ width: 13, flexShrink: 0 }}>{lab}</span>)}
      </div>
      <div className="hm">
        {weeks.map((w, i) => (
          <div key={i} className="hmcol">
            {w.map((day, j) => day ? (
              <span
                key={j}
                className="hmc"
                style={{ background: LV[day.v] }}
                title={day.c ? `${day.iso} · ${day.c} log${day.c > 1 ? "s" : ""}` : day.iso}
              />
            ) : (
              <span key={j} className="hmc" style={{ background: "transparent" }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatsView({ S }) {
  const years = useMemo(() => [...new Set(S.logs.map((l) => l.date.slice(0, 4)))].sort().reverse(), [S.logs]);
  const [yf, setYf] = useState(years[0] || "all");
  const [histAll, setHistAll] = useState(false);
  const inScope = (d) => yf === "all" || (d && d.startsWith(yf));

  const counts = TYPES.map((t) => ({
    t,
    n: S.entries.filter((e) =>
      e.status === "completed" &&
      S.mediaById[e.mediaId].type === t &&
      (yf === "all" || (e.finishedAt && e.finishedAt.startsWith(yf)))
    ).length,
  }));

  const histLogs = S.logs.filter((l) => l.rating != null && (histAll || inScope(l.date)));
  const buckets = Array.from({ length: 10 }, (_, i) => histLogs.filter((l) => l.rating === i + 1).length);
  const maxB = Math.max(1, ...buckets);

  const scopeLogs = S.logs.filter((l) => inScope(l.date));
  const top = (fn) => {
    const c = {};
    for (const l of scopeLogs) for (const k of fn(S.mediaById[l.mediaId])) c[k] = (c[k] || 0) + 1;
    return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 6);
  };
  const topGenres = top((m) => m.genres);
  const topCreators = top((m) => [primaryCreator(m)]);
  const maxG = Math.max(1, ...topGenres.map(([, n]) => n));
  const maxC = Math.max(1, ...topCreators.map(([, n]) => n));
  const hmYear = yf === "all" ? (years[0] || "2026") : yf;

  return (
    <>
      <div className="pagehead"><h1>Stats</h1><div className="sub">What a year of logging looks like.</div></div>
      <div className="toolbar">
        <button className={"chip" + (yf === "all" ? " on" : "")} onClick={() => setYf("all")}>All time</button>
        {years.map((y) => <button key={y} className={"chip" + (yf === y ? " on" : "")} onClick={() => setYf(y)}>{y}</button>)}
        <Anno id="STAT-001" />
      </div>
      <div className="statgrid">
        {counts.map(({ t, n }) => {
          const I = TYPE_ICON[t];
          return (
            <div key={t} className="card tcount">
              <span className="ic"><I size={17} /></span>
              <span>
                <div className="bignum">{n}</div>
                <div style={{ fontSize: 11, color: "var(--dim)", letterSpacing: ".08em", textTransform: "uppercase", marginTop: 3 }}>{TYPE_PLURAL[t]} completed</div>
              </span>
            </div>
          );
        })}
      </div>
      <div className="statgrid">
        <div className="card wide">
          <div className="cardhead">
            Rating distribution <Anno id="STAT-002" />
            {yf !== "all" && (
              <span style={{ marginLeft: "auto", display: "inline-flex", gap: 5 }}>
                <button className={"chip" + (!histAll ? " on" : "")} onClick={() => setHistAll(false)}>{yf}</button>
                <button className={"chip" + (histAll ? " on" : "")} onClick={() => setHistAll(true)}>All time</button>
              </span>
            )}
          </div>
          <div className="hist">
            {buckets.map((n, i) => (
              <div key={i} className="hcol">
                <div className="hbar" style={{ height: `${(n / maxB) * 100}%` }} title={`${n} log${n === 1 ? "" : "s"}`} />
                <div className="hlab">{(i + 1) / 2}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="card wide">
          <div className="cardhead">Activity · {hmYear} <Anno id="STAT-003" /></div>
          <Heatmap logs={S.logs} year={hmYear} />
          <div className="hmlegend">
            Less
            {["var(--surface2)", "rgba(224,180,88,.25)", "rgba(224,180,88,.45)", "rgba(224,180,88,.68)", "var(--accent)"].map((c, i) => (
              <span key={i} className="hmc" style={{ background: c, display: "inline-block" }} />
            ))}
            More
          </div>
        </div>
        <div className="card">
          <div className="cardhead">Top genres <Anno id="STAT-004" /></div>
          {topGenres.map(([g, n]) => (
            <div key={g} className="toprow">
              <span className="nm">{g}</span>
              <span className="tbwrap"><span className="tb" style={{ width: `${(n / maxG) * 100}%` }} /></span>
              <span className="ct">{n}</span>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="cardhead">Top creators</div>
          {topCreators.map(([g, n]) => (
            <div key={g} className="toprow">
              <span className="nm">{g}</span>
              <span className="tbwrap"><span className="tb" style={{ width: `${(n / maxC) * 100}%` }} /></span>
              <span className="ct">{n}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function Sidebar({ S, route, nav, openPalette, spec, setSpec }) {
  const items = [
    { k: "home", label: "Home", I: HomeIcon },
    { k: "library", label: "Library", I: LayoutGrid, ct: S.entries.length },
    { k: "diary", label: "Diary", I: CalendarDays, ct: S.logs.length },
    { k: "lists", label: "Lists", I: ListIcon, ct: S.lists.length },
    { k: "stats", label: "Stats", I: BarChart3 },
  ];
  const active = route.name === "media" ? "library" : route.name === "list" ? "lists" : route.name;
  return (
    <nav className="side">
      <div className="wordmark"><span className="wmfull">VAUL</span><b>T</b></div>
      <button className="navbtn" onClick={openPalette}>
        <Search size={16} /><span className="nlabel">Search</span><span className="ct">⌘K</span>
      </button>
      <div style={{ height: 10 }} />
      {items.map(({ k, label, I, ct }) => (
        <button key={k} className={"navbtn" + (active === k ? " on" : "")} onClick={() => nav({ name: k })}>
          <I size={16} /><span className="nlabel">{label}</span>
          {ct != null && <span className="ct">{ct}</span>}
        </button>
      ))}
      <div className="sidefoot">
        <Switch on={spec} onChange={setSpec} label="Spec IDs" />
        <div className="ver">VAULT · UI PROTOTYPE v0.1</div>
      </div>
    </nav>
  );
}

/* ───────────────────────────── app ───────────────────────────── */

export default function VaultPrototype() {
  const [media] = useState(MEDIA);
  const [entries, setEntries] = useState(ENTRIES);
  const [logs, setLogs] = useState(LOGS);
  const [lists, setLists] = useState(LISTS);
  const [route, setRoute] = useState({ name: "home" });
  const prevRef = useRef(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [logFor, setLogFor] = useState(null);
  const [spec, setSpec] = useState(true);
  const [toasts, setToasts] = useState([]);

  const mediaById = useMemo(() => Object.fromEntries(media.map((m) => [m.id, m])), [media]);
  const entryByMedia = useMemo(() => Object.fromEntries(entries.map((e) => [e.mediaId, e])), [entries]);
  const S = { media, entries, logs, lists, mediaById, entryByMedia };

  const nav = (r) => {
    setRoute((cur) => {
      if (cur.name !== r.name || cur.id !== r.id) prevRef.current = cur;
      return r;
    });
  };
  const back = () => {
    const p = prevRef.current;
    const fallback = { name: route.name === "list" ? "lists" : "library" };
    const target = p && (p.name !== route.name || p.id !== route.id) ? p : fallback;
    prevRef.current = null;
    setRoute(target);
  };

  const toast = (msg) => {
    const id = uid();
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  };

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
      if (e.key === "Escape") { setPaletteOpen(false); setLogFor(null); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const patchEntry = (id, patch) => setEntries((es) => es.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  /* LIB-007: status transitions carry side effects (start/finish dates, default qualifier) */
  const statusPatch = (e, status, { startDate, endDate } = {}) => {
    const patch = { status };
    if (status !== "completed" && status !== "dropped") patch.qualifier = null;
    if (status === "in_progress" && !e.startedAt) patch.startedAt = startDate || todayISO();
    if (status === "completed") {
      patch.finishedAt = e.finishedAt || endDate || todayISO();
      if (!e.qualifier) patch.qualifier = "finished";
    }
    return patch;
  };

  const api = {
    toast,
    applyStatus: (id, status) => {
      const e = entries.find((x) => x.id === id);
      if (!e || e.status === status) return;
      patchEntry(id, statusPatch(e, status));
      toast(`Status → ${STATUS_META[status].label}`);
    },
    setQualifier: (id, q) => patchEntry(id, { qualifier: q }),
    rate: (id, rating) => patchEntry(id, { rating, ratingManualAt: todayISO() }),
    toggleFav: (id) => {
      const e = entries.find((x) => x.id === id);
      if (!e) return;
      if (!e.favorite) {
        const t = mediaById[e.mediaId].type;
        const n = entries.filter((x) => x.favorite && mediaById[x.mediaId].type === t).length;
        if (n >= 4) { toast(`Favorites are capped at 4 per type (${TYPE_PLURAL[t].toLowerCase()})`); return; }
      }
      patchEntry(id, { favorite: !e.favorite });
    },
    addToLibrary: (mediaId) => {
      if (entryByMedia[mediaId]) { toast("Already in your library"); return; }
      const m = mediaById[mediaId];
      setEntries((es) => [{
        id: uid(), mediaId, status: "backlog", qualifier: null, rating: null, ratingManualAt: null,
        favorite: false, tags: [], progress: {}, addedAt: todayISO(), startedAt: null, finishedAt: null,
      }, ...es]);
      toast(`${m.title} added · Backlog`);
    },
    saveLog: (form) => {
      setLogs((ls) => [{ id: uid(), ...form }, ...ls]);
      const e = entryByMedia[form.mediaId];
      if (e) {
        let patch = {};
        if (form.status && form.status !== e.status) {
          patch = statusPatch(e, form.status, { startDate: form.date, endDate: form.endDate || form.date });
        }
        const blocked = e.ratingManualAt && e.ratingManualAt > form.date; /* LOG-004: manual override wins */
        let synced = false;
        if (form.rating != null && !blocked) { patch.rating = form.rating; synced = true; }
        if (Object.keys(patch).length) patchEntry(e.id, patch);
        toast(synced ? "Log saved · library rating synced" : "Log saved");
      } else {
        toast("Log saved");
      }
    },
    toggleList: (listId, mediaId) => {
      const Lx = lists.find((x) => x.id === listId);
      const inc = Lx && Lx.items.some((it) => it.mediaId === mediaId);
      setLists((Ls) => Ls.map((x) => x.id !== listId ? x : {
        ...x,
        items: inc ? x.items.filter((it) => it.mediaId !== mediaId) : [...x.items, { mediaId, note: "" }],
      }));
      if (Lx) toast(inc ? `Removed from “${Lx.name}”` : `Added to “${Lx.name}”`);
    },
    createList: (name) => {
      const id = "L" + uid();
      setLists((Ls) => [...Ls, { id, name, ranked: false, note: "", items: [] }]);
      toast(`List “${name}” created`);
      return id;
    },
    renameList: (id, name) => setLists((Ls) => Ls.map((x) => (x.id === id ? { ...x, name } : x))),
    setListRanked: (id, ranked) => setLists((Ls) => Ls.map((x) => (x.id === id ? { ...x, ranked } : x))),
    deleteList: (id) => { setLists((Ls) => Ls.filter((x) => x.id !== id)); toast("List deleted"); },
    moveListItem: (id, i, d) => setLists((Ls) => Ls.map((x) => {
      if (x.id !== id) return x;
      const j = i + d;
      if (j < 0 || j >= x.items.length) return x;
      const items = [...x.items];
      [items[i], items[j]] = [items[j], items[i]];
      return { ...x, items };
    })),
    removeListItem: (id, mediaId) => setLists((Ls) => Ls.map((x) => (x.id === id ? { ...x, items: x.items.filter((it) => it.mediaId !== mediaId) } : x))),
    setListNote: (id, note) => setLists((Ls) => Ls.map((x) => (x.id === id ? { ...x, note } : x))),
    setListItemNote: (id, mediaId, note) => setLists((Ls) => Ls.map((x) => (x.id === id ? { ...x, items: x.items.map((it) => (it.mediaId === mediaId ? { ...it, note } : it)) } : x))),
    updateProgress: (id, p) => setEntries((es) => es.map((e) => (e.id === id ? { ...e, progress: { ...e.progress, ...p } } : e))),
    addTag: (id, t) => setEntries((es) => es.map((e) => (e.id === id && !e.tags.includes(t) ? { ...e, tags: [...e.tags, t] } : e))),
    removeTag: (id, t) => setEntries((es) => es.map((e) => (e.id === id ? { ...e, tags: e.tags.filter((x) => x !== t) } : e))),
    refresh: (m) => toast(`Metadata refreshed from ${SRC[m.type]} (mock)`),
  };

  const openLog = (mediaId) => {
    if (!entryByMedia[mediaId]) api.addToLibrary(mediaId);
    setLogFor(mediaId);
  };

  let view;
  switch (route.name) {
    case "home": view = <HomeView S={S} api={api} nav={nav} openPalette={() => setPaletteOpen(true)} openLog={openLog} />; break;
    case "library": view = <LibraryView S={S} api={api} nav={nav} openLog={openLog} />; break;
    case "media": view = <DetailView S={S} api={api} nav={nav} back={back} openLog={openLog} id={route.id} />; break;
    case "diary": view = <DiaryView S={S} nav={nav} />; break;
    case "lists": view = <ListsView S={S} api={api} nav={nav} />; break;
    case "list": view = <ListDetail S={S} api={api} nav={nav} back={back} id={route.id} />; break;
    default: view = <StatsView S={S} />;
  }

  const logMedia = logFor ? mediaById[logFor] : null;
  const logEntry = logFor ? entryByMedia[logFor] : null;

  return (
    <SpecCtx.Provider value={spec}>
      <div className="vault">
        <style>{CSS}</style>
        <Sidebar S={S} route={route} nav={nav} openPalette={() => setPaletteOpen(true)} spec={spec} setSpec={setSpec} />
        <main className="main">
          <div className="page" key={route.name + (route.id || "")}>{view}</div>
        </main>
        {paletteOpen && <CommandPalette S={S} api={api} nav={nav} onClose={() => setPaletteOpen(false)} />}
        {logMedia && logEntry && <LogModal media={logMedia} entry={logEntry} api={api} onClose={() => setLogFor(null)} />}
        <Toasts items={toasts} />
      </div>
    </SpecCtx.Provider>
  );
}
