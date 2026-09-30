/**
 * Main Application Orchestrator for BioAutomata DNA Helix Analyzer
 * Coordinates 3D Helix, Higgs-Field, Large Interactive State Transition Diagram,
 * View Mode Switching (3D Helix / Full Automata Canvas / Split View), and Biological Diagnostic Panels.
 */

import { DNA_PRESETS, BASE_COLORS, GENETIC_CODE } from "./data/presets.js";
import { MotifDFA, OrfDFA } from "./automata/dfa_orf_engine.js";
import { MutationNFA } from "./automata/nfa_mutation.js";
import { FormalSpecGenerator } from "./automata/formal_spec.js";
import { DnaHelix3D } from "./visualizer/dna_helix_3d.js";
import { StateGraphVisualizer } from "./visualizer/state_graph.js";

class DnaAutomataApp {
  constructor() {
    this.sequence = "";
    this.currentIndex = 0;
    this.mode = "orf"; // "orf" | "motif_dfa" | "mutation_nfa"
    this.targetMotif = "GAATTC";
    this.activePreset = DNA_PRESETS[0];

    // Automata instances
    this.orfDfa = new OrfDFA();
    this.motifDfa = new MotifDFA(this.targetMotif);
    this.mutationNfa = new MutationNFA("CCTGAGGAG", 1);

    // Playback loop
    this.isPlaying = false;
    this.playTimer = null;
    this.stepSpeedMs = 200;

    // Visualizers
    this.helix3D = null;
    this.sidebarGraph = null;
    this.centerGraph = null;
    this.centerView = "helix"; // "helix" | "automata" | "split"

    this.init();
  }

  init() {
    // 1. Initialize 3D Helix
    const helixContainer = document.getElementById("helix-canvas-container");
    if (helixContainer) {
      this.helix3D = new DnaHelix3D(helixContainer);
    }

    // 2. Initialize 2D State Graphs (Sidebar mini-graph & Center stage full-canvas)
    const sidebarCanvas = document.getElementById("state-graph-canvas");
    if (sidebarCanvas) {
      this.sidebarGraph = new StateGraphVisualizer(sidebarCanvas, { isMini: true, viewMode: "all", layoutMode: "auto" });
    }

    const centerCanvas = document.getElementById("center-graph-canvas");
    if (centerCanvas) {
      this.centerGraph = new StateGraphVisualizer(centerCanvas, { isMini: false, viewMode: "all", layoutMode: "auto" });
    }

    // 3. Populate Presets Dropdown
    this.setupPresetsDropdown();

    // 4. Attach Event Listeners
    this.attachEventListeners();

    // 5. Load default preset
    this.loadPreset(DNA_PRESETS[0]);
  }

  setupPresetsDropdown() {
    const select = document.getElementById("preset-select");
    if (!select) return;

    select.innerHTML = DNA_PRESETS.map((p, idx) => `
      <option value="${idx}">${p.name}</option>
    `).join("");

    select.addEventListener("change", (e) => {
      const selected = DNA_PRESETS[parseInt(e.target.value, 10)];
      this.loadPreset(selected);
    });
  }

  loadPreset(preset) {
    this.activePreset = preset;
    this.pause();

    const seqInput = document.getElementById("sequence-input");
    const motifInput = document.getElementById("motif-input");
    const descBox = document.getElementById("preset-description");

    if (seqInput) seqInput.value = preset.sequence;
    if (motifInput && preset.targetMotif) motifInput.value = preset.targetMotif;
    if (descBox) descBox.innerText = preset.description;

    this.sequence = preset.sequence;
    this.targetMotif = preset.targetMotif || "ATG";

    // Auto-select most appropriate mode for preset
    if (preset.id.includes("mutation") || preset.id.includes("sickle")) {
      this.setMode("mutation_nfa");
    } else if (preset.id.includes("restriction")) {
      this.setMode("motif_dfa");
    } else {
      this.setMode("orf");
    }

    this.resetSimulation();
  }

  setMode(newMode) {
    this.mode = newMode;
    const modeSelect = document.getElementById("mode-select");
    if (modeSelect) modeSelect.value = newMode;

    const motifGroup = document.getElementById("motif-input-group");
    if (motifGroup) {
      motifGroup.style.display = (this.mode === "orf") ? "none" : "flex";
    }

    this.updateStatusBadge();
    this.resetSimulation();
  }

  setCenterView(viewName) {
    this.centerView = viewName;

    // Update tab buttons
    document.querySelectorAll(".stage-tab").forEach(tab => {
      tab.classList.toggle("active", tab.dataset.view === viewName);
    });

    const wrapper = document.getElementById("center-canvas-wrapper");
    const helixContainer = document.getElementById("helix-canvas-container");
    const graphContainer = document.getElementById("center-graph-container");
    const helixBadges = document.getElementById("helix-overlay-badges");
    const helixLegend = document.getElementById("helix-nucleotide-legend");

    if (!wrapper || !helixContainer || !graphContainer) return;

    if (viewName === "helix") {
      wrapper.classList.remove("split-view");
      helixContainer.style.display = "block";
      graphContainer.style.display = "none";
      if (helixBadges) helixBadges.style.display = "flex";
      if (helixLegend) helixLegend.style.display = "flex";
      this.helix3D?.onResize();

    } else if (viewName === "automata") {
      wrapper.classList.remove("split-view");
      helixContainer.style.display = "none";
      graphContainer.style.display = "block";
      if (helixBadges) helixBadges.style.display = "none";
      if (helixLegend) helixLegend.style.display = "none";
      this.centerGraph?.resize();
      this.centerGraph?.fitToView();

    } else if (viewName === "split") {
      wrapper.classList.add("split-view");
      helixContainer.style.display = "block";
      graphContainer.style.display = "block";
      if (helixBadges) helixBadges.style.display = "flex";
      if (helixLegend) helixLegend.style.display = "none";
      this.helix3D?.onResize();
      this.centerGraph?.resize();
      this.centerGraph?.fitToView();
    }

    this.updateStatusBadge();
  }

  updateStatusBadge() {
    const badgeText = document.getElementById("stage-status-text");
    if (!badgeText) return;

    let modeDesc = "";
    if (this.mode === "orf") {
      modeDesc = "ORF Recognizer DFA (ATG \u2192 Codons \u2192 Stop)";
    } else if (this.mode === "motif_dfa") {
      modeDesc = `Exact Motif DFA (KMP: "${this.targetMotif}")`;
    } else {
      modeDesc = `Levenshtein SNP NFA (k=1 Mismatch: "${this.targetMotif}")`;
    }

    const viewDesc = this.centerView === "automata" ? " [Full State Diagram Active]" : 
                    (this.centerView === "split" ? " [Split View Active]" : "");
    badgeText.innerText = `${modeDesc}${viewDesc}`;
  }

  resetSimulation() {
    this.pause();
    this.currentIndex = 0;

    const seqInput = document.getElementById("sequence-input");
    if (seqInput) {
      this.sequence = seqInput.value.replace(/[^acgtACGT]/g, "").toUpperCase();
    }

    const motifInput = document.getElementById("motif-input");
    if (motifInput) {
      this.targetMotif = motifInput.value.replace(/[^acgtACGT]/g, "").toUpperCase() || "ATG";
    }

    // Reset Automata
    this.orfDfa.reset();
    this.motifDfa = new MotifDFA(this.targetMotif);
    this.mutationNfa = new MutationNFA(this.targetMotif, 1);

    // Update 3D Helix
    if (this.helix3D) {
      this.helix3D.setSequence(this.sequence);
    }

    // Configure State Graphs (Both Sidebar and Center Full Canvas)
    let specBadgeText = "Formal State Machine Graph";
    if (this.mode === "orf") {
      this.sidebarGraph?.loadOrfGraph(this.orfDfa);
      this.centerGraph?.loadOrfGraph(this.orfDfa);
      this.sidebarGraph?.setActiveStates("q_scan");
      this.centerGraph?.setActiveStates("q_scan");
      specBadgeText = `ORF DFA \u2022 7 Functional States \u2022 Triplet & Stop Logic`;

    } else if (this.mode === "motif_dfa") {
      this.sidebarGraph?.loadMotifDfaGraph(this.motifDfa);
      this.centerGraph?.loadMotifDfaGraph(this.motifDfa);
      this.sidebarGraph?.setActiveStates("q0");
      this.centerGraph?.setActiveStates("q0");

      const totalTrans = (this.motifDfa.states.length) * this.motifDfa.alphabet.length;
      specBadgeText = `KMP Exact Matcher DFA \u2022 ${this.motifDfa.states.length} States \u2022 ${totalTrans} \u03B4 Transitions`;

    } else {
      this.sidebarGraph?.loadMutationNfaGraph(this.mutationNfa);
      this.centerGraph?.loadMutationNfaGraph(this.mutationNfa);
      this.sidebarGraph?.setActiveStates("q(0,0)");
      this.centerGraph?.setActiveStates("q(0,0)");
      specBadgeText = `Mutation SNP NFA (k=1) \u2022 ${this.mutationNfa.states.length} States \u2022 Dual Layer Lattice`;
    }

    const graphSpecBadge = document.getElementById("graph-spec-badge");
    if (graphSpecBadge) graphSpecBadge.innerText = specBadgeText;

    // Reset Logs and Metrics
    this.clearLogs();
    this.updateFormalSpec();
    this.updateMetrics();
    this.updateSequenceViewer();
    this.updateStatusBadge();
  }

  step() {
    if (this.currentIndex >= this.sequence.length) {
      this.pause();
      this.logToConsole(`[COMPLETE] Reached end of DNA sequence (${this.sequence.length} bp processed).`, "success");
      return;
    }

    const char = this.sequence[this.currentIndex];
    let stepLog = null;
    let isAccepted = false;
    let isMutation = false;

    if (this.mode === "orf") {
      stepLog = this.orfDfa.step(char, this.currentIndex);
      isAccepted = stepLog.isAccepted;

      const trans = { from: stepLog.prevState, to: stepLog.nextState, symbol: char };
      this.sidebarGraph?.setActiveStates(stepLog.nextState, trans);
      this.centerGraph?.setActiveStates(stepLog.nextState, trans);

      if (stepLog.event === "START_CODON_FOUND") {
        this.logToConsole(`[DFA START] Start Codon 'ATG' identified at pos ${this.currentIndex - 2}. Open Reading Frame Initiated.`, "info");
      } else if (stepLog.event === "STOP_CODON_ACCEPTED") {
        const lastOrf = this.orfDfa.discoveredOrfs[this.orfDfa.discoveredOrfs.length - 1];
        this.logToConsole(`[DFA ACCEPT] Stop Codon '${lastOrf.stopCodon}' recognized! ORF Validated: length ${lastOrf.length} bp (${lastOrf.codons.length} codons).`, "success");
      }

    } else if (this.mode === "motif_dfa") {
      stepLog = this.motifDfa.step(char, this.currentIndex);
      isAccepted = stepLog.isAccepted;

      const trans = { from: stepLog.prevState, to: stepLog.nextState, symbol: char };
      this.sidebarGraph?.setActiveStates(stepLog.nextState, trans);
      this.centerGraph?.setActiveStates(stepLog.nextState, trans);

      if (isAccepted) {
        this.logToConsole(`[DFA ACCEPT] Exact Motif '${this.targetMotif}' accepted at pos ${stepLog.index - this.targetMotif.length + 1}..${stepLog.index}!`, "success");
      }

    } else if (this.mode === "mutation_nfa") {
      stepLog = this.mutationNfa.step(char, this.currentIndex);
      isAccepted = stepLog.isAccepted;
      isMutation = (stepLog.mutationFound && !stepLog.mutationFound.isPureWildType);

      this.sidebarGraph?.setActiveStates(Array.from(stepLog.activeStates));
      this.centerGraph?.setActiveStates(Array.from(stepLog.activeStates));

      if (stepLog.mutationFound) {
        const mf = stepLog.mutationFound;
        if (mf.isPureWildType) {
          this.logToConsole(`[NFA MATCH] Perfect Wild-Type sequence matched at pos ${mf.startIndex}..${mf.acceptedAt}.`, "info");
        } else {
          this.logToConsole(`[NFA MUTATION ALERT] ${mf.classification} detected at pos ${mf.startIndex}..${mf.acceptedAt}!`, "error");
        }
      }
    }

    // Update 3D Helix Scanner & Higgs-Field
    if (this.helix3D) {
      this.helix3D.highlightBase(this.currentIndex, isAccepted, isMutation);
    }

    // Update Formal Specification & Tables
    this.updateFormalSpec(char);

    // Update Metrics & Diagnostics
    this.updateMetrics();
    this.updateSequenceViewer();

    this.currentIndex++;
  }

  play() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    document.getElementById("btn-play")?.classList.add("active");
    this.playTimer = setInterval(() => this.step(), this.stepSpeedMs);
  }

  pause() {
    this.isPlaying = false;
    document.getElementById("btn-play")?.classList.remove("active");
    if (this.playTimer) {
      clearInterval(this.playTimer);
      this.playTimer = null;
    }
  }

  updateFormalSpec(currentSymbol = "") {
    const specContainer = document.getElementById("formal-spec-content");
    const tableContainer = document.getElementById("transition-table-content");
    if (!specContainer || !tableContainer) return;

    if (this.mode === "orf") {
      specContainer.innerHTML = `
        <div class="formal-tuple">
          <span class="tuple-line"><strong>M<sub>ORF</sub></strong> = (<strong>Q</strong>, <strong>&Sigma;</strong>, <strong>&delta;</strong>, <strong>q<sub>scan</sub></strong>, <strong>{ q<sub>complete</sub> }</strong>)</span>
          <div class="tuple-details">
            <div><span class="tuple-key">Current State:</span> <span class="badge-active">${this.orfDfa.currentState}</span></div>
            <div><span class="tuple-key">Reading Frame:</span> ${this.orfDfa.inOrf ? `Active (+1 Triplet: ${this.orfDfa.currentCodon || '...'})` : 'Scanning'}</div>
            <div><span class="tuple-key">Discovered ORFs:</span> ${this.orfDfa.discoveredOrfs.length}</div>
          </div>
        </div>
      `;
      tableContainer.innerHTML = `
        <div class="orf-state-summary">
          <p><strong>DFA States:</strong> q_scan &rarr; q_A &rarr; q_AT &rarr; [q_c1, q_c2, q_c3] &rarr; q_complete</p>
          <p>Accepts language: <code>L = ATG ( &Sigma;&Sigma;&Sigma; )* ( TAA | TAG | TGA )</code></p>
        </div>
      `;
    } else if (this.mode === "motif_dfa") {
      const { tupleHtml, tableHtml } = FormalSpecGenerator.generateDfaSpec(this.motifDfa, this.motifDfa.currentState, currentSymbol);
      specContainer.innerHTML = tupleHtml;
      tableContainer.innerHTML = tableHtml;
    } else {
      const { tupleHtml, tableHtml } = FormalSpecGenerator.generateNfaSpec(this.mutationNfa, this.mutationNfa.activeStates, currentSymbol);
      specContainer.innerHTML = tupleHtml;
      tableContainer.innerHTML = tableHtml;
    }
  }

  updateMetrics() {
    // GC Content
    const subSeq = this.sequence.substring(0, Math.max(1, this.currentIndex));
    const gcCount = (subSeq.match(/[GC]/g) || []).length;
    const gcPercent = ((gcCount / subSeq.length) * 100).toFixed(1);
    
    document.getElementById("metric-gc") && (document.getElementById("metric-gc").innerText = `${gcPercent}%`);
    document.getElementById("metric-progress") && (document.getElementById("metric-progress").innerText = `${this.currentIndex} / ${this.sequence.length} bp`);

    // Discovered Orfs / Matches
    if (this.mode === "orf") {
      document.getElementById("metric-events-label") && (document.getElementById("metric-events-label").innerText = "ORFs Validated");
      document.getElementById("metric-events") && (document.getElementById("metric-events").innerText = `${this.orfDfa.discoveredOrfs.length}`);
    } else if (this.mode === "motif_dfa") {
      document.getElementById("metric-events-label") && (document.getElementById("metric-events-label").innerText = "Motifs Found");
      document.getElementById("metric-events") && (document.getElementById("metric-events").innerText = `${this.motifDfa.matches.length}`);
    } else {
      document.getElementById("metric-events-label") && (document.getElementById("metric-events-label").innerText = "Mutations Detected");
      document.getElementById("metric-events") && (document.getElementById("metric-events").innerText = `${this.mutationNfa.detectedMutations.filter(m => !m.isPureWildType).length}`);
    }
  }

  updateSequenceViewer() {
    const viewer = document.getElementById("sequence-stream");
    if (!viewer) return;

    const windowSize = 40;
    const start = Math.max(0, this.currentIndex - 20);
    const end = Math.min(this.sequence.length, start + windowSize);

    let html = "";
    for (let i = start; i < end; i++) {
      const char = this.sequence[i];
      const isCurrent = (i === this.currentIndex);
      const color = BASE_COLORS[char]?.css || "#fff";
      html += `<span class="stream-char ${isCurrent ? 'char-current' : ''}" style="color:${color}">${char}</span>`;
    }

    viewer.innerHTML = html;
  }

  logToConsole(msg, type = "normal") {
    const consoleBox = document.getElementById("terminal-logs");
    if (!consoleBox) return;

    const entry = document.createElement("div");
    entry.className = `log-entry log-${type}`;
    const timestamp = new Date().toISOString().substring(11, 19);
    entry.innerHTML = `<span class="log-time">[${timestamp}]</span> ${msg}`;

    consoleBox.appendChild(entry);
    consoleBox.scrollTop = consoleBox.scrollHeight;
  }

  clearLogs() {
    const consoleBox = document.getElementById("terminal-logs");
    if (consoleBox) consoleBox.innerHTML = "";
    this.logToConsole("[SYSTEM INITIALIZED] Automata engine ready for DNA stream.", "info");
  }

  attachEventListeners() {
    // Playback Buttons
    document.getElementById("btn-play")?.addEventListener("click", () => {
      if (this.isPlaying) this.pause();
      else this.play();
    });

    document.getElementById("btn-step")?.addEventListener("click", () => {
      this.pause();
      this.step();
    });

    document.getElementById("btn-reset")?.addEventListener("click", () => {
      this.resetSimulation();
    });

    // Speed Slider
    const speedSlider = document.getElementById("speed-slider");
    if (speedSlider) {
      speedSlider.addEventListener("input", (e) => {
        this.stepSpeedMs = parseInt(e.target.value, 10);
        document.getElementById("speed-display") && (document.getElementById("speed-display").innerText = `${this.stepSpeedMs}ms`);
        if (this.isPlaying) {
          this.pause();
          this.play();
        }
      });
    }

    // Mode Selector
    document.getElementById("mode-select")?.addEventListener("change", (e) => {
      this.setMode(e.target.value);
    });

    // Custom Sequence Change
    document.getElementById("sequence-input")?.addEventListener("input", () => {
      this.resetSimulation();
    });

    document.getElementById("motif-input")?.addEventListener("input", () => {
      this.resetSimulation();
    });

    // Center Stage View Switcher Tabs
    document.getElementById("tab-helix")?.addEventListener("click", () => this.setCenterView("helix"));
    document.getElementById("tab-automata")?.addEventListener("click", () => this.setCenterView("automata"));
    document.getElementById("tab-split")?.addEventListener("click", () => this.setCenterView("split"));

    // Quick Expand to Center Button from Right Panel Header
    document.getElementById("btn-expand-to-center")?.addEventListener("click", () => {
      this.setCenterView("automata");
    });

    // Sidebar Arcs Toggle (All Transitions vs Backbone)
    let sidebarArcsAll = true;
    const btnSidebarArcs = document.getElementById("btn-sidebar-arcs-toggle");
    btnSidebarArcs?.addEventListener("click", () => {
      sidebarArcsAll = !sidebarArcsAll;
      btnSidebarArcs.classList.toggle("active", sidebarArcsAll);
      this.sidebarGraph?.setViewMode(sidebarArcsAll ? "all" : "backbone");
    });

    // Mini Graph Zoom Controls in Right Sidebar
    document.getElementById("mini-zoom-fit")?.addEventListener("click", () => this.sidebarGraph?.fitToView());
    document.getElementById("mini-zoom-in")?.addEventListener("click", () => this.sidebarGraph?.zoomIn());
    document.getElementById("mini-zoom-out")?.addEventListener("click", () => this.sidebarGraph?.zoomOut());

    // Center Stage Graph Toolbar Controls
    const btnCenterArcsAll = document.getElementById("center-btn-arcs-all");
    const btnCenterArcsBackbone = document.getElementById("center-btn-arcs-backbone");

    btnCenterArcsAll?.addEventListener("click", () => {
      btnCenterArcsAll.classList.add("active");
      btnCenterArcsBackbone?.classList.remove("active");
      this.centerGraph?.setViewMode("all");
    });

    btnCenterArcsBackbone?.addEventListener("click", () => {
      btnCenterArcsBackbone.classList.add("active");
      btnCenterArcsAll?.classList.remove("active");
      this.centerGraph?.setViewMode("backbone");
    });

    // Center Stage Layout Toggle
    const btnLayoutAuto = document.getElementById("center-btn-layout-auto");
    const btnLayoutLinear = document.getElementById("center-btn-layout-linear");
    const btnLayoutSerpentine = document.getElementById("center-btn-layout-serpentine");

    const setLayoutActive = (btn, mode) => {
      [btnLayoutAuto, btnLayoutLinear, btnLayoutSerpentine].forEach(b => b?.classList.remove("active"));
      btn?.classList.add("active");
      this.centerGraph?.setLayoutMode(mode);
    };

    btnLayoutAuto?.addEventListener("click", () => setLayoutActive(btnLayoutAuto, "auto"));
    btnLayoutLinear?.addEventListener("click", () => setLayoutActive(btnLayoutLinear, "linear"));
    btnLayoutSerpentine?.addEventListener("click", () => setLayoutActive(btnLayoutSerpentine, "serpentine"));

    // Center Stage Zoom Controls
    document.getElementById("center-btn-zoom-in")?.addEventListener("click", () => this.centerGraph?.zoomIn());
    document.getElementById("center-btn-zoom-out")?.addEventListener("click", () => this.centerGraph?.zoomOut());
    document.getElementById("center-btn-zoom-fit")?.addEventListener("click", () => this.centerGraph?.fitToView());
    document.getElementById("center-btn-zoom-reset")?.addEventListener("click", () => this.centerGraph?.resetView());
    document.getElementById("center-btn-export")?.addEventListener("click", () => this.centerGraph?.exportImage());

    // State Click synchronization with Transition Table
    const handleStateSelected = (e) => {
      const stateId = e.detail?.stateId;
      if (!stateId) return;
      // Find row in automata table with this state
      const tableRows = document.querySelectorAll(".automata-table tbody tr");
      tableRows.forEach(row => {
        const isMatch = row.textContent.includes(stateId);
        row.classList.toggle("row-highlight", isMatch);
        if (isMatch) {
          row.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      });
    };

    document.getElementById("state-graph-canvas")?.addEventListener("state-selected", handleStateSelected);
    document.getElementById("center-graph-canvas")?.addEventListener("state-selected", handleStateSelected);

    // Fullscreen toggle
    const fsBtn = document.getElementById("btn-fullscreen");
    if (fsBtn) {
      fsBtn.addEventListener("click", () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      });
      document.addEventListener("fullscreenchange", () => {
        const isFs = !!document.fullscreenElement;
        fsBtn.innerHTML = isFs ? `<span>&times;</span> Exit` : `<span>&#x26F6;</span> Fullscreen`;
        setTimeout(() => {
          window.dispatchEvent(new Event("resize"));
        }, 100);
      });
    }
  }
}

// Instantiate upon window load
window.addEventListener("DOMContentLoaded", () => {
  window.app = new DnaAutomataApp();
});
