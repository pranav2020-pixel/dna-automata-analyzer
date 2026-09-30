/**
 * Formal Automata Specification & Transition Table Generator
 * Produces mathematical 5-tuple M = (Q, Sigma, delta, q0, F) and HTML transition tables.
 */

export class FormalSpecGenerator {
  /**
   * Generates formal 5-tuple and HTML table for a MotifDFA
   * @param {import('./dfa_orf_engine.js').MotifDFA} dfa
   * @param {string} currentState
   * @param {string} currentSymbol
   * @returns {object} { tupleHtml, tableHtml }
   */
  static generateDfaSpec(dfa, currentState = "q0", currentSymbol = "") {
    const Q = dfa.states.join(", ");
    const Sigma = dfa.alphabet.join(", ");
    const q0 = dfa.startState;
    const F = Array.from(dfa.acceptStates).join(", ");

    const tupleHtml = `
      <div class="formal-tuple">
        <span class="tuple-line"><strong>M</strong> = (<strong>Q</strong>, <strong>&Sigma;</strong>, <strong>&delta;</strong>, <strong>q<sub>0</sub></strong>, <strong>F</strong>)</span>
        <div class="tuple-details">
          <div><span class="tuple-key">Q:</span> { ${Q} }</div>
          <div><span class="tuple-key">&Sigma;:</span> { ${Sigma} }</div>
          <div><span class="tuple-key">q<sub>0</sub>:</span> ${q0}</div>
          <div><span class="tuple-key">F:</span> { ${F} }</div>
        </div>
      </div>
    `;

    // Build Transition Table
    let tableHtml = `
      <table class="automata-table">
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
      if (isStart && isAccept) prefix = "-> *";
      else if (isStart) prefix = "-> ";
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

    return { tupleHtml, tableHtml };
  }

  /**
   * Generates formal representation for the Mutation NFA
   * @param {import('./nfa_mutation.js').MutationNFA} nfa
   * @param {Set<string>} activeStates
   * @param {string} currentSymbol
   */
  static generateNfaSpec(nfa, activeStates = new Set(), currentSymbol = "") {
    const statesDisplay = nfa.states.slice(0, 10).join(", ") + (nfa.states.length > 10 ? ", ..." : "");
    const Sigma = nfa.alphabet.join(", ");
    const q0 = nfa.startState;
    const F = Array.from(nfa.acceptStates).join(", ");

    const tupleHtml = `
      <div class="formal-tuple">
        <span class="tuple-line"><strong>NFA (k=${nfa.k} Mismatch)</strong> = (<strong>Q</strong>, <strong>&Sigma;</strong>, <strong>&delta;</strong>, <strong>q<sub>0</sub></strong>, <strong>F</strong>)</span>
        <div class="tuple-details">
          <div><span class="tuple-key">Q:</span> { (i, e) | 0 &le; i &le; ${nfa.m}, 0 &le; e &le; ${nfa.k} } (${nfa.states.length} states)</div>
          <div><span class="tuple-key">&Sigma;:</span> { ${Sigma} }</div>
          <div><span class="tuple-key">q<sub>0</sub>:</span> ${q0}</div>
          <div><span class="tuple-key">F:</span> { q(${nfa.m}, e) | e &le; ${nfa.k} }</div>
          <div><span class="tuple-key">Active States |S|:</span> <span class="badge-active">${activeStates.size} active</span></div>
        </div>
      </div>
    `;

    // Condensed Active States transition preview
    let tableHtml = `
      <div class="active-nfa-states">
        <div class="subheading">Current Active State Set S &sube; Q:</div>
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
