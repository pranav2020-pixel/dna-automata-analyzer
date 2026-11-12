/**
 * Mutation-Tolerant NFA (Levenshtein / k-Mismatch Automata)
 * Models single-nucleotide polymorphisms (SNPs) and point mutations in DNA sequences.
 * States: q(i, e) where:
 *   i = target pattern index matched [0..m]
 *   e = errors / point mutations incurred [0..k]
 */

export class MutationNFA {
  /**
   * @param {string} referencePattern - Target reference pattern (e.g. 'CCTGAGGAG')
   * @param {number} maxErrors - Maximum allowed point mutations / mismatches k (0, 1, or 2)
   */
  constructor(referencePattern, maxErrors = 1) {
    this.pattern = (referencePattern || "CCTGAGGAG").toUpperCase().replace(/[^ACGT]/g, "");
    if (!this.pattern) this.pattern = "CCTGAGGAG";
    this.m = this.pattern.length;
    this.k = Math.max(0, Math.min(2, parseInt(maxErrors, 10) || 1));
    this.alphabet = ['A', 'C', 'G', 'T'];

    // State format: "q(i,e)"
    this.states = [];
    for (let i = 0; i <= this.m; i++) {
      for (let e = 0; e <= this.k; e++) {
        this.states.push(`q(${i},${e})`);
      }
    }

    this.startState = "q(0,0)";
    // Accepting states: any state where i == m and e <= k
    this.acceptStates = new Set();
    for (let e = 0; e <= this.k; e++) {
      this.acceptStates.add(`q(${this.m},${e})`);
    }

    // Active state set at runtime
    this.activeStates = new Set([this.startState]);
    this.currentIndex = -1;
    this.detectedMutations = [];
    this.history = [];
    
    // Path tracking for mutation pinpointing
    this.stateMetadata = new Map(); // stateStr => { path: [] }
    this.stateMetadata.set(this.startState, { path: [] });
  }

  getStateDescription(stateStr) {
    const match = stateStr.match(/q\((\d+),(\d+)\)/);
    if (!match) return "Active state";
    const i = parseInt(match[1], 10);
    const e = parseInt(match[2], 10);

    if (i === 0 && e === 0) {
      return "Initial state: Waiting for pattern prefix";
    }
    if (i === this.m) {
      if (e === 0) return `Target match: Wild-type sequence matched perfectly (${this.m}/${this.m} bp, 0 mismatches)`;
      return `Target match: Sequence matched with ${e} point mutation(s) / SNP(s) (${this.m}/${this.m} bp)`;
    }
    if (e === 0) {
      return `Wild-type branch: ${i}/${this.m} bases matched identically to reference`;
    }
    return `Mutation branch: ${i}/${this.m} bases matched with ${e} point mutation(s) accumulated`;
  }

  reset() {
    this.activeStates = new Set([this.startState]);
    this.currentIndex = -1;
    this.detectedMutations = [];
    this.history = [];
    this.stateMetadata.clear();
    this.stateMetadata.set(this.startState, { path: [] });
  }

  /**
   * Evaluates delta transitions from a given state (i, e) on input symbol c
   * @param {number} i - Pattern index
   * @param {number} e - Errors count
   * @param {string} c - Input nucleotide
   * @returns {Array<{nextState: string, isMutation: boolean, details: object}>}
   */
  getTransitions(i, e, c) {
    const transitions = [];
    if (i >= this.m) return transitions;

    const expectedChar = this.pattern[i];

    // 1. Exact Match: no error increment
    if (c === expectedChar) {
      transitions.push({
        nextState: `q(${i + 1},${e})`,
        isMutation: false,
        expectedChar,
        actualChar: c,
        posInPattern: i,
        type: "MATCH"
      });
    }

    // 2. Point Mutation / Substitution: if errors < k
    if (c !== expectedChar && e < this.k) {
      transitions.push({
        nextState: `q(${i + 1},${e + 1})`,
        isMutation: true,
        expectedChar,
        actualChar: c,
        posInPattern: i,
        type: "SUBSTITUTION_SNP"
      });
    }

    return transitions;
  }

  /**
   * Consumes a single nucleotide across the NFA active state set
   * @param {string} char
   * @param {number} globalIndex
   * @returns {object} stepResult
   */
  step(char, globalIndex) {
    const symbol = char.toUpperCase();
    if (!this.alphabet.includes(symbol)) {
      return { activeStates: Array.from(this.activeStates), isAccepted: false, invalid: true };
    }

    this.currentIndex = globalIndex;
    const prevActiveStates = new Set(this.activeStates);
    const nextActiveStates = new Set();
    const nextStateMetadata = new Map();
    const transitionsFired = [];

    // Always keep start state active so we can start matching pattern at any sequence position
    nextActiveStates.add(this.startState);
    nextStateMetadata.set(this.startState, { path: [] });

    for (const stateStr of prevActiveStates) {
      const match = stateStr.match(/q\((\d+),(\d+)\)/);
      if (!match) continue;
      const i = parseInt(match[1], 10);
      const e = parseInt(match[2], 10);

      const currentPath = this.stateMetadata.get(stateStr)?.path || [];
      const trans = this.getTransitions(i, e, symbol);

      for (const t of trans) {
        nextActiveStates.add(t.nextState);
        const transRecord = {
          from: stateStr,
          to: t.nextState,
          ...t,
          globalIndex
        };
        transitionsFired.push(transRecord);

        // Track path history for pinpointing mutations
        if (!nextStateMetadata.has(t.nextState)) {
          nextStateMetadata.set(t.nextState, { path: [...currentPath, transRecord] });
        }
      }
    }

    this.activeStates = nextActiveStates;
    this.stateMetadata = nextStateMetadata;

    // Check if any accepting state was reached
    let acceptedState = null;
    for (const stateStr of this.activeStates) {
      if (this.acceptStates.has(stateStr)) {
        acceptedState = stateStr;
        break;
      }
    }

    const isAccepted = acceptedState !== null;
    let mutationFound = null;

    if (isAccepted) {
      // Parse error count from accepting state
      const match = acceptedState.match(/q\((\d+),(\d+)\)/);
      const errors = match ? parseInt(match[2], 10) : 0;
      
      const path = this.stateMetadata.get(acceptedState)?.path || [];
      const mutationsOnPath = path.filter(p => p.isMutation);

      mutationFound = {
        acceptedAt: globalIndex,
        startIndex: globalIndex - this.m + 1,
        errors,
        isPureWildType: (errors === 0),
        classification: errors === 0 
          ? "Exact Reference Match" 
          : `Point Mutation (SNP: ${errors} mismatch${errors > 1 ? 'es' : ''})`,
        mutations: mutationsOnPath.map(m => ({
          globalPos: m.globalIndex,
          patternPos: m.posInPattern,
          expected: m.expectedChar,
          actual: m.actualChar,
          description: `Base ${m.globalIndex + 1}: ${m.expectedChar} \u2192 ${m.actualChar}`
        }))
      };

      this.detectedMutations.push(mutationFound);
    }

    // Generate human-friendly active summary
    let summaryText = "";
    if (isAccepted) {
      summaryText = mutationFound?.classification || "Accepted";
    } else {
      const maxLen = Math.max(0, ...Array.from(nextActiveStates).map(s => {
        const m = s.match(/q\((\d+),/);
        return m ? parseInt(m[1], 10) : 0;
      }));
      summaryText = `Tracking ${nextActiveStates.size} active state(s) \u2022 Deepest match: ${maxLen}/${this.m} bp`;
    }

    const stepLog = {
      index: globalIndex,
      symbol,
      prevActiveStates: Array.from(prevActiveStates),
      activeStates: Array.from(nextActiveStates),
      isAccepted,
      acceptedState,
      mutationFound,
      description: summaryText
    };
    this.history.push(stepLog);

    return stepLog;
  }
}
