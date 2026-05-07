/**
 * SafeGuard AI v3 — script.js
 * Text Analysis + YouTube Scanner + Charts + Prevention Tab
 */

/* ══════════════════════════════════════════════════════════════
   CATEGORY METADATA
══════════════════════════════════════════════════════════════ */
const CATEGORIES = {
  'not cyberbullying': {
    icon:'✅', label:'Safe Content', sub:'No harmful patterns detected', isSafe:true,
    signals:[{l:'No threats detected',t:'safe'},{l:'Respectful tone',t:'safe'},{l:'No hate speech',t:'safe'}],
  },
  cyberbullying: {
    icon:'🚫', label:'Cyberbullying', sub:'Harmful or harassing content', isSafe:false,
    signals:[{l:'Harassment detected',t:'danger'},{l:'Targeting individual',t:'danger'},{l:'Abusive language',t:'warn'}],
  },
  threat: {
    icon:'⚠️', label:'Threat', sub:'Threatening language detected', isSafe:false,
    signals:[{l:'Physical threat',t:'danger'},{l:'Intimidation',t:'danger'},{l:'Violent language',t:'warn'}],
  },
  hate: {
    icon:'🔴', label:'Hate Speech', sub:'Content targeting groups or identities', isSafe:false,
    signals:[{l:'Group targeting',t:'danger'},{l:'Discriminatory language',t:'danger'},{l:'Derogatory terms',t:'warn'}],
  },
  insult: {
    icon:'🗣️', label:'Insult', sub:'Offensive or degrading language', isSafe:false,
    signals:[{l:'Personal attack',t:'warn'},{l:'Derogatory phrasing',t:'warn'},{l:'Offensive language',t:'danger'}],
  },
  'offensive language': {
    icon:'🔞', label:'Offensive Language', sub:'Inappropriate or vulgar content', isSafe:false,
    signals:[{l:'Vulgar content',t:'warn'},{l:'Inappropriate tone',t:'warn'},{l:'Profanity',t:'neutral'}],
  },
};

const CHART_COLORS = {
  'not cyberbullying': '#4ade80',
  cyberbullying:       '#f87171',
  threat:              '#fb923c',
  hate:                '#e879f9',
  insult:              '#fbbf24',
  'offensive language':'#60a5fa',
  other:               '#94a3b8',
};

function getCategoryMeta(raw) {
  const key = (raw||'').toLowerCase().trim();
  if (CATEGORIES[key]) return {...CATEGORIES[key], rawKey:key};
  for (const [k,v] of Object.entries(CATEGORIES)) {
    if (key.includes(k)||k.includes(key)) return {...v, rawKey:k};
  }
  const isSafe = key.includes('not')||key.includes('safe')||key.includes('clean');
  return {
    icon: isSafe?'✅':'⚠️', label:titleCase(raw||'Unknown'),
    sub: isSafe?'Content appears safe':'Potentially harmful content',
    isSafe, signals:[{l:titleCase(raw||'Unknown'), t:isSafe?'safe':'warn'}], rawKey:key,
  };
}

function titleCase(str) {
  return str.replace(/\w\S*/g, t => t[0].toUpperCase()+t.slice(1).toLowerCase());
}
function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ══════════════════════════════════════════════════════════════
   TAB SYSTEM
══════════════════════════════════════════════════════════════ */
const tabBtns      = document.querySelectorAll('.tab-btn');
const tabPanels    = document.querySelectorAll('.tab-panel');
const tabIndicator = document.getElementById('tabIndicator');

function setTab(targetTab) {
  tabBtns.forEach(b => b.classList.remove('active'));
  tabPanels.forEach(p => p.classList.remove('active'));
  const btn   = document.querySelector(`.tab-btn[data-tab="${targetTab}"]`);
  const panel = document.getElementById(`tab-${targetTab}`);
  btn.classList.add('active');
  panel.classList.add('active');
  // Move indicator
  const rect = btn.getBoundingClientRect();
  const navRect = btn.parentElement.getBoundingClientRect();
  tabIndicator.style.left  = (btn.offsetLeft) + 'px';
  tabIndicator.style.width = btn.offsetWidth + 'px';
}

tabBtns.forEach(btn => btn.addEventListener('click', () => setTab(btn.dataset.tab)));
// Init indicator on load
window.addEventListener('load', () => {
  const activeBtn = document.querySelector('.tab-btn.active');
  if (activeBtn) {
    tabIndicator.style.left  = activeBtn.offsetLeft + 'px';
    tabIndicator.style.width = activeBtn.offsetWidth + 'px';
  }
});

/* ══════════════════════════════════════════════════════════════
   TEXT ANALYSIS TAB
══════════════════════════════════════════════════════════════ */
const textInput       = document.getElementById('textInput');
const charCountEl     = document.getElementById('charCount');
const clearBtn        = document.getElementById('clearBtn');
const analyzeBtn      = document.getElementById('analyzeBtn');
const loadingState    = document.getElementById('loadingState');
const resultSection   = document.getElementById('resultSection');
const errorState      = document.getElementById('errorState');
const errorMsg        = document.getElementById('errorMsg');
const retryBtn        = document.getElementById('retryBtn');
const reAnalyzeBtn    = document.getElementById('reAnalyzeBtn');
const copyReportBtn   = document.getElementById('copyReportBtn');
const verdictBanner   = document.getElementById('verdictBanner');
const verdictIcon     = document.getElementById('verdictIcon');
const verdictValue    = document.getElementById('verdictValue');
const verdictBadge    = document.getElementById('verdictBadge');
const categoryIcon    = document.getElementById('categoryIcon');
const categoryValue   = document.getElementById('categoryValue');
const categorySub     = document.getElementById('categorySub');
const confNumber      = document.getElementById('confidenceNumber');
const confFill        = document.getElementById('confidenceFill');
const riskTags        = document.getElementById('riskTags');
const step1 = document.getElementById('step1');
const step2 = document.getElementById('step2');
const step3 = document.getElementById('step3');

let lastResponse  = null;
let loaderTimers  = [];

/* Char counter */
textInput.addEventListener('input', () => {
  const len = textInput.value.length;
  charCountEl.textContent = len;
  const cc = charCountEl.parentElement;
  cc.classList.remove('warn-c','danger-c');
  if (len > 1800) cc.classList.add('danger-c');
  else if (len > 1400) cc.classList.add('warn-c');
});

/* Clear */
clearBtn.addEventListener('click', () => {
  textInput.value = ''; charCountEl.textContent = '0';
  charCountEl.parentElement.classList.remove('warn-c','danger-c');
  resetTextPanels(); lastResponse = null; textInput.focus();
});

reAnalyzeBtn.addEventListener('click', () => { resultSection.classList.remove('visible'); textInput.focus(); });
retryBtn.addEventListener('click', () => { errorState.classList.remove('visible'); doAnalyze(); });

function resetTextPanels() {
  loadingState.classList.remove('visible');
  resultSection.classList.remove('visible');
  errorState.classList.remove('visible');
}

function animateSteps(s1,s2,s3) {
  loaderTimers.forEach(clearTimeout); loaderTimers = [];
  [s1,s2,s3].forEach(s => s.classList.remove('active','done'));
  s1.classList.add('active');
  loaderTimers.push(setTimeout(()=>{ s1.classList.replace('active','done'); s2.classList.add('active'); }, 900));
  loaderTimers.push(setTimeout(()=>{ s2.classList.replace('active','done'); s3.classList.add('active'); }, 2000));
}

function renderResult(data) {
  const meta = getCategoryMeta(data.prediction);
  const pct  = Math.round(data.confidence * 100);

  verdictBanner.className = 'verdict-strip ' + (meta.isSafe ? 'safe' : 'danger');
  verdictIcon.textContent  = meta.icon;
  verdictValue.textContent = meta.isSafe ? 'Not Cyberbullying' : 'Cyberbullying Detected';
  verdictBadge.textContent = meta.isSafe ? 'Safe ✓' : 'Unsafe ✗';
  categoryIcon.textContent = meta.icon;
  categoryValue.textContent = meta.label;
  categorySub.textContent   = meta.sub;
  confNumber.textContent = pct + '%';

  const fillColor = meta.isSafe
    ? 'linear-gradient(90deg,#4ade80,#22c55e)'
    : pct > 80 ? 'linear-gradient(90deg,#f87171,#ef4444)'
    : 'linear-gradient(90deg,#fbbf24,#f59e0b)';
  confFill.style.background = fillColor;
  setTimeout(()=>{ confFill.style.width = pct+'%'; }, 80);

  riskTags.innerHTML = '';
  meta.signals.forEach((sig,i)=>{
    const tag = document.createElement('span');
    tag.className = `sig-tag ${sig.t}`;
    tag.textContent = sig.l;
    tag.style.animationDelay = `${i*70}ms`;
    riskTags.appendChild(tag);
  });
  const ctag = document.createElement('span');
  ctag.className = `sig-tag gold`;
  ctag.textContent = `${pct}% confidence`;
  ctag.style.animationDelay = `${meta.signals.length*70}ms`;
  riskTags.appendChild(ctag);
}

/* Copy report */
copyReportBtn.addEventListener('click', ()=>{
  if (!lastResponse) return;
  const meta = getCategoryMeta(lastResponse.prediction);
  const pct  = Math.round(lastResponse.confidence*100);
  const sigs = meta.signals.map(s=>`  • ${s.l}`).join('\n');
  const txt  = `SafeGuard AI — Report\n${'═'.repeat(44)}\nResult     : ${meta.isSafe?'✅ Safe':'🚫 Cyberbullying'}\nCategory   : ${meta.label}\nConfidence : ${pct}%\n${'─'.repeat(44)}\nSignals:\n${sigs}\n${'─'.repeat(44)}\nInput:\n${textInput.value.trim()}\n${'═'.repeat(44)}`;
  navigator.clipboard.writeText(txt).then(()=>{
    copyReportBtn.innerHTML = '✓ Copied!'; copyReportBtn.classList.add('copied');
    setTimeout(()=>{ copyReportBtn.innerHTML = '⬡ Copy Report'; copyReportBtn.classList.remove('copied'); }, 2200);
  });
});

async function doAnalyze() {
  const text = textInput.value.trim();
  if (!text) {
    textInput.style.borderColor = 'var(--danger)';
    textInput.style.boxShadow   = '0 0 0 3px var(--danger-bg)';
    setTimeout(()=>{ textInput.style.borderColor=''; textInput.style.boxShadow=''; }, 1200);
    return;
  }
  resetTextPanels();
  analyzeBtn.disabled = true;
  analyzeBtn.querySelector('.btn-label').textContent = 'Analyzing…';
  loadingState.classList.add('visible');
  animateSteps(step1, step2, step3);

  try {
    const res = await fetch('/analyze', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({text}),
    });
    if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e.error||`Server ${res.status}`); }
    const data = await res.json();
    if (typeof data.prediction !== 'string' || typeof data.confidence !== 'number') throw new Error('Invalid response format.');
    lastResponse = data;
    loaderTimers.push(setTimeout(()=>{ step3.classList.replace('active','done'); }, 2800));
    await new Promise(r=>setTimeout(r,3000));
    loadingState.classList.remove('visible');
    renderResult(data); resultSection.classList.add('visible');
  } catch(err) {
    loadingState.classList.remove('visible');
    errorMsg.textContent = err.message || 'Something went wrong.';
    errorState.classList.add('visible');
  } finally {
    analyzeBtn.disabled = false;
    analyzeBtn.querySelector('.btn-label').textContent = 'Analyze Text';
  }
}

analyzeBtn.addEventListener('click', doAnalyze);
textInput.addEventListener('keydown', e=>{ if ((e.ctrlKey||e.metaKey)&&e.key==='Enter') doAnalyze(); });

/* ══════════════════════════════════════════════════════════════
   YOUTUBE SCANNER TAB
══════════════════════════════════════════════════════════════ */
const ytUrlInput      = document.getElementById('ytUrlInput');
const ytAnalyzeBtn    = document.getElementById('ytAnalyzeBtn');
const ytLoadingState  = document.getElementById('ytLoadingState');
const ytResultSection = document.getElementById('ytResultSection');
const ytErrorState    = document.getElementById('ytErrorState');
const ytErrorMsg      = document.getElementById('ytErrorMsg');
const ytRetryBtn      = document.getElementById('ytRetryBtn');
const ytResetBtn      = document.getElementById('ytResetBtn');
const exportCsvBtn    = document.getElementById('exportCsvBtn');
const ytStep1 = document.getElementById('yt-step1');
const ytStep2 = document.getElementById('yt-step2');
const ytStep3 = document.getElementById('yt-step3');

let allCommentData = [];
let ytLoaderTimers = [];

function resetYtPanels() {
  ytLoadingState.classList.remove('visible');
  ytResultSection.classList.remove('visible');
  ytErrorState.classList.remove('visible');
}

/* Filter chips */
document.querySelectorAll('.filter-chip').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.filter-chip').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const f = btn.dataset.filter;
    document.querySelectorAll('#commentsTableBody tr').forEach(row=>{
      const harmful = row.dataset.harmful==='true';
      row.classList.toggle('hidden',
        f==='harmful' ? !harmful : f==='safe' ? harmful : false
      );
    });
  });
});

/* ── Charts ──────────────────────────────────────────────────── */
function drawPieChart(categoryMap) {
  const canvas = document.getElementById('pieChart');
  const ctx    = canvas.getContext('2d');
  const total  = Object.values(categoryMap).reduce((a,b)=>a+b, 0);
  const legend = document.getElementById('pieLegend');
  legend.innerHTML = '';
  ctx.clearRect(0,0,200,200);

  if (!total) return;

  const entries = Object.entries(categoryMap);
  let startAngle = -Math.PI/2;
  const cx=100, cy=100, r=80;

  entries.forEach(([cat, count])=>{
    const slice = (count/total)*2*Math.PI;
    const color = CHART_COLORS[cat] || CHART_COLORS.other;
    ctx.beginPath();
    ctx.moveTo(cx,cy);
    ctx.arc(cx,cy,r, startAngle, startAngle+slice);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    // thin separator
    ctx.strokeStyle = '#161b24';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    startAngle += slice;

    // Legend item
    const item = document.createElement('div');
    item.className = 'legend-item';
    item.innerHTML = `<span class="legend-dot" style="background:${color}"></span>${titleCase(cat)} <span style="color:var(--t3);margin-left:4px">(${count})</span>`;
    legend.appendChild(item);
  });

  // Donut hole
  ctx.beginPath();
  ctx.arc(cx,cy,44,0,2*Math.PI);
  ctx.fillStyle = '#1c2230';
  ctx.fill();
  // Centre text
  ctx.fillStyle = '#eef0f6';
  ctx.font = 'bold 22px Cormorant Garamond, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(total, cx, cy-6);
  ctx.font = '10px DM Mono, monospace';
  ctx.fillStyle = '#3d4760';
  ctx.fillText('TOTAL', cx, cy+12);
}

function drawBarChart(comments) {
  const canvas = document.getElementById('barChart');
  const ctx    = canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);

  const w = canvas.width, h = canvas.height;
  const pd = {top:16, right:16, bottom:36, left:36};
  const chartW = w - pd.left - pd.right;
  const chartH = h - pd.top - pd.bottom;

  // Group into safe vs harmful in batches of 5
  const batchSize = 5;
  const batches   = [];
  for (let i=0; i<comments.length; i+=batchSize) {
    const batch = comments.slice(i, i+batchSize);
    batches.push({
      safe:    batch.filter(c=>!c.is_harmful).length,
      harmful: batch.filter(c=>c.is_harmful).length,
      label:   `${i+1}–${Math.min(i+batchSize, comments.length)}`,
    });
  }

  if (!batches.length) return;

  const maxVal = Math.max(...batches.map(b=>b.safe+b.harmful), 1);
  const barGroupW = chartW / batches.length;
  const barW = Math.min(barGroupW * 0.35, 28);

  // Grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth   = 1;
  for (let i=0; i<=4; i++) {
    const y = pd.top + chartH - (i/4)*chartH;
    ctx.beginPath(); ctx.moveTo(pd.left,y); ctx.lineTo(pd.left+chartW,y); ctx.stroke();
    ctx.fillStyle = '#3d4760'; ctx.font = '9px DM Mono, monospace'; ctx.textAlign = 'right';
    ctx.fillText(Math.round((i/4)*maxVal), pd.left-6, y+3);
  }

  batches.forEach((b,i)=>{
    const x      = pd.left + i*barGroupW + barGroupW/2;
    const safeH  = (b.safe/maxVal)*chartH;
    const harmH  = (b.harmful/maxVal)*chartH;

    // Safe bar
    ctx.fillStyle = 'rgba(74,222,128,0.7)';
    ctx.beginPath();
    ctx.roundRect(x - barW - 3, pd.top+chartH-safeH, barW, safeH, [3,3,0,0]);
    ctx.fill();

    // Harmful bar
    ctx.fillStyle = 'rgba(248,113,113,0.7)';
    ctx.beginPath();
    ctx.roundRect(x + 3, pd.top+chartH-harmH, barW, harmH, [3,3,0,0]);
    ctx.fill();

    // X label
    ctx.fillStyle = '#3d4760'; ctx.font = '9px DM Mono, monospace'; ctx.textAlign = 'center';
    ctx.fillText(b.label, x, pd.top+chartH+18);
  });

  // Legend
  const ly = pd.top+chartH+32;
  ctx.fillStyle = 'rgba(74,222,128,0.7)'; ctx.fillRect(pd.left, ly-8, 10, 10);
  ctx.fillStyle = '#8892a8'; ctx.font = '9px DM Mono'; ctx.textAlign='left';
  ctx.fillText('Safe', pd.left+14, ly);
  ctx.fillStyle = 'rgba(248,113,113,0.7)'; ctx.fillRect(pd.left+52, ly-8, 10, 10);
  ctx.fillStyle = '#8892a8'; ctx.fillText('Harmful', pd.left+66, ly);
}

/* ── Render YouTube Results ──────────────────────────────────── */
function renderYtResults(data) {
  allCommentData = data.comments;

  document.getElementById('videoTitle').textContent   = data.video.title;
  document.getElementById('videoChannel').textContent = '▶ ' + data.video.channel;
  const thumb = document.getElementById('videoThumbnail');
  if (data.video.thumbnail) { thumb.src = data.video.thumbnail; thumb.style.display='block'; }
  else { thumb.style.display='none'; }

  document.getElementById('yt-safe-count').textContent    = data.summary.safe;
  document.getElementById('yt-flagged-count').textContent = data.summary.flagged;
  document.getElementById('yt-total-count').textContent   = data.summary.total;
  document.getElementById('yt-flagged-pct').textContent   = data.summary.flagged_pct + '%';

  // Build category map for pie chart
  const catMap = {};
  data.comments.forEach(c=>{
    const k = c.prediction.toLowerCase().trim();
    catMap[k] = (catMap[k]||0) + 1;
  });
  drawPieChart(catMap);
  drawBarChart(data.comments);

  // Table rows
  const tbody = document.getElementById('commentsTableBody');
  tbody.innerHTML = '';
  data.comments.forEach((c,i)=>{
    const meta = getCategoryMeta(c.prediction);
    const pct  = Math.round(c.confidence*100);
    const tr   = document.createElement('tr');
    tr.dataset.harmful = c.is_harmful ? 'true' : 'false';
    tr.style.animationDelay = `${i*35}ms`;
    const avatar = c.avatar_url
      ? `<img class="author-avatar" src="${escHtml(c.avatar_url)}" alt="" onerror="this.style.display='none'" />`
      : `<span style="font-size:18px">👤</span>`;
    tr.innerHTML = `
      <td><div class="comment-author">${avatar}<span class="author-name" title="${escHtml(c.author)}">${escHtml(c.author)}</span></div></td>
      <td><div class="comment-text ${c.is_harmful?'harmful':''}">${escHtml(c.text)}</div></td>
      <td><span class="tbl-badge ${c.is_harmful?'danger':'safe'}">${c.is_harmful?'🚫 '+titleCase(c.prediction):'✅ Safe'}</span></td>
      <td><span class="tbl-conf">${pct}%</span></td>
    `;
    tbody.appendChild(tr);
  });

  // Reset filter
  document.querySelectorAll('.filter-chip').forEach(b=>b.classList.remove('active'));
  document.querySelector('.filter-chip[data-filter="all"]').classList.add('active');

  ytResultSection.classList.add('visible');
}

/* Export CSV */
exportCsvBtn.addEventListener('click',()=>{
  if (!allCommentData.length) return;
  const rows = [['Author','Comment','Prediction','Confidence','Harmful'],
    ...allCommentData.map(c=>[
      `"${c.author.replace(/"/g,'""')}"`,
      `"${c.text.replace(/"/g,'""')}"`,
      `"${c.prediction}"`,
      `"${Math.round(c.confidence*100)}%"`,
      `"${c.is_harmful?'Yes':'No'}"`,
    ])
  ];
  const blob = new Blob([rows.map(r=>r.join(',')).join('\n')], {type:'text/csv'});
  const a    = Object.assign(document.createElement('a'), {href:URL.createObjectURL(blob), download:'safeguard_yt_report.csv'});
  a.click(); URL.revokeObjectURL(a.href);
});

ytResetBtn.addEventListener('click',()=>{ resetYtPanels(); ytUrlInput.value=''; allCommentData=[]; ytUrlInput.focus(); });
ytRetryBtn.addEventListener('click',()=>{ ytErrorState.classList.remove('visible'); doYtAnalyze(); });

async function doYtAnalyze() {
  const url = ytUrlInput.value.trim();

  if (!url) {
    ytUrlInput.style.borderColor = 'var(--danger)';
    ytUrlInput.style.boxShadow   = '0 0 0 3px var(--danger-bg)';
    setTimeout(()=>{ ytUrlInput.style.borderColor=''; ytUrlInput.style.boxShadow=''; }, 1200);
    return;
  }

  resetYtPanels();
  ytAnalyzeBtn.disabled = true;
  ytAnalyzeBtn.querySelector('.btn-label').textContent = 'Scanning…';
  ytLoadingState.classList.add('visible');
  animateSteps(ytStep1, ytStep2, ytStep3);

  try {
    // ✅ FIXED URL (underscore)
    const res = await fetch('/analyze_youtube', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url })
    });

    // ✅ Better error handling
    if (!res.ok) {
      const text = await res.text();
      console.error("Server Error:", text);
      throw new Error(`Server Error: ${res.status}`);
    }

    const data = await res.json();
    console.log("API Response:", data); // DEBUG

    ytLoaderTimers.push(setTimeout(()=>{ ytStep3.classList.replace('active','done'); }, 3200));
    await new Promise(r=>setTimeout(r,3400));

    ytLoadingState.classList.remove('visible');
    renderYtResults(data);

  } catch (err) {
    console.error("FULL ERROR:", err); // DEBUG

    ytLoadingState.classList.remove('visible');
    ytErrorMsg.textContent = "❌ " + (err.message || "Failed to scan");
    ytErrorState.classList.add('visible');
  } finally {
    ytAnalyzeBtn.disabled = false;
    ytAnalyzeBtn.querySelector('.btn-label').textContent = 'Scan Comments';
  }
}

ytAnalyzeBtn.addEventListener('click', doYtAnalyze);

ytUrlInput.addEventListener('keydown', e=>{ if (e.key==='Enter') doYtAnalyze(); });