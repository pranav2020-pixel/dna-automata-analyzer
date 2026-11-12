/**
 * Formal Automata Specification & Transition Table Generator
 * Produces mathematical 5-tuple M = (Q, Sigma, delta, q0, F) with educational explanations and HTML transition tables.
 */

export class FormalSpecGenerator {
  /**
   * Generates formal 5-tuple and HTML table for a MotifDFA
   * @param {import('./dfa_orf_engine.js').MotifDFA} dfa
   * @param {string} currentState
   * @param {string} currentSymbol
   * @returns {object} { tupleHtml, tableHtml, summaryHtml }
   */
  static generateDfaSpec(dfa, currentState = "q0", currentSymbol = "") {
    const Q = dfa.states.join(", ");
    const Sigma = dfa.alphabet.join(", ");
    const q0 = dfa.startState;
    const F = Array.from(dfa.acceptStates).join(", ");
    const activeDesc = dfa.getStateDescription ? dfa.getStateDescription(currentState) : "";

    const tupleHtml = `
      <div class="formal-spec-card">
        <div class="formal-math-header">
          <span class="math-title">DFA Definition: <strong>M</strong> = (<strong>Q</strong>, <strong>&Sigma;</strong>, <strong>&delta;</strong>, <strong>q<sub>0</sub></strong>, <strong>F</strong>)</span>
        </div>
        <div class="tuple-breakdown">
          <div class="tuple-row">
            <span class="tuple-label">Q (States):</span>
            <span class="tuple-val">{ ${Q} } (${dfa.states.length} states)</span>
          </div>
          <div class="tuple-row">
            <span class="tuple-label">&Sigma; (Alphabet):</span>
            <span class="tuple-val">{ ${Sigma} } (DNA nucleotides)</span>
          </div>
          <div class="tuple-row">
            <span class="tuple-label">q<sub>0</sub> (Start):</span>
            <span class="tuple-val">${q0}</span>
          </div>
          <div class="tuple-row">
            <span class="tuple-label">F (Accepting):</span>
            <span class="tuple-val">{ ${F} }</span>
          </div>
        </div>
      </div>
    `;

    // Build Transition Table
    let tableHtml = `
      <table class="automata-table" aria-label="DFA Transition Matrix">
        <thead>
          <tr>
            <th>State</th>
            ${dfa.alphabet.map(sym => `<th class="${sym === currentSymbol ? 'col-highlight' : ''}">${sym}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
    `;

    for (const state of dfa.states) {
      const isStart = state === dfa.startState;
      const isAccept = dfa.acceptStates.has(state);
      const isCurrent = state === currentState;

      let prefix = "";
      if (isStart && isAccept) prefix = "\u2192 *";
      else if (isStart) prefix = "\u2192 ";
      else if (isAccept) prefix = "* ";

      tableHtml += `
        <tr class="${isCurrent ? 'row-highlight' : ''}">
          <td class="state-cell"><strong>${prefix}${state}</strong></td>
          ${dfa.alphabet.map(sym => {
            const nextSt = dfa.delta[state] ? dfa.delta[state][sym] : "-";
            const isCellTarget = (isCurrent && sym === currentSymbol);
            return `<td class="${isCellTarget ? 'cell-active' : ''}">${nextSt}</td>`;
          }).join("")}
        </tr>
      `;
    }

    tableHtml += `</tbody></table>`;

    return { tupleHtml, tableHtml, activeDesc };
  }

  /**
   * Generates formal representation and transition matrix for the ORF DFA
   * @param {import('./dfa_orf_engine.js').OrfDFA} orfDfa
   * @param {string} currentState
   * @param {string} currentSymbol
   */
  static generateOrfSpec(orfDfa, currentState = "q_scan", currentSymbol = "") {
    const Q = orfDfa.states ? orfDfa.states.join(", ") : "q_scan, q_A, q_AT, q_c1, q_c2, q_c3, q_complete";
    const Sigma = "A, C, G, T";
    const q0 = orfDfa.startState || "q_scan";
    const F = "q_complete";
    const activeDesc = orfDfa.getStateDescription ? orfDfa.getStateDescription() : "";
    const frameLabel = `Frame +${(orfDfa.readingFrame || 0) + 1}`;

    const tupleHtml = `
      <div class="formal-spec-card">
        <div class="formal-math-header">
          <span class="math-title">ORF Recognizer DFA: <strong>M<sub>ORF</sub></strong> = (<strong>Q</strong>, <strong>&Sigma;</strong>, <strong>&delta;</strong>, <strong>q<sub>scan</sub></strong>, <strong>{ q<sub>complete</sub> }</strong>)</span>
        </div>
        <div class="tuple-breakdown">
          <div class="tuple-row">
            <span class="tuple-label">Q (States):</span>
            <span class="tuple-val">{ ${Q} } (7 functional states)</span>
          </div>
          <div class="tuple-row">
            <span class="tuple-label">&Sigma; (Alphabet):</span>
            <span class="tuple-val">{ ${Sigma} }</span>
          </div>
          <div class="tuple-row">
            <span class="tuple-label">Start / Frame:</span>
            <span class="tuple-val">${q0} &bull; ${frameLabel}</span>
          </div>
          <div class="tuple-row">
            <span class="tuple-label">Accepting (F):</span>
            <span class="tuple-val">{ ${F} } (Stop Codon TAA, TAG, TGA)</span>
          </div>
          <div class="tuple-row">
            <span class="tuple-label">Current State:</span>
            <span class="tuple-val"><span class="badge-active">${currentState}</span> ${orfDfa.inOrf ? `&bull; In ORF (Codon: ${orfDfa.currentCodon || '...'})` : '&bull; Scanning'}</span>
          </div>
        </div>
      </div>
    `;

    const tableHtml = `
      <div class="orf-state-summary" style="padding:0.4rem;font-size:0.7rem;color:var(--text-muted);line-height:1.5;">
        <p style="margin:0 0 0.3rem 0;"><strong style="color:var(--text-main);">Recognition Grammar:</strong> <code>L = &Sigma;* &bull; ATG &bull; (&Sigma;&Sigma;&Sigma;)* &bull; (TAA | TAG | TGA)</code></p>
        <p style="margin:0 0 0.3rem 0;"><strong style="color:var(--text-main);">Primary Cycle:</strong> <code>q_scan &rarr; q_A &rarr; q_AT &rarr; q_c1 &rarr; q_c2 &rarr; q_c3 &rarr; [q_c1 | q_complete]</code></p>
        <p style="margin:0;"><strong style="color:var(--text-main);">Validated ORFs:</strong> <span class="badge-active">${orfDfa.discoveredOrfs.length} identified</span></p>
      </div>
    `;

    return { tupleHtml, tableHtml, activeDesc };
  }

  /**
   * Generates formal representation for the Mutation NFA
   * @param {import('./nfa_mutation.js').MutationNFA} nfa
   * @param {Set<string>} activeStates
   * @param {string} currentSymbol
   */
  static generateNfaSpec(nfa, activeStates = new Set(), currentSymbol = "") {
    const Sigma = nfa.alphabet.join(", ");
    const q0 = nfa.startState;
    const F = Array.from(nfa.acceptStates).join(", ");

    const tupleHtml = `
      <div class="formal-spec-card">
        <div class="formal-math-header">
          <span class="math-title">NFA (k=${nfa.k} Mismatch): <strong>M</strong> = (<strong>Q</strong>, <strong>&Sigma;</strong>, <strong>&delta;</strong>, <strong>q<sub>0</sub></strong>, <strong>F</strong>)</span>
        </div>
        <div class="tuple-breakdown">
          <div class="tuple-row">
            <span class="tuple-label">Q (States):</span>
            <span class="tuple-val">{ q(i, e) | 0 &le; i &le; ${nfa.m}, 0 &le; e &le; ${nfa.k} } (${nfa.states.length} total)</span>
          </div>
          <div class="tuple-row">
            <span class="tuple-label">&Sigma; (Alphabet):</span>
            <span class="tuple-val">{ ${Sigma} }</span>
          </div>
          <div class="tuple-row">
            <span class="tuple-label">q<sub>0</sub> (Start):</span>
            <span class="tuple-val">${q0}</span>
          </div>
          <div class="tuple-row">
            <span class="tuple-label">F (Accepting):</span>
            <span class="tuple-val">{ q(${nfa.m}, e) | 0 &le; e &le; ${nfa.k} }</span>
          </div>
          <div class="tuple-row">
            <span class="tuple-label">Active Set |S|:</span>
            <span class="tuple-val"><span class="badge-active">${activeStates.size} state(s) active</span></span>
          </div>
        </div>
      </div>
    `;

    // Condensed Active States transition preview
    let tableHtml = `
      <div class="active-nfa-states">
        <div class="subheading">Active State Subset S &sube; Q:</div>
        <div class="state-chips">
          ${Array.from(activeStates).map(st => {
            const isAccept = nfa.acceptStates.has(st);
            return `<span class="state-chip ${isAccept ? 'chip-accept' : ''}">${st}${isAccept ? ' [FINAL]' : ''}</span>`;
          }).join("")}
        </div>
      </div>
    `;

    return { tupleHtml, tableHtml };
  }
}
