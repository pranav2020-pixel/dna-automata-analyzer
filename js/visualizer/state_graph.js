/**
 * 2D Canvas State Transition Graph Visualizer
 * High-performance, interactive automata state diagram visualizer with:
 * - Full transition arcs (forward, self-loops, fallback failure edges)
 * - Directed bezier curves with oriented arrowheads
 * - Smart layouts: Linear, Serpentine (wrapped), and 2-layer NFA Grid
 * - Smooth interactive Pan and Zoom (wheel, drag, fit-to-screen)
 * - Interactive state inspection with hover tooltips
 * - Live animated active state halos and firing transition highlights
 */

import { BASE_COLORS } from "../data/presets.js";

export class StateGraphVisualizer {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {object} options - Configuration options
   */
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.isMini = options.isMini || false;

    // Graph data model
    this.nodes = [];
    this.edges = [];
    this.activeStateIds = new Set();
    this.lastTransition = null;
    this.currentGraphType = null; // "motif" | "orf" | "mutation_nfa"
    this.automatonData = null;

    // View options
    this.viewMode = options.viewMode || "all"; // "all" | "backbone" | "active"
    this.layoutMode = options.layoutMode || "auto"; // "auto" | "linear" | "serpentine" | "grid"

    // Pan & Zoom
    this.panX = 0;
    this.panY = 0;
    this.zoom = 1.0;
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.hasMoved = false;

    // Interaction & Tooltip
    this.hoveredNode = null;
    this.hoveredEdge = null;
    this.selectedNode = null;
    this.mouseScreenX = 0;
    this.mouseScreenY = 0;

    // Device Pixel Ratio
    this.dpr = window.devicePixelRatio || 1;

    // Event Listeners
    this.setupEvents();

    this.resize();
    window.addEventListener('resize', () => this.resize());
    if (window.ResizeObserver && this.canvas.parentElement) {
      new ResizeObserver(() => this.resize()).observe(this.canvas.parentElement);
    }
  }

  setupEvents() {
    const cvs = this.canvas;

    cvs.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.hasMoved = false;
      this.dragStartX = e.clientX - this.panX;
      this.dragStartY = e.clientY - this.panY;
      cvs.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      const rect = cvs.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      this.mouseScreenX = mouseX;
      this.mouseScreenY = mouseY;

      if (this.isDragging) {
        this.panX = e.clientX - this.dragStartX;
        this.panY = e.clientY - this.dragStartY;
        this.hasMoved = true;
        this.render();
        return;
      }

      // Check node hover if mouse is inside canvas
      if (mouseX >= 0 && mouseX <= rect.width && mouseY >= 0 && mouseY <= rect.height) {
        const worldPos = this.screenToWorld(mouseX, mouseY);
        let foundNode = null;
        for (const node of this.nodes) {
          const dx = worldPos.x - node.x;
          const dy = worldPos.y - node.y;
          if (Math.sqrt(dx * dx + dy * dy) <= (node.r || 18) + 4) {
            foundNode = node;
            break;
          }
        }

        if (foundNode !== this.hoveredNode) {
          this.hoveredNode = foundNode;
          cvs.style.cursor = foundNode ? 'pointer' : 'grab';
          this.render();
        }
      } else if (this.hoveredNode) {
        this.hoveredNode = null;
        cvs.style.cursor = 'grab';
        this.render();
      }
    });

    window.addEventListener('mouseup', () => {
      if (this.isDragging) {
        this.isDragging = false;
        cvs.style.cursor = this.hoveredNode ? 'pointer' : 'grab';
      }
    });

    cvs.addEventListener('click', (e) => {
      if (this.hasMoved) return; // was a drag
      if (this.hoveredNode) {
        this.selectedNode = (this.selectedNode === this.hoveredNode.id) ? null : this.hoveredNode.id;
        this.render();
        // Dispatch custom event for state selection
        cvs.dispatchEvent(new CustomEvent('state-selected', { detail: { stateId: this.selectedNode } }));
      }
    });

    // Zoom via mouse wheel around cursor
    cvs.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = cvs.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
      this.zoomAtPoint(mouseX, mouseY, zoomFactor);
    }, { passive: false });

    // Touch support for mobile / tablets
    let lastTouchDistance = 0;
    let touchStartX = 0;
    let touchStartY = 0;

    cvs.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.hasMoved = false;
        touchStartX = e.touches[0].clientX - this.panX;
        touchStartY = e.touches[0].clientY - this.panY;
      } else if (e.touches.length === 2) {
        this.isDragging = false;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastTouchDistance = Math.sqrt(dx * dx + dy * dy);
      }
    }, { passive: true });

    cvs.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1 && this.isDragging) {
        this.panX = e.touches[0].clientX - touchStartX;
        this.panY = e.touches[0].clientY - touchStartY;
        this.hasMoved = true;
        this.render();
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (lastTouchDistance > 0) {
          const factor = dist / lastTouchDistance;
          const rect = cvs.getBoundingClientRect();
          const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
          const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
          this.zoomAtPoint(midX, midY, factor);
        }
        lastTouchDistance = dist;
      }
    }, { passive: true });

    cvs.addEventListener('touchend', () => {
      this.isDragging = false;
      lastTouchDistance = 0;
    });
  }

  screenToWorld(sx, sy) {
    return {
      x: (sx - this.panX) / this.zoom,
      y: (sy - this.panY) / this.zoom
    };
  }

  worldToScreen(wx, wy) {
    return {
      x: wx * this.zoom + this.panX,
      y: wy * this.zoom + this.panY
    };
  }

  zoomAtPoint(sx, sy, factor) {
    const newZoom = Math.max(0.3, Math.min(4.0, this.zoom * factor));
    // Keep the world point under the cursor stationary
    this.panX = sx - (sx - this.panX) * (newZoom / this.zoom);
    this.panY = sy - (sy - this.panY) * (newZoom / this.zoom);
    this.zoom = newZoom;
    this.render();
  }

  zoomIn() {
    const cx = (this.canvas.width / this.dpr) / 2;
    const cy = (this.canvas.height / this.dpr) / 2;
    this.zoomAtPoint(cx, cy, 1.25);
  }

  zoomOut() {
    const cx = (this.canvas.width / this.dpr) / 2;
    const cy = (this.canvas.height / this.dpr) / 2;
    this.zoomAtPoint(cx, cy, 0.8);
  }

  resetView() {
    this.panX = 0;
    this.panY = 0;
    this.zoom = 1.0;
    this.render();
  }

  fitToView() {
    if (!this.nodes || this.nodes.length === 0) return;
    const w = this.canvas.width / this.dpr;
    const h = this.canvas.height / this.dpr;
    if (w <= 0 || h <= 0) return;

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (const node of this.nodes) {
      const r = node.r || 18;
      minX = Math.min(minX, node.x - r - 25);
      maxX = Math.max(maxX, node.x + r + 25);
      minY = Math.min(minY, node.y - r - 35);
      maxY = Math.max(maxY, node.y + r + 35);
    }

    const graphW = Math.max(10, maxX - minX);
    const graphH = Math.max(10, maxY - minY);

    const pad = this.isMini ? 16 : 32;
    const scaleX = (w - pad * 2) / graphW;
    const scaleY = (h - pad * 2) / graphH;
    const targetZoom = Math.max(0.4, Math.min(1.4, Math.min(scaleX, scaleY)));

    this.zoom = targetZoom;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    this.panX = w / 2 - centerX * this.zoom;
    this.panY = h / 2 - centerY * this.zoom;

    this.render();
  }

  resize() {
    if (!this.canvas || !this.canvas.parentElement) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const cssW = Math.max(100, Math.floor(rect.width));
    const cssH = Math.max(80, Math.floor(rect.height));

    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = cssW * this.dpr;
    this.canvas.height = cssH * this.dpr;

    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;

    this.rebuildCurrentGraph();
    this.fitToView();
  }

  setViewMode(mode) {
    this.viewMode = mode;
    this.render();
  }

  setLayoutMode(mode) {
    this.layoutMode = mode;
    this.rebuildCurrentGraph();
    this.fitToView();
  }

  rebuildCurrentGraph() {
    if (this.currentGraphType === "motif" && this.automatonData) {
      this.buildMotifDfaNodes(this.automatonData);
    } else if (this.currentGraphType === "orf") {
      this.buildOrfNodes();
    } else if (this.currentGraphType === "mutation_nfa" && this.automatonData) {
      this.buildMutationNfaNodes(this.automatonData);
    }
  }

  /**
   * Loads and builds the complete state transition diagram for a Motif DFA
   * @param {import('../automata/dfa_orf_engine.js').MotifDFA} dfa
   */
  loadMotifDfaGraph(dfa) {
    this.currentGraphType = "motif";
    this.automatonData = dfa;
    this.buildMotifDfaNodes(dfa);
    this.fitToView();
  }

  buildMotifDfaNodes(dfa) {
    if (!dfa || !dfa.states) return;
    const w = this.canvas.width / this.dpr;
    const h = this.canvas.height / this.dpr;
    const n = dfa.states.length; // e.g. 10 for CCTGAGGAG

    // Determine layout strategy
    let useSerpentine = false;
    if (this.layoutMode === "serpentine") {
      useSerpentine = true;
    } else if (this.layoutMode === "auto") {
      // Auto: if width is narrow and states > 6, wrap into 2 rows
      useSerpentine = (w < 550 && n > 6);
    }

    this.nodes = [];
    const nodeRadius = useSerpentine ? (this.isMini ? 14 : 17) : Math.max(14, Math.min(22, (w / (n + 1.5)) * 0.42));

    if (!useSerpentine) {
      // Single Linear Row Layout
      const pad = nodeRadius + 30;
      const stepX = (w - pad * 2) / Math.max(1, n - 1);
      const cy = h / 2;

      for (let i = 0; i < n; i++) {
        const st = dfa.states[i];
        this.nodes.push({
          id: st,
          label: st,
          subLabel: dfa.pattern.substring(0, i),
          x: pad + i * stepX,
          y: cy,
          r: nodeRadius,
          isStart: (st === dfa.startState),
          isAccept: dfa.acceptStates.has(st),
          index: i
        });
      }
    } else {
      // Serpentine (Wrapped 2-Row Layout)
      // Row 0: states 0 to half-1 (flowing Left to Right)
      // Row 1: states half to n-1 (flowing Right to Left)
      const half = Math.ceil(n / 2);
      const pad = nodeRadius + 24;
      const stepX = (w - pad * 2) / Math.max(1, half - 1);
      const y0 = h * 0.32;
      const y1 = h * 0.70;

      for (let i = 0; i < n; i++) {
        const st = dfa.states[i];
        let x, y;
        if (i < half) {
          x = pad + i * stepX;
          y = y0;
        } else {
          // Flow back right to left
          const revIdx = i - half;
          x = (w - pad) - revIdx * stepX;
          y = y1;
        }

        this.nodes.push({
          id: st,
          label: st,
          subLabel: dfa.pattern.substring(0, i),
          x,
          y,
          r: nodeRadius,
          isStart: (st === dfa.startState),
          isAccept: dfa.acceptStates.has(st),
          index: i
        });
      }
    }

    // Build complete delta transitions from dfa.delta
    this.edges = [];
    const transitionMap = new Map(); // key: "from->to" => array of symbols

    for (const state of dfa.states) {
      if (!dfa.delta[state]) continue;
      for (const symbol of dfa.alphabet) {
        const nextState = dfa.delta[state][symbol];
        if (!nextState) continue;

        const key = `${state}->${nextState}`;
        if (!transitionMap.has(key)) {
          transitionMap.set(key, { from: state, to: nextState, symbols: [] });
        }
        transitionMap.get(key).symbols.push(symbol);
      }
    }

    for (const { from, to, symbols } of transitionMap.values()) {
      const fromIdx = parseInt(from.replace("q", ""), 10);
      const toIdx = parseInt(to.replace("q", ""), 10);

      const isBackbone = (toIdx === fromIdx + 1 && symbols.includes(dfa.pattern[fromIdx]));
      const isSelf = (from === to);
      const isBackward = (toIdx <= fromIdx && !isSelf);

      this.edges.push({
        from,
        to,
        symbols,
        label: symbols.join(", "),
        type: isBackbone ? "forward" : (isSelf ? "self" : (isBackward ? "backward" : "cross")),
        isBackbone
      });
    }
  }

  /**
   * Configures complete graph nodes and transitions for an ORF DFA
   */
  loadOrfGraph(orfDfa = null) {
    this.currentGraphType = "orf";
    this.automatonData = orfDfa;
    this.buildOrfNodes();
    this.fitToView();
  }

  buildOrfNodes() {
    const w = this.canvas.width / this.dpr;
    const h = this.canvas.height / this.dpr;
    const cy = h / 2;
    const pad = 36;
    const r = this.isMini ? 15 : 18;

    // 7 essential states for ORF DFA
    const stepX = (w - pad * 2) / 5.2;

    this.nodes = [
      { id: "q_scan", label: "q_scan", subLabel: "Wait 'A'", x: pad, y: cy, r, isStart: true, isAccept: false },
      { id: "q_A", label: "q_A", subLabel: "Saw 'A'", x: pad + stepX * 0.9, y: cy - 35, r, isStart: false, isAccept: false },
      { id: "q_AT", label: "q_AT", subLabel: "Saw 'AT'", x: pad + stepX * 1.8, y: cy - 35, r, isStart: false, isAccept: false },
      { id: "q_orf_c1", label: "q_c1", subLabel: "Codon 1", x: pad + stepX * 2.7, y: cy, r, isStart: false, isAccept: false },
      { id: "q_orf_c2", label: "q_c2", subLabel: "Codon 2", x: pad + stepX * 3.6, y: cy - 38, r, isStart: false, isAccept: false },
      { id: "q_orf_c3", label: "q_c3", subLabel: "Codon 3", x: pad + stepX * 3.6, y: cy + 38, r, isStart: false, isAccept: false },
      { id: "q_orf_complete", label: "q_FINAL", subLabel: "ORF Stop", x: Math.min(w - pad, pad + stepX * 4.7), y: cy, r, isStart: false, isAccept: true }
    ];

    this.edges = [
      // Start Codon Search
      { from: "q_scan", to: "q_scan", symbols: ["C", "G", "T"], label: "C,G,T", type: "self", isBackbone: false },
      { from: "q_scan", to: "q_A", symbols: ["A"], label: "A", type: "forward", isBackbone: true },
      { from: "q_A", to: "q_A", symbols: ["A"], label: "A", type: "self", isBackbone: false },
      { from: "q_A", to: "q_AT", symbols: ["T"], label: "T", type: "forward", isBackbone: true },
      { from: "q_A", to: "q_scan", symbols: ["C", "G"], label: "C,G", type: "backward", isBackbone: false },
      { from: "q_AT", to: "q_orf_c1", symbols: ["G"], label: "G (START)", type: "forward", isBackbone: true },
      { from: "q_AT", to: "q_A", symbols: ["A"], label: "A", type: "backward", isBackbone: false },
      { from: "q_AT", to: "q_scan", symbols: ["C", "T"], label: "C,T", type: "backward", isBackbone: false },

      // Triplet Codon Reading Loop
      { from: "q_orf_c1", to: "q_orf_c2", symbols: ["A", "C", "G", "T"], label: "\u03A3", type: "forward", isBackbone: true },
      { from: "q_orf_c2", to: "q_orf_c3", symbols: ["A", "C", "G", "T"], label: "\u03A3", type: "forward", isBackbone: true },
      { from: "q_orf_c3", to: "q_orf_c1", symbols: ["\u00ACSTOP"], label: "\u00ACSTOP", type: "backward", isBackbone: false },
      { from: "q_orf_c3", to: "q_orf_complete", symbols: ["STOP"], label: "STOP (TAA|TAG|TGA)", type: "forward", isBackbone: true },
      { from: "q_orf_complete", to: "q_scan", symbols: ["\u03A3"], label: "\u03A3", type: "backward", isBackbone: false }
    ];
  }

  /**
   * Configures complete 2D lattice graph for Mutation NFA
   * @param {import('../automata/nfa_mutation.js').MutationNFA} nfa
   */
  loadMutationNfaGraph(nfa) {
    this.currentGraphType = "mutation_nfa";
    this.automatonData = nfa;
    this.buildMutationNfaNodes(nfa);
    this.fitToView();
  }

  buildMutationNfaNodes(nfa) {
    if (!nfa) return;
    const w = this.canvas.width / this.dpr;
    const h = this.canvas.height / this.dpr;
    const m = nfa.m; // pattern length
    const k = nfa.k; // max errors (usually 1)

    const pad = 36;
    const stepX = (w - pad * 2) / Math.max(1, m);
    const r = this.isMini ? 13 : 16;

    this.nodes = [];
    this.edges = [];

    // Rows 0..k (e=0 Wild-type, e>=1 Mutants)
    for (let e = 0; e <= k; e++) {
      const y = (k === 0) 
        ? h * 0.5 
        : h * (0.28 + (e / k) * 0.44);

      for (let i = 0; i <= m; i++) {
        this.nodes.push({
          id: `q(${i},${e})`,
          label: `q(${i},${e})`,
          subLabel: e === 0 ? `Match ${i}` : `Err ${e}`,
          x: pad + i * stepX,
          y,
          r,
          isStart: (i === 0 && e === 0),
          isAccept: (i === m),
          layer: e,
          pos: i
        });
      }
    }

    // Edges
    // 1. Self loop on start state
    this.edges.push({
      from: `q(0,0)`,
      to: `q(0,0)`,
      symbols: ["\u03A3"],
      label: "\u03A3 (Scan)",
      type: "self",
      isBackbone: false
    });

    for (let i = 0; i < m; i++) {
      const matchChar = nfa.pattern[i];

      // Exact match horizontal transitions for every error level e
      for (let e = 0; e <= k; e++) {
        this.edges.push({
          from: `q(${i},${e})`,
          to: `q(${i + 1},${e})`,
          symbols: [matchChar],
          label: matchChar,
          type: "forward",
          isBackbone: (e === 0)
        });

        // SNP Mutation diagonal downward transition to e + 1
        if (e < k) {
          this.edges.push({
            from: `q(${i},${e})`,
            to: `q(${i + 1},${e + 1})`,
            symbols: ["\u2260" + matchChar],
            label: `\u2260${matchChar}`,
            type: "mutation",
            isBackbone: false
          });
        }
      }
    }
  }

  /**
   * Sets current active state(s) and triggers animation
   * @param {string | string[]} stateIds
   * @param {object} lastTrans
   */
  setActiveStates(stateIds, lastTrans = null) {
    if (Array.isArray(stateIds)) {
      this.activeStateIds = new Set(stateIds);
    } else if (stateIds instanceof Set) {
      this.activeStateIds = new Set(stateIds);
    } else if (stateIds) {
      this.activeStateIds = new Set([stateIds]);
    } else {
      this.activeStateIds.clear();
    }

    this.lastTransition = lastTrans;
    this.render();
  }

  exportImage() {
    const link = document.createElement('a');
    link.download = `bioautomata-state-diagram-${this.currentGraphType || 'dfa'}-${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);

    if (!this.nodes || this.nodes.length === 0) return;

    ctx.save();
    // Device Pixel Ratio scaling + Pan/Zoom transform
    ctx.scale(this.dpr, this.dpr);
    ctx.translate(this.panX, this.panY);
    ctx.scale(this.zoom, this.zoom);

    // Filter edges based on viewMode
    let edgesToDraw = this.edges;
    if (this.viewMode === "backbone") {
      edgesToDraw = this.edges.filter(e => e.isBackbone || (this.lastTransition && this.lastTransition.from === e.from && this.lastTransition.to === e.to));
    }

    // 1. Draw Edges
    for (const edge of edgesToDraw) {
      const n1 = this.nodes.find(n => n.id === edge.from);
      const n2 = this.nodes.find(n => n.id === edge.to);
      if (!n1 || !n2) continue;

      const isFired = this.lastTransition && 
                     this.lastTransition.from === edge.from && 
                     this.lastTransition.to === edge.to;

      const isHovered = this.hoveredNode && 
                       (this.hoveredNode.id === edge.from || this.hoveredNode.id === edge.to);

      ctx.save();
      ctx.beginPath();

      let strokeColor = "rgba(110, 118, 129, 0.4)";
      let lineWidth = 1.2;

      if (isFired) {
        strokeColor = "#58a6ff";
        lineWidth = 2.4;
      } else if (isHovered) {
        strokeColor = "#79c0ff";
        lineWidth = 1.8;
      } else if (edge.type === "mutation") {
        strokeColor = "rgba(218, 54, 51, 0.65)"; // Alert Red / Coral for SNP mutation
        lineWidth = 1.4;
      } else if (edge.isBackbone) {
        strokeColor = "rgba(139, 148, 158, 0.65)";
        lineWidth = 1.5;
      } else if (edge.type === "backward" || edge.type === "self") {
        strokeColor = "rgba(110, 118, 129, 0.32)";
        lineWidth = 1.0;
      }

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineWidth;

      if (edge.type === "mutation") {
        ctx.setLineDash([4, 3]);
      }

      if (n1 === n2) {
        // Self Loop
        const loopR = Math.max(12, n1.r * 0.75);
        const loopCy = n1.y - n1.r - loopR;
        ctx.arc(n1.x, loopCy, loopR, 0, Math.PI * 2);
        ctx.stroke();

        // Arrowhead on return point
        this.drawArrowhead(ctx, n1.x + loopR * 0.8, n1.y - n1.r - 2, 0.7, strokeColor, 7);

        // Label above loop
        this.drawEdgeLabel(ctx, edge.label, n1.x, loopCy - loopR - 4, isFired, edge.symbols);

      } else {
        // Directed curved edge between n1 and n2
        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        let midX = (n1.x + n2.x) / 2;
        let midY = (n1.y + n2.y) / 2;

        let arcHeight = 0;
        if (edge.type === "forward") {
          arcHeight = -Math.min(28, Math.max(12, dist * 0.16));
        } else if (edge.type === "backward") {
          // Curve downward underneath
          const hopDist = Math.abs(n1.index - n2.index) || 2;
          arcHeight = Math.min(65, 18 + hopDist * 5.5);
        } else if (edge.type === "mutation") {
          arcHeight = 10;
        }

        // Perpendicular offset
        const normX = -dy / (dist || 1);
        const normY = dx / (dist || 1);
        const ctrlX = midX + normX * arcHeight;
        const ctrlY = midY + normY * arcHeight;

        ctx.moveTo(n1.x, n1.y);
        ctx.quadraticCurveTo(ctrlX, ctrlY, n2.x, n2.y);
        ctx.stroke();

        // Compute tangent vector at destination node border
        const t = 0.94;
        const ptX = (1 - t) * (1 - t) * n1.x + 2 * (1 - t) * t * ctrlX + t * t * n2.x;
        const ptY = (1 - t) * (1 - t) * n1.y + 2 * (1 - t) * t * ctrlY + t * t * n2.y;
        const angle = Math.atan2(n2.y - ptY, n2.x - ptX);

        // Arrowhead stops at node boundary
        const arrowX = n2.x - Math.cos(angle) * (n2.r + 1);
        const arrowY = n2.y - Math.sin(angle) * (n2.r + 1);

        this.drawArrowhead(ctx, arrowX, arrowY, angle, strokeColor, 8);

        // Edge label positioned near control point
        const lblX = 0.25 * n1.x + 0.5 * ctrlX + 0.25 * n2.x;
        const lblY = 0.25 * n1.y + 0.5 * ctrlY + 0.25 * n2.y;
        this.drawEdgeLabel(ctx, edge.label, lblX, lblY, isFired, edge.symbols);
      }

      ctx.restore();
    }

    // 2. Draw Nodes
    for (const node of this.nodes) {
      const isActive = this.activeStateIds.has(node.id);
      const isHovered = (this.hoveredNode && this.hoveredNode.id === node.id);
      const isSelected = (this.selectedNode === node.id);
      const r = node.r || 18;

      ctx.save();

      // Pulsing Halo Ring for Active State
      if (isActive) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, r + 7, 0, Math.PI * 2);
        ctx.strokeStyle = node.isAccept ? "rgba(46, 160, 67, 0.5)" : "rgba(88, 166, 255, 0.5)";
        ctx.lineWidth = 2.0;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(node.x, node.y, r + 3, 0, Math.PI * 2);
        ctx.strokeStyle = node.isAccept ? "rgba(46, 160, 67, 0.8)" : "rgba(88, 166, 255, 0.8)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Outer circle fill & border
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
      ctx.fillStyle = isActive ? (node.isAccept ? "#0e3a1f" : "#19283f") : (isHovered ? "#21262d" : "#161b22");
      ctx.fill();

      let borderColor = "#30363d";
      if (node.isAccept) borderColor = "#2ea043";
      else if (isActive) borderColor = "#58a6ff";
      else if (isSelected) borderColor = "#f0f6fc";
      else if (isHovered) borderColor = "#8b949e";

      ctx.strokeStyle = borderColor;
      ctx.lineWidth = isActive ? 2.2 : 1.6;
      ctx.stroke();

      // Double circle for Final / Accepting states F
      if (node.isAccept) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, r - 4, 0, Math.PI * 2);
        ctx.strokeStyle = "#2ea043";
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }

      // Start arrow indicator for q0
      if (node.isStart) {
        const arrowLen = 18;
        ctx.beginPath();
        ctx.moveTo(node.x - r - arrowLen, node.y);
        ctx.lineTo(node.x - r, node.y);
        ctx.strokeStyle = "#8b949e";
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // Arrow head
        ctx.beginPath();
        ctx.moveTo(node.x - r - 5, node.y - 4);
        ctx.lineTo(node.x - r, node.y);
        ctx.lineTo(node.x - r - 5, node.y + 4);
        ctx.fillStyle = "#8b949e";
        ctx.fill();
      }

      // State Label (e.g. "q0", "q1", "q_scan")
      ctx.fillStyle = isActive ? "#ffffff" : (node.isAccept ? "#3fb950" : "#f0f6fc");
      const fontSize = Math.max(9, Math.min(12, Math.floor(r * 0.72)));
      ctx.font = `600 ${fontSize}px "JetBrains Mono", monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(node.label, node.x, node.y);

      // Sub-label below node if available (e.g. prefix match)
      if (node.subLabel && !this.isMini && this.zoom >= 0.8) {
        ctx.fillStyle = "#8b949e";
        ctx.font = `500 9px "JetBrains Mono", monospace`;
        ctx.fillText(node.subLabel, node.x, node.y + r + 11);
      }

      ctx.restore();
    }

    ctx.restore();

    // 3. Draw Hover Tooltip on Top in Screen Coordinates
    if (this.hoveredNode) {
      this.drawTooltip(this.hoveredNode);
    }
  }

  drawArrowhead(ctx, tipX, tipY, angle, color, size = 8) {
    ctx.save();
    ctx.translate(tipX, tipY);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-size, -size * 0.45);
    ctx.lineTo(-size * 0.65, 0);
    ctx.lineTo(-size, size * 0.45);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  drawEdgeLabel(ctx, text, x, y, isFired, symbols = []) {
    if (!text) return;
    ctx.save();

    // Determine color based on nucleotide symbol if single char
    let labelColor = isFired ? "#ffffff" : "#c9d1d9";
    if (symbols && symbols.length === 1 && BASE_COLORS[symbols[0]]) {
      labelColor = BASE_COLORS[symbols[0]].css;
    }

    ctx.font = isFired ? "bold 10px JetBrains Mono, monospace" : "500 9px JetBrains Mono, monospace";
    const textWidth = ctx.measureText(text).width;

    // Small rounded pill backdrop
    ctx.fillStyle = isFired ? "rgba(22, 27, 34, 0.95)" : "rgba(13, 17, 23, 0.88)";
    ctx.beginPath();
    ctx.roundRect(x - textWidth / 2 - 4, y - 6, textWidth + 8, 13, 3);
    ctx.fill();
    ctx.strokeStyle = isFired ? "#58a6ff" : "rgba(48, 54, 61, 0.7)";
    ctx.lineWidth = 0.8;
    ctx.stroke();

    ctx.fillStyle = labelColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x, y + 1);

    ctx.restore();
  }

  drawTooltip(node) {
    const ctx = this.ctx;
    const screenPos = this.worldToScreen(node.x, node.y);

    // Gather outgoing transitions
    const outgoing = this.edges.filter(e => e.from === node.id);

    const title = `${node.label} ${node.isAccept ? '[FINAL / ACCEPT]' : (node.isStart ? '[START STATE]' : '')}`;
    const prefixText = node.subLabel ? `Matched Prefix: "${node.subLabel}"` : "";

    ctx.save();
    ctx.font = "bold 11px JetBrains Mono, monospace";
    let maxW = Math.max(160, ctx.measureText(title).width + 24);

    const lines = [];
    if (prefixText) lines.push(prefixText);

    if (outgoing.length > 0) {
      lines.push("Transitions \u03B4:");
      for (const e of outgoing) {
        lines.push(`  \u2022 on [${e.label}] \u2192 ${e.to}`);
      }
    } else {
      lines.push("No outgoing transitions (Dead state)");
    }

    ctx.font = "10px JetBrains Mono, monospace";
    for (const line of lines) {
      maxW = Math.max(maxW, ctx.measureText(line).width + 24);
    }

    const boxH = 26 + lines.length * 15;
    let boxX = screenPos.x + 14;
    let boxY = screenPos.y - boxH / 2;

    const canvasW = this.canvas.width / this.dpr;
    const canvasH = this.canvas.height / this.dpr;

    if (boxX + maxW > canvasW - 10) boxX = screenPos.x - maxW - 14;
    if (boxY < 10) boxY = 10;
    if (boxY + boxH > canvasH - 10) boxY = canvasH - boxH - 10;

    // Tooltip backdrop
    ctx.fillStyle = "rgba(13, 17, 23, 0.95)";
    ctx.strokeStyle = "rgba(48, 54, 61, 0.9)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, maxW, boxH, 6);
    ctx.fill();
    ctx.stroke();

    // Title
    ctx.fillStyle = node.isAccept ? "#2ea043" : "#58a6ff";
    ctx.font = "bold 11px JetBrains Mono, monospace";
    ctx.fillText(title, boxX + 10, boxY + 16);

    // Lines
    ctx.font = "10px JetBrains Mono, monospace";
    let curY = boxY + 32;
    for (const line of lines) {
      ctx.fillStyle = line.startsWith("Transitions") ? "#8b949e" : (line.includes("\u2192") ? "#f0f6fc" : "#8b949e");
      ctx.fillText(line, boxX + 10, curY);
      curY += 15;
    }

    ctx.restore();
  }
}
