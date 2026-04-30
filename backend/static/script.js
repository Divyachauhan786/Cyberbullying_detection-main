/**
 * SafeGuard AI — Cyberbullying Detection System
 * Frontend Logic: script.js
 * ─────────────────────────────────────────────
 * Sends text to Flask /analyze endpoint and renders results.
 * Expected response shape:
 *   { prediction: string, confidence: number }
 *
 * `prediction` values (case-insensitive):
 *   "not cyberbullying" | "cyberbullying" | "threat" |
 *   "hate" | "insult" | "offensive language" | etc.
 *
 * `confidence` — float between 0 and 1 (e.g. 0.94)
 */

/* ─── DOM References ────────────────────────────────────────── */
const textInput       = document.getElementById('textInput');
const charCount       = document.getElementById('charCount');
const clearBtn        = document.getElementById('clearBtn');
const analyzeBtn      = document.getElementById('analyzeBtn');
const loadingState    = document.getElementById('loadingState');
const resultSection   = document.getElementById('resultSection');
const errorState      = document.getElementById('errorState');
const errorMsg        = document.getElementById('errorMsg');
const retryBtn        = document.getElementById('retryBtn');
const reAnalyzeBtn    = document.getElementById('reAnalyzeBtn');
const copyReportBtn   = document.getElementById('copyReportBtn');

// Verdict
const verdictBanner   = document.getElementById('verdictBanner');
const verdictIcon     = document.getElementById('verdictIcon');
const verdictLabel    = document.getElementById('verdictLabel');
const verdictValue    = document.getElementById('verdictValue');
const verdictBadge    = document.getElementById('verdictBadge');

// Metrics
const categoryIcon    = document.getElementById('categoryIcon');
const categoryValue   = document.getElementById('categoryValue');
const categorySub     = document.getElementById('categorySub');
const confidenceNumber= document.getElementById('confidenceNumber');
const confidenceFill  = document.getElementById('confidenceFill');
const riskTags        = document.getElementById('riskTags');

// Loading steps
const step1 = document.getElementById('step1');
const step2 = document.getElementById('step2');
const step3 = document.getElementById('step3');

/* ─── Category Metadata ─────────────────────────────────────── */
const CATEGORIES = {
  'not cyberbullying': {
    icon: '✅',
    label: 'Safe Content',
    sub: 'No harmful patterns detected',
    isSafe: true,
    signals: [
      { label: 'No threats detected', type: 'safe' },
      { label: 'Respectful tone', type: 'safe' },
      { label: 'No hate speech', type: 'safe' },
    ],
  },
  cyberbullying: {
    icon: '🚫',
    label: 'Cyberbullying',
    sub: 'Harmful or harassing content',
    isSafe: false,
    signals: [
      { label: 'Harassment', type: 'danger' },
      { label: 'Targeting individual', type: 'danger' },
      { label: 'Repeated abuse', type: 'warn' },
    ],
  },
  threat: {
    icon: '⚠️',
    label: 'Threat',
    sub: 'Threatening language detected',
    isSafe: false,
    signals: [
      { label: 'Physical threat', type: 'danger' },
      { label: 'Intimidation', type: 'danger' },
      { label: 'Violent language', type: 'warn' },
    ],
  },
  hate: {
    icon: '🔴',
    label: 'Hate Speech',
    sub: 'Content targeting groups or identities',
    isSafe: false,
    signals: [
      { label: 'Group targeting', type: 'danger' },
      { label: 'Discriminatory language', type: 'danger' },
      { label: 'Derogatory terms', type: 'warn' },
    ],
  },
  insult: {
    icon: '🗣️',
    label: 'Insult',
    sub: 'Offensive or degrading language',
    isSafe: false,
    signals: [
      { label: 'Personal attack', type: 'warn' },
      { label: 'Derogatory phrasing', type: 'warn' },
      { label: 'Offensive language', type: 'danger' },
    ],
  },
  'offensive language': {
    icon: '🔞',
    label: 'Offensive Language',
    sub: 'Inappropriate or vulgar content',
    isSafe: false,
    signals: [
      { label: 'Vulgar content', type: 'warn' },
      { label: 'Inappropriate tone', type: 'warn' },
      { label: 'Profanity', type: 'neutral' },
    ],
  },
};

/* Fallback for unknown categories */
function getCategoryMeta(raw) {
  const key = (raw || '').toLowerCase().trim();
  if (CATEGORIES[key]) return { ...CATEGORIES[key], rawKey: key };
  // Partial match
  for (const [k, v] of Object.entries(CATEGORIES)) {
    if (key.includes(k) || k.includes(key)) return { ...v, rawKey: k };
  }
  // Generic fallback
  const isSafe = key.includes('not') || key.includes('safe') || key.includes('clean');
  return {
    icon: isSafe ? '✅' : '⚠️',
    label: toTitleCase(raw || 'Unknown'),
    sub: isSafe ? 'Content appears safe' : 'Potentially harmful content',
    isSafe,
    signals: [{ label: toTitleCase(raw || 'Unknown'), type: isSafe ? 'safe' : 'warn' }],
    rawKey: key,
  };
}

/* ─── State ─────────────────────────────────────────────────── */
let lastResponse = null;
let loadingTimers = [];

/* ─── Helpers ───────────────────────────────────────────────── */
function toTitleCase(str) {
  return str.replace(/\w\S*/g, t => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());
}

function hide(el) {
  el.classList.remove('visible');
  el.setAttribute('aria-hidden', 'true');
}
function show(el) {
  el.classList.add('visible');
  el.setAttribute('aria-hidden', 'false');
}
function resetPanels() {
  hide(loadingState);
  hide(resultSection);
  hide(errorState);
}


/* ─── Character Counter ─────────────────────────────────────── */
textInput.addEventListener('input', () => {
  const len = textInput.value.length;
  charCount.textContent = len;
  charCount.parentElement.classList.remove('warn', 'danger');
  if (len > 1800) charCount.parentElement.classList.add('danger');
  else if (len > 1400) charCount.parentElement.classList.add('warn');
});

/* ─── Clear Button ──────────────────────────────────────────── */
clearBtn.addEventListener('click', () => {
  textInput.value = '';
  charCount.textContent = '0';
  charCount.parentElement.classList.remove('warn', 'danger');
  resetPanels();
  lastResponse = null;
  textInput.focus();
});

/* ─── Reset (Re-analyze) ────────────────────────────────────── */
reAnalyzeBtn.addEventListener('click', () => {
  hide(resultSection);
  textInput.focus();
});

/* ─── Retry button ──────────────────────────────────────────── */
retryBtn.addEventListener('click', () => {
  hide(errorState);
  doAnalyze();
});

/* ─── Copy Report ───────────────────────────────────────────── */
copyReportBtn.addEventListener('click', () => {
  if (!lastResponse) return;

  const meta = getCategoryMeta(lastResponse.prediction);
  const confidence = Math.round(lastResponse.confidence * 100);
  const signals = meta.signals.map(s => `  • ${s.label}`).join('\n');
  const text = `SafeGuard AI — Cyberbullying Detection Report
════════════════════════════════════════
Result     : ${meta.isSafe ? '✅ Not Cyberbullying' : '🚫 Cyberbullying Detected'}
Category   : ${meta.label}
Confidence : ${confidence}%
────────────────────────────────────────
Detected Signals:
${signals}
────────────────────────────────────────
Input Text :
${textInput.value.trim()}
════════════════════════════════════════
Generated by SafeGuard AI`;

  navigator.clipboard.writeText(text).then(() => {
    copyReportBtn.innerHTML = '<span>✅</span> Copied!';
    copyReportBtn.classList.add('copied');
    setTimeout(() => {
      copyReportBtn.innerHTML = '<span>📋</span> Copy Report';
      copyReportBtn.classList.remove('copied');
    }, 2200);
  }).catch(() => {
    copyReportBtn.innerHTML = '<span>⛔</span> Failed';
    setTimeout(() => {
      copyReportBtn.innerHTML = '<span>📋</span> Copy Report';
    }, 1800);
  });
});

/* ─── Loading Animation Steps ───────────────────────────────── */
function animateLoadingSteps() {
  // Clear any previous timers
  loadingTimers.forEach(clearTimeout);
  loadingTimers = [];

  [step1, step2, step3].forEach(s => {
    s.classList.remove('active', 'done');
  });

  step1.classList.add('active');

  loadingTimers.push(setTimeout(() => {
    step1.classList.remove('active');
    step1.classList.add('done');
    step2.classList.add('active');
  }, 800));

  loadingTimers.push(setTimeout(() => {
    step2.classList.remove('active');
    step2.classList.add('done');
    step3.classList.add('active');
  }, 1700));
}

/* ─── Render Result ─────────────────────────────────────────── */
function renderResult(data) {
  const meta = getCategoryMeta(data.prediction);
  const confidence = Math.round(data.confidence * 100);

  /* Verdict banner */
  verdictBanner.className = 'verdict-banner ' + (meta.isSafe ? 'safe' : 'danger');
  verdictIcon.textContent = meta.icon;
  verdictValue.textContent = meta.isSafe ? 'Not Cyberbullying' : 'Cyberbullying Detected';
  verdictBadge.textContent = meta.isSafe ? 'Safe ✓' : 'Unsafe ✗';

  /* Category card */
  categoryIcon.textContent = meta.icon;
  categoryValue.textContent = meta.label;
  categorySub.textContent = meta.sub;

  /* Confidence */
  confidenceNumber.textContent = confidence + '%';
  const fillColor = meta.isSafe
    ? 'linear-gradient(90deg, #22c55e, #16a34a)'
    : confidence > 80
      ? 'linear-gradient(90deg, #ef4444, #b91c1c)'
      : 'linear-gradient(90deg, #f59e0b, #d97706)';

  confidenceFill.style.background = fillColor;

  // Animate bar after short delay
  setTimeout(() => {
    confidenceFill.style.width = confidence + '%';
  }, 100);

  /* Risk tags */
  riskTags.innerHTML = '';
  meta.signals.forEach((sig, i) => {
    const tag = document.createElement('span');
    tag.className = `risk-tag ${sig.type}`;
    tag.textContent = sig.label;
    tag.style.animationDelay = `${i * 80}ms`;
    riskTags.appendChild(tag);
  });

  // Add confidence tag
  const confTag = document.createElement('span');
  const confClass = confidence >= 80 ? 'danger' : confidence >= 60 ? 'warn' : 'neutral';
  confTag.className = `risk-tag ${confClass}`;
  confTag.textContent = `${confidence}% confidence`;
  confTag.style.animationDelay = `${meta.signals.length * 80}ms`;
  riskTags.appendChild(confTag);
}

/* ─── Core: doAnalyze() ─────────────────────────────────────── */
async function doAnalyze() {
  const text = textInput.value.trim();

  if (!text) {
    textInput.focus();
    textInput.style.borderColor = 'var(--danger-red)';
    textInput.style.boxShadow = '0 0 0 3px var(--danger-bg)';
    setTimeout(() => {
      textInput.style.borderColor = '';
      textInput.style.boxShadow = '';
    }, 1200);
    return;
  }

  /* Reset panels and show loading */
  resetPanels();
  analyzeBtn.disabled = true;
  analyzeBtn.querySelector('.btn-text').textContent = 'Analyzing…';

  show(loadingState);
  animateLoadingSteps();

  try {
    // ✅ Correct
    const response = await fetch('/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: text })  // key must be "text"
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `Server error: ${response.status}`);
    }

    const data = await response.json();

    // Validate response shape
    if (typeof data.prediction !== 'string' || typeof data.confidence !== 'number') {
      throw new Error('Invalid response format from server.');
    }

    lastResponse = data;

    // Complete loading animation
    loadingTimers.push(setTimeout(() => {
      step3.classList.remove('active');
      step3.classList.add('done');
    }, 2400));

    // Small delay so user sees steps complete
    await new Promise(r => setTimeout(r, 2600));

    hide(loadingState);
    renderResult(data);
    show(resultSection);

  } catch (err) {
    hide(loadingState);
    errorMsg.textContent = err.message || 'Something went wrong. Please try again.';
    show(errorState);
  } finally {
    analyzeBtn.disabled = false;
    analyzeBtn.querySelector('.btn-text').textContent = 'Analyze Text';
  }
}

/* ─── Analyze Button ────────────────────────────────────────── */
analyzeBtn.addEventListener('click', doAnalyze);

/* Allow Ctrl+Enter / Cmd+Enter to submit */
textInput.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    doAnalyze();
  }
});

/* ─── Keyboard shortcut hint (subtle UX) ───────────────────── */
textInput.addEventListener('focus', () => {
  if (!textInput.dataset.hinted) {
    textInput.dataset.hinted = '1';
    // Subtle placeholder update after first focus
    setTimeout(() => {
      if (!textInput.value) {
        textInput.setAttribute('placeholder',
          'Type or paste your text…\n\n(Ctrl+Enter to analyze quickly)');
      }
    }, 3000);
  }
});
