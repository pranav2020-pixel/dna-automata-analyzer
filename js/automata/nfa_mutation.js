/**
 * Mutation-Tolerant NFA (Levenshtein / k-Mismatch Automata)
 * Models single-nucleotide polymorphisms (SNPs) and point mutations in DNA sequences.
 * States: (i, e) where i = pattern index matched [0..m], e = errors incurred [0..k]
 */

export class MutationNFA {
  /**
   * @param {string} referencePattern - Target reference pattern (e.g., wild-type sequence 'CCTGAGGAG')
   * @param {number} maxErrors - Maximum allowed mismatches k (typically 1 or 2 for SNP detection)
   */
  constructor(referencePattern, maxErrors = 1) {
    this.pattern = referencePattern.toUpperCase();
    this.m = this.pattern.length;
    this.k = maxErrors;
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

    // Active state set at runtime: Set of state strings
    this.activeStates = new Set([this.startState]);
    this.currentIndex = -1;
    this.detectedMutations = [];
    this.history = [];
    
    // Path tracking for mutation pinpointing
    this.pathHistory = [];
  }

  reset() {
    this.activeStates = new Set([this.startState]);
    this.currentIndex = -1;
    this.detectedMutations = [];
    this.history = [];
    this.pathHistory = [];
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
    const transitionsFired = [];

    // Always keep start state active so we can start matching pattern at any sequence position
    nextActiveStates.add(this.startState);

    for (const stateStr of prevActiveStates) {
      const match = stateStr.match(/q\((\d+),(\d+)\)/);
      if (!match) continue;
      const i = parseInt(match[1], 10);
      const e = parseInt(match[2], 10);

      const trans = this.getTransitions(i, e, symbol);
      for (const t of trans) {
        nextActiveStates.add(t.nextState);
        transitionsFired.push({
          from: stateStr,
          to: t.nextState,
          ...t,
          globalIndex
        });
      }
    }

    this.activeStates = nextActiveStates;

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
      
      // Locate mutation details
      const mutationTrans = transitionsFired.filter(t => t.isMutation);
      const mutationDetail = mutationTrans.length > 0 ? mutationTrans[mutationTrans.length - 1] : null;

      mutationFound = {
        acceptedAt: globalIndex,
        startIndex: globalIndex - this.m + 1,
        errors,
        isPureWildType: (errors === 0),
        classification: errors === 0 ? "Wild-Type Homolog" : `Point Mutation (SNP: ${errors} error)`,
        mutationDetail
      };

      this.detectedMutations.push(mutationFound);
    }

    const stepLog = {
      index: globalIndex,
      symbol,
      prevActiveStates: Array.from(prevActiveStates),
      activeStates: Array.from(nextActiveStates),
      isAccepted,
      acceptedState,
      mutationFound
    };
    this.history.push(stepLog);

    return stepLog;
  }
}
