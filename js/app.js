/**
 * Main Application Orchestrator for Helixa DNA Sequence & Mutation Analyzer
 * Coordinates 3D Interactive Helix, 2D State Graphs, DFA/NFA Engines,
 * Biological Diagnostics, and Educational Formal Automata Specifications.
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
    this.tolerance = 1;
    this.readingFrame = 0;
    this.activePreset = DNA_PRESETS[0];
    this.findings = [];

    // Automata engine instances
    this.orfDfa = new OrfDFA(this.readingFrame);
    this.motifDfa = new MotifDFA(this.targetMotif);
    this.mutationNfa = new MutationNFA("CCTGAGGAG", this.tolerance);

    // Playback loop
    this.isPlaying = false;
    this.playTimer = null;
    this.stepSpeedMs = 200;

    // Visualizers & Camera controls
    this.helix3D = null;
    this.sidebarGraph = null;
    this.centerGraph = null;
    this.centerView = "helix"; // "helix" | "automata" | "split"
    this.trackHelix = true;
    this.rotateHelix = false;

    this.init();
  }

  init() {
    // 1. Initialize 3D Helix
    const helixContainer = document.getElementById("helix-canvas-container");
    if (helixContainer) {
      this.helix3D = new DnaHelix3D(helixContainer);
    }

    // 2. Initialize 2D State Graphs (Sidebar mini-graph & Center stage full canvas)
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
      <option value="${idx}">${p.name} [${p.organism || 'Genomics'}]</option>
    `).join("");

    select.addEventListener("change", (e) => {
      const selected = DNA_PRESETS[parseInt(e.target.value, 10)];
      if (selected) {
        this.loadPreset(selected);
      }
    });
  }

  loadPreset(preset) {
    this.activePreset = preset;
    this.pause();

    const seqInput = document.getElementById("sequence-input");
    const motifInput = document.getElementById("motif-input");
    const descBox = document.getElementById("preset-description");
    const tolSelect = document.getElementById("tolerance-select");
    const frameSelect = document.getElementById("frame-select");

    if (seqInput) seqInput.value = preset.sequence;
    if (motifInput && preset.targetMotif) motifInput.value = preset.targetMotif;

    if (descBox) {
      let html = `<strong>${preset.organism || 'Genomic Sequence'} &bull; ${preset.gene || preset.name}</strong>: ${preset.description}`;
      if (preset.clinicalContext) {
        html += `<div style="margin-top:0.35rem;color:var(--text-secondary);font-size:0.75rem;line-height:1.4;">${preset.clinicalContext}</div>`;
      }
      if (preset.mutationDetails) {
        html += `<div style="margin-top:0.3rem;color:var(--accent-amber);font-size:0.75rem;font-weight:600;">${preset.mutationDetails}</div>`;
      }
      descBox.innerHTML = html;
    }

    this.sequence = preset.sequence;
    this.targetMotif = preset.targetMotif || (preset.mode === "motif_dfa" ? "GAATTC" : "CCTGAGGAG");

    if (preset.tolerance !== undefined) {
      this.tolerance = preset.tolerance;
      if (tolSelect) tolSelect.value = String(preset.tolerance);
    }

    if (preset.frame !== undefined) {
      this.readingFrame = preset.frame;
      if (frameSelect) frameSelect.value = String(preset.frame);
    }

    // Auto-select mode directly from preset configuration
    if (preset.mode) {
      this.setMode(preset.mode);
    } else if (preset.id.includes("mutation") || preset.id.includes("sickle")) {
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
    const tolGroup = document.getElementById("tolerance-input-group");
    const frameGroup = document.getElementById("frame-input-group");

    if (motifGroup) {
      motifGroup.style.display = (this.mode === "orf") ? "none" : "flex";
    }
    if (tolGroup) {
      tolGroup.style.display = (this.mode === "mutation_nfa") ? "flex" : "none";
    }
    if (frameGroup) {
      frameGroup.style.display = (this.mode === "orf") ? "flex" : "none";
    }

    this.updateStatusBadge();
    this.resetSimulation();
  }

  setCenterView(viewName) {
    this.centerView = viewName;

    // Update tab active states
    document.querySelectorAll(".stage-tab").forEach(tab => {
      const isSelected = tab.dataset.view === viewName;
      tab.classList.toggle("active", isSelected);
      tab.setAttribute("aria-selected", isSelected ? "true" : "false");
    });

    const wrapper = document.getElementById("center-canvas-wrapper");
    const helixContainer = document.getElementById("helix-canvas-container");
    const helixToolbar = document.getElementById("helix-toolbar");
    const graphContainer = document.getElementById("center-graph-container");
    const helixBadges = document.getElementById("helix-overlay-badges");
    const helixLegend = document.getElementById("helix-nucleotide-legend");

    if (!wrapper || !helixContainer || !graphContainer) return;

    if (viewName === "helix") {
      wrapper.classList.remove("split-view");
      helixContainer.style.display = "block";
      if (helixToolbar) helixToolbar.style.display = "flex";
      graphContainer.style.display = "none";
      if (helixBadges) helixBadges.style.display = "flex";
      if (helixLegend) helixLegend.style.display = "flex";
      this.helix3D?.onResize();

    } else if (viewName === "automata") {
      wrapper.classList.remove("split-view");
      helixContainer.style.display = "none";
      if (helixToolbar) helixToolbar.style.display = "none";
      graphContainer.style.display = "block";
      if (helixBadges) helixBadges.style.display = "none";
      if (helixLegend) helixLegend.style.display = "none";
      this.centerGraph?.resize();
      this.centerGraph?.fitToView();

    } else if (viewName === "split") {
      wrapper.classList.add("split-view");
      helixContainer.style.display = "block";
      if (helixToolbar) helixToolbar.style.display = "flex";
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
      modeDesc = `ORF Search (Frame +${this.readingFrame + 1}: ATG \u2192 Codons \u2192 Stop)`;
    } else if (this.mode === "motif_dfa") {
      modeDesc = `Exact Motif DFA (Pattern: "${this.targetMotif}")`;
    } else {
      modeDesc = `SNP Mutation NFA (Tolerance k=${this.tolerance}: "${this.targetMotif}")`;
    }

    const viewDesc = this.centerView === "automata" ? " [Full State Diagram]" : 
                    (this.centerView === "split" ? " [Split View]" : "");
    badgeText.innerText = `${modeDesc}${viewDesc}`;
  }

  resetSimulation() {
    this.pause();
    this.currentIndex = 0;
    this.findings = [];
    this.renderFindings();

    const seqInput = document.getElementById("sequence-input");
    if (seqInput) {
      this.sequence = seqInput.value.replace(/[^acgtACGT]/g, "").toUpperCase();
    }

    const motifInput = document.getElementById("motif-input");
    if (motifInput) {
      this.targetMotif = motifInput.value.replace(/[^acgtACGT]/g, "").toUpperCase() || "GAATTC";
    }

    const tolSelect = document.getElementById("tolerance-select");
    if (tolSelect) {
      this.tolerance = parseInt(tolSelect.value, 10);
    }

    const frameSelect = document.getElementById("frame-select");
    if (frameSelect) {
      this.readingFrame = parseInt(frameSelect.value, 10);
    }

    // Reset Automata instances
    this.orfDfa = new OrfDFA(this.readingFrame);
    this.motifDfa = new MotifDFA(this.targetMotif);
    this.mutationNfa = new MutationNFA(this.targetMotif, this.tolerance);

    // Update 3D Helix
    if (this.helix3D) {
      this.helix3D.setSequence(this.sequence);
      this.helix3D.setAutoTrack(this.trackHelix);
      this.helix3D.setAutoRotate(this.rotateHelix);
    }

    // Configure State Graphs (Both Sidebar mini-graph and Center stage full canvas)
    let specBadgeText = "State Transition Diagram";
    if (this.mode === "orf") {
      this.sidebarGraph?.loadOrfGraph(this.orfDfa);
      this.centerGraph?.loadOrfGraph(this.orfDfa);
      this.sidebarGraph?.setActiveStates("q_scan");
      this.centerGraph?.setActiveStates("q_scan");
      specBadgeText = `ORF Recognizer DFA \u2022 Frame +${this.readingFrame + 1} \u2022 Triplet & Stop Logic`;

    } else if (this.mode === "motif_dfa") {
      this.sidebarGraph?.loadMotifDfaGraph(this.motifDfa);
      this.centerGraph?.loadMotifDfaGraph(this.motifDfa);
      this.sidebarGraph?.setActiveStates("q0");
      this.centerGraph?.setActiveStates("q0");
      const totalTrans = (this.motifDfa.states.length) * this.motifDfa.alphabet.length;
      specBadgeText = `Motif Matcher DFA \u2022 ${this.motifDfa.states.length} States \u2022 ${totalTrans} Transitions`;

    } else {
      this.sidebarGraph?.loadMutationNfaGraph(this.mutationNfa);
      this.centerGraph?.loadMutationNfaGraph(this.mutationNfa);
      this.sidebarGraph?.setActiveStates("q(0,0)");
      this.centerGraph?.setActiveStates("q(0,0)");
      specBadgeText = `Mutation NFA (k=${this.tolerance}) \u2022 ${this.mutationNfa.states.length} States \u2022 ${this.tolerance + 1}-Layer Lattice`;
    }

    const graphSpecBadge = document.getElementById("graph-spec-badge");
    if (graphSpecBadge) graphSpecBadge.innerText = specBadgeText;

    // Reset Action Card to standby
    this.updateActionCard(
      this.mode === "mutation_nfa" ? "q(0,0)" : (this.mode === "orf" ? "q_scan" : "q0"),
      "Ready to Scan",
      "Press <strong>Play</strong> or <strong>Step</strong> to inspect nucleotides one-by-one."
    );

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
      this.logToConsole(`[COMPLETE] Reached end of DNA sequence (${this.sequence.length} bp processed). Total findings: ${this.findings.length}.`, "success");
      this.updateActionCard(
        "Complete",
        "Finished",
        `Sequence processing finished (${this.sequence.length} bp processed, ${this.findings.length} genetic feature(s) identified).`
      );
      return;
    }

    const char = this.sequence[this.currentIndex];
    let stepLog = null;
    let isAccepted = false;
    let isMutation = false;
    let actionState = "Active";
    let actionEvent = "Scanning";
    let actionDesc = "";

    if (this.mode === "orf") {
      stepLog = this.orfDfa.step(char, this.currentIndex);
      isAccepted = stepLog.isAccepted;
      actionState = stepLog.nextState;
      actionDesc = this.orfDfa.getStateDescription();

      const trans = { from: stepLog.prevState, to: stepLog.nextState, symbol: char };
      this.sidebarGraph?.setActiveStates(stepLog.nextState, trans);
      this.centerGraph?.setActiveStates(stepLog.nextState, trans);

      if (stepLog.event === "START_CODON_FOUND") {
        actionEvent = "Start Codon (ATG)";
        this.logToConsole(`[ORF START] Start Codon 'ATG' identified at pos ${this.currentIndex - 2}..${this.currentIndex}. Translation initiated.`, "info");
      } else if (stepLog.event === "STOP_CODON_ACCEPTED") {
        actionEvent = "Stop Codon Accepted";
        const lastOrf = this.orfDfa.discoveredOrfs[this.orfDfa.discoveredOrfs.length - 1];
        if (lastOrf) {
          this.findings.push({
            type: "orf",
            title: `Open Reading Frame (${lastOrf.length} bp)`,
            start: lastOrf.startIndex,
            end: lastOrf.endIndex,
            length: lastOrf.length,
            stopCodon: lastOrf.stopCodon,
            codonsCount: lastOrf.codons.length,
            protein: lastOrf.proteinSequence || "Met..."
          });
          this.renderFindings();
          this.logToConsole(`[ORF COMPLETE] Stop Codon '${lastOrf.stopCodon}' recognized! ORF validated: ${lastOrf.length} bp, ${lastOrf.codons.length} codons [${lastOrf.proteinSequence}].`, "success");
        }
      } else if (stepLog.event === "IN_CODON") {
        actionEvent = `Codon Pos ${stepLog.codonPos}/3`;
      } else {
        actionEvent = "Scanning";
      }

    } else if (this.mode === "motif_dfa") {
      stepLog = this.motifDfa.step(char, this.currentIndex);
      isAccepted = stepLog.isAccepted;
      actionState = stepLog.nextState;
      actionDesc = this.motifDfa.getStateDescription();

      const trans = { from: stepLog.prevState, to: stepLog.nextState, symbol: char };
      this.sidebarGraph?.setActiveStates(stepLog.nextState, trans);
      this.centerGraph?.setActiveStates(stepLog.nextState, trans);

      if (isAccepted) {
        actionEvent = "Motif Match";
        const startPos = stepLog.index - this.targetMotif.length + 1;
        this.findings.push({
          type: "motif",
          title: `Restriction Cleavage Site: ${this.targetMotif}`,
          start: startPos,
          end: stepLog.index,
          length: this.targetMotif.length,
          motif: this.targetMotif
        });
        this.renderFindings();
        this.logToConsole(`[CLEAVAGE SITE] Exact motif '${this.targetMotif}' accepted at pos ${startPos}..${stepLog.index}!`, "success");
      } else {
        actionEvent = `Match ${stepLog.matchLen}/${this.targetMotif.length}`;
      }

    } else if (this.mode === "mutation_nfa") {
      stepLog = this.mutationNfa.step(char, this.currentIndex);
      isAccepted = stepLog.isAccepted;
      isMutation = (stepLog.mutationFound && !stepLog.mutationFound.isPureWildType);
      actionState = Array.from(stepLog.activeStates).join(", ");
      actionDesc = this.mutationNfa.getStateDescription();

      this.sidebarGraph?.setActiveStates(Array.from(stepLog.activeStates));
      this.centerGraph?.setActiveStates(Array.from(stepLog.activeStates));

      if (stepLog.mutationFound) {
        const mf = stepLog.mutationFound;
        if (mf.isPureWildType) {
          actionEvent = "Wild-Type Match";
          this.findings.push({
            type: "wildtype",
            title: `Wild-Type Pattern (${this.targetMotif})`,
            start: mf.startIndex,
            end: mf.acceptedAt,
            pattern: this.targetMotif,
            errors: 0
          });
          this.renderFindings();
          this.logToConsole(`[WILD-TYPE] Perfect sequence match at pos ${mf.startIndex}..${mf.acceptedAt}.`, "info");
        } else {
          actionEvent = "SNP Mutation Alert";
          const mutDetails = mf.mutations.map(m => `${m.expected}\u2192${m.actual} at pos ${m.patternIndex + 1}`).join(", ");
          this.findings.push({
            type: "mutation",
            title: mf.classification,
            start: mf.startIndex,
            end: mf.acceptedAt,
            pattern: this.targetMotif,
            errors: mf.errors,
            mutations: mf.mutations,
            details: mutDetails
          });
          this.renderFindings();
          this.logToConsole(`[MUTATION ALERT] ${mf.classification} detected at pos ${mf.startIndex}..${mf.acceptedAt} (${mutDetails})!`, "error");
        }
      } else {
        actionEvent = `${stepLog.activeStates.size} State${stepLog.activeStates.size > 1 ? 's' : ''} Active`;
      }
    }

    // Update Action Explainer Card
    this.updateActionCard(actionState, actionEvent, actionDesc);

    // Update 3D Helix Scanner & Camera Follow
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

  updateActionCard(stateText, eventText, descriptionHtml) {
    const stateBadge = document.getElementById("action-state-badge");
    const eventPill = document.getElementById("action-event-pill");
    const descEl = document.getElementById("action-description-text");

    if (stateBadge) stateBadge.innerText = stateText;
    if (eventPill) {
      eventPill.innerText = eventText;
      eventPill.className = "action-event-pill";
      if (eventText.includes("Mutation") || eventText.includes("Alert")) {
        eventPill.classList.add("event-mutation");
      } else if (eventText.includes("Match") || eventText.includes("Stop") || eventText.includes("Complete")) {
        eventPill.classList.add("event-accept");
      }
    }
    if (descEl) descEl.innerHTML = descriptionHtml;
  }

  renderFindings() {
    const container = document.getElementById("findings-container");
    if (!container) return;

    if (!this.findings || this.findings.length === 0) {
      container.innerHTML = `<div class="findings-empty-state">No genetic features identified yet in this run.</div>`;
      return;
    }

    container.innerHTML = this.findings.map(f => {
      let isMutation = f.type === "mutation";
      let details = "";

      if (f.type === "orf") {
        details = `Stop: <code>${f.stopCodon}</code> &bull; Codons: ${f.codonsCount} &bull; Protein: <code>${f.protein}</code>`;
      } else if (f.type === "mutation") {
        details = `Target: <code>${f.pattern}</code> &bull; Variations: ${f.errors} &bull; ${f.details}`;
      } else if (f.type === "motif") {
        details = `Cleavage Recognition: <code>${f.motif}</code> (${f.length} bp)`;
      } else if (f.type === "wildtype") {
        details = `Exact Wild-Type Match: <code>${f.pattern}</code> (0 variations)`;
      }

      return `
        <div class="finding-item ${isMutation ? 'mutation-item' : ''}">
          <div class="finding-header">
            <span>${f.title}</span>
            <span style="font-family:var(--font-mono);font-size:0.65rem;color:var(--text-dim);">pos ${f.start}..${f.end}</span>
          </div>
          <div class="finding-body">${details}</div>
        </div>
      `;
    }).join("");
  }

  exportFindings() {
    const exportData = {
      exportedAt: new Date().toISOString(),
      sequenceLength: this.sequence.length,
      mode: this.mode,
      preset: this.activePreset?.name || "Custom",
      findingsCount: this.findings.length,
      findings: this.findings
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `helixa-findings-${this.mode}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.logToConsole(`[EXPORT] Saved ${this.findings.length} findings to JSON file.`, "info");
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
      const { tupleHtml, tableHtml } = FormalSpecGenerator.generateOrfSpec(this.orfDfa, this.orfDfa.currentState, currentSymbol);
      specContainer.innerHTML = tupleHtml;
      tableContainer.innerHTML = tableHtml;
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
    const subSeq = this.sequence.substring(0, Math.max(1, this.currentIndex));
    const gcCount = (subSeq.match(/[GC]/g) || []).length;
    const gcPercent = ((gcCount / subSeq.length) * 100).toFixed(1);
    
    const pct = this.sequence.length > 0 ? Math.round((this.currentIndex / this.sequence.length) * 100) : 0;
    const progressEl = document.getElementById("metric-progress");
    if (progressEl) {
      progressEl.innerText = `${this.currentIndex} / ${this.sequence.length} bp (${pct}%)`;
    }

    const gcEl = document.getElementById("metric-gc");
    if (gcEl) {
      gcEl.innerText = `${gcPercent}%`;
    }

    // Dynamic Findings Count & Label
    const eventsLabel = document.getElementById("metric-events-label");
    const eventsEl = document.getElementById("metric-events");

    if (this.mode === "orf") {
      if (eventsLabel) eventsLabel.innerText = "ORFs Validated";
      if (eventsEl) eventsEl.innerText = `${this.orfDfa.discoveredOrfs.length} found`;
    } else if (this.mode === "motif_dfa") {
      if (eventsLabel) eventsLabel.innerText = "Motifs Found";
      if (eventsEl) eventsEl.innerText = `${this.motifDfa.matches.length} matches`;
    } else {
      const mutCount = this.mutationNfa.detectedMutations.filter(m => !m.isPureWildType).length;
      if (eventsLabel) eventsLabel.innerText = "Mutations Detected";
      if (eventsEl) eventsEl.innerText = `${mutCount} identified`;
    }
  }

  updateSequenceViewer() {
    const viewer = document.getElementById("sequence-stream");
    const contextPill = document.getElementById("stream-context-pill");
    if (!viewer) return;

    const windowSize = 40;
    const start = Math.max(0, this.currentIndex - 20);
    const end = Math.min(this.sequence.length, start + windowSize);

    let html = "";
    for (let i = start; i < end; i++) {
      const char = this.sequence[i];
      const isCurrent = (i === this.currentIndex);
      const color = BASE_COLORS[char]?.css || "#ffffff";
      html += `<span class="stream-char ${isCurrent ? 'char-current' : ''}" style="color:${color}">${char}</span>`;
    }

    viewer.innerHTML = html;

    if (contextPill) {
      const char = this.sequence[this.currentIndex] || "-";
      contextPill.innerText = `Base ${this.currentIndex + 1} / ${this.sequence.length} [${char}]`;
    }
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

    // Speed Slider & Speed Preset Pills
    const speedSlider = document.getElementById("speed-slider");
    if (speedSlider) {
      speedSlider.addEventListener("input", (e) => {
        this.stepSpeedMs = parseInt(e.target.value, 10);
        const speedDisplay = document.getElementById("speed-display");
        if (speedDisplay) speedDisplay.innerText = `${this.stepSpeedMs} ms / base`;

        // Sync speed pills
        document.querySelectorAll(".speed-pill").forEach(p => {
          p.classList.toggle("active", parseInt(p.dataset.speed, 10) === this.stepSpeedMs);
        });

        if (this.isPlaying) {
          this.pause();
          this.play();
        }
      });
    }

    document.querySelectorAll(".speed-pill").forEach(pill => {
      pill.addEventListener("click", () => {
        document.querySelectorAll(".speed-pill").forEach(p => p.classList.remove("active"));
        pill.classList.add("active");
        const speed = parseInt(pill.dataset.speed, 10);
        this.stepSpeedMs = speed;
        if (speedSlider) speedSlider.value = String(speed);
        const speedDisplay = document.getElementById("speed-display");
        if (speedDisplay) speedDisplay.innerText = `${speed} ms / base`;
        if (this.isPlaying) {
          this.pause();
          this.play();
        }
      });
    });

    // Mode Selector
    document.getElementById("mode-select")?.addEventListener("change", (e) => {
      this.setMode(e.target.value);
    });

    // Tolerance Selector (SNP k)
    document.getElementById("tolerance-select")?.addEventListener("change", (e) => {
      this.tolerance = parseInt(e.target.value, 10);
      this.resetSimulation();
    });

    // Reading Frame Selector
    document.getElementById("frame-select")?.addEventListener("change", (e) => {
      this.readingFrame = parseInt(e.target.value, 10);
      this.resetSimulation();
    });

    // Custom Sequence Change
    document.getElementById("sequence-input")?.addEventListener("input", () => {
      this.resetSimulation();
    });

    // Target Motif Change
    document.getElementById("motif-input")?.addEventListener("input", () => {
      this.resetSimulation();
    });

    // Quick Motif Preset Pills
    document.querySelectorAll(".quick-pill").forEach(pill => {
      pill.addEventListener("click", () => {
        const motif = pill.dataset.motif;
        if (!motif) return;
        const motifInput = document.getElementById("motif-input");
        if (motifInput) motifInput.value = motif;
        this.targetMotif = motif;
        this.resetSimulation();
      });
    });

    // DNA Sequence Actions (Upload, Clean, Reverse Complement)
    const fileUpload = document.getElementById("file-upload");
    document.getElementById("btn-upload-file")?.addEventListener("click", () => {
      fileUpload?.click();
    });

    fileUpload?.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const raw = ev.target.result || "";
        const lines = raw.split(/\r?\n/);
        const cleaned = lines
          .filter(l => !l.trim().startsWith(">"))
          .join("")
          .replace(/[^a-zA-Z]/g, "")
          .replace(/U/gi, "T")
          .toUpperCase();

        const seqInput = document.getElementById("sequence-input");
        if (seqInput) seqInput.value = cleaned;
        this.logToConsole(`[FILE IMPORT] Loaded ${file.name} (${cleaned.length} bp).`, "info");
        this.resetSimulation();
      };
      reader.readAsText(file);
    });

    document.getElementById("btn-clean-seq")?.addEventListener("click", () => {
      const seqInput = document.getElementById("sequence-input");
      if (!seqInput) return;
      const lines = seqInput.value.split(/\r?\n/);
      const cleaned = lines
        .filter(l => !l.trim().startsWith(">"))
        .join("")
        .replace(/[^a-zA-Z]/g, "")
        .replace(/U/gi, "T")
        .toUpperCase();
      seqInput.value = cleaned;
      this.logToConsole(`[CLEAN] Sanitized sequence (${cleaned.length} valid nucleotides, non-bases removed).`, "info");
      this.resetSimulation();
    });

    document.getElementById("btn-rev-comp")?.addEventListener("click", () => {
      const seqInput = document.getElementById("sequence-input");
      if (!seqInput) return;
      const clean = seqInput.value.replace(/[^a-zA-Z]/g, "").toUpperCase();
      const complement = { 'A': 'T', 'T': 'A', 'C': 'G', 'G': 'C' };
      const revComp = clean.split("").reverse().map(b => complement[b] || b).join("");
      seqInput.value = revComp;
      this.logToConsole(`[REV COMP] Inverted to Reverse Complement (3'\u21925' antiparallel strand, ${revComp.length} bp).`, "info");
      this.resetSimulation();
    });

    // Helix Stage Toolbar Controls
    const btnTrack = document.getElementById("btn-helix-track");
    btnTrack?.addEventListener("click", () => {
      this.trackHelix = !this.trackHelix;
      btnTrack.classList.toggle("active", this.trackHelix);
      this.helix3D?.setAutoTrack(this.trackHelix);
    });

    const btnRotate = document.getElementById("btn-helix-rotate");
    btnRotate?.addEventListener("click", () => {
      this.rotateHelix = !this.rotateHelix;
      btnRotate.classList.toggle("active", this.rotateHelix);
      this.helix3D?.setAutoRotate(this.rotateHelix);
    });

    document.getElementById("btn-helix-reset-cam")?.addEventListener("click", () => {
      this.helix3D?.resetCamera();
    });

    // Center Stage View Switcher Tabs
    document.getElementById("tab-helix")?.addEventListener("click", () => this.setCenterView("helix"));
    document.getElementById("tab-automata")?.addEventListener("click", () => this.setCenterView("automata"));
    document.getElementById("tab-split")?.addEventListener("click", () => this.setCenterView("split"));

    // Quick Expand to Center Button from Right Panel Header
    document.getElementById("btn-expand-to-center")?.addEventListener("click", () => {
      this.setCenterView("automata");
    });

    // Export Findings & Clear Logs
    document.getElementById("btn-export-findings")?.addEventListener("click", () => {
      this.exportFindings();
    });

    document.getElementById("btn-clear-logs")?.addEventListener("click", () => {
      this.clearLogs();
    });

    // Sidebar Arcs Toggle
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

    // Fullscreen Toggle
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

// Instantiate application upon window DOM ready
window.addEventListener("DOMContentLoaded", () => {
  window.app = new DnaAutomataApp();
});
