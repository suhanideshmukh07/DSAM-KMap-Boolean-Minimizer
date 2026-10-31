// main.js – Complete orchestrator for K-Map + Quine-McCluskey Minimizer

let currentNumVars = 4;
let currentMinterms = [];
let currentDontCares = [];
let currentTargetForm = 'SOP'; // 'SOP' or 'POS'
let currentCircuitViewMode = 'standard'; // 'standard', 'compare', 'nand', 'nor'
let currentStepAnimation = {
  running: false,
  timer: null,
  stepIdx: 0,
  totalSteps: 0,
  groups: []
};

let kmapSolverInstance = null;
let qmSolverInstance = null;
let kmapResultCache = null;
let qmResultCache = null;
let currentVerifResult = null;
let currentSOPPOSComparison = null;
let currentComplexityData = null;
let truthTableInstance = null;
let circuitRendererInstance = null;

// Practice Mode State
let currentPracticeProblem = null;
let practiceDifficulty = 'Medium';
let practiceQuestionType = 'K-Map';

document.addEventListener('DOMContentLoaded', () => {
  setupSidebarNavigation();
  setupThemeToggle();
  initDashboardLayout();
  setupEventListeners();
});

function setupSidebarNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      const target = item.getAttribute('data-target');
      showSection(target);

      // Close mobile drawer if open
      const sidebar = document.getElementById('app-sidebar');
      if (sidebar.classList.contains('sidebar-open')) {
        sidebar.classList.remove('sidebar-open');
      }
    });
  });

  const sidebarToggle = document.getElementById('btn-toggle-sidebar');
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
      document.getElementById('app-sidebar').classList.toggle('sidebar-open');
    });
  }

  const topbarSolver = document.getElementById('btn-topbar-solver');
  if (topbarSolver) {
    topbarSolver.addEventListener('click', () => {
      navigateToSection('solver');
    });
  }

  const printBtn = document.getElementById('btn-print-report');
  if (printBtn) {
    printBtn.addEventListener('click', () => {
      window.print();
    });
  }

  const downloadBtn = document.getElementById('btn-download-report');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      downloadSolutionReport();
    });
  }
}

function showSection(sectionId) {
  const sections = document.querySelectorAll('.content-scroll > section');
  sections.forEach(sec => {
    sec.classList.remove('active');
    if (sec.id === `sec-${sectionId}`) {
      sec.classList.add('active');
    }
  });

  // Update topbar heading
  const headingMap = {
    dashboard: 'Dashboard Overview',
    solver: 'Boolean Minimization Solver',
    kmap: 'Karnaugh Map Minimization',
    qm: 'Quine–McCluskey Tabular Method',
    verification: 'Three-Way Formal Verification',
    circuit: 'Logic Gate Schematic & Simulation',
    comparison: 'SOP vs POS Comparison & Optimization',
    complexity: 'Algorithm Complexity Analyzer',
    autotest: 'Automated Test Suite & Edge Case Verification',
    practice: 'Interactive Practice & Quiz Mode',
    learn: 'Educational Concepts & Reference',
    about: 'About Project'
  };
  const headingEl = document.getElementById('page-heading');
  if (headingEl) {
    headingEl.textContent = headingMap[sectionId] || 'Logic Minimizer';
  }

  // Update workflow stepper active stage
  updateWorkflowStepper(sectionId);
}

function navigateToSection(sectionId) {
  const btn = document.querySelector(`.nav-item[data-target="${sectionId}"]`);
  if (btn) btn.click();
}

function setupThemeToggle() {
  const toggleBtn = document.getElementById('btn-theme-toggle');
  const label = document.getElementById('theme-btn-label');
  toggleBtn.addEventListener('click', () => {
    const html = document.documentElement;
    const isDark = html.getAttribute('data-theme') === 'dark';
    if (isDark) {
      html.setAttribute('data-theme', 'light');
      label.textContent = 'Dark Mode';
    } else {
      html.setAttribute('data-theme', 'dark');
      label.textContent = 'Light Mode';
    }
  });
}

function updateWorkflowStepper(currentSection) {
  const stepperMap = {
    solver: 1,
    kmap: 2,
    qm: 3,
    verification: 4,
    circuit: 5
  };
  const activeStage = stepperMap[currentSection] || 0;
  for (let s = 1; s <= 5; s++) {
    const el = document.getElementById(`step-indicator-${s}`);
    if (!el) continue;
    el.classList.remove('active', 'completed');
    if (s < activeStage) {
      el.classList.add('completed');
    } else if (s === activeStage) {
      el.classList.add('active');
    }
  }
}

function initDashboardLayout() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <!-- WORKFLOW STEPPER -->
    <div class="workflow-stepper">
      <div class="step-item" id="step-indicator-1" onclick="navigateToSection('solver')">
        <span class="step-num">1</span>
        <span>Input</span>
      </div>
      <div class="step-divider"></div>
      <div class="step-item" id="step-indicator-2" onclick="navigateToSection('kmap')">
        <span class="step-num">2</span>
        <span>K-Map</span>
      </div>
      <div class="step-divider"></div>
      <div class="step-item" id="step-indicator-3" onclick="navigateToSection('qm')">
        <span class="step-num">3</span>
        <span>Quine–McCluskey</span>
      </div>
      <div class="step-divider"></div>
      <div class="step-item" id="step-indicator-4" onclick="navigateToSection('verification')">
        <span class="step-num">4</span>
        <span>Verify</span>
      </div>
      <div class="step-divider"></div>
      <div class="step-item" id="step-indicator-5" onclick="navigateToSection('circuit')">
        <span class="step-num">5</span>
        <span>Circuit</span>
      </div>
    </div>

    <!-- DASHBOARD SECTION -->
    <section id="sec-dashboard" class="active">
      <div class="card" style="background: linear-gradient(135deg, rgba(79, 70, 229, 0.08), rgba(124, 58, 237, 0.08)); border-color: rgba(79, 70, 229, 0.2);">
        <h1 style="margin:0 0 0.5rem 0; font-size:1.85rem; font-weight:800; color:var(--color-primary);">K-Map + Quine–McCluskey</h1>
        <h3 style="margin:0 0 0.75rem 0; font-weight:600; color:var(--color-text-muted);">Boolean Logic Minimization & Verification</h3>
        <p style="margin:0 0 1.5rem 0; max-width:760px; font-size:1.02rem;">
          Minimize, understand and verify Boolean functions using two fundamental digital logic techniques. Compare spatial visual grouping against systematic algorithmic reduction with full mathematical proof.
        </p>
        <div style="display:flex; gap:0.75rem; flex-wrap:wrap; align-items:center;">
          <button class="btn btn-primary" onclick="navigateToSection('solver')">
            <span>START SOLVING</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
          <button class="btn btn-secondary" onclick="navigateToSection('practice')">
            <span>Practice Quiz</span>
          </button>
        </div>
      </div>

      <!-- Quick Preset Examples -->
      <div class="card">
        <div class="card-header">
          <h3>Quick Preset Examples</h3>
          <span style="font-size:0.85rem; color:var(--color-text-muted);">Click any benchmark to load instantly</span>
        </div>
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:1rem;">
          <button class="btn btn-secondary" onclick="loadPresetExample('simple')">
            <div style="text-align:left;">
              <div style="font-weight:700; color:var(--color-primary);">Simple 3-Var</div>
              <div style="font-size:0.8rem; color:var(--color-text-muted);">m(1, 3, 5, 7) → C</div>
            </div>
          </button>
          <button class="btn btn-secondary" onclick="loadPresetExample('wraparound')">
            <div style="text-align:left;">
              <div style="font-weight:700; color:var(--color-secondary);">Wrap-Around 4-Var</div>
              <div style="font-size:0.8rem; color:var(--color-text-muted);">Corners: m(0, 2, 8, 10) → B'D'</div>
            </div>
          </button>
          <button class="btn btn-secondary" onclick="loadPresetExample('dontcare')">
            <div style="text-align:left;">
              <div style="font-weight:700; color:var(--color-accent);">Don't-Care Optimization</div>
              <div style="font-size:0.8rem; color:var(--color-text-muted);">m(1,3,7,11,15) + d(0,2,5)</div>
            </div>
          </button>
          <button class="btn btn-secondary" onclick="loadPresetExample('complex')">
            <div style="text-align:left;">
              <div style="font-weight:700; color:var(--color-success);">Complex 4-Variable</div>
              <div style="font-size:0.8rem; color:var(--color-text-muted);">m(0,1,2,5,7,8,9,10,13,15)</div>
            </div>
          </button>
        </div>
      </div>

      <!-- Feature Overview Grid -->
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:1.25rem;">
        <div class="card" style="margin:0;">
          <h4 style="margin:0 0 0.5rem 0; color:var(--color-primary); display:flex; align-items:center; gap:0.5rem;">
            <span>K-Map Visualizer</span>
          </h4>
          <p style="font-size:0.88rem; color:var(--color-text-muted); margin:0;">
            Real Gray-code mapping with distinct color overlays for pairs, quads, and octets. Supports cylinder & torus wrap-around.
          </p>
        </div>
        <div class="card" style="margin:0;">
          <h4 style="margin:0 0 0.5rem 0; color:var(--color-secondary); display:flex; align-items:center; gap:0.5rem;">
            <span>Quine–McCluskey Stepper</span>
          </h4>
          <p style="font-size:0.88rem; color:var(--color-text-muted); margin:0;">
            Hamming-weight binary grouping, pairwise merging, step-by-step combination logs, and full Prime Implicant chart.
          </p>
        </div>
        <div class="card" style="margin:0;">
          <h4 style="margin:0 0 0.5rem 0; color:var(--color-accent); display:flex; align-items:center; gap:0.5rem;">
            <span>Interactive Circuit Simulation</span>
          </h4>
          <p style="font-size:0.88rem; color:var(--color-text-muted); margin:0;">
            Procedural logic gates with live toggle switches (A, B, C, D) and active wire highlighting.
          </p>
        </div>
      </div>
    </section>

    <!-- SOLVER SECTION -->
    <section id="sec-solver">
      <!-- Input Card -->
      <div class="card">
        <div class="card-header">
          <h2>1. Input Specification</h2>
          <div style="display:flex; gap:0.5rem;">
            <button class="btn btn-secondary btn-sm" onclick="clearSolverInputs()">Reset</button>
          </div>
        </div>

        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:1.25rem; margin-bottom:1.25rem;">
          <div>
            <label class="form-label">Number of Variables:</label>
            <div class="segmented-control" id="var-count-control">
              <button class="segmented-btn" data-vars="2">2 Vars (A,B)</button>
              <button class="segmented-btn" data-vars="3">3 Vars (A,B,C)</button>
              <button class="segmented-btn active" data-vars="4">4 Vars (A,B,C,D)</button>
            </div>
          </div>
          <div>
            <label class="form-label">Input Method:</label>
            <div class="segmented-control" id="input-mode-control">
              <button class="segmented-btn active" data-mode="minterms">Minterms</button>
              <button class="segmented-btn" data-mode="truthtable">Truth Table</button>
              <button class="segmented-btn" data-mode="expression">Boolean Expr</button>
            </div>
          </div>
        </div>

        <!-- Mode A: Minterms -->
        <div id="block-mode-minterms">
          <div class="form-group">
            <label class="form-label" for="minterms-input">Minterms Σm( ... ) :</label>
            <input type="text" id="minterms-input" class="form-input" placeholder="e.g. 0, 2, 8, 10 or space separated" />
            <div class="input-feedback" id="minterms-error"></div>
          </div>
          <div class="form-group">
            <label class="form-label" for="dontcares-input">Don't-Care Terms d( ... ) [Optional]:</label>
            <input type="text" id="dontcares-input" class="form-input" placeholder="e.g. 5, 13" />
            <div class="input-feedback" id="dontcares-error"></div>
          </div>
        </div>

        <!-- Mode B: Truth Table Inside Solver -->
        <div id="block-mode-truthtable" style="display:none;">
          <p style="font-size:0.88rem; color:var(--color-text-muted); margin-bottom:0.75rem;">
            Click on any cell in the <strong>F (Original)</strong> column to cycle its state: <strong>0 → 1 → X (Don't Care) → 0</strong>.
          </p>
          <div id="solver-truth-table-container"></div>
        </div>

        <!-- Mode C: Boolean Expression -->
        <div id="block-mode-expression" style="display:none;">
          <div class="form-group">
            <label class="form-label" for="expr-input">Boolean Expression:</label>
            <input type="text" id="expr-input" class="form-input" placeholder="e.g. A'B'CD + AB'C or (A + B')(C + D)" />
            <div class="input-feedback" id="expr-error"></div>
            <div style="font-size:0.8rem; color:var(--color-text-muted); margin-top:0.35rem;">
              Supported operators: NOT (<code>'</code>, <code>!</code>, <code>~</code>), AND (implicit juxtaposition, <code>*</code>, <code>&</code>), OR (<code>+</code>, <code>|</code>), Parentheses <code>( )</code>.
            </div>
          </div>
        </div>

        <!-- Form controls -->
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; margin-top:1.5rem; padding-top:1rem; border-top:1px solid var(--color-border);">
          <div style="display:flex; align-items:center; gap:0.5rem;">
            <span style="font-weight:600; font-size:0.88rem;">Optimization Goal:</span>
            <div class="segmented-control" id="target-form-control">
              <button class="segmented-btn active" data-form="SOP">SOP (Sum of Products)</button>
              <button class="segmented-btn" data-form="POS">POS (Product of Sums)</button>
            </div>
          </div>
          <button class="btn btn-primary" id="btn-run-solve" style="padding:0.7rem 2rem; font-size:1rem;">
            <span>Solve & Minimize</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        </div>
      </div>

      <!-- Quick Result Card -->
      <div class="card" id="solver-quick-result" style="display:none;"></div>
    </section>

    <!-- K-MAP SECTION -->
    <section id="sec-kmap">
      <div class="card" style="padding:1.5rem;">
        <div class="card-header" style="border-bottom:none; margin-bottom:0.75rem; padding-bottom:0;">
          <div>
            <h2 style="font-size:1.4rem; font-weight:800; color:var(--color-text);">K-Map</h2>
            <div style="font-size:0.85rem; color:var(--color-text-muted);">Visualize groups • Understand • Minimize</div>
          </div>
          <div style="display:flex; gap:0.75rem; align-items:center; flex-wrap:wrap;">
            <div class="segmented-control" id="kmap-show-hide-control">
              <button class="segmented-btn active" id="btn-kmap-show-groups">Show Groups</button>
              <button class="segmented-btn" id="btn-kmap-hide-groups">Hide Groups</button>
            </div>
            <div class="segmented-control" id="kmap-view-form-control">
              <button class="segmented-btn active" data-form="SOP">SOP (1s)</button>
              <button class="segmented-btn" data-form="POS">POS (0s)</button>
            </div>
          </div>
        </div>

        <!-- 3-Column Interactive Layout matching reference image -->
        <div class="kmap-section-layout">
          <!-- Left: Input Details -->
          <div class="kmap-info-card">
            <h4 style="margin:0 0 0.85rem 0; font-size:0.95rem; font-weight:700; color:var(--color-text);">Input Details</h4>
            <div style="font-size:0.85rem; margin-bottom:0.75rem;">
              <span style="color:var(--color-text-muted); display:block; font-weight:600;">Variables:</span>
              <strong id="kmap-stat-vars" style="color:var(--color-primary);">A, B, C, D (4 variables)</strong>
            </div>
            <div style="font-size:0.85rem; margin-bottom:0.75rem;">
              <span style="color:var(--color-text-muted); display:block; font-weight:600;">Minterms:</span>
              <span id="kmap-stat-minterms" style="word-break:break-word; font-family:monospace; font-weight:600;">None</span>
            </div>
            <div style="font-size:0.85rem; margin-bottom:0.75rem;">
              <span style="color:var(--color-text-muted); display:block; font-weight:600;">Don't-Cares:</span>
              <span id="kmap-stat-dontcares" style="word-break:break-word; font-family:monospace; font-weight:600;">None</span>
            </div>
            <div style="margin-top:1.25rem; padding-top:0.75rem; border-top:1px solid var(--color-border); font-size:0.82rem; color:var(--color-text-muted);">
              Click on any group outline or card to inspect its Boolean elimination rationale.
            </div>
          </div>

          <!-- Center: K-Map Main Grid & Overlay Stage -->
          <div class="kmap-main-stage">
            <div id="kmap-display-container"></div>

            <!-- Stepper Animation Controls -->
            <div style="display:flex; align-items:center; justify-content:center; gap:0.5rem; margin-top:1rem; flex-wrap:wrap;">
              <button class="btn btn-secondary btn-sm" id="btn-anim-prev" title="Previous step">◀ Prev</button>
              <button class="btn btn-primary btn-sm" id="btn-anim-play" title="Auto play animation">▶ Play Grouping</button>
              <button class="btn btn-secondary btn-sm" id="btn-anim-next" title="Next step">Next ▶</button>
              <button class="btn btn-secondary btn-sm" id="btn-anim-reset">Show All</button>
              <span id="anim-step-status" style="font-size:0.82rem; font-weight:600; color:var(--color-primary); margin-left:0.5rem;">Showing All Groups</span>
            </div>
          </div>

          <!-- Right: Key Legend & Groups List -->
          <div class="kmap-sidebar-card">
            <h4 style="margin:0 0 0.85rem 0; font-size:0.95rem; font-weight:700; color:var(--color-text);">Legend</h4>
            <div class="legend-key-list">
              <div class="legend-key-item">
                <span class="legend-key-chip" style="background:#eff6ff; color:#1e40af; border:1px solid #bfdbfe;">1</span>
                <span>= Minterm (1)</span>
              </div>
              <div class="legend-key-item">
                <span class="legend-key-chip" style="background:#f8fafc; color:#64748b; border:1px solid #cbd5e1;">0</span>
                <span>= Zero (0)</span>
              </div>
              <div class="legend-key-item">
                <span class="legend-key-chip" style="background:#fffbeb; color:#d97706; border:1px solid #fde68a;">X</span>
                <span>= Don't-Care</span>
              </div>
              <div class="legend-key-item">
                <span class="legend-key-chip" style="border:2px solid #8b5cf6; background:rgba(139,92,246,0.12); color:#8b5cf6;">▢</span>
                <span>= Implicant Group</span>
              </div>
            </div>

            <h4 style="margin:1.25rem 0 0.65rem 0; font-size:0.95rem; font-weight:700; color:var(--color-text);">Groups</h4>
            <div id="kmap-side-groups-list"></div>
          </div>
        </div>

        <!-- Optimal Implicant Groups Detailed Table/Cards -->
        <h3 style="margin-top:2rem; margin-bottom:0.75rem; font-size:1.15rem; font-weight:700;">Optimal Implicant Groups</h3>
        <div id="kmap-groups-legend" class="group-legend-container"></div>

        <!-- Selected Group Interactive Detail Modal/Box -->
        <div id="kmap-group-detail-box" style="margin-top:1.25rem; padding:1.25rem; border-radius:10px; background:var(--color-surface); border:1px solid var(--color-border); display:none;"></div>

        <!-- K-Map Results Banner -->
        <div class="result-banner" id="kmap-summary-box" style="margin-top:1.5rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;"></div>
      </div>
    </section>

    <!-- QUINE-MCCLUSKEY SECTION -->
    <section id="sec-qm">
      <div class="card">
        <div class="card-header">
          <h2>Quine–McCluskey Tabular Reduction</h2>
          <div class="segmented-control" id="qm-view-form-control">
            <button class="segmented-btn active" data-form="SOP">SOP (Minterms)</button>
            <button class="segmented-btn" data-form="POS">POS (Maxterms)</button>
          </div>
        </div>

        <p style="font-size:0.9rem; color:var(--color-text-muted); margin-bottom:1.25rem;">
          The Quine–McCluskey algorithm reduces Boolean functions systematically through Hamming weight grouping, iterative variable elimination, and prime implicant chart optimization.
        </p>

        <!-- Stepper Accordion -->
        <div id="qm-stepper-container"></div>

        <!-- Prime Implicant Chart -->
        <h3 style="margin-top:2rem; margin-bottom:0.5rem; font-size:1.15rem;">Prime Implicant Chart</h3>
        <p style="font-size:0.85rem; color:var(--color-text-muted); margin-bottom:1rem;">
          Columns represent target minterms; rows represent Prime Implicants. Essential Prime Implicants (marked in bold) have unique column coverage.
        </p>
        <div class="table-responsive" id="qm-pi-chart-container"></div>

        <div id="qm-essential-reasons" style="margin-top:1rem;"></div>

        <!-- QM Summary -->
        <div class="result-banner" id="qm-summary-box" style="margin-top:1.5rem;"></div>
      </div>
    </section>

    <!-- VERIFICATION SECTION -->
    <section id="sec-verification">
      <div class="card">
        <div class="card-header">
          <h2>Formal Three-Way Verification</h2>
        </div>

        <div id="verif-master-banner" style="padding:1.25rem; border-radius:8px; margin-bottom:1.5rem; font-weight:600;"></div>

        <!-- 3-Way Metrics Cards -->
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:1rem; margin-bottom:1.5rem;">
          <div class="card" style="margin:0; text-align:center; padding:1rem;" id="verif-card-orig-kmap">
            <div style="font-size:0.8rem; color:var(--color-text-muted); font-weight:600;">ORIGINAL = K-MAP</div>
            <div style="font-size:1.25rem; font-weight:bold; margin-top:0.35rem;" id="verif-stat-1">—</div>
          </div>
          <div class="card" style="margin:0; text-align:center; padding:1rem;" id="verif-card-orig-qm">
            <div style="font-size:0.8rem; color:var(--color-text-muted); font-weight:600;">ORIGINAL = QUINE-MCCLUSKEY</div>
            <div style="font-size:1.25rem; font-weight:bold; margin-top:0.35rem;" id="verif-stat-2">—</div>
          </div>
          <div class="card" style="margin:0; text-align:center; padding:1rem;" id="verif-card-kmap-qm">
            <div style="font-size:0.8rem; color:var(--color-text-muted); font-weight:600;">K-MAP = QUINE-MCCLUSKEY</div>
            <div style="font-size:1.25rem; font-weight:bold; margin-top:0.35rem;" id="verif-stat-3">—</div>
          </div>
        </div>

        <h3 style="margin-bottom:0.75rem; font-size:1.1rem;">Full Truth Table Proof (All 2<sup>N</sup> States)</h3>
        <div class="table-responsive" id="verif-table-container"></div>
      </div>

      <!-- Reduction Metrics Comparison Card -->
      <div class="card">
        <div class="card-header">
          <h3>Hardware Reduction Metrics</h3>
        </div>
        <div id="verif-metrics-container"></div>
      </div>
    </section>

    <!-- CIRCUIT SECTION -->
    <section id="sec-circuit">
      <div class="card">
        <div class="card-header">
          <h2>Logic Gate Schematic & Simulation</h2>
          <div style="display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap;">
            <div class="segmented-control" id="circuit-view-mode-control">
              <button class="segmented-btn active" data-view="standard">Standard Circuit</button>
              <button class="segmented-btn" data-view="compare">Side-by-Side Optimization</button>
              <button class="segmented-btn" data-view="nand">NAND-Only</button>
              <button class="segmented-btn" data-view="nor">NOR-Only</button>
            </div>
          </div>
        </div>
        <div style="font-size:0.88rem; color:var(--color-text-muted); margin-bottom:1rem;" id="circuit-mode-description">
          Interactive schematic with live input switches and real-time wire propagation.
        </div>
        <div id="circuit-container"></div>
      </div>
    </section>

    <!-- SOP vs POS COMPARISON SECTION -->
    <section id="sec-comparison">
      <div class="card">
        <div class="card-header">
          <h2>SOP vs POS Comparison & Gate Requirement Estimation</h2>
          <button class="btn btn-secondary btn-sm" onclick="navigateToSection('circuit')">View Schematic</button>
        </div>
        <p style="font-size:0.9rem; color:var(--color-text-muted); margin-bottom:1.25rem;">
          Compare Sum-of-Products (1-cell grouping) against Product-of-Sums (0-cell grouping) across term counts, literal counts, and gate hardware requirements.
        </p>
        <div id="comparison-content-container"></div>
      </div>
    </section>

    <!-- COMPLEXITY ANALYZER SECTION -->
    <section id="sec-complexity">
      <div class="card">
        <div class="card-header">
          <h2>Algorithm Complexity & Runtime Analyzer</h2>
          <button class="btn btn-primary btn-sm" id="btn-reanalyze-complexity">Re-run Benchmark</button>
        </div>
        <p style="font-size:0.9rem; color:var(--color-text-muted); margin-bottom:1.25rem;">
          Empirical and theoretical comparison between visual Karnaugh Map minimization and systematic Quine–McCluskey tabular reduction.
        </p>
        <div id="complexity-content-container"></div>
      </div>
    </section>

    <!-- AUTOMATED TESTING SECTION -->
    <section id="sec-autotest">
      <div class="card">
        <div class="card-header">
          <h2>Automated Test Suite & Edge Case Verification</h2>
          <button class="btn btn-primary btn-sm" id="btn-run-autotests">Run All Tests</button>
        </div>
        <p style="font-size:0.9rem; color:var(--color-text-muted); margin-bottom:1.25rem;">
          Built-in automated unit tests validating edge cases (all minterms, empty, single cell, don't-cares only), torus wrap-around corners/edges, parser syntax, and 3-way equivalence.
        </p>
        <div id="autotest-content-container"></div>
      </div>
    </section>

    <!-- PRACTICE SECTION -->
    <section id="sec-practice">
      <div class="card">
        <div class="card-header">
          <h2>Interactive Practice & Quiz Mode</h2>
          <button class="btn btn-primary btn-sm" id="btn-generate-quiz">Generate New Problem</button>
        </div>

        <div style="display:flex; gap:1rem; flex-wrap:wrap; margin-bottom:1.25rem;">
          <div>
            <label class="form-label">Difficulty:</label>
            <div class="segmented-control" id="quiz-diff-control">
              <button class="segmented-btn" data-diff="Easy">Easy (3 Vars)</button>
              <button class="segmented-btn active" data-diff="Medium">Medium (4 Vars)</button>
              <button class="segmented-btn" data-diff="Hard">Hard (with Don't-Cares)</button>
            </div>
          </div>
        </div>

        <div id="practice-problem-container"></div>
      </div>
    </section>

    <!-- LEARN SECTION -->
    <section id="sec-learn">
      <div class="card">
        <div class="card-header">
          <h2>Educational Reference & Digital Systems Theory</h2>
        </div>

        <!-- Topics Accordion -->
        <div class="accordion-item open">
          <div class="accordion-header" onclick="toggleAccordion(this)">
            <span>1. Boolean Algebra Axioms & Theorems</span>
            <span>▾</span>
          </div>
          <div class="accordion-content">
            <p>Boolean algebra forms the mathematical basis for all digital electronic circuits. Fundamental theorems include:</p>
            <ul>
              <li><strong>Involution:</strong> <code>(A')' = A</code></li>
              <li><strong>Complementarity:</strong> <code>A + A' = 1</code>, <code>A · A' = 0</code></li>
              <li><strong>De Morgan's Laws:</strong> <code>(A + B)' = A' · B'</code>, <code>(A · B)' = A' + B'</code></li>
              <li><strong>Distributive Law:</strong> <code>A + (B · C) = (A + B)(A + C)</code></li>
            </ul>
          </div>
        </div>

        <div class="accordion-item">
          <div class="accordion-header" onclick="toggleAccordion(this)">
            <span>2. Gray Code Ordering in Karnaugh Maps</span>
            <span>▾</span>
          </div>
          <div class="accordion-content">
            <p>Gray code is an ordering of binary numbers such that consecutive values differ by exactly one bit: <code>00, 01, 11, 10</code>. This property ensures that adjacent cells on a K-map represent minterms with Hamming distance 1, permitting physical visual cancellation of variables via <code>XY + XY' = X</code>.</p>
          </div>
        </div>

        <div class="accordion-item">
          <div class="accordion-header" onclick="toggleAccordion(this)">
            <span>3. Sum-of-Products (SOP) vs Product-of-Sums (POS)</span>
            <span>▾</span>
          </div>
          <div class="accordion-content">
            <p><strong>SOP (Sum-of-Products):</strong> Grouping 1-cells and Don't-Cares. Produces an OR of AND gates (e.g. <code>AB + C'D</code>).</p>
            <p><strong>POS (Product-of-Sums):</strong> Grouping 0-cells directly. Produces an AND of OR gates (e.g. <code>(A + B)(C' + D)</code>). In POS, a literal <code>0</code> represents uncomplemented variable <code>A</code>, while <code>1</code> represents complemented variable <code>A'</code>.</p>
          </div>
        </div>

        <div class="accordion-item">
          <div class="accordion-header" onclick="toggleAccordion(this)">
            <span>4. Quine–McCluskey vs K-Map Comparison</span>
            <span>▾</span>
          </div>
          <div class="accordion-content">
            <div class="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Feature</th>
                    <th>Karnaugh Map (K-Map)</th>
                    <th>Quine–McCluskey (QM)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Approach</strong></td>
                    <td>Visual / Spatial pattern recognition</td>
                    <td>Tabular / Algorithmic exhaustive search</td>
                  </tr>
                  <tr>
                    <td><strong>Variable Scalability</strong></td>
                    <td>Practical for 2 to 4 variables (rarely 5 or 6)</td>
                    <td>Can be automated for N variables in software</td>
                  </tr>
                  <tr>
                    <td><strong>Human Intuition</strong></td>
                    <td>High visual clarity and immediate insight</td>
                    <td>Mechanical and repetitive without intuition</td>
                  </tr>
                  <tr>
                    <td><strong>Optimization Guarantee</strong></td>
                    <td>Prone to human grouping oversights</td>
                    <td>Mathematically guaranteed optimal cover</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="accordion-item">
          <div class="accordion-header" onclick="toggleAccordion(this)">
            <span>5. Common Student Mistakes in Boolean Minimization</span>
            <span>▾</span>
          </div>
          <div class="accordion-content">
            <ul style="color:#b91c1c; font-weight:500;">
              <li><strong>Grouping non-power-of-two cell counts:</strong> Groups of 3, 5, or 6 cells are mathematically invalid.</li>
              <li><strong>Grouping diagonal cells:</strong> Diagonal cells differ by at least 2 bits and cannot be grouped.</li>
              <li><strong>Overlooking torus wrap-around:</strong> Opposite edges (left-right, top-bottom) and 4-corners are adjacent.</li>
              <li><strong>Treating Don't-Cares as mandatory:</strong> 'X' cells are only included if they enlarge a 1-group; never create isolated groups of pure Xs.</li>
              <li><strong>Omitting Essential Prime Implicants:</strong> Failing to recognize when a minterm is covered by only one prime implicant.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- ABOUT SECTION -->
    <section id="sec-about">
      <div class="card">
        <div class="card-header">
          <h2>About this Project</h2>
        </div>
        <p><strong>K-Map + Quine–McCluskey Boolean Logic Minimizer</strong> is an interactive educational simulator designed for Digital Systems and Microprocessors (DSAM).</p>
        <p>Key Architectural Highlights:</p>
        <ul>
          <li><strong>Pure Web Standards:</strong> 100% HTML5, CSS3, and Vanilla JavaScript. Zero external frameworks, zero CDNs, zero backend.</li>
          <li><strong>Exact Mathematics:</strong> No hardcoded or heuristic shortcuts. Exact Gray-code coordinate mapping, torus wrap-around rect clipping, Hamming weight grouping, and branch-and-bound minimal set cover.</li>
          <li><strong>Dynamic Dual Representation:</strong> Computes both genuine SOP (Sum of Products) and true POS (Product of Sums using 0-cells).</li>
        </ul>
        <div style="margin-top:1rem; font-size:0.85rem; color:var(--color-text-muted);">
          Developed for Academic Year 2026 • DSAM Course Project
        </div>
      </div>
    </section>
  `;

  // Instantiate TruthTable in Solver with live row selection synchronization
  truthTableInstance = new TruthTable('solver-truth-table-container', currentNumVars, (m, d) => {
    currentMinterms = m;
    currentDontCares = d;
    document.getElementById('minterms-input').value = m.join(', ');
    document.getElementById('dontcares-input').value = d.join(', ');
    triggerSolve();
  }, (rowIdx, varValues) => {
    syncStateFromIndex(rowIdx);
  });

  // Instantiate CircuitRenderer with live input switch synchronization
  circuitRendererInstance = new CircuitRenderer('circuit-container', (inputStates) => {
    syncStateFromInputs(inputStates);
  });
}

function setupEventListeners() {
  // Variable count selector
  const varBtns = document.querySelectorAll('#var-count-control .segmented-btn');
  varBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      varBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentNumVars = parseInt(btn.getAttribute('data-vars'), 10);
      truthTableInstance.setNumVars(currentNumVars);
      validateAndTrigger();
    });
  });

  // Input mode selector
  const modeBtns = document.querySelectorAll('#input-mode-control .segmented-btn');
  modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      modeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const mode = btn.getAttribute('data-mode');
      document.getElementById('block-mode-minterms').style.display = mode === 'minterms' ? 'block' : 'none';
      document.getElementById('block-mode-truthtable').style.display = mode === 'truthtable' ? 'block' : 'none';
      document.getElementById('block-mode-expression').style.display = mode === 'expression' ? 'block' : 'none';
    });
  });

  // Target Form (SOP vs POS)
  const formBtns = document.querySelectorAll('#target-form-control .segmented-btn');
  formBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      formBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTargetForm = btn.getAttribute('data-form');
      triggerSolve();
    });
  });

  // K-Map Show/Hide groups toggle
  const showBtn = document.getElementById('btn-kmap-show-groups');
  const hideBtn = document.getElementById('btn-kmap-hide-groups');
  if (showBtn && hideBtn) {
    showBtn.addEventListener('click', () => {
      showBtn.classList.add('active');
      hideBtn.classList.remove('active');
      const layer = document.querySelector('.kmap-overlay-layer');
      if (layer) layer.classList.remove('hidden');
    });
    hideBtn.addEventListener('click', () => {
      hideBtn.classList.add('active');
      showBtn.classList.remove('active');
      const layer = document.querySelector('.kmap-overlay-layer');
      if (layer) layer.classList.add('hidden');
    });
  }

  // K-Map view SOP/POS toggle
  const kmapFormBtns = document.querySelectorAll('#kmap-view-form-control .segmented-btn');
  kmapFormBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      kmapFormBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderKMapViews(btn.getAttribute('data-form') === 'POS');
    });
  });

  // QM view SOP/POS toggle
  const qmFormBtns = document.querySelectorAll('#qm-view-form-control .segmented-btn');
  qmFormBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      qmFormBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderQMViews(btn.getAttribute('data-form') === 'POS');
    });
  });

  // Solve button
  document.getElementById('btn-run-solve').addEventListener('click', () => {
    validateAndTrigger();
  });

  // Live input changes
  document.getElementById('minterms-input').addEventListener('input', () => validateInputsLive());
  document.getElementById('dontcares-input').addEventListener('input', () => validateInputsLive());
  document.getElementById('expr-input').addEventListener('input', () => validateExpressionLive());

  // K-Map Stepper Animation Buttons
  document.getElementById('btn-anim-play').addEventListener('click', toggleKMapAnimation);
  document.getElementById('btn-anim-next').addEventListener('click', stepKMapAnimationNext);
  document.getElementById('btn-anim-prev').addEventListener('click', stepKMapAnimationPrev);
  document.getElementById('btn-anim-reset').addEventListener('click', resetKMapAnimation);

  // Practice Mode Generator
  document.getElementById('btn-generate-quiz').addEventListener('click', generatePracticeProblem);
  const diffBtns = document.querySelectorAll('#quiz-diff-control .segmented-btn');
  diffBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      diffBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      practiceDifficulty = btn.getAttribute('data-diff');
      generatePracticeProblem();
    });
  });

  // Circuit View Mode Control
  const circuitModeBtns = document.querySelectorAll('#circuit-view-mode-control .segmented-btn');
  circuitModeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      circuitModeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCircuitViewMode = btn.getAttribute('data-view');
      renderCircuitSection();
    });
  });

  // Re-run Complexity Benchmark
  const reanalyzeBtn = document.getElementById('btn-reanalyze-complexity');
  if (reanalyzeBtn) {
    reanalyzeBtn.addEventListener('click', () => {
      currentComplexityData = new ComplexityAnalyzer(currentNumVars, currentMinterms, currentDontCares).compare();
      renderComplexitySection(currentComplexityData);
    });
  }

  // Run Automated Tests
  const runTestsBtn = document.getElementById('btn-run-autotests');
  if (runTestsBtn) {
    runTestsBtn.addEventListener('click', () => {
      runAndRenderAutoTests();
    });
  }

  generatePracticeProblem();
}

function validateInputsLive() {
  const mInput = document.getElementById('minterms-input').value;
  const dInput = document.getElementById('dontcares-input').value;
  const mErr = document.getElementById('minterms-error');
  const dErr = document.getElementById('dontcares-error');

  const res = validateInputs(mInput, dInput, currentNumVars);
  if (!res.valid) {
    mErr.textContent = res.error;
    mErr.className = 'input-feedback show-error';
    return false;
  } else {
    mErr.textContent = '';
    mErr.className = 'input-feedback';
    dErr.textContent = '';
    dErr.className = 'input-feedback';
    return true;
  }
}

function validateExpressionLive() {
  const expr = document.getElementById('expr-input').value;
  const errEl = document.getElementById('expr-error');
  const res = validateBooleanExpression(expr, currentNumVars);
  if (!res.valid) {
    errEl.textContent = res.error;
    errEl.className = 'input-feedback show-error';
    return false;
  } else {
    errEl.textContent = '';
    errEl.className = 'input-feedback';
    return true;
  }
}

function validateAndTrigger() {
  const activeModeBtn = document.querySelector('#input-mode-control .segmented-btn.active');
  const mode = activeModeBtn ? activeModeBtn.getAttribute('data-mode') : 'minterms';

  if (mode === 'expression') {
    const expr = document.getElementById('expr-input').value;
    const res = validateBooleanExpression(expr, currentNumVars);
    if (!res.valid) {
      const errEl = document.getElementById('expr-error');
      errEl.textContent = res.error;
      errEl.className = 'input-feedback show-error';
      return;
    }
    currentMinterms = getMintermsFromExpression(expr, currentNumVars);
    currentDontCares = [];
    document.getElementById('minterms-input').value = currentMinterms.join(', ');
    document.getElementById('dontcares-input').value = '';
  } else {
    const mInput = document.getElementById('minterms-input').value;
    const dInput = document.getElementById('dontcares-input').value;
    const res = validateInputs(mInput, dInput, currentNumVars);
    if (!res.valid) {
      const mErr = document.getElementById('minterms-error');
      mErr.textContent = res.error;
      mErr.className = 'input-feedback show-error';
      return;
    }
    currentMinterms = res.minterms;
    currentDontCares = res.dontCares;
  }

  truthTableInstance.setData(currentMinterms, currentDontCares);
  triggerSolve();
}

function clearSolverInputs() {
  document.getElementById('minterms-input').value = '';
  document.getElementById('dontcares-input').value = '';
  document.getElementById('expr-input').value = '';
  currentMinterms = [];
  currentDontCares = [];
  truthTableInstance.setData([], []);
  triggerSolve();
}

function loadPresetExample(type) {
  if (type === 'simple') {
    setVariableCount(3);
    document.getElementById('minterms-input').value = '1, 3, 5, 7';
    document.getElementById('dontcares-input').value = '';
  } else if (type === 'wraparound') {
    setVariableCount(4);
    document.getElementById('minterms-input').value = '0, 2, 8, 10';
    document.getElementById('dontcares-input').value = '';
  } else if (type === 'dontcare') {
    setVariableCount(4);
    document.getElementById('minterms-input').value = '1, 3, 7, 11, 15';
    document.getElementById('dontcares-input').value = '0, 2, 5';
  } else if (type === 'complex') {
    setVariableCount(4);
    document.getElementById('minterms-input').value = '0, 1, 2, 5, 7, 8, 9, 10, 13, 15';
    document.getElementById('dontcares-input').value = '';
  }
  navigateToSection('solver');
  validateAndTrigger();
}

function setVariableCount(n) {
  currentNumVars = n;
  const varBtns = document.querySelectorAll('#var-count-control .segmented-btn');
  varBtns.forEach(btn => {
    if (parseInt(btn.getAttribute('data-vars'), 10) === n) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  truthTableInstance.setNumVars(n);
}

function triggerSolve() {
  // Solve K-Map
  kmapSolverInstance = new KMapSolver(currentNumVars, currentMinterms, currentDontCares);
  kmapResultCache = kmapSolverInstance.solve();

  // Solve Quine-McCluskey
  qmSolverInstance = new QuineMcCluskey(currentNumVars, currentMinterms, currentDontCares);
  qmResultCache = qmSolverInstance.solve();

  // Verification 3-Way
  const verifRes = verifyThreeWay(
    currentMinterms,
    currentDontCares,
    kmapResultCache.sop,
    qmResultCache.sop,
    currentNumVars,
    kmapResultCache.pos,
    qmResultCache.pos
  );

  currentVerifResult = verifRes;

  // Compute SOP vs POS comparison & Complexity
  currentSOPPOSComparison = new SOPPOSComparer(kmapResultCache.sop, kmapResultCache.pos, currentNumVars).analyze();
  currentComplexityData = new ComplexityAnalyzer(currentNumVars, currentMinterms, currentDontCares).compare();

  // Update truth table comparison column
  truthTableInstance.setData(currentMinterms, currentDontCares, kmapResultCache.sop);

  // Render sections
  renderQuickResultBanner(verifRes);
  renderKMapViews(false);
  renderQMViews(false);
  renderVerificationSection(verifRes);
  renderCircuitSection();
  renderComparisonSection(currentSOPPOSComparison);
  renderComplexitySection(currentComplexityData);
  runAndRenderAutoTests();
}

function renderQuickResultBanner(verifRes) {
  const banner = document.getElementById('solver-quick-result');
  banner.style.display = 'block';

  const origMetrics = { terms: currentMinterms.length, literals: currentMinterms.length * currentNumVars };
  const minMetrics = getExpressionMetrics(kmapResultCache.sop, false);
  const reductionPct = origMetrics.literals > 0
    ? (((origMetrics.literals - minMetrics.literals) / origMetrics.literals) * 100).toFixed(1)
    : 0;

  banner.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:1rem;">
      <div>
        <div style="font-size:0.85rem; font-weight:700; color:var(--color-primary); text-transform:uppercase; letter-spacing:0.5px;">Minimization Summary</div>
        <div style="font-size:1.4rem; font-weight:800; margin:0.35rem 0;">
          F = <span style="color:var(--color-primary);">${kmapResultCache.sop}</span>
        </div>
        <div style="font-size:0.95rem; color:var(--color-text-muted);">
          POS: <code>${kmapResultCache.pos}</code>
        </div>
      </div>
      <div style="display:flex; gap:1.5rem; text-align:right;">
        <div>
          <div style="font-size:0.75rem; color:var(--color-text-muted); font-weight:600;">TERMS</div>
          <div style="font-size:1.25rem; font-weight:700;">${origMetrics.terms} → ${minMetrics.terms}</div>
        </div>
        <div>
          <div style="font-size:0.75rem; color:var(--color-text-muted); font-weight:600;">LITERALS</div>
          <div style="font-size:1.25rem; font-weight:700;">${origMetrics.literals} → ${minMetrics.literals}</div>
        </div>
        <div>
          <div style="font-size:0.75rem; color:var(--color-text-muted); font-weight:600;">SAVINGS</div>
          <div style="font-size:1.25rem; font-weight:700; color:var(--color-success);">${reductionPct}%</div>
        </div>
      </div>
    </div>
    <div style="margin-top:0.75rem; padding-top:0.75rem; border-top:1px solid var(--color-border); font-size:0.88rem; color:${verifRes.isEquivalent ? 'var(--color-success)' : 'var(--color-danger)'}; font-weight:600;">
      ${verifRes.isEquivalent ? '✓ K-Map and Quine–McCluskey results are 100% logically equivalent across all input states.' : '⚠ Warning: Minimization forms differ in truth value.'}
    </div>
  `;
}

function renderKMapViews(forPOS = false) {
  const container = document.getElementById('kmap-display-container');
  container.innerHTML = '';

  const solver = kmapSolverInstance;
  const numRows = solver.rowGray.length;
  const numCols = solver.colGray.length;

  // Update left input details card
  const statVars = document.getElementById('kmap-stat-vars');
  const statMin = document.getElementById('kmap-stat-minterms');
  const statDc = document.getElementById('kmap-stat-dontcares');
  if (statVars) statVars.textContent = `${getVarNames(currentNumVars).join(', ')} (${currentNumVars} variables)`;
  if (statMin) statMin.textContent = currentMinterms.length > 0 ? currentMinterms.join(', ') : 'None';
  if (statDc) statDc.textContent = currentDontCares.length > 0 ? currentDontCares.join(', ') : 'None';

  const wrapper = document.createElement('div');
  wrapper.className = 'kmap-wrapper';

  const table = document.createElement('table');
  table.className = 'kmap-table';

  // Corner Header
  const headerTr = document.createElement('tr');
  const cornerTh = document.createElement('th');
  cornerTh.className = 'header-corner';
  const rowVarStr = solver.rowVars.join('');
  const colVarStr = solver.colVars.join('');
  cornerTh.innerHTML = `<span style="font-size:0.85rem; color:var(--color-text-muted);">${rowVarStr}</span> \\ <span style="color:var(--color-primary);">${colVarStr}</span>`;
  headerTr.appendChild(cornerTh);

  for (let c = 0; c < numCols; c++) {
    const th = document.createElement('th');
    th.className = 'col-header';
    th.innerText = toBinary(solver.colGray[c], solver.colVars.length);
    headerTr.appendChild(th);
  }
  table.appendChild(headerTr);

  // Table Body Rows
  for (let r = 0; r < numRows; r++) {
    const tr = document.createElement('tr');
    const rowTh = document.createElement('th');
    rowTh.className = 'row-header';
    rowTh.innerText = toBinary(solver.rowGray[r], solver.rowVars.length);
    tr.appendChild(rowTh);

    for (let c = 0; c < numCols; c++) {
      const td = document.createElement('td');
      td.className = 'kmap-cell';
      const idx = solver.getCellIndex(r, c);
      const val = solver.getCellValue(r, c);
      td.classList.add(`val-${val.toLowerCase()}`);
      td.setAttribute('data-row', r);
      td.setAttribute('data-col', c);
      td.setAttribute('data-idx', idx);
      td.innerHTML = `<span>${val}</span><span class="kmap-cell-idx">${idx}</span>`;
      td.addEventListener('click', () => {
        syncStateFromIndex(idx);
      });
      tr.appendChild(td);
    }
    table.appendChild(tr);
  }

  wrapper.appendChild(table);

  // Overlay layer for colored group rectangles & floating pill tags
  const overlayLayer = document.createElement('div');
  overlayLayer.className = 'kmap-overlay-layer';
  wrapper.appendChild(overlayLayer);

  container.appendChild(wrapper);

  // Groups to display
  const activeGroups = forPOS ? kmapResultCache.posGroups : kmapResultCache.groups;
  currentStepAnimation.groups = activeGroups;
  currentStepAnimation.totalSteps = activeGroups.length;

  // Render Overlays, Side Cards, and Legends
  renderGroupOverlays(table, overlayLayer, activeGroups, forPOS);
  renderGroupLegends(activeGroups, forPOS);
  renderSideGroupsList(activeGroups, forPOS);

  // Summary box matching reference
  const summaryBox = document.getElementById('kmap-summary-box');
  const sopStr = kmapResultCache.sop;
  const posStr = kmapResultCache.pos;
  summaryBox.innerHTML = `
    <div style="display:flex; align-items:center; gap:0.75rem;">
      <div style="width:34px; height:34px; border-radius:50%; background:#10b981; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:1.1rem;">✓</div>
      <div>
        <div style="font-size:0.75rem; color:var(--color-text-muted); font-weight:700; text-transform:uppercase;">Minimized Expression (${forPOS ? 'POS' : 'SOP'})</div>
        <div style="font-size:1.35rem; font-weight:800; color:var(--color-primary);">F = ${forPOS ? posStr : sopStr}</div>
      </div>
    </div>
    <div style="font-size:0.95rem; color:var(--color-text-muted);">
      <span style="font-weight:600;">Alternate (${forPOS ? 'SOP' : 'POS'}):</span> <code>F = ${forPOS ? sopStr : posStr}</code>
    </div>
    <div>
      <button class="btn btn-primary" onclick="navigateToSection('qm')">Next: Quine-McCluskey →</button>
    </div>
  `;
}

function renderGroupOverlays(table, overlayLayer, groups, isPOS) {
  overlayLayer.innerHTML = '';
  // Measure table geometry from actual DOM cells
  const headerOffsetTop = table.rows[0].offsetHeight;
  const headerOffsetLeft = table.rows[0].cells[0].offsetWidth;
  const cellHeight = table.rows[1].cells[1].offsetHeight;
  const cellWidth = table.rows[1].cells[1].offsetWidth;
  const numRows = table.rows.length - 1;
  const numCols = table.rows[0].cells.length - 1;

  groups.forEach((group, gIdx) => {
    const colorClass = `group-color-${gIdx % 8}`;
    const tagClass = `group-tag-${gIdx % 8}`;
    const expl = kmapSolverInstance.getGroupExplanation(group, isPOS);

    // Handle wrap-around segmentation
    const rowSegments = [];
    if (group.r + group.h <= numRows) {
      rowSegments.push({ r: group.r, h: group.h, isEdge: false });
    } else {
      rowSegments.push({ r: group.r, h: numRows - group.r, isEdge: true, edge: 'bottom' });
      rowSegments.push({ r: 0, h: (group.r + group.h) % numRows, isEdge: true, edge: 'top' });
    }

    const colSegments = [];
    if (group.c + group.w <= numCols) {
      colSegments.push({ c: group.c, w: group.w, isEdge: false });
    } else {
      colSegments.push({ c: group.c, w: numCols - group.c, isEdge: true, edge: 'right' });
      colSegments.push({ c: 0, w: (group.c + group.w) % numCols, isEdge: true, edge: 'left' });
    }

    // Multiply rowSegments x colSegments to generate 1, 2, or 4 visual sub-rectangles
    const renderedRects = [];
    rowSegments.forEach(rs => {
      colSegments.forEach(cs => {
        const rect = document.createElement('div');
        rect.className = `group-rect ${colorClass}`;
        rect.setAttribute('data-group-idx', gIdx);

        const pad = 5 + ((gIdx % 3) * 3); // Stagger insets for overlapping groups
        const top = headerOffsetTop + rs.r * cellHeight + pad;
        const left = headerOffsetLeft + cs.c * cellWidth + pad;
        const width = cs.w * cellWidth - pad * 2;
        const height = rs.h * cellHeight - pad * 2;

        rect.style.top = `${top}px`;
        rect.style.left = `${left}px`;
        rect.style.width = `${width}px`;
        rect.style.height = `${height}px`;

        // If wrap-around segment, style edge borders cleanly
        if (rs.isEdge || cs.isEdge) {
          rect.style.borderRadius = '12px';
        }

        rect.addEventListener('mouseenter', () => highlightGroup(gIdx));
        rect.addEventListener('mouseleave', () => unhighlightGroup());
        rect.addEventListener('click', () => selectGroup(group, gIdx, isPOS));

        overlayLayer.appendChild(rect);
        renderedRects.push({ rect, top, left, width, height, r: rs.r, c: cs.c });
      });
    });

    // Floating pill label (e.g. "G1 • A'B'")
    if (renderedRects.length > 0) {
      const primaryRect = renderedRects[0];
      const tag = document.createElement('div');
      tag.className = `group-tag ${tagClass}`;
      tag.setAttribute('data-group-idx', gIdx);
      tag.textContent = `G${gIdx + 1} • ${expl.term}`;

      // Smart positioning: place tag near top-right or bottom-center of first rect
      if (primaryRect.height > primaryRect.width) {
        // Vertical column group: place below bottom edge
        tag.style.top = `${primaryRect.top + primaryRect.height + 4}px`;
        tag.style.left = `${primaryRect.left + (primaryRect.width / 2) - 34}px`;
      } else {
        // Horizontal or square group: place to the right
        tag.style.top = `${primaryRect.top + (primaryRect.height / 2) - 12}px`;
        tag.style.left = `${primaryRect.left + primaryRect.width + 8}px`;
      }

      tag.addEventListener('mouseenter', () => highlightGroup(gIdx));
      tag.addEventListener('mouseleave', () => unhighlightGroup());
      tag.addEventListener('click', () => selectGroup(group, gIdx, isPOS));

      overlayLayer.appendChild(tag);
    }
  });
}

function renderGroupLegends(groups, isPOS) {
  const container = document.getElementById('kmap-groups-legend');
  container.innerHTML = '';

  if (groups.length === 0) {
    container.innerHTML = '<div style="color:var(--color-text-muted); font-size:0.9rem;">No groups required (function is constant 0 or 1).</div>';
    return;
  }

  groups.forEach((group, idx) => {
    const expl = kmapSolverInstance.getGroupExplanation(group, isPOS);
    const item = document.createElement('div');
    item.className = 'group-legend-item';
    item.setAttribute('data-group-idx', idx);

    let fixedVarsHtml = expl.commonVars.map(c => `<code>${c.text}</code>`).join(', ') || 'None';
    let elimVarsHtml = expl.eliminatedVars.map(v => `<code>${v}</code>`).join(', ') || 'None';

    item.innerHTML = `
      <div style="display:flex; align-items:center; gap:0.75rem; flex:1;">
        <span class="group-badge group-color-${idx % 8}" style="background:currentColor;"></span>
        <div>
          <strong>GROUP ${idx + 1}</strong> <span style="color:var(--color-text-muted); font-size:0.85rem;">(${expl.size} cells)</span>
          <div style="font-size:0.82rem; color:var(--color-text-muted); margin-top:2px;">
            Cells: m(${expl.indices.join(', ')})
          </div>
        </div>
      </div>
      <div style="display:flex; gap:1.5rem; align-items:center; flex-wrap:wrap;">
        <div style="font-size:0.85rem;"><span style="color:var(--color-text-muted);">Type:</span> <strong>${expl.typeName}</strong></div>
        <div style="font-size:0.85rem;"><span style="color:var(--color-text-muted);">Fixed:</span> ${fixedVarsHtml}</div>
        <div style="font-size:0.85rem;"><span style="color:var(--color-text-muted);">Eliminated:</span> ${elimVarsHtml}</div>
        <div style="font-weight:800; font-size:1.15rem; color:var(--color-primary); min-width:60px; text-align:right;">
          ${expl.term}
        </div>
      </div>
    `;

    item.addEventListener('mouseenter', () => highlightGroup(idx));
    item.addEventListener('mouseleave', () => unhighlightGroup());
    item.addEventListener('click', () => selectGroup(group, idx, isPOS));

    container.appendChild(item);
  });
}

function renderSideGroupsList(groups, isPOS) {
  const sideList = document.getElementById('kmap-side-groups-list');
  if (!sideList) return;
  sideList.innerHTML = '';

  if (groups.length === 0) {
    sideList.innerHTML = '<div style="color:var(--color-text-muted); font-size:0.82rem;">No groups</div>';
    return;
  }

  groups.forEach((group, idx) => {
    const expl = kmapSolverInstance.getGroupExplanation(group, isPOS);
    const card = document.createElement('div');
    card.className = 'kmap-side-group-card';
    card.setAttribute('data-group-idx', idx);

    card.innerHTML = `
      <div style="display:flex; align-items:center; gap:0.5rem;">
        <span class="group-badge group-color-${idx % 8}" style="background:currentColor;"></span>
        <div>
          <div style="font-weight:700; font-size:0.85rem;">Group ${idx + 1} <span style="font-weight:normal; color:var(--color-text-muted); font-size:0.75rem;">(${expl.size} cells)</span></div>
          <div style="font-weight:800; color:var(--color-primary); font-size:0.95rem;">${expl.term}</div>
        </div>
      </div>
      <div style="color:var(--color-text-muted); font-size:0.9rem;">›</div>
    `;

    card.addEventListener('mouseenter', () => highlightGroup(idx));
    card.addEventListener('mouseleave', () => unhighlightGroup());
    card.addEventListener('click', () => selectGroup(group, idx, isPOS));

    sideList.appendChild(card);
  });
}

function highlightGroup(groupIdx) {
  const activeGroups = kmapResultCache ? kmapResultCache.groups : [];
  const targetGroup = activeGroups[groupIdx];

  // Highlight overlays
  document.querySelectorAll('.group-rect, .group-tag').forEach(r => {
    if (parseInt(r.getAttribute('data-group-idx'), 10) === groupIdx) {
      r.classList.add('highlighted');
      r.style.opacity = '1';
    } else {
      r.classList.remove('highlighted');
      r.style.opacity = '0.25';
    }
  });

  // Highlight list items
  document.querySelectorAll('.group-legend-item, .kmap-side-group-card').forEach(it => {
    if (parseInt(it.getAttribute('data-group-idx'), 10) === groupIdx) {
      it.classList.add('active');
    } else {
      it.classList.remove('active');
    }
  });

  // Highlight cells belonging to this group
  if (targetGroup) {
    const indicesSet = new Set(targetGroup.indices);
    document.querySelectorAll('.kmap-cell').forEach(cell => {
      const idx = parseInt(cell.getAttribute('data-idx'), 10);
      if (indicesSet.has(idx)) {
        cell.classList.add('cell-highlighted');
      } else {
        cell.classList.remove('cell-highlighted');
      }
    });
  }
}

function unhighlightGroup() {
  document.querySelectorAll('.group-rect, .group-tag').forEach(r => {
    r.classList.remove('highlighted');
    r.style.opacity = '1';
  });
  document.querySelectorAll('.group-legend-item, .kmap-side-group-card').forEach(it => {
    it.classList.remove('active');
  });
  document.querySelectorAll('.kmap-cell').forEach(cell => {
    cell.classList.remove('cell-highlighted');
  });
}

function selectGroup(group, groupIdx, isPOS) {
  // Mark selected state
  document.querySelectorAll('.group-rect').forEach(r => {
    if (parseInt(r.getAttribute('data-group-idx'), 10) === groupIdx) {
      r.classList.add('selected');
    } else {
      r.classList.remove('selected');
    }
  });

  document.querySelectorAll('.group-legend-item, .kmap-side-group-card').forEach(it => {
    if (parseInt(it.getAttribute('data-group-idx'), 10) === groupIdx) {
      it.classList.add('selected');
    } else {
      it.classList.remove('selected');
    }
  });

  showGroupExplanation(group, isPOS);
}

function showGroupExplanation(group, isPOS) {
  const expl = kmapSolverInstance.getGroupExplanation(group, isPOS);
  const box = document.getElementById('kmap-group-detail-box');
  box.style.display = 'block';

  let commonVarsHtml = expl.commonVars.map(c => `<code>${c.text}</code>`).join(', ') || 'None';
  let elimVarsHtml = expl.eliminatedVars.map(v => `<code>${v}</code>`).join(', ') || 'None';

  box.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
      <h4 style="margin:0; font-size:1.15rem; color:var(--color-primary);">Group Detailed Analysis: ${expl.term}</h4>
      <button class="btn btn-secondary btn-sm" onclick="document.getElementById('kmap-group-detail-box').style.display='none'">✕ Close</button>
    </div>
    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:1rem; font-size:0.9rem;">
      <div><span style="color:var(--color-text-muted);">Cells:</span> <strong>m(${expl.indices.join(', ')})</strong></div>
      <div><span style="color:var(--color-text-muted);">Type:</span> <strong>${expl.typeName} (${expl.size} cells)</strong></div>
      <div><span style="color:var(--color-text-muted);">Fixed Variables:</span> ${commonVarsHtml}</div>
      <div><span style="color:var(--color-text-muted);">Eliminated Variables:</span> ${elimVarsHtml}</div>
    </div>
    <p style="margin:0.85rem 0 0 0; font-size:0.9rem; color:var(--color-text); background:var(--color-card); padding:0.75rem 1rem; border-radius:8px; border:1px solid var(--color-border);">
      <strong>Elimination Rationale:</strong> ${expl.explanation}
    </p>
  `;
}

// K-Map Animation Controller
function toggleKMapAnimation() {
  const btn = document.getElementById('btn-anim-play');
  if (currentStepAnimation.running) {
    clearInterval(currentStepAnimation.timer);
    currentStepAnimation.running = false;
    btn.textContent = '▶ Play Grouping';
  } else {
    currentStepAnimation.running = true;
    currentStepAnimation.stepIdx = 0;
    btn.textContent = '⏸ Pause';
    currentStepAnimation.timer = setInterval(() => {
      stepKMapAnimationNext();
      if (currentStepAnimation.stepIdx >= currentStepAnimation.totalSteps) {
        clearInterval(currentStepAnimation.timer);
        currentStepAnimation.running = false;
        btn.textContent = '▶ Play Grouping';
      }
    }, 1400);
  }
}

function stepKMapAnimationNext() {
  if (currentStepAnimation.stepIdx < currentStepAnimation.totalSteps) {
    currentStepAnimation.stepIdx++;
    applyKMapAnimationStep();
  }
}

function stepKMapAnimationPrev() {
  if (currentStepAnimation.stepIdx > 1) {
    currentStepAnimation.stepIdx--;
    applyKMapAnimationStep();
  }
}

function resetKMapAnimation() {
  if (currentStepAnimation.running) {
    clearInterval(currentStepAnimation.timer);
    currentStepAnimation.running = false;
    document.getElementById('btn-anim-play').textContent = '▶ Play Grouping';
  }
  currentStepAnimation.stepIdx = currentStepAnimation.totalSteps;
  applyKMapAnimationStep();
}

function applyKMapAnimationStep() {
  const status = document.getElementById('anim-step-status');
  const idx = currentStepAnimation.stepIdx;
  const total = currentStepAnimation.totalSteps;

  if (idx >= total) {
    status.textContent = `All ${total} Groups Highlighted`;
    document.querySelectorAll('.group-rect').forEach(r => r.style.display = 'block');
  } else {
    status.textContent = `Step ${idx} of ${total}: Grouping Implicant ${idx}`;
    document.querySelectorAll('.group-rect').forEach(r => {
      const gIdx = parseInt(r.getAttribute('data-group-idx'), 10);
      r.style.display = gIdx < idx ? 'block' : 'none';
    });
    highlightGroup(idx - 1);
  }
}

function renderQMViews(forPOS = false) {
  const solver = qmSolverInstance;
  const res = forPOS ? qmResultCache.posResult : qmResultCache;
  const container = document.getElementById('qm-stepper-container');
  container.innerHTML = '';

  // Step 1: Initial Grouping Accordion
  let stepsHtml = '';
  res.steps.forEach((step, sIdx) => {
    let roundHtml = `
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th style="width:120px;">Group (Weight)</th>
              <th style="font-family:monospace;">Binary Term</th>
              <th>Covered Minterms</th>
              <th style="width:100px;">Combined</th>
            </tr>
          </thead>
          <tbody>
    `;

    Object.keys(step.groups).forEach(gKey => {
      const items = step.groups[gKey];
      items.forEach(item => {
        roundHtml += `
          <tr>
            <td style="font-weight:600; text-align:center;">Weight ${gKey}</td>
            <td style="font-family:monospace; font-weight:700; color:var(--color-primary);">${item.term}</td>
            <td>m(${item.minterms.join(', ')})</td>
            <td style="text-align:center; font-weight:600; color:${item.used ? 'var(--color-success)' : 'var(--color-warning)'};">
              ${item.used ? '✓ Combined' : '★ Prime Implicant'}
            </td>
          </tr>
        `;
      });
    });

    roundHtml += `</tbody></table></div>`;

    stepsHtml += `
      <div class="accordion-item ${sIdx === 0 ? 'open' : ''}">
        <div class="accordion-header" onclick="toggleAccordion(this)">
          <span>STEP ${sIdx + 1}: Round ${step.round} Pairwise Term Merging</span>
          <span>▾</span>
        </div>
        <div class="accordion-content">
          ${roundHtml}
        </div>
      </div>
    `;
  });

  // Combination Logs
  if (res.combinationLogs && res.combinationLogs.length > 0) {
    let combHtml = '<div class="table-responsive"><table><thead><tr><th>Round</th><th>Term 1</th><th>Term 2</th><th>Result</th><th>Eliminated</th><th>Rationale</th></tr></thead><tbody>';
    res.combinationLogs.forEach(c => {
      combHtml += `
        <tr>
          <td style="text-align:center;">R${c.round}</td>
          <td style="font-family:monospace;">${c.term1}</td>
          <td style="font-family:monospace;">${c.term2}</td>
          <td style="font-family:monospace; font-weight:bold; color:var(--color-primary);">${c.result}</td>
          <td style="font-weight:bold; color:var(--color-secondary);">${c.eliminatedVar}</td>
          <td style="font-size:0.85rem; color:var(--color-text-muted);">${c.explanation}</td>
        </tr>
      `;
    });
    combHtml += '</tbody></table></div>';

    stepsHtml += `
      <div class="accordion-item">
        <div class="accordion-header" onclick="toggleAccordion(this)">
          <span>STEP ${res.steps.length + 1}: Detailed Elimination Logs (${res.combinationLogs.length} combinations)</span>
          <span>▾</span>
        </div>
        <div class="accordion-content">
          ${combHtml}
        </div>
      </div>
    `;
  }

  container.innerHTML = stepsHtml;

  // Prime Implicant Chart
  const chartContainer = document.getElementById('qm-pi-chart-container');
  chartContainer.innerHTML = '';

  const targetMinterms = forPOS ? solver.allTerms.filter(m => !solver.minterms.includes(m) && !solver.dontCares.includes(m)) : solver.minterms;

  if (res.primeImplicants.length > 0) {
    let chartHtml = `
      <table>
        <thead>
          <tr>
            <th style="min-width:180px;">Prime Implicant</th>
            <th style="min-width:80px;">Essential?</th>
    `;
    targetMinterms.forEach(m => {
      chartHtml += `<th style="text-align:center;">${m}</th>`;
    });
    chartHtml += `</tr></thead><tbody>`;

    const vars = getVarNames(solver.numVars);
    res.primeImplicants.forEach((pi, idx) => {
      const isEssential = res.essentialPIs.some(epi => epi.term === pi.term);
      const isSelected = res.finalCover.some(fc => fc.term === pi.term);
      const expr = termToExpression(pi.term, vars, forPOS);

      chartHtml += `
        <tr style="background:${isEssential ? 'rgba(79, 70, 229, 0.06)' : 'transparent'};">
          <td style="font-weight:bold; font-family:monospace;">
            ${expr} <span style="color:var(--color-text-muted); font-size:0.8rem;">(${pi.term})</span>
          </td>
          <td style="font-weight:700; color:${isEssential ? 'var(--color-primary)' : 'var(--color-text-muted)'};">
            ${isEssential ? '★ YES' : (isSelected ? '✓ Cover' : '—')}
          </td>
      `;

      targetMinterms.forEach(m => {
        const covers = pi.minterms.includes(m);
        chartHtml += `
          <td style="text-align:center; font-weight:bold; font-size:1.1rem; color:${covers ? (isEssential ? 'var(--color-primary)' : 'var(--color-success)') : 'transparent'};">
            ${covers ? '●' : '·'}
          </td>
        `;
      });
      chartHtml += `</tr>`;
    });

    chartHtml += `</tbody></table>`;
    chartContainer.innerHTML = chartHtml;
  }

  // Essential PI explanations
  const reasonsDiv = document.getElementById('qm-essential-reasons');
  reasonsDiv.innerHTML = '';
  if (res.essentialReasons && res.essentialReasons.length > 0) {
    let rHtml = '<div style="background:var(--color-surface); padding:1rem; border-radius:8px; border:1px solid var(--color-border);">';
    rHtml += '<h4 style="margin:0 0 0.5rem 0; font-size:0.95rem; color:var(--color-primary);">Essential Prime Implicant Justifications:</h4><ul style="margin:0; padding-left:1.25rem; font-size:0.88rem;">';
    res.essentialReasons.forEach(r => {
      rHtml += `<li>${r.explanation}</li>`;
    });
    rHtml += '</ul></div>';
    reasonsDiv.innerHTML = rHtml;
  }

  // QM Summary box
  const qmSummaryBox = document.getElementById('qm-summary-box');
  const exprFinal = forPOS ? qmResultCache.pos : qmResultCache.sop;
  qmSummaryBox.innerHTML = `
    <h3 style="margin:0 0 0.35rem 0; font-size:1.2rem;">Quine–McCluskey ${forPOS ? 'POS' : 'SOP'} Solution:</h3>
    <div style="font-size:1.4rem; font-weight:800; color:var(--color-primary);">F = ${exprFinal}</div>
    <div style="font-size:0.88rem; color:var(--color-text-muted); margin-top:0.35rem;">
      Reduced to ${res.finalCover.length} prime implicants (${res.essentialPIs.length} essential, ${res.finalCover.length - res.essentialPIs.length} Petrick/branch covers).
    </div>
  `;
}

function renderVerificationSection(verifRes) {
  const masterBanner = document.getElementById('verif-master-banner');
  if (verifRes.allThreeEquivalent) {
    masterBanner.style.background = '#dcfce7';
    masterBanner.style.color = '#15803d';
    masterBanner.style.border = '1px solid #86efac';
    masterBanner.innerHTML = `
      <div style="font-size:1.15rem; font-weight:bold; margin-bottom:0.25rem;">✓ Verified: All Three Functions Are Logically Equivalent!</div>
      <div style="font-size:0.9rem; font-weight:normal;">Both K-Map and Quine–McCluskey minimizations produce 100% identical truth tables and match the original function specification on all valid minterms.</div>
    `;
  } else {
    masterBanner.style.background = '#fee2e2';
    masterBanner.style.color = '#b91c1c';
    masterBanner.style.border = '1px solid #fca5a5';
    masterBanner.innerHTML = `
      <div style="font-size:1.15rem; font-weight:bold; margin-bottom:0.25rem;">⚠ Discrepancy Detected in Truth Table Verification!</div>
      <div style="font-size:0.9rem; font-weight:normal;">Check the comparison table below for mismatched input rows.</div>
    `;
  }

  document.getElementById('verif-stat-1').innerHTML = verifRes.origEqualsKmap
    ? '<span style="color:var(--color-success)">✓ PASS</span>'
    : '<span style="color:var(--color-danger)">✗ FAIL</span>';
  document.getElementById('verif-stat-2').innerHTML = verifRes.origEqualsQm
    ? '<span style="color:var(--color-success)">✓ PASS</span>'
    : '<span style="color:var(--color-danger)">✗ FAIL</span>';
  document.getElementById('verif-stat-3').innerHTML = verifRes.kmapEqualsQm
    ? '<span style="color:var(--color-success)">✓ PASS</span>'
    : '<span style="color:var(--color-danger)">✗ FAIL</span>';

  // Detailed Truth Table Proof
  const container = document.getElementById('verif-table-container');
  let tableHtml = `
    <table>
      <thead>
        <tr>
          <th style="width:60px; text-align:center;">Row #</th>
          <th style="width:100px; text-align:center;">Binary State</th>
          <th style="text-align:center;">Original F</th>
          <th style="text-align:center;">K-Map F</th>
          <th style="text-align:center;">QM F</th>
          <th style="text-align:center;">Status</th>
        </tr>
      </thead>
      <tbody>
  `;

  verifRes.table.forEach(row => {
    tableHtml += `
      <tr style="background:${row.match ? 'transparent' : 'rgba(239, 68, 68, 0.1)'};">
        <td style="text-align:center; color:var(--color-text-muted); font-size:0.85rem;">m${row.index}</td>
        <td style="text-align:center; font-family:monospace; font-weight:600;">${row.bin}</td>
        <td style="text-align:center; font-weight:bold;">${row.origVal}</td>
        <td style="text-align:center; font-weight:bold; color:var(--color-primary);">${row.kmapVal}</td>
        <td style="text-align:center; font-weight:bold; color:var(--color-secondary);">${row.qmVal}</td>
        <td style="text-align:center; font-weight:bold; color:${row.match ? 'var(--color-success)' : 'var(--color-danger)'};">
          ${row.match ? '✓ Match' : '✗ Mismatch'}
        </td>
      </tr>
    `;
  });

  tableHtml += '</tbody></table>';
  container.innerHTML = tableHtml;

  // Hardware Metrics
  const origMetrics = { terms: currentMinterms.length, literals: currentMinterms.length * currentNumVars };
  const minMetrics = getExpressionMetrics(kmapResultCache.sop, false);
  const termReduction = origMetrics.terms > 0 ? (((origMetrics.terms - minMetrics.terms) / origMetrics.terms) * 100).toFixed(1) : 0;
  const litReduction = origMetrics.literals > 0 ? (((origMetrics.literals - minMetrics.literals) / origMetrics.literals) * 100).toFixed(1) : 0;

  document.getElementById('verif-metrics-container').innerHTML = `
    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:1rem;">
      <div style="background:var(--color-surface); padding:1rem; border-radius:8px; border:1px solid var(--color-border);">
        <div style="font-size:0.8rem; color:var(--color-text-muted); font-weight:600;">TERMS (PRODUCT GATES)</div>
        <div style="font-size:1.4rem; font-weight:800; margin:0.25rem 0;">${origMetrics.terms} → ${minMetrics.terms}</div>
        <div style="font-size:0.85rem; color:var(--color-success); font-weight:600;">${termReduction}% reduction</div>
      </div>
      <div style="background:var(--color-surface); padding:1rem; border-radius:8px; border:1px solid var(--color-border);">
        <div style="font-size:0.8rem; color:var(--color-text-muted); font-weight:600;">LITERALS (INPUT WIRES)</div>
        <div style="font-size:1.4rem; font-weight:800; margin:0.25rem 0;">${origMetrics.literals} → ${minMetrics.literals}</div>
        <div style="font-size:0.85rem; color:var(--color-success); font-weight:600;">${litReduction}% reduction</div>
      </div>
      <div style="background:var(--color-surface); padding:1rem; border-radius:8px; border:1px solid var(--color-border);">
        <div style="font-size:0.8rem; color:var(--color-text-muted); font-weight:600;">EQUIVALENCE PROOF</div>
        <div style="font-size:1.4rem; font-weight:800; margin:0.25rem 0; color:var(--color-primary);">100%</div>
        <div style="font-size:0.85rem; color:var(--color-text-muted);">Checked all ${1 << currentNumVars} rows</div>
      </div>
    </div>
  `;
}

function generatePracticeProblem() {
  const container = document.getElementById('practice-problem-container');
  let numVars = 3;
  let hasDontCares = false;

  if (practiceDifficulty === 'Easy') {
    numVars = 3;
  } else if (practiceDifficulty === 'Medium') {
    numVars = 4;
  } else if (practiceDifficulty === 'Hard') {
    numVars = 4;
    hasDontCares = true;
  }

  const total = 1 << numVars;
  const minCount = Math.floor(Math.random() * 3) + 3;
  const pickedMinterms = new Set();
  while (pickedMinterms.size < minCount) {
    pickedMinterms.add(Math.floor(Math.random() * total));
  }

  const pickedDontCares = new Set();
  if (hasDontCares) {
    while (pickedDontCares.size < 2) {
      const r = Math.floor(Math.random() * total);
      if (!pickedMinterms.has(r)) {
        pickedDontCares.add(r);
      }
    }
  }

  const minList = Array.from(pickedMinterms).sort((a,b)=>a-b);
  const dcList = Array.from(pickedDontCares).sort((a,b)=>a-b);

  const testSolver = new KMapSolver(numVars, minList, dcList);
  const expectedRes = testSolver.solve();

  currentPracticeProblem = {
    numVars,
    minterms: minList,
    dontCares: dcList,
    solutionSOP: expectedRes.sop,
    solutionPOS: expectedRes.pos
  };

  const vars = getVarNames(numVars).join(', ');
  let dcText = dcList.length > 0 ? ` + d(${dcList.join(', ')})` : '';

  container.innerHTML = `
    <div style="background:var(--color-surface); padding:1.25rem; border-radius:8px; border:1px solid var(--color-border);">
      <div style="font-size:0.85rem; font-weight:700; color:var(--color-primary); text-transform:uppercase;">
        Challenge Problem (${practiceDifficulty})
      </div>
      <div style="font-size:1.3rem; font-weight:bold; margin:0.5rem 0;">
        F(${vars}) = Σm(${minList.join(', ')})${dcText}
      </div>
      <p style="font-size:0.9rem; color:var(--color-text-muted);">
        Minimize this Boolean function to its optimal SOP expression:
      </p>

      <div style="display:flex; gap:0.75rem; flex-wrap:wrap; margin-top:1rem;">
        <input type="text" id="quiz-user-input" class="form-input" style="max-width:380px;" placeholder="e.g. A'B + C'D" />
        <button class="btn btn-primary" id="btn-quiz-check">Check Answer</button>
        <button class="btn btn-secondary" id="btn-quiz-show-sol">Show Solution</button>
      </div>

      <div id="quiz-feedback-box" style="margin-top:1rem; display:none; padding:0.85rem 1rem; border-radius:6px; font-weight:600; font-size:0.95rem;"></div>
    </div>
  `;

  document.getElementById('btn-quiz-check').addEventListener('click', checkPracticeAnswer);
  document.getElementById('btn-quiz-show-sol').addEventListener('click', showPracticeSolution);
}

function checkPracticeAnswer() {
  const userAns = document.getElementById('quiz-user-input').value.trim();
  const feedback = document.getElementById('quiz-feedback-box');
  feedback.style.display = 'block';

  if (!userAns) {
    feedback.style.background = '#fee2e2';
    feedback.style.color = '#b91c1c';
    feedback.textContent = 'Please enter an expression to check.';
    return;
  }

  // Validate expression syntax before checking
  const validation = validateBooleanExpression(userAns, currentPracticeProblem.numVars);
  if (!validation.valid) {
    feedback.style.background = '#fee2e2';
    feedback.style.color = '#b91c1c';
    feedback.textContent = 'Invalid expression: ' + validation.error;
    return;
  }

  const verif = verifyThreeWay(
    currentPracticeProblem.minterms,
    currentPracticeProblem.dontCares,
    userAns,
    currentPracticeProblem.solutionSOP,
    currentPracticeProblem.numVars
  );

  if (verif.origEqualsKmap) {
    feedback.style.background = '#dcfce7';
    feedback.style.color = '#15803d';
    feedback.innerHTML = `✓ Correct! Your minimized expression is 100% logically equivalent to the target function. Optimal minimal: <code>${currentPracticeProblem.solutionSOP}</code>`;
  } else {
    feedback.style.background = '#fee2e2';
    feedback.style.color = '#b91c1c';
    feedback.innerHTML = `✗ Incorrect. Your expression does not produce the expected truth values. Try again or click "Show Solution"!`;
  }
}

function showPracticeSolution() {
  const feedback = document.getElementById('quiz-feedback-box');
  feedback.style.display = 'block';
  feedback.style.background = '#eff6ff';
  feedback.style.color = '#1e40af';
  feedback.innerHTML = `
    <strong>Optimal Solution:</strong><br>
    SOP: <code>${currentPracticeProblem.solutionSOP}</code><br>
    POS: <code>${currentPracticeProblem.solutionPOS}</code>
  `;
}

function toggleAccordion(headerEl) {
  const item = headerEl.parentElement;
  item.classList.toggle('open');
}

// ==========================================
// 1. LIVE SYNCHRONIZATION
// ==========================================
function syncStateFromInputs(inputStates) {
  const vars = getVarNames(currentNumVars);
  let idx = 0;
  vars.forEach((v, i) => {
    const bitShift = currentNumVars - 1 - i;
    if (inputStates[v]) {
      idx |= (1 << bitShift);
    }
  });

  // Highlight truth table row
  if (truthTableInstance) {
    truthTableInstance.highlightRow(idx);
  }

  // Highlight K-Map cell
  highlightKmapCell(idx);
}

function syncStateFromIndex(idx) {
  const vars = getVarNames(currentNumVars);
  const states = {};
  vars.forEach((v, i) => {
    const bitShift = currentNumVars - 1 - i;
    states[v] = ((idx >> bitShift) & 1) ? 1 : 0;
  });

  // Update circuit renderer states and interactive switch UI
  if (circuitRendererInstance) {
    circuitRendererInstance.inputStates = { ...circuitRendererInstance.inputStates, ...states };
    document.querySelectorAll('.btn-input-switch').forEach(btn => {
      const v = btn.getAttribute('data-var');
      const st = states[v] || 0;
      btn.textContent = `${v} = ${st}`;
      btn.style.border = `1px solid ${st ? '#10b981' : '#cbd5e1'}`;
      btn.style.background = st ? '#10b981' : '#ffffff';
      btn.style.color = st ? '#ffffff' : '#334155';
    });
    // Re-render active circuit
    renderCircuitSection();
  }

  // Highlight truth table row
  if (truthTableInstance) {
    truthTableInstance.highlightRow(idx);
  }

  // Highlight K-Map cell
  highlightKmapCell(idx);
}

function highlightKmapCell(idx) {
  document.querySelectorAll('.kmap-cell').forEach(cell => {
    if (parseInt(cell.getAttribute('data-idx'), 10) === idx) {
      cell.classList.add('cell-active-input');
    } else {
      cell.classList.remove('cell-active-input');
    }
  });
}

// ==========================================
// 2. CIRCUIT VIEWS (Standard, Side-by-Side, NAND, NOR)
// ==========================================
function renderCircuitSection() {
  const container = document.getElementById('circuit-container');
  if (!container || !circuitRendererInstance || !kmapResultCache) return;

  const descEl = document.getElementById('circuit-mode-description');

  if (currentCircuitViewMode === 'standard') {
    if (descEl) descEl.textContent = 'Interactive schematic with live input switches and real-time wire propagation for minimized SOP expression.';
    circuitRendererInstance.setExpr(kmapResultCache.sop, currentNumVars);
  } else if (currentCircuitViewMode === 'compare') {
    if (descEl) descEl.textContent = 'Side-by-side optimization: original canonical form vs minimized circuit with gate counts and hardware savings.';
    container.innerHTML = '';
    const vars = getVarNames(currentNumVars);
    const origSop = currentMinterms.map(m => {
      const bin = toBinary(m, currentNumVars);
      return termToExpression(bin, vars, false);
    }).join(' + ') || '0';
    circuitRendererInstance.renderComparison(origSop, kmapResultCache.sop, currentNumVars);
  } else if (currentCircuitViewMode === 'nand') {
    if (descEl) descEl.textContent = 'Universal NAND-only circuit conversion using double negation on Sum-of-Products (SOP) form.';
    container.innerHTML = '';
    const conv = new NANDNORConverter(kmapResultCache.sop, kmapResultCache.pos, currentNumVars);
    const nandData = conv.toNAND();
    circuitRendererInstance.renderNANDCircuit(nandData, currentNumVars);
  } else if (currentCircuitViewMode === 'nor') {
    if (descEl) descEl.textContent = 'Universal NOR-only circuit conversion using double negation on Product-of-Sums (POS) form.';
    container.innerHTML = '';
    const conv = new NANDNORConverter(kmapResultCache.sop, kmapResultCache.pos, currentNumVars);
    const norData = conv.toNOR();
    circuitRendererInstance.renderNORCircuit(norData, currentNumVars);
  }
}

// ==========================================
// 3. SOP vs POS COMPARISON
// ==========================================
function renderComparisonSection(comparison) {
  const container = document.getElementById('comparison-content-container');
  if (!container || !comparison) return;

  const sop = comparison.sop;
  const pos = comparison.pos;
  const isSOPRec = comparison.recommendation === 'SOP';
  const isPOSRec = comparison.recommendation === 'POS';

  let recBannerBg = '#eff6ff';
  let recBannerBorder = '#bfdbfe';
  let recBannerColor = '#1e40af';
  if (isSOPRec || isPOSRec) {
    recBannerBg = '#ecfdf5';
    recBannerBorder = '#a7f3d0';
    recBannerColor = '#065f46';
  }

  container.innerHTML = `
    <!-- Recommendation Banner -->
    <div style="background:${recBannerBg}; border:1px solid ${recBannerBorder}; border-radius:8px; padding:1.25rem; margin-bottom:1.5rem; color:${recBannerColor};">
      <div style="display:flex; align-items:center; gap:0.6rem; font-weight:bold; font-size:1.15rem; margin-bottom:0.35rem;">
        <span>★ Recommendation:</span>
        <span style="text-transform:uppercase; font-size:1.2rem; text-decoration:underline;">${comparison.recommendation} Form</span>
      </div>
      <div style="font-size:0.95rem;">${comparison.reason}</div>
    </div>

    <!-- Side-by-Side Comparison Grid -->
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(320px, 1fr)); gap:1.5rem; margin-bottom:1.5rem;">
      <!-- SOP Card -->
      <div class="card" style="margin:0; border:2px solid ${isSOPRec ? 'var(--color-primary)' : 'var(--color-border)'};">
        <div class="card-header">
          <h3 style="color:var(--color-primary);">Sum-of-Products (SOP)</h3>
          ${isSOPRec ? '<span style="background:var(--color-primary); color:#fff; font-size:0.75rem; padding:0.2rem 0.5rem; border-radius:4px; font-weight:bold;">RECOMMENDED</span>' : ''}
        </div>
        <div style="font-size:1.25rem; font-weight:bold; font-family:monospace; margin-bottom:1rem; word-break:break-word;">
          F = ${sop.expr}
        </div>
        <div class="table-responsive">
          <table>
            <tbody>
              <tr><td><strong>Product Terms (AND gates)</strong></td><td style="text-align:right; font-weight:bold;">${sop.gates.andGates}</td></tr>
              <tr><td><strong>Sum Term (OR gate)</strong></td><td style="text-align:right; font-weight:bold;">${sop.gates.orGates}</td></tr>
              <tr><td><strong>Inverters (NOT gates)</strong></td><td style="text-align:right; font-weight:bold;">${sop.gates.notGates}</td></tr>
              <tr style="background:var(--color-surface);"><td><strong>Total Gate Requirement</strong></td><td style="text-align:right; font-weight:bold; color:var(--color-primary); font-size:1.1rem;">${sop.totalGates}</td></tr>
              <tr><td><strong>Total Literals</strong></td><td style="text-align:right; font-weight:bold;">${sop.metrics.literals}</td></tr>
              <tr><td><strong>Total Terms</strong></td><td style="text-align:right; font-weight:bold;">${sop.metrics.terms}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- POS Card -->
      <div class="card" style="margin:0; border:2px solid ${isPOSRec ? 'var(--color-secondary)' : 'var(--color-border)'};">
        <div class="card-header">
          <h3 style="color:var(--color-secondary);">Product-of-Sums (POS)</h3>
          ${isPOSRec ? '<span style="background:var(--color-secondary); color:#fff; font-size:0.75rem; padding:0.2rem 0.5rem; border-radius:4px; font-weight:bold;">RECOMMENDED</span>' : ''}
        </div>
        <div style="font-size:1.25rem; font-weight:bold; font-family:monospace; margin-bottom:1rem; word-break:break-word;">
          F = ${pos.expr}
        </div>
        <div class="table-responsive">
          <table>
            <tbody>
              <tr><td><strong>Sum Terms (OR gates)</strong></td><td style="text-align:right; font-weight:bold;">${pos.gates.orGates}</td></tr>
              <tr><td><strong>Product Term (AND gate)</strong></td><td style="text-align:right; font-weight:bold;">${pos.gates.andGates}</td></tr>
              <tr><td><strong>Inverters (NOT gates)</strong></td><td style="text-align:right; font-weight:bold;">${pos.gates.notGates}</td></tr>
              <tr style="background:var(--color-surface);"><td><strong>Total Gate Requirement</strong></td><td style="text-align:right; font-weight:bold; color:var(--color-secondary); font-size:1.1rem;">${pos.totalGates}</td></tr>
              <tr><td><strong>Total Literals</strong></td><td style="text-align:right; font-weight:bold;">${pos.metrics.literals}</td></tr>
              <tr><td><strong>Total Factors</strong></td><td style="text-align:right; font-weight:bold;">${pos.metrics.terms}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

// ==========================================
// 4. COMPLEXITY ANALYZER
// ==========================================
function renderComplexitySection(complexityData) {
  const container = document.getElementById('complexity-content-container');
  if (!container || !complexityData) return;

  const km = complexityData.kmap;
  const qm = complexityData.qm;
  const comp = complexityData.comparison;

  container.innerHTML = `
    <!-- Summary banner -->
    <div class="result-banner" style="margin-bottom:1.5rem;">
      <h3 style="margin:0 0 0.5rem; font-size:1.15rem; color:var(--color-primary);">Benchmark Execution Results</h3>
      <p style="margin:0 0 0.5rem; font-size:0.95rem;">${complexityData.summary}</p>
      <div style="display:flex; gap:1.5rem; flex-wrap:wrap; font-size:0.88rem; font-weight:600;">
        <span>Faster Algorithm: <strong style="color:var(--color-success);">${comp.fasterMethod}</strong></span>
        <span>Speedup Ratio: <strong>${comp.speedRatio}x</strong></span>
        <span>Logical Equivalence: <strong style="color:var(--color-success);">${comp.equivalentResults ? '✓ 100% Identical' : '⚠ Differ'}</strong></span>
      </div>
    </div>

    <!-- Comparative Table -->
    <div class="table-responsive">
      <table>
        <thead>
          <tr>
            <th>Metric / Dimension</th>
            <th style="color:var(--color-primary);">Karnaugh Map (Spatial)</th>
            <th style="color:var(--color-secondary);">Quine–McCluskey (Tabular)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Execution Time</strong></td>
            <td style="font-weight:bold; font-family:monospace;">${km.executionTimeMs.toFixed(3)} ms</td>
            <td style="font-weight:bold; font-family:monospace;">${qm.executionTimeMs.toFixed(3)} ms</td>
          </tr>
          <tr>
            <td><strong>Total Operation Count</strong></td>
            <td style="font-weight:bold;">${km.operations.total} operations</td>
            <td style="font-weight:bold;">${qm.operations.total} operations</td>
          </tr>
          <tr>
            <td><strong>Grouping Mechanism</strong></td>
            <td>${km.operations.groupEnumerations} geometric rectangles checked across ${km.operations.cellReads} cells</td>
            <td>${qm.operations.pairComparisons} bitwise comparisons in ${qm.operations.rounds} merging rounds (${qm.operations.combinationsFound} prime terms merged)</td>
          </tr>
          <tr>
            <td><strong>Set Cover Phase</strong></td>
            <td>${km.operations.setCoverOps} branch checks over prime groups</td>
            <td>${qm.operations.chartConstruction} chart cell checks + ${qm.operations.essentialIdentification} essential checks</td>
          </tr>
          <tr>
            <td><strong>Theoretical Time Complexity</strong></td>
            <td style="font-family:monospace;">${km.complexity.groupFinding}</td>
            <td style="font-family:monospace;">${qm.complexity.tabularReduction}</td>
          </tr>
          <tr>
            <td><strong>Scalability Range</strong></td>
            <td>Practical for n ≤ 4 (2D visual limit)</td>
            <td>Scalable to n ≥ 6 in software implementations</td>
          </tr>
          <tr>
            <td><strong>Minimized SOP Result</strong></td>
            <td style="font-family:monospace; font-weight:bold; color:var(--color-primary);">${km.result.sop}</td>
            <td style="font-family:monospace; font-weight:bold; color:var(--color-secondary);">${qm.result.sop}</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

// ==========================================
// 5. AUTOMATED TESTING
// ==========================================
function runAndRenderAutoTests() {
  const container = document.getElementById('autotest-content-container');
  if (!container) return;

  const tester = new AutomatedTester();
  const summary = tester.runAllTests();

  let html = `
    <!-- Summary Header -->
    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; padding:1rem 1.25rem; border-radius:8px; margin-bottom:1.5rem; background:${summary.allPassed ? '#ecfdf5' : '#fef2f2'}; border:1px solid ${summary.allPassed ? '#a7f3d0' : '#fecaca'};">
      <div>
        <div style="font-size:1.2rem; font-weight:bold; color:${summary.allPassed ? '#065f46' : '#991b1b'};">
          ${summary.allPassed ? '✓ All Tests Passed Successfully!' : '⚠ Some Tests Failed'}
        </div>
        <div style="font-size:0.88rem; color:${summary.allPassed ? '#047857' : '#b91c1c'};">
          ${summary.passed} of ${summary.total} automated tests passed (${summary.passRate}%)
        </div>
      </div>
      <div style="display:flex; gap:1rem; font-size:1.1rem; font-weight:bold;">
        <span style="color:#059669;">Passed: ${summary.passed}</span>
        <span style="color:#dc2626;">Failed: ${summary.failed}</span>
      </div>
    </div>
  `;

  // Categories breakdown
  Object.keys(summary.categories).forEach(cat => {
    const cData = summary.categories[cat];
    const catPassed = cData.failed === 0;

    html += `
      <div class="card" style="margin-bottom:1rem; border-left:4px solid ${catPassed ? '#10b981' : '#ef4444'};">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
          <h4 style="margin:0; font-size:1rem; font-weight:700;">${cat}</h4>
          <span style="font-size:0.8rem; font-weight:bold; padding:0.2rem 0.5rem; border-radius:4px; background:${catPassed ? '#d1fae5' : '#fee2e2'}; color:${catPassed ? '#065f46' : '#991b1b'};">
            ${cData.passed}/${cData.tests.length} PASS
          </span>
        </div>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th style="width:50px;">Status</th>
                <th>Test Case Description</th>
                <th>Result Details</th>
              </tr>
            </thead>
            <tbody>
    `;

    cData.tests.forEach(t => {
      html += `
        <tr>
          <td style="text-align:center; font-weight:bold; color:${t.passed ? '#059669' : '#dc2626'};">
            ${t.passed ? '✓' : '✗'}
          </td>
          <td style="font-weight:600;">${t.name}</td>
          <td style="font-family:monospace; font-size:0.85rem; color:var(--color-text-muted);">${t.details}</td>
        </tr>
      `;
    });

    html += `</tbody></table></div></div>`;
  });

  container.innerHTML = html;
}

// ==========================================
// 6. SOLUTION REPORT DOWNLOAD
// ==========================================
function downloadSolutionReport() {
  if (!kmapResultCache || !qmResultCache) {
    triggerSolve();
  }
  const reporter = new ReportGenerator();
  const text = reporter.generate({
    numVars: currentNumVars,
    minterms: currentMinterms,
    dontCares: currentDontCares,
    kmapResult: kmapResultCache,
    qmResult: qmResultCache,
    verifResult: currentVerifResult,
    sopPosComparison: currentSOPPOSComparison,
    complexityData: currentComplexityData
  });
  reporter.download(text, `Boolean_Minimization_Report_${currentNumVars}Vars.txt`);
}
