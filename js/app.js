/* ======================================================
   RÉSUMÉ.AI — ATS Intelligence Platform
   Main Application JavaScript
   ====================================================== */

'use strict';

// ---- CURSOR ----
const cursor = document.getElementById('cursor');
const cursorTrail = document.getElementById('cursorTrail');
let mx = -100, my = -100, tx = -100, ty = -100;

document.addEventListener('mousemove', e => {
  mx = e.clientX; my = e.clientY;
  cursor.style.left = mx + 'px';
  cursor.style.top = my + 'px';
});

function animTrail() {
  tx += (mx - tx) * 0.14;
  ty += (my - ty) * 0.14;
  cursorTrail.style.left = tx + 'px';
  cursorTrail.style.top = ty + 'px';
  requestAnimationFrame(animTrail);
}
animTrail();

document.querySelectorAll('button, textarea, a, .nav-item').forEach(el => {
  el.addEventListener('mouseenter', () => {
    cursor.style.width = '16px';
    cursor.style.height = '16px';
    cursorTrail.style.opacity = '1';
    cursorTrail.style.transform = 'translate(-50%,-50%) scale(1.4)';
  });
  el.addEventListener('mouseleave', () => {
    cursor.style.width = '10px';
    cursor.style.height = '10px';
    cursorTrail.style.opacity = '0.6';
    cursorTrail.style.transform = 'translate(-50%,-50%) scale(1)';
  });
});

// ---- STATE ----
let analysis = null;

// ---- DOM ----
const resumeInput = document.getElementById('resumeInput');
const jobInput = document.getElementById('jobInput');
const analyzeBtn = document.getElementById('analyzeBtn');
const newAnalysisBtn = document.getElementById('newAnalysisBtn');
const exportBtn = document.getElementById('exportBtn');

const phaseInput = document.getElementById('phaseInput');
const phaseLoading = document.getElementById('phaseLoading');
const phaseResults = document.getElementById('phaseResults');

// ---- CHAR COUNTERS ----
function updateCounters() {
  const r = resumeInput.value.length;
  const j = jobInput.value.length;
  const total = r + j;

  document.getElementById('resumeCounter').textContent = r.toLocaleString() + ' chars';
  document.getElementById('jobCounter').textContent = j.toLocaleString() + ' chars';
  document.getElementById('totalChars').textContent = total.toLocaleString();

  updateIndicator('resumeIndicator', r);
  updateIndicator('jobIndicator', j);
}

function updateIndicator(id, len) {
  const el = document.getElementById(id);
  const dot = el.querySelector('.ind-dot');
  const txt = el.querySelector('.ind-text');
  if (len === 0) {
    dot.className = 'ind-dot empty';
    txt.textContent = 'Awaiting input';
  } else if (len < 200) {
    dot.className = 'ind-dot partial';
    txt.textContent = 'Add more content';
  } else {
    dot.className = 'ind-dot ready';
    txt.textContent = 'Ready ✓';
  }
}

resumeInput.addEventListener('input', updateCounters);
jobInput.addEventListener('input', updateCounters);

// ---- PHASE SWITCH ----
function showPhase(phase) {
  [phaseInput, phaseLoading, phaseResults].forEach(p => p.classList.add('hidden'));
  phase.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---- LOADING ANIMATION ----
function animateLoadingSteps() {
  const steps = ['ls1', 'ls2', 'ls3', 'ls4', 'ls5'];
  const icons = ['◉', '◉', '◉', '◉', '◉'];
  steps.forEach(id => {
    const el = document.getElementById(id);
    el.className = 'lstep';
    el.querySelector('.lstep-icon').textContent = '○';
  });
  steps.forEach((id, i) => {
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.add('active');
        el.querySelector('.lstep-icon').textContent = '◌';
        setTimeout(() => {
          if (el) {
            el.classList.remove('active');
            el.classList.add('done');
            el.querySelector('.lstep-icon').textContent = '◉';
          }
        }, 800);
      }
    }, i * 900 + 400);
  });
}

// ---- TOAST ----
function showToast(msg, type = 'error') {
  let wrap = document.querySelector('.toast-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = 'toast-wrap';
    document.body.appendChild(wrap);
  }
  const t = document.createElement('div');
  t.className = 'toast' + (type === 'info' ? ' info' : '');
  t.textContent = msg;
  wrap.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 400); }, 3200);
}

// ---- CONFIG ----
const GROQ_API_KEY = 'grok api key'; // Get free key at console.groq.com
const GROQ_MODEL   = 'llama-3.3-70b-versatile';

// ---- FILE UPLOAD SETUP ----
// Set pdf.js worker
if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

setupUploadZone('resumeUploadZone', 'resumeFileInput', 'resumeFileInfo', 'resumeInput', 'resumeClearBtn', 'resumeIndicator', 'resumeCounter');
setupUploadZone('jobUploadZone',    'jobFileInput',    'jobFileInfo',    'jobInput',    'jobClearBtn',    'jobIndicator',    'jobCounter');

function setupUploadZone(zoneId, inputId, infoId, textareaId, clearBtnId, indicatorId, counterId) {
  const zone      = document.getElementById(zoneId);
  const fileInput = document.getElementById(inputId);
  const infoEl    = document.getElementById(infoId);
  const textarea  = document.getElementById(textareaId);
  const clearBtn  = document.getElementById(clearBtnId);

  // Drag events
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file, zone, infoEl, textarea, clearBtn, indicatorId, counterId);
  });

  // Click to pick file — the hidden input covers the zone
  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (file) handleFile(file, zone, infoEl, textarea, clearBtn, indicatorId, counterId);
    fileInput.value = ''; // reset so same file can be re-selected
  });

  // Clear button
  clearBtn.addEventListener('click', e => {
    e.stopPropagation();
    textarea.value = '';
    infoEl.innerHTML = '';
    zone.classList.remove('has-file');
    clearBtn.style.display = 'none';
    updateCounters();
  });
}

async function handleFile(file, zone, infoEl, textarea, clearBtn, indicatorId, counterId) {
  const ext = file.name.split('.').pop().toLowerCase();
  const allowed = ['pdf', 'doc', 'docx', 'txt'];
  if (!allowed.includes(ext)) {
    showToast('Unsupported file type. Please use PDF, DOCX, or TXT.');
    return;
  }

  // Show parsing state
  infoEl.innerHTML = `<span class="uz-parsing">⏳ Parsing ${file.name}…</span>`;
  zone.classList.add('has-file');

  try {
    let text = '';
    if (ext === 'txt') {
      text = await readAsText(file);
    } else if (ext === 'pdf') {
      text = await parsePDF(file);
    } else if (ext === 'doc' || ext === 'docx') {
      text = await parseDOCX(file);
    }

    if (!text || text.trim().length < 20) {
      throw new Error('Could not extract text from this file. Try copy-pasting the content instead.');
    }

    textarea.value = text.trim();
    updateCounters();

    const kb = (file.size / 1024).toFixed(1);
    infoEl.innerHTML = `
      <span style="font-size:18px">✅</span>
      <span class="uz-file-name">${file.name}</span>
      <span class="uz-file-size">${kb} KB</span>
      <button class="uz-remove" title="Remove file">✕</button>
    `;

    // Remove button inside info
    infoEl.querySelector('.uz-remove').addEventListener('click', e => {
      e.stopPropagation();
      textarea.value = '';
      infoEl.innerHTML = '';
      zone.classList.remove('has-file');
      clearBtn.style.display = 'none';
      updateCounters();
    });

    clearBtn.style.display = 'inline-block';
  } catch (err) {
    zone.classList.remove('has-file');
    infoEl.innerHTML = '';
    showToast(err.message || 'Failed to parse file.');
  }
}

function readAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Failed to read text file.'));
    reader.readAsText(file);
  });
}

async function parsePDF(file) {
  if (!window.pdfjsLib) throw new Error('PDF parser not loaded. Check your internet connection.');
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map(item => item.str).join(' ');
    fullText += pageText + '\n';
  }
  return fullText;
}

async function parseDOCX(file) {
  if (!window.mammoth) throw new Error('DOCX parser not loaded. Check your internet connection.');
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}


function buildPrompt(resume, job) {
  return `You are an ATS expert. Analyze the resume vs job description. Reply with ONLY a raw JSON object — no markdown, no backticks, no explanation, no text before or after the JSON.

RESUME:
${resume.substring(0, 2500)}

JOB DESCRIPTION:
${job.substring(0, 1800)}

Return this exact JSON (keep all string values SHORT — max 120 chars each to avoid truncation):
{"ats_score":0,"grade":"A","grade_label":"Exceptional","summary":"Two sentence summary here.","subscores":{"keyword_match":0,"format_ats":0,"experience_relevance":0,"skills_alignment":0},"matched_keywords":["k1","k2","k3","k4","k5","k6","k7","k8"],"missing_keywords":["k1","k2","k3","k4","k5","k6"],"partial_keywords":["k1","k2","k3","k4"],"strengths":[{"title":"Title","detail":"Detail."},{"title":"Title","detail":"Detail."},{"title":"Title","detail":"Detail."},{"title":"Title","detail":"Detail."}],"gaps":[{"title":"Title","detail":"Detail.","severity":"high"},{"title":"Title","detail":"Detail.","severity":"medium"},{"title":"Title","detail":"Detail.","severity":"low"}],"improvements":[{"section":"Section","icon":"✏️","suggestion":"Suggestion."},{"section":"Section","icon":"📊","suggestion":"Suggestion."},{"section":"Section","icon":"🎯","suggestion":"Suggestion."},{"section":"Section","icon":"💡","suggestion":"Suggestion."},{"section":"Section","icon":"🔑","suggestion":"Suggestion."}]}

Fill in real values. grade must be A/B/C/D. grade_label must be Exceptional/Strong/Moderate/Weak. severity must be high/medium/low.`;
}

async function groqFetch(prompt) {
  const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      max_tokens: 4000,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You are an ATS resume analysis expert. Always respond with valid JSON only. No markdown. No explanation.'
        },
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!resp.ok) {
    const err = await resp.text();
    let msg = `Groq API error ${resp.status}`;
    try { msg = JSON.parse(err).error?.message || msg; } catch(e) {}
    throw new Error(msg);
  }

  const data = await resp.json();
  return data.choices[0].message.content;
}

function safeParseJSON(raw) {
  // Strip markdown fences if present
  let text = raw.replace(/```json[\s\S]*?```/g, match => match.slice(7, -3))
                .replace(/```[\s\S]*?```/g, match => match.slice(3, -3))
                .trim();

  // Try direct parse first
  try { return JSON.parse(text); } catch(e) {}

  // Extract first { ... } block
  const start = text.indexOf('{');
  const end   = text.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    try { return JSON.parse(text.slice(start, end + 1)); } catch(e) {}
  }

  // Last resort: try to fix truncated JSON by closing open structures
  try {
    let fixed = text.slice(start);
    // Count unclosed brackets/braces
    let braces = 0, brackets = 0, inStr = false, escape = false;
    for (const ch of fixed) {
      if (escape) { escape = false; continue; }
      if (ch === '\\' && inStr) { escape = true; continue; }
      if (ch === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (ch === '{') braces++;
      else if (ch === '}') braces--;
      else if (ch === '[') brackets++;
      else if (ch === ']') brackets--;
    }
    // Close any dangling string
    if (inStr) fixed += '"';
    // Close open arrays/objects
    while (brackets > 0) { fixed += ']'; brackets--; }
    while (braces > 0)   { fixed += '}'; braces--; }
    return JSON.parse(fixed);
  } catch(e) {
    throw new Error('Could not parse AI response. Please try again.');
  }
}

async function callClaudeAPI(resume, job) {
  const prompt = buildPrompt(resume, job);
  const raw = await groqFetch(prompt);
  return safeParseJSON(raw);
}

// ---- ANALYZE ----
analyzeBtn.addEventListener('click', async () => {
  const resume = resumeInput.value.trim();
  const job = jobInput.value.trim();

  if (!resume) { showToast('Please paste your resume text first'); return; }
  if (!job) { showToast('Please paste the job description first'); return; }
  if (resume.length < 80) { showToast('Resume text seems too short — paste more content'); return; }
  if (job.length < 80) { showToast('Job description seems too short — paste more content'); return; }

  showPhase(phaseLoading);
  animateLoadingSteps();

  try {
    const data = await callClaudeAPI(resume, job);
    analysis = data;
    renderResults(data);
    showPhase(phaseResults);
  } catch (e) {
    console.error(e);
    showToast('Analysis failed: ' + e.message.substring(0, 80));
    showPhase(phaseInput);
  }
});

// ---- RESET ----
newAnalysisBtn.addEventListener('click', () => {
  analysis = null;
  resumeInput.value = '';
  jobInput.value = '';
  updateCounters();
  showPhase(phaseInput);
});

// ---- EXPORT ----
exportBtn.addEventListener('click', () => {
  showToast('Opening print dialog for PDF export...', 'info');
  setTimeout(() => window.print(), 600);
});

// ---- RENDER RESULTS ----
function renderResults(data) {
  // Score
  animNumber(document.getElementById('displayScore'), 0, data.ats_score, 1400);
  document.getElementById('displayGrade').textContent = data.grade;
  document.getElementById('displayGradeLabel').textContent = data.grade_label;
  document.getElementById('displayVerdict').textContent = data.summary;

  // Radar
  renderRadar(data.subscores);

  // Sub scores
  renderSubscores(data.subscores);

  // Keywords
  renderKeywords(data);

  // Strengths
  renderStrengths(data.strengths);

  // Gaps
  renderGaps(data.gaps);

  // Improvements
  renderImprovements(data.improvements);

  // Summary
  renderSummary(data);
}

// ---- RADAR CHART ----
function renderRadar(subscores) {
  const container = document.getElementById('radarChart');
  const vals = [
    subscores.keyword_match / 100,
    subscores.format_ats / 100,
    subscores.experience_relevance / 100,
    subscores.skills_alignment / 100
  ];
  const labels = ['Keywords', 'Format', 'Experience', 'Skills'];
  const cx = 110, cy = 110, r = 85;
  const angles = [0, 1, 2, 3].map(i => (i * Math.PI * 2) / 4 - Math.PI / 2);

  function pt(frac, a) {
    return [cx + frac * r * Math.cos(a), cy + frac * r * Math.sin(a)];
  }

  // Grid rings
  let gridPaths = '';
  [0.25, 0.5, 0.75, 1].forEach(frac => {
    const pts = angles.map(a => pt(frac, a));
    const d = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join('') + 'Z';
    gridPaths += `<path d="${d}" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="1"/>`;
  });

  // Axes
  let axes = angles.map(a => {
    const [x, y] = pt(1, a);
    return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>`;
  }).join('');

  // Data polygon
  const dataPts = vals.map((v, i) => pt(v, angles[i]));
  const dataD = dataPts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join('') + 'Z';

  // Labels
  const labelPts = angles.map((a, i) => {
    const [x, y] = pt(1.22, a);
    return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" fill="rgba(201,168,76,0.7)" font-size="9" font-family="JetBrains Mono, monospace" letter-spacing="1">${labels[i].toUpperCase()}</text>`;
  }).join('');

  // Data dots
  const dots = dataPts.map(([x, y]) =>
    `<circle cx="${x}" cy="${y}" r="4" fill="#C9A84C"/>`
  ).join('');

  container.innerHTML = `
    <svg class="radar-svg" viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg">
      ${gridPaths}
      ${axes}
      <path d="${dataD}" fill="rgba(201,168,76,0.15)" stroke="#C9A84C" stroke-width="2"/>
      ${dots}
      ${labelPts}
    </svg>`;
}

// ---- SUBSCORES ----
function renderSubscores(ss) {
  const items = [
    { key: 'keyword_match', label: 'Keyword Match', cls: 'c-gold', barColor: '#C9A84C' },
    { key: 'format_ats', label: 'ATS Format', cls: 'c-blue', barColor: '#1A3B6B' },
    { key: 'experience_relevance', label: 'Experience', cls: 'c-green', barColor: '#1A6B3A' },
    { key: 'skills_alignment', label: 'Skills', cls: 'c-red', barColor: '#C53030' }
  ];
  const row = document.getElementById('subscoreRow');
  row.innerHTML = items.map(item => `
    <div class="subscore-card ${item.cls}">
      <div class="ss-name">${item.label}</div>
      <div class="ss-value" style="color:${item.barColor}">${ss[item.key]}</div>
      <div class="ss-bar"><div class="ss-fill" style="width:0%;background:${item.barColor}" data-w="${ss[item.key]}"></div></div>
    </div>
  `).join('');

  setTimeout(() => {
    row.querySelectorAll('.ss-fill').forEach(el => {
      el.style.width = el.dataset.w + '%';
    });
  }, 120);
}

// ---- KEYWORDS ----
function renderKeywords(data) {
  const matched = data.matched_keywords || [];
  const missing = data.missing_keywords || [];
  const partial = data.partial_keywords || [];

  document.getElementById('kwSummary').textContent =
    `${matched.length} matched · ${partial.length} partial · ${missing.length} missing`;

  document.getElementById('keywordSections').innerHTML = `
    <div>
      <div class="kw-group-label" style="color:var(--green)">✓ Matched (${matched.length})</div>
      <div class="kw-chips">${matched.map(k => `<span class="kw-chip kw-matched">${k}</span>`).join('')}</div>
    </div>
    <div>
      <div class="kw-group-label" style="color:var(--gold2)">≈ Partial (${partial.length})</div>
      <div class="kw-chips">${partial.map(k => `<span class="kw-chip kw-partial">${k}</span>`).join('')}</div>
    </div>
    <div>
      <div class="kw-group-label" style="color:var(--red)">✗ Missing (${missing.length})</div>
      <div class="kw-chips">${missing.map(k => `<span class="kw-chip kw-missing">${k}</span>`).join('')}</div>
    </div>
  `;
}

// ---- STRENGTHS ----
function renderStrengths(strengths) {
  document.getElementById('strengthList').innerHTML = (strengths || []).map((s, i) => `
    <div class="strength-item">
      <div class="si-num">0${i + 1}</div>
      <div class="si-content">
        <div class="si-title">${s.title}</div>
        <div class="si-detail">${s.detail}</div>
      </div>
    </div>
  `).join('');
}

// ---- GAPS ----
function renderGaps(gaps) {
  document.getElementById('gapList').innerHTML = (gaps || []).map(g => `
    <div class="gap-item">
      <div class="gap-sev ${g.severity}">${g.severity.toUpperCase()}</div>
      <div>
        <div class="gi-title">${g.title}</div>
        <div class="gi-detail">${g.detail}</div>
      </div>
    </div>
  `).join('');
}

// ---- IMPROVEMENTS ----
function renderImprovements(improvements) {
  const count = (improvements || []).length;
  document.getElementById('improvCount').textContent = `${count} action items identified`;

  document.getElementById('improvGrid').innerHTML = (improvements || []).map(item => `
    <div class="improv-item">
      <div class="improv-section">${item.section}</div>
      <div class="improv-icon">${item.icon || '→'}</div>
      <div class="improv-text">${item.suggestion}</div>
    </div>
  `).join('');
}

// ---- SUMMARY ----
function renderSummary(data) {
  document.getElementById('summaryBanner').innerHTML = `
    <div class="sb-label">AI VERDICT</div>
    <div class="sb-divider"></div>
    <div class="sb-text">${data.summary}</div>
  `;
}

// ---- NUMBER ANIMATION ----
function animNumber(el, from, to, duration) {
  const start = performance.now();
  function step(now) {
    const p = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(from + (to - from) * ease);
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ---- INIT ----
updateCounters();
