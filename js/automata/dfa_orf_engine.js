/**
 * DFA Engine for Open Reading Frame (ORF) and Exact Motif Recognition
 * Formal Definition: M = (Q, Sigma, delta, q0, F)
 */

import { GENETIC_CODE } from "../data/presets.js";

export class MotifDFA {
  /**
   * Constructs an exact-matching DFA for any nucleotide motif pattern using KMP/Aho-Corasick principles.
   * @param {string} pattern - Target nucleotide pattern (e.g., 'GAATTC', 'ATG', 'CCTGAGGAG')
   */
  constructor(pattern) {
    this.pattern = pattern.toUpperCase();
    this.alphabet = ['A', 'C', 'G', 'T'];
    this.m = this.pattern.length;
    
    // States: 0, 1, 2, ..., m (where state m is the accepting final state)
    this.states = Array.from({ length: this.m + 1 }, (_, i) => `q${i}`);
    this.startState = "q0";
    this.acceptStates = new Set([`q${this.m}`]);
    
    // Transition Table: delta[state][char] -> nextState
    this.delta = {};
    this.buildTransitionTable();

    // Runtime state
    this.currentState = this.startState;
    this.currentIndex = -1;
    this.matches = []; // Indices where pattern was accepted
    this.history = [];
  }

  buildTransitionTable() {
    for (let i = 0; i <= this.m; i++) {
      this.delta[`q${i}`] = {};
    }

    // Base case: prefix table computation
    for (let state = 0; state <= this.m; state++) {
      for (const char of this.alphabet) {
        // Find longest prefix of pattern that is a suffix of (pattern[0..state-1] + char)
        let candidate = this.pattern.substring(0, state) + char;
        let k = Math.min(this.m, state + 1);
        while (k > 0) {
          if (candidate.endsWith(this.pattern.substring(0, k))) {
            break;
          }
          k--;
        }
        this.delta[`q${state}`][char] = `q${k}`;
      }
    }
  }

  reset() {
    this.currentState = this.startState;
    this.currentIndex = -1;
    this.matches = [];
    this.history = [];
  }

  /**
   * Consumes a single character and transitions the state machine
   * @param {string} char
   * @param {number} index
   * @returns {object} stepResult
   */
  step(char, index) {
    const symbol = char.toUpperCase();
    if (!this.alphabet.includes(symbol)) {
      return { state: this.currentState, accepted: false, invalid: true };
    }

    this.currentIndex = index;
    const prevState = this.currentState;
    const nextState = this.delta[prevState][symbol];
    this.currentState = nextState;

    const isAccepted = this.acceptStates.has(nextState);
    if (isAccepted) {
      this.matches.push({
        startIndex: index - this.m + 1,
        endIndex: index,
        pattern: this.pattern
      });
    }

    const stepLog = {
      index,
      symbol,
      prevState,
      nextState,
      isAccepted,
      matchedLength: parseInt(nextState.replace("q", ""), 10)
    };
    this.history.push(stepLog);

    return stepLog;
  }
}

export class OrfDFA {
  /**
   * DFA specifically designed to detect Open Reading Frames (ORFs):
   * Scans for Start Codon (ATG), then groups nucleotides into triplets until a Stop Codon (TAA, TAG, TGA) is encountered.
   */
  constructor() {
    this.alphabet = ['A', 'C', 'G', 'T'];
    this.states = [
      "q_scan",       // Scanning for 'A' of 'ATG'
      "q_A",          // Saw 'A'
      "q_AT",         // Saw 'AT'
      "q_orf_c1",     // Inside ORF, expecting 1st nucleotide of codon
      "q_orf_c2",     // Inside ORF, expecting 2nd nucleotide of codon
      "q_orf_c3",     // Inside ORF, expecting 3rd nucleotide of codon
      "q_stop_T",     // In codon pos 1, saw 'T' (potential stop)
      "q_stop_TA",    // In codon pos 2, saw 'TA'
      "q_stop_TG",    // In codon pos 2, saw 'TG'
      "q_orf_complete"// Final accepting state: full ORF discovered
    ];
    this.startState = "q_scan";
    this.acceptStates = new Set(["q_orf_complete"]);

    this.currentState = this.startState;
    this.currentIndex = -1;
    this.currentCodon = "";
    this.currentOrfCodons = [];
    this.discoveredOrfs = [];
    this.history = [];
    this.inOrf = false;
    this.orfStartIndex = -1;
  }

  reset() {
    this.currentState = this.startState;
    this.currentIndex = -1;
    this.currentCodon = "";
    this.currentOrfCodons = [];
    this.discoveredOrfs = [];
    this.history = [];
    this.inOrf = false;
    this.orfStartIndex = -1;
  }

  step(char, index) {
    const symbol = char.toUpperCase();
    if (!this.alphabet.includes(symbol)) {
      return { state: this.currentState, accepted: false, invalid: true };
    }

    this.currentIndex = index;
    const prevState = this.currentState;
    let nextState = prevState;
    let event = "scan";

    if (!this.inOrf) {
      // Searching for ATG
      if (prevState === "q_scan") {
        nextState = (symbol === "A") ? "q_A" : "q_scan";
      } else if (prevState === "q_A") {
        if (symbol === "T") nextState = "q_AT";
        else if (symbol === "A") nextState = "q_A";
        else nextState = "q_scan";
      } else if (prevState === "q_AT") {
        if (symbol === "G") {
          nextState = "q_orf_c1";
          this.inOrf = true;
          this.orfStartIndex = index - 2;
          this.currentOrfCodons = ["ATG"];
          this.currentCodon = "";
          event = "START_CODON_FOUND";
        } else if (symbol === "A") {
          nextState = "q_A";
        } else {
          nextState = "q_scan";
        }
      }
    } else {
      // Inside active ORF reading frame: tracking triplets
      this.currentCodon += symbol;

      if (this.currentCodon.length === 1) {
        nextState = "q_orf_c2";
      } else if (this.currentCodon.length === 2) {
        nextState = "q_orf_c3";
      } else if (this.currentCodon.length === 3) {
        const codon = this.currentCodon;
        this.currentOrfCodons.push(codon);

        // Check for STOP codons: TAA, TAG, TGA
        if (codon === "TAA" || codon === "TAG" || codon === "TGA") {
          nextState = "q_orf_complete";
          this.discoveredOrfs.push({
            start: this.orfStartIndex,
            end: index,
            length: index - this.orfStartIndex + 1,
            codons: [...this.currentOrfCodons],
            stopCodon: codon,
            aminoAcids: this.currentOrfCodons.map(c => GENETIC_CODE[c] || "???")
          });
          event = "STOP_CODON_ACCEPTED";
          this.inOrf = false;
        } else {
          // Continue ORF
          nextState = "q_orf_c1";
          event = "CODON_READ";
        }
        this.currentCodon = "";
      }
    }

    this.currentState = nextState;
    const isAccepted = (nextState === "q_orf_complete");

    const stepLog = {
      index,
      symbol,
      prevState,
      nextState,
      isAccepted,
      inOrf: this.inOrf,
      event,
      currentCodon: this.currentCodon,
      currentOrfCodons: [...this.currentOrfCodons]
    };
    this.history.push(stepLog);

    return stepLog;
  }
}
