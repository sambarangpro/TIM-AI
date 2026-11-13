/**
 * ==============================================================================
 * AI MULTI-AGENT STUDIO WORKSPACE - ORCHESTRATION ENGINE
 * ==============================================================================
 * 
 * Mesin orkestrasi statis murni (Vanilla JS ES Module):
 * 1. Mengimpor AGENTS_TEAM dan WORKSPACE_CONFIG dari agents-config.js
 * 2. Mengelola Bring Your Own Key (BYOK) via LocalStorage
 * 3. Menjalankan alur kerja berantai (Sequential Handoff Pipeline) ke Gemini API
 * 4. Merender visual timeline, progres step, dan output Markdown
 * ==============================================================================
 */

import { AGENTS_TEAM, WORKSPACE_CONFIG } from './agents-config.js';

// ==========================================
// STATE MANAGEMENT
// ==========================================
const state = {
  apiKey: localStorage.getItem(WORKSPACE_CONFIG.storageKeyApiKey) || '',
  isRunning: false,
  abortController: null,
  currentAgentIndex: -1,
  // Menyimpan output tiap agen: { [agentId]: { text, durationMs, usage, timestamp, status } }
  outputs: {},
  activeTab: 'flow' // 'flow' | 'consolidated'
};

// ==========================================
// DOM ELEMENT REFERENCES
// ==========================================
const DOM = {
  // API Key Elements
  apiKeyIndicator: document.getElementById('api-key-indicator'),
  apiKeyStatusText: document.getElementById('api-key-status-text'),
  btnToggleKeyModal: document.getElementById('btn-toggle-key-modal'),
  btnQuickSetupKey: document.getElementById('btn-quick-setup-key'),
  modalApiKey: document.getElementById('modal-api-key'),
  btnCloseKeyModal: document.getElementById('btn-close-key-modal'),
  btnCancelKeyModal: document.getElementById('btn-cancel-key-modal'),
  btnSaveApiKey: document.getElementById('btn-save-api-key'),
  btnClearKey: document.getElementById('btn-clear-key'),
  inputApiKey: document.getElementById('input-api-key'),
  btnToggleKeyVisibility: document.getElementById('btn-toggle-key-visibility'),
  apiKeyAlert: document.getElementById('api-key-alert'),

  // Team Inspector Modal
  btnInspectTeam: document.getElementById('btn-inspect-team'),
  modalTeamInspector: document.getElementById('modal-team-inspector'),
  btnCloseTeamModal: document.getElementById('btn-close-team-modal'),
  btnDismissTeamModal: document.getElementById('btn-dismiss-team-modal'),
  teamInspectorContent: document.getElementById('team-inspector-content'),

  // Pipeline Stepper
  pipelineStepper: document.getElementById('pipeline-stepper'),
  pipelineAgentCount: document.getElementById('pipeline-agent-count'),
  pipelineStatusBadge: document.getElementById('pipeline-status-badge'),

  // Brief & Controls
  projectBrief: document.getElementById('project-brief'),
  briefCharCount: document.getElementById('brief-char-count'),
  btnRunPipeline: document.getElementById('btn-run-pipeline'),
  btnStopPipeline: document.getElementById('btn-stop-pipeline'),
  btnClearWorkspace: document.getElementById('btn-clear-workspace'),
  btnExportAllMd: document.getElementById('btn-export-all-md'),
  presetBtns: document.querySelectorAll('.preset-btn'),

  // Output Containers & Tabs
  containerSequentialOutputs: document.getElementById('container-sequential-outputs'),
  containerConsolidatedOutput: document.getElementById('container-consolidated-output'),
  consolidatedRenderedContent: document.getElementById('consolidated-rendered-content'),
  tabViewFlow: document.getElementById('tab-view-flow'),
  tabViewConsolidated: document.getElementById('tab-view-consolidated'),
  btnCopyConsolidated: document.getElementById('btn-copy-consolidated'),

  // Toast Container
  toastContainer: document.getElementById('toast-container')
};

// ==========================================
// PRESET BRIEFS DATA
// ==========================================
const PRESETS = {
  coffee: `Produk: "KalaNusa Cold Brew" - Kopi dingin botol siap minum (RTD) premium 250ml.
Bahan: 100% Single-origin Arabika Gayo & Flores Bajawa, diseduh dingin 18 jam lambat.
Keunggulan: Tanpa gula tambahan (0 Kalori), keasaman rendah (ramah lambung), botol kaca daur ulang dengan desain minimalis elegan.
Target Pasar: Profesional muda perkotaan usia 23-38 tahun di Jakarta, Surabaya, & Bandung yang menghargai cita rasa kopi autentik, gaya hidup produktif, dan kepedulian lingkungan.
Tujuan: Kampanye peluncuran digital multi-channel untuk mendominasi penjualan online via D2C dan marketplace premium.`,

  saas: `Produk: "CodeSprint AI" - Asisten otomatisasi pengujian kode berbasis agen kecerdasan buatan.
Keunggulan: Mengurangi waktu pembuatan unit test dan integration test dari hitungan jam menjadi 30 detik. Kompatibel dengan TypeScript, Python, dan Go. Integrasi langsung ke GitHub Actions dan GitLab CI.
Target Pasar: Engineering Leads, CTO startup Seri A-B, dan Senior DevOps Engineers.
Tujuan: Mengakuisisi 500 tim pengembang software dalam program Early Access Beta gratis selama 30 hari.
Pesan Kunci: "Tulis fitur lebih cepat, biarkan AI yang menjamin kode Anda tahan banting tanpa bug."`,

  fintech: `Produk: "NavaSave" - Aplikasi mikro-investasi dan dompet otomatis berbasis AI khusus Gen-Z dan First-jobber.
Keunggulan: Fitur "Round-up Spare Change" (setiap belanja dibulatkan ke Rp10.000 terdekat dan selisihnya otomatis diinvestasikan ke Reksa Dana Pasar Uang atau Emas Digital). Gamifikasi finansial dengan reward streak menabung.
Target Pasar: Mahasiswa tingkat akhir dan profesional baru usia 18-26 tahun yang sering merasa sulit menabung atau takut berinvestasi saham rumit.
Tujuan: Kampanye edukasi dan peluncuran aplikasi di media sosial (TikTok, Instagram Reels, Twitter/X) untuk 50.000 unduhan bulan pertama.`
};

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  initMarkdownRenderer();
  initApiKeyUI();
  renderPipelineStepper();
  renderAgentOutputContainers();
  setupEventListeners();
  updateApiKeyStatusBadge();
});

/**
 * Inisialisasi parser Markdown (marked.js) dengan opsi aman dan syntax highlighting
 */
function initMarkdownRenderer() {
  if (typeof marked !== 'undefined') {
    marked.setOptions({
      breaks: true,
      gfm: true,
      highlight: function (code, lang) {
        if (typeof hljs !== 'undefined' && lang && hljs.getLanguage(lang)) {
          try {
            return hljs.highlight(code, { language: lang }).value;
          } catch (e) {
            console.error('Highlight error', e);
          }
        }
        return code;
      }
    });
  }
}

/**
 * Inisialisasi nilai API Key dari LocalStorage
 */
function initApiKeyUI() {
  if (state.apiKey) {
    DOM.inputApiKey.value = state.apiKey;
    DOM.apiKeyAlert.classList.add('hidden');
  } else {
    DOM.apiKeyAlert.classList.remove('hidden');
  }
}

/**
 * Render visual stepper pipeline di bagian atas berdasarkan AGENTS_TEAM
 */
function renderPipelineStepper() {
  DOM.pipelineAgentCount.textContent = AGENTS_TEAM.length;
  DOM.pipelineStepper.innerHTML = '';

  AGENTS_TEAM.forEach((agent, index) => {
    const stepCard = document.createElement('div');
    stepCard.id = `stepper-step-${agent.id}`;
    stepCard.className = `p-4 rounded-xl border border-surface-700 bg-surface-900/80 transition-all duration-300 relative`;
    
    stepCard.innerHTML = `
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center space-x-2">
          <span class="w-6 h-6 rounded-full bg-surface-800 text-slate-300 flex items-center justify-center text-xs font-mono font-bold border border-surface-700 step-number">
            ${index + 1}
          </span>
          <span class="text-xs font-semibold text-slate-200 truncate max-w-[140px]">${agent.name}</span>
        </div>
        <span class="step-badge text-[10px] px-2 py-0.5 rounded-full font-mono bg-surface-800 text-slate-400 border border-surface-700">
          Menunggu
        </span>
      </div>

      <div class="text-xs text-slate-400 font-medium truncate mb-2.5">${agent.role}</div>

      <div class="flex items-center justify-between pt-2 border-t border-surface-800 text-[11px] text-slate-500 font-mono">
        <span class="text-brand-400 bg-brand-500/10 px-1.5 py-0.5 rounded">${agent.model}</span>
        <span class="step-timer">--</span>
      </div>
    `;

    DOM.pipelineStepper.appendChild(stepCard);
  });
}

/**
 * Render container kartu output untuk setiap agen di bawah workspace
 */
function renderAgentOutputContainers() {
  DOM.containerSequentialOutputs.innerHTML = '';

  AGENTS_TEAM.forEach((agent, index) => {
    const card = document.createElement('div');
    card.id = `output-card-${agent.id}`;
    card.className = `bg-surface-850 rounded-2xl border border-surface-750 overflow-hidden shadow-lg transition-all duration-300`;

    card.innerHTML = `
      <!-- Card Header -->
      <div class="p-4 sm:p-5 border-b border-surface-750 flex flex-wrap items-center justify-between gap-3 bg-surface-800/40">
        <div class="flex items-center space-x-3">
          <div class="w-9 h-9 rounded-xl bg-surface-750 text-slate-200 flex items-center justify-center font-bold text-sm shadow">
            ${agent.avatarBadge ? agent.avatarBadge.slice(0, 2) : (index + 1)}
          </div>
          <div>
            <div class="flex items-center space-x-2">
              <h4 class="text-sm font-bold text-white">${agent.name}</h4>
              <span class="text-xs text-slate-400">•</span>
              <span class="text-xs text-slate-300 font-medium">${agent.role}</span>
            </div>
            <div class="flex items-center space-x-2 mt-0.5 text-[11px] font-mono text-slate-400">
              <span class="text-brand-400">Model: ${agent.model}</span>
              <span>•</span>
              <span>Temp: ${agent.temperature}</span>
              <span id="output-meta-${agent.id}" class="text-slate-500 hidden sm:inline"></span>
            </div>
          </div>
        </div>

        <!-- Action Buttons for Output -->
        <div class="flex items-center space-x-2 text-xs">
          <span id="card-status-badge-${agent.id}" class="px-2.5 py-1 rounded-full text-[11px] font-mono bg-surface-800 text-slate-400 border border-surface-700">
            Menunggu Giliran
          </span>
          <button data-agent-id="${agent.id}" class="btn-copy-agent-output hidden px-3 py-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 border border-surface-700 text-slate-300 hover:text-white transition flex items-center space-x-1">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span>Salin</span>
          </button>
        </div>
      </div>

      <!-- Card Body Content -->
      <div class="p-5 sm:p-6">
        <!-- Placeholder Empty State -->
        <div id="output-placeholder-${agent.id}" class="text-center py-10 text-slate-500 space-y-2">
          <svg class="w-8 h-8 mx-auto text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <p class="text-xs">Output akan otomatis digenerate saat alur eksekusi mencapai tahap ini.</p>
        </div>

        <!-- Thinking / Loading Skeleton -->
        <div id="output-loading-${agent.id}" class="hidden space-y-4 py-4 animate-pulse">
          <div class="flex items-center space-x-2 text-brand-400 text-xs font-medium">
            <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>${agent.name} sedang memproses analisis & menyusun hasil...</span>
          </div>
          <div class="h-4 bg-surface-750 rounded w-3/4"></div>
          <div class="h-4 bg-surface-750 rounded w-5/6"></div>
          <div class="h-4 bg-surface-750 rounded w-2/3"></div>
          <div class="h-20 bg-surface-750/40 rounded"></div>
        </div>

        <!-- Rendered Output Area -->
        <div id="output-content-${agent.id}" class="hidden markdown-body"></div>

        <!-- Error Container (if failure occurs) -->
        <div id="output-error-${agent.id}" class="hidden p-4 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-300 text-xs space-y-3">
          <div class="font-bold flex items-center space-x-1.5 text-rose-200">
            <svg class="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Gagal Mengeksekusi Agen</span>
          </div>
          <p id="error-message-${agent.id}" class="font-mono text-[11px] leading-relaxed break-words"></p>
          <div class="pt-2">
            <button data-agent-index="${index}" class="btn-retry-single-agent px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-medium transition text-xs shadow">
              Ulangi Eksekusi Agen Ini
            </button>
          </div>
        </div>
      </div>
    `;

    DOM.containerSequentialOutputs.appendChild(card);
  });

  // Attach listener to newly created copy buttons
  document.querySelectorAll('.btn-copy-agent-output').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const agentId = btn.getAttribute('data-agent-id');
      if (state.outputs[agentId]?.text) {
        copyToClipboard(state.outputs[agentId].text, 'Output agen disalin ke clipboard!');
      }
    });
  });

  // Attach listener to retry buttons
  document.querySelectorAll('.btn-retry-single-agent').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(btn.getAttribute('data-agent-index'), 10);
      if (!isNaN(index)) {
        startPipeline(index);
      }
    });
  });
}

// ==========================================
// EVENT LISTENERS SETUP
// ==========================================
function setupEventListeners() {
  // API Key Modal Controls
  DOM.btnToggleKeyModal.addEventListener('click', openApiKeyModal);
  DOM.btnQuickSetupKey.addEventListener('click', openApiKeyModal);
  DOM.btnCloseKeyModal.addEventListener('click', closeApiKeyModal);
  DOM.btnCancelKeyModal.addEventListener('click', closeApiKeyModal);
  DOM.btnSaveApiKey.addEventListener('click', saveApiKey);
  DOM.btnClearKey.addEventListener('click', clearApiKey);
  DOM.btnToggleKeyVisibility.addEventListener('click', toggleKeyVisibility);

  // Close modal when clicking on backdrop
  DOM.modalApiKey.addEventListener('click', (e) => {
    if (e.target === DOM.modalApiKey) closeApiKeyModal();
  });

  // Team Inspector Modal Controls
  DOM.btnInspectTeam.addEventListener('click', openTeamModal);
  DOM.btnCloseTeamModal.addEventListener('click', closeTeamModal);
  DOM.btnDismissTeamModal.addEventListener('click', closeTeamModal);
  DOM.modalTeamInspector.addEventListener('click', (e) => {
    if (e.target === DOM.modalTeamInspector) closeTeamModal();
  });

  // Project Brief input counter
  DOM.projectBrief.addEventListener('input', () => {
    DOM.briefCharCount.textContent = `${DOM.projectBrief.value.length} karakter`;
  });

  // Preset buttons
  DOM.presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const presetKey = btn.getAttribute('data-preset');
      if (PRESETS[presetKey]) {
        DOM.projectBrief.value = PRESETS[presetKey];
        DOM.briefCharCount.textContent = `${DOM.projectBrief.value.length} karakter`;
        showToast('Template singkat dimuat ke kolom brief.', 'info');
      }
    });
  });

  // Pipeline Run / Stop Controls
  DOM.btnRunPipeline.addEventListener('click', () => startPipeline(0));
  DOM.btnStopPipeline.addEventListener('click', stopPipeline);
  DOM.btnClearWorkspace.addEventListener('click', resetWorkspace);
  DOM.btnExportAllMd.addEventListener('click', exportFullMarkdown);

  // Tab View Switcher
  DOM.tabViewFlow.addEventListener('click', () => switchOutputTab('flow'));
  DOM.tabViewConsolidated.addEventListener('click', () => switchOutputTab('consolidated'));
  DOM.btnCopyConsolidated.addEventListener('click', () => {
    const finalContent = generateConsolidatedMarkdown();
    if (finalContent) {
      copyToClipboard(finalContent, 'Paket Final Deliverable disalin ke clipboard!');
    }
  });
}

// ==========================================
// API KEY MANAGEMENT
// ==========================================
function openApiKeyModal() {
  DOM.inputApiKey.value = state.apiKey;
  DOM.modalApiKey.classList.remove('hidden');
  DOM.inputApiKey.focus();
}

function closeApiKeyModal() {
  DOM.modalApiKey.classList.add('hidden');
}

function saveApiKey() {
  const enteredKey = DOM.inputApiKey.value.trim();
  if (!enteredKey) {
    showToast('Kunci API tidak boleh kosong.', 'error');
    return;
  }

  state.apiKey = enteredKey;
  localStorage.setItem(WORKSPACE_CONFIG.storageKeyApiKey, enteredKey);
  updateApiKeyStatusBadge();
  DOM.apiKeyAlert.classList.add('hidden');
  closeApiKeyModal();
  showToast('API Key Gemini berhasil disimpan!', 'success');
}

function clearApiKey() {
  if (confirm('Apakah Anda yakin ingin menghapus API Key yang tersimpan di browser ini?')) {
    state.apiKey = '';
    localStorage.removeItem(WORKSPACE_CONFIG.storageKeyApiKey);
    DOM.inputApiKey.value = '';
    updateApiKeyStatusBadge();
    DOM.apiKeyAlert.classList.remove('hidden');
    closeApiKeyModal();
    showToast('API Key telah dihapus dari LocalStorage.', 'info');
  }
}

function toggleKeyVisibility() {
  if (DOM.inputApiKey.type === 'password') {
    DOM.inputApiKey.type = 'text';
  } else {
    DOM.inputApiKey.type = 'password';
  }
}

function updateApiKeyStatusBadge() {
  if (state.apiKey) {
    DOM.apiKeyIndicator.className = 'w-2 h-2 rounded-full bg-emerald-400';
    DOM.apiKeyStatusText.textContent = 'API Key Tersimpan';
    DOM.btnToggleKeyModal.classList.remove('border-rose-500/30', 'bg-rose-500/10');
    DOM.btnToggleKeyModal.classList.add('border-emerald-500/30', 'bg-emerald-500/10');
  } else {
    DOM.apiKeyIndicator.className = 'w-2 h-2 rounded-full bg-rose-500';
    DOM.apiKeyStatusText.textContent = 'API Key Belum Diisi';
    DOM.btnToggleKeyModal.classList.remove('border-emerald-500/30', 'bg-emerald-500/10');
    DOM.btnToggleKeyModal.classList.add('border-rose-500/30', 'bg-rose-500/10');
  }
}

// ==========================================
// TEAM CONFIGURATION INSPECTOR MODAL
// ==========================================
function openTeamModal() {
  DOM.teamInspectorContent.innerHTML = '';

  AGENTS_TEAM.forEach((agent, index) => {
    const section = document.createElement('div');
    section.className = 'p-4 rounded-xl border border-surface-700 bg-surface-900 space-y-3';

    section.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-2.5">
          <span class="w-6 h-6 rounded-md bg-brand-600 text-white flex items-center justify-center text-xs font-bold font-mono">
            ${index + 1}
          </span>
          <span class="font-bold text-white text-sm">${agent.name}</span>
          <span class="text-xs text-slate-400">(${agent.role})</span>
        </div>
        <div class="flex items-center space-x-2 text-xs font-mono">
          <span class="px-2 py-0.5 rounded bg-brand-500/20 text-brand-300">${agent.model}</span>
          <span class="px-2 py-0.5 rounded bg-surface-800 text-slate-400">Temp: ${agent.temperature}</span>
        </div>
      </div>

      <div class="space-y-1.5 text-xs">
        <div class="font-semibold text-slate-300">📋 SOP / System Prompt:</div>
        <pre class="p-3 bg-surface-950 rounded-lg text-slate-300 font-mono text-[11px] whitespace-pre-wrap border border-surface-800 leading-relaxed max-h-48 overflow-y-auto">${escapeHtml(agent.systemPrompt)}</pre>
      </div>

      <div class="space-y-1.5 text-xs">
        <div class="font-semibold text-slate-300">🎯 Task Instruction (Sequential Trigger):</div>
        <pre class="p-3 bg-surface-950 rounded-lg text-amber-200/90 font-mono text-[11px] whitespace-pre-wrap border border-surface-800 leading-relaxed max-h-36 overflow-y-auto">${escapeHtml(agent.taskInstruction)}</pre>
      </div>
    `;

    DOM.teamInspectorContent.appendChild(section);
  });

  DOM.modalTeamInspector.classList.remove('hidden');
}

function closeTeamModal() {
  DOM.modalTeamInspector.classList.add('hidden');
}

// ==========================================
// SEQUENTIAL HANDOFF ORCHESTRATION PIPELINE
// ==========================================

/**
 * Memulai pipeline eksekusi multi-agen secara berurutan.
 * @param {number} startIndex - Indeks agen mulai (0 untuk eksekusi baru, atau n untuk retry)
 */
async function startPipeline(startIndex = 0) {
  // 1. Validasi API Key
  if (!state.apiKey) {
    showToast('Harap masukkan Gemini API Key terlebih dahulu.', 'error');
    openApiKeyModal();
    return;
  }

  // 2. Validasi Brief Awal Proyek
  const initialBrief = DOM.projectBrief.value.trim();
  if (!initialBrief) {
    showToast('Harap tuliskan brief proyek Anda terlebih dahulu.', 'error');
    DOM.projectBrief.focus();
    return;
  }

  // 3. Setup Kontrol & Status UI
  state.isRunning = true;
  state.abortController = new AbortController();
  DOM.btnRunPipeline.classList.add('hidden');
  DOM.btnStopPipeline.classList.remove('hidden');
  DOM.pipelineStatusBadge.textContent = 'Status: Orkestrasi Berjalan...';
  DOM.pipelineStatusBadge.className = 'text-xs px-2.5 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 animate-pulse';

  showToast(`Memulai orkestrasi berantai untuk ${AGENTS_TEAM.length} agen...`, 'info');

  // Jika mulai dari awal (index 0), reset data yang ada
  if (startIndex === 0) {
    state.outputs = {};
    resetUIOutputs();
  }

  // 4. Eksekusi Loop Berurutan (Sequential Handoff)
  try {
    for (let i = startIndex; i < AGENTS_TEAM.length; i++) {
      if (!state.isRunning) break;

      state.currentAgentIndex = i;
      const currentAgent = AGENTS_TEAM[i];

      // Update UI Stepper & Card ke status "Working"
      updateStepperAgentState(currentAgent.id, 'working');
      updateCardAgentState(currentAgent.id, 'working');

      const startTime = performance.now();
      const timerInterval = startStepTimer(currentAgent.id, startTime);

      try {
        // Susun prompt akumulasi: Brief Awal + Output Agen Sebelumnya + Instruksi Tugas
        const accumulatedPrompt = buildSequentialPrompt(initialBrief, i);

        // Eksekusi pemanggilan Gemini REST API
        const responseData = await callGeminiAPI(currentAgent, accumulatedPrompt, state.abortController.signal);
        
        clearInterval(timerInterval);
        const durationSec = ((performance.now() - startTime) / 1000).toFixed(1);

        // Ekstrak teks hasil generasi
        const generatedText = responseData.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const usage = responseData.usageMetadata || {};

        if (!generatedText) {
          throw new Error('API Gemini tidak mengembalikan konten teks. Alasan selesai: ' + (responseData.candidates?.[0]?.finishReason || 'UNKNOWN'));
        }

        // Simpan ke state
        state.outputs[currentAgent.id] = {
          agentId: currentAgent.id,
          agentName: currentAgent.name,
          agentRole: currentAgent.role,
          model: currentAgent.model,
          text: generatedText,
          durationSec: `${durationSec}s`,
          usage: usage,
          timestamp: new Date().toLocaleTimeString('id-ID'),
          status: 'success'
        };

        // Update UI ke status "Completed"
        updateStepperAgentState(currentAgent.id, 'completed', `${durationSec}s`);
        renderAgentOutput(currentAgent.id, generatedText, durationSec, usage);

        showToast(`✅ ${currentAgent.name} (${currentAgent.role}) selesai!`, 'success');

      } catch (agentError) {
        clearInterval(timerInterval);
        if (agentError.name === 'AbortError') {
          updateStepperAgentState(currentAgent.id, 'waiting');
          updateCardAgentState(currentAgent.id, 'idle');
          throw agentError;
        }

        console.error(`Error on agent ${currentAgent.name}:`, agentError);
        updateStepperAgentState(currentAgent.id, 'failed');
        renderAgentError(currentAgent.id, agentError.message);
        throw agentError;
      }
    }

    // Seluruh agen berhasil menyelesaikan tugas
    if (state.isRunning) {
      DOM.pipelineStatusBadge.textContent = 'Status: Seluruh Agen Selesai ✨';
      DOM.pipelineStatusBadge.className = 'text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
      DOM.btnExportAllMd.removeAttribute('disabled');
      
      // Render paket final terpadu
      renderConsolidatedOutput();
      showToast('🎉 Seluruh tim agen berhasil menyelesaikan kampanye!', 'success');
    }

  } catch (error) {
    if (error.name === 'AbortError') {
      DOM.pipelineStatusBadge.textContent = 'Status: Dihentikan Pengguna';
      DOM.pipelineStatusBadge.className = 'text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30';
      showToast('Proses orkestrasi dihentikan oleh pengguna.', 'info');
    } else {
      DOM.pipelineStatusBadge.textContent = 'Status: Terjadi Kesalahan';
      DOM.pipelineStatusBadge.className = 'text-xs px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30';
      showToast(`Gagal: ${error.message}`, 'error');
    }
  } finally {
    state.isRunning = false;
    state.abortController = null;
    DOM.btnRunPipeline.classList.remove('hidden');
    DOM.btnStopPipeline.classList.add('hidden');
  }
}

/**
 * Hentikan orkestrasi yang sedang berjalan
 */
function stopPipeline() {
  if (state.abortController) {
    state.abortController.abort();
  }
  state.isRunning = false;
}

/**
 * Susun teks konteks kumulatif untuk agen ke-n:
 * Menyatukan brief awal, output seluruh agen sebelumnya, dan taskInstruction agen ini.
 */
function buildSequentialPrompt(initialBrief, currentAgentIndex) {
  const agent = AGENTS_TEAM[currentAgentIndex];
  let promptText = `==================================================\n`;
  promptText += `### BRIEF AWAL PROYEK DARI PENGGUNA:\n`;
  promptText += `==================================================\n`;
  promptText += `${initialBrief}\n\n`;

  // Sertakan seluruh output dari agen sebelumnya (jika ada)
  if (currentAgentIndex > 0) {
    promptText += `==================================================\n`;
    promptText += `### DOKUMEN HASIL DARI AGEN-AGEN SEBELUMNYA:\n`;
    promptText += `==================================================\n\n`;

    for (let prevIndex = 0; prevIndex < currentAgentIndex; prevIndex++) {
      const prevAgent = AGENTS_TEAM[prevIndex];
      const prevOutput = state.outputs[prevAgent.id]?.text || '(Output tidak ditemukan)';
      promptText += `#### [HASIL TAHAP ${prevIndex + 1} - ${prevAgent.name.toUpperCase()} (${prevAgent.role})]:\n`;
      promptText += `${prevOutput}\n\n`;
      promptText += `--------------------------------------------------\n\n`;
    }
  }

  // Tambahkan Instruksi Spesifik untuk Agen saat ini
  promptText += `==================================================\n`;
  promptText += `### INSTRUKSI TUGAS KHUSUS ANDA (${agent.name} - ${agent.role}):\n`;
  promptText += `==================================================\n`;
  promptText += `${agent.taskInstruction}\n`;

  return promptText;
}

/**
 * Panggilan langsung ke Gemini REST API via fetch
 * Sesuai spesifikasi payload:
 * {
 *   system_instruction: { parts: [{ text: agent.systemPrompt }] },
 *   contents: [{ role: "user", parts: [{ text: ... }] }],
 *   generationConfig: { temperature: 0.7 }
 * }
 */
async function callGeminiAPI(agent, promptText, abortSignal) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${agent.model}:generateContent?key=${encodeURIComponent(state.apiKey)}`;

  const payload = {
    system_instruction: {
      parts: [
        { text: agent.systemPrompt }
      ]
    },
    contents: [
      {
        role: "user",
        parts: [
          { text: promptText }
        ]
      }
    ],
    generationConfig: {
      temperature: typeof agent.temperature === 'number' ? agent.temperature : WORKSPACE_CONFIG.defaultTemperature
    }
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload),
    signal: abortSignal
  });

  const responseData = await response.json();

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    if (responseData.error) {
      const err = responseData.error;
      if (response.status === 400 && err.message?.includes('API_KEY_INVALID')) {
        errorMessage = 'Gemini API Key tidak valid. Mohon periksa kembali API Key Anda di menu atas.';
      } else if (response.status === 429) {
        errorMessage = `Batas kuota (Rate limit / Quota exceeded) tercapai pada model ${agent.model}. Tunggu beberapa saat sebelum mencoba kembali.`;
      } else {
        errorMessage = `${err.message || err.status || 'Terjadi kesalahan pada Gemini API.'}`;
      }
    }
    throw new Error(errorMessage);
  }

  return responseData;
}

// ==========================================
// UI STEPPER & CARD STATE UPDATERS
// ==========================================

function updateStepperAgentState(agentId, status, durationText = '') {
  const stepEl = document.getElementById(`stepper-step-${agentId}`);
  if (!stepEl) return;

  const badgeEl = stepEl.querySelector('.step-badge');
  const timerEl = stepEl.querySelector('.step-timer');
  const numberEl = stepEl.querySelector('.step-number');

  if (status === 'working') {
    stepEl.className = 'p-4 rounded-xl border border-brand-500 bg-surface-850 shadow-lg agent-active-glow transition-all duration-300 relative';
    badgeEl.textContent = 'Memproses...';
    badgeEl.className = 'step-badge text-[10px] px-2 py-0.5 rounded-full font-mono bg-brand-500/20 text-brand-300 border border-brand-500/30 animate-pulse';
    numberEl.className = 'w-6 h-6 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs font-mono font-bold step-number';
  } else if (status === 'completed') {
    stepEl.className = 'p-4 rounded-xl border border-emerald-500/40 bg-surface-900/90 transition-all duration-300 relative';
    badgeEl.textContent = 'Selesai ✓';
    badgeEl.className = 'step-badge text-[10px] px-2 py-0.5 rounded-full font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
    numberEl.className = 'w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-mono font-bold step-number';
    if (durationText) timerEl.textContent = `⚡ ${durationText}`;
  } else if (status === 'failed') {
    stepEl.className = 'p-4 rounded-xl border border-rose-500/40 bg-surface-900/90 transition-all duration-300 relative';
    badgeEl.textContent = 'Gagal ✕';
    badgeEl.className = 'step-badge text-[10px] px-2 py-0.5 rounded-full font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30';
    numberEl.className = 'w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs font-mono font-bold step-number';
  } else {
    // idle / waiting
    stepEl.className = 'p-4 rounded-xl border border-surface-700 bg-surface-900/80 transition-all duration-300 relative';
    badgeEl.textContent = 'Menunggu';
    badgeEl.className = 'step-badge text-[10px] px-2 py-0.5 rounded-full font-mono bg-surface-800 text-slate-400 border border-surface-700';
    numberEl.className = 'w-6 h-6 rounded-full bg-surface-800 text-slate-300 flex items-center justify-center text-xs font-mono font-bold border border-surface-700 step-number';
    timerEl.textContent = '--';
  }
}

function updateCardAgentState(agentId, status) {
  const placeholder = document.getElementById(`output-placeholder-${agentId}`);
  const loading = document.getElementById(`output-loading-${agentId}`);
  const content = document.getElementById(`output-content-${agentId}`);
  const errorBox = document.getElementById(`output-error-${agentId}`);
  const statusBadge = document.getElementById(`card-status-badge-${agentId}`);
  const copyBtn = document.querySelector(`.btn-copy-agent-output[data-agent-id="${agentId}"]`);

  if (status === 'working') {
    placeholder?.classList.add('hidden');
    content?.classList.add('hidden');
    errorBox?.classList.add('hidden');
    loading?.classList.remove('hidden');
    copyBtn?.classList.add('hidden');
    if (statusBadge) {
      statusBadge.textContent = 'Sedang Berpikir...';
      statusBadge.className = 'px-2.5 py-1 rounded-full text-[11px] font-mono bg-brand-500/20 text-brand-300 border border-brand-500/30 animate-pulse';
    }
  } else if (status === 'idle') {
    loading?.classList.add('hidden');
    errorBox?.classList.add('hidden');
    placeholder?.classList.remove('hidden');
    if (statusBadge) {
      statusBadge.textContent = 'Menunggu Giliran';
      statusBadge.className = 'px-2.5 py-1 rounded-full text-[11px] font-mono bg-surface-800 text-slate-400 border border-surface-700';
    }
  }
}

function startStepTimer(agentId, startTime) {
  const stepEl = document.getElementById(`stepper-step-${agentId}`);
  const timerEl = stepEl ? stepEl.querySelector('.step-timer') : null;

  return setInterval(() => {
    const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);
    if (timerEl) {
      timerEl.textContent = `⏱️ ${elapsed}s`;
    }
  }, 200);
}

function renderAgentOutput(agentId, markdownText, durationSec, usage = {}) {
  const placeholder = document.getElementById(`output-placeholder-${agentId}`);
  const loading = document.getElementById(`output-loading-${agentId}`);
  const content = document.getElementById(`output-content-${agentId}`);
  const errorBox = document.getElementById(`output-error-${agentId}`);
  const statusBadge = document.getElementById(`card-status-badge-${agentId}`);
  const metaText = document.getElementById(`output-meta-${agentId}`);
  const copyBtn = document.querySelector(`.btn-copy-agent-output[data-agent-id="${agentId}"]`);

  placeholder?.classList.add('hidden');
  loading?.classList.add('hidden');
  errorBox?.classList.add('hidden');

  if (content) {
    content.classList.remove('hidden');
    content.innerHTML = typeof marked !== 'undefined' ? marked.parse(markdownText) : markdownText;
  }

  if (statusBadge) {
    statusBadge.textContent = `Selesai (${durationSec}s)`;
    statusBadge.className = 'px-2.5 py-1 rounded-full text-[11px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
  }

  if (metaText && usage.totalTokenCount) {
    metaText.textContent = `• ${usage.totalTokenCount.toLocaleString()} tokens`;
  }

  copyBtn?.classList.remove('hidden');
}

function renderAgentError(agentId, errorMessage) {
  const loading = document.getElementById(`output-loading-${agentId}`);
  const errorBox = document.getElementById(`output-error-${agentId}`);
  const errorMsgEl = document.getElementById(`error-message-${agentId}`);
  const statusBadge = document.getElementById(`card-status-badge-${agentId}`);

  loading?.classList.add('hidden');
  if (errorBox) {
    errorBox.classList.remove('hidden');
  }
  if (errorMsgEl) {
    errorMsgEl.textContent = errorMessage;
  }
  if (statusBadge) {
    statusBadge.textContent = 'Gagal';
    statusBadge.className = 'px-2.5 py-1 rounded-full text-[11px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30';
  }
}

function resetUIOutputs() {
  AGENTS_TEAM.forEach(agent => {
    updateStepperAgentState(agent.id, 'waiting');
    const placeholder = document.getElementById(`output-placeholder-${agent.id}`);
    const loading = document.getElementById(`output-loading-${agent.id}`);
    const content = document.getElementById(`output-content-${agent.id}`);
    const errorBox = document.getElementById(`output-error-${agent.id}`);
    const copyBtn = document.querySelector(`.btn-copy-agent-output[data-agent-id="${agent.id}"]`);
    const statusBadge = document.getElementById(`card-status-badge-${agent.id}`);
    const metaText = document.getElementById(`output-meta-${agent.id}`);

    placeholder?.classList.remove('hidden');
    loading?.classList.add('hidden');
    content?.classList.add('hidden');
    errorBox?.classList.add('hidden');
    copyBtn?.classList.add('hidden');
    if (metaText) metaText.textContent = '';
    if (statusBadge) {
      statusBadge.textContent = 'Menunggu Giliran';
      statusBadge.className = 'px-2.5 py-1 rounded-full text-[11px] font-mono bg-surface-800 text-slate-400 border border-surface-700';
    }
  });

  DOM.consolidatedRenderedContent.innerHTML = `<p class="text-slate-500 italic">Jalankan orkestrasi pipeline terlebih dahulu untuk menghasilkan dokumen terpadu.</p>`;
  DOM.btnExportAllMd.setAttribute('disabled', 'true');
}

function resetWorkspace() {
  if (confirm('Bersihkan seluruh teks brief dan riwayat output saat ini?')) {
    stopPipeline();
    DOM.projectBrief.value = '';
    DOM.briefCharCount.textContent = '0 karakter';
    state.outputs = {};
    resetUIOutputs();
    DOM.pipelineStatusBadge.textContent = 'Status: Menunggu Brief';
    DOM.pipelineStatusBadge.className = 'text-xs px-2 py-0.5 rounded-full bg-surface-800 text-slate-400 font-normal';
    showToast('Workspace berhasil dibersihkan.', 'info');
  }
}

// ==========================================
// CONSOLIDATED FINAL DELIVERABLE & EXPORT
// ==========================================

function switchOutputTab(tab) {
  state.activeTab = tab;
  if (tab === 'flow') {
    DOM.tabViewFlow.className = 'px-3 py-1 rounded-md bg-brand-600 text-white font-medium transition';
    DOM.tabViewConsolidated.className = 'px-3 py-1 rounded-md text-slate-400 hover:text-white transition';
    DOM.containerSequentialOutputs.classList.remove('hidden');
    DOM.containerConsolidatedOutput.classList.add('hidden');
  } else {
    DOM.tabViewFlow.className = 'px-3 py-1 rounded-md text-slate-400 hover:text-white transition';
    DOM.tabViewConsolidated.className = 'px-3 py-1 rounded-md bg-brand-600 text-white font-medium transition';
    DOM.containerSequentialOutputs.classList.add('hidden');
    DOM.containerConsolidatedOutput.classList.remove('hidden');
  }
}

function renderConsolidatedOutput() {
  const consolidatedMd = generateConsolidatedMarkdown();
  if (typeof marked !== 'undefined') {
    DOM.consolidatedRenderedContent.innerHTML = marked.parse(consolidatedMd);
  } else {
    DOM.consolidatedRenderedContent.innerText = consolidatedMd;
  }
}

function generateConsolidatedMarkdown() {
  const brief = DOM.projectBrief.value.trim();
  const dateStr = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  let doc = `# FINAL EXECUTIVE DELIVERABLE PACKAGE\n`;
  doc += `> Dibuat secara otomatis oleh **${WORKSPACE_CONFIG.appName}** pada ${dateStr}.\n\n`;

  doc += `## 1. Brief Awal Proyek\n`;
  doc += `\`\`\`text\n${brief}\n\`\`\`\n\n`;

  doc += `## 2. Hasil Rantai Orkestrasi Agen\n\n`;

  AGENTS_TEAM.forEach((agent, i) => {
    const data = state.outputs[agent.id];
    doc += `### Tahap ${i + 1}: ${agent.name} — ${agent.role}\n`;
    doc += `- **Model Digunakan:** \`${agent.model}\`\n`;
    doc += `- **Durasi:** ${data ? data.durationSec : 'N/A'}\n\n`;
    doc += `${data ? data.text : '_Belum ada output_'}\n\n`;
    doc += `---\n\n`;
  });

  return doc;
}

function exportFullMarkdown() {
  const markdownText = generateConsolidatedMarkdown();
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `multi-agent-campaign-${timestamp}.md`;

  const blob = new Blob([markdownText], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const downloadAnchor = document.createElement('a');
  downloadAnchor.href = url;
  downloadAnchor.download = filename;
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  document.body.removeChild(downloadAnchor);
  URL.revokeObjectURL(url);

  showToast(`File ${filename} berhasil diunduh!`, 'success');
}

// ==========================================
// UTILITY HELPERS
// ==========================================

function copyToClipboard(text, successMessage) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(successMessage, 'success');
    }).catch(err => {
      fallbackCopyText(text, successMessage);
    });
  } else {
    fallbackCopyText(text, successMessage);
  }
}

function fallbackCopyText(text, successMessage) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  try {
    document.execCommand('copy');
    showToast(successMessage, 'success');
  } catch (err) {
    showToast('Gagal menyalin teks secara otomatis.', 'error');
  }
  document.body.removeChild(textarea);
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  const typeStyles = {
    info: 'bg-surface-800 text-slate-200 border-surface-700',
    success: 'bg-emerald-950/90 text-emerald-200 border-emerald-500/40',
    error: 'bg-rose-950/90 text-rose-200 border-rose-500/40'
  };

  const icons = {
    info: `<svg class="w-4 h-4 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`,
    success: `<svg class="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>`,
    error: `<svg class="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`
  };

  toast.className = `flex items-center space-x-2.5 px-4 py-3 rounded-xl border shadow-xl text-xs backdrop-blur-md transition-all duration-300 pointer-events-auto max-w-sm ${typeStyles[type] || typeStyles.info}`;
  toast.innerHTML = `
    <div class="shrink-0">${icons[type] || icons.info}</div>
    <div class="leading-relaxed">${message}</div>
  `;

  DOM.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-x-4');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 4000);
}

function escapeHtml(string) {
  if (!string) return '';
  return String(string)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
