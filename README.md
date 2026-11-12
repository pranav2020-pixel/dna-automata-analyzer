# Helixa: DNA Sequence & Mutation Analyzer
### Formal Languages & Automata Theory (FLAT / TOC) Capstone Project

---

## 1. Project Overview & Problem Statement
In modern bioinformatics and computational genomics, analyzing genetic sequences for functional biological elements (such as Open Reading Frames, transcription factor binding sites, restriction enzyme cleavage targets, and single-nucleotide polymorphisms / point mutations) is conventionally approached using brute-force string searches. 

**Helixa** models biological sequence analysis as formal language recognition over the finite nucleotide alphabet:
$$\Sigma = \{ \text{A}, \text{C}, \text{G}, \text{T} \}$$

The application provides:
1. **Open Reading Frame (ORF) Recognizer DFA:** Deterministic finite automaton enforcing codon triplet reading frames ($+1, +2, +3$) from Start Codons (`ATG`) through coding codons to Stop Codons (`TAA`, `TAG`, `TGA`), with full amino acid translation.
2. **Exact Motif Matcher DFA:** Knuth-Morris-Pratt based transition matrix generator to detect critical restriction enzyme palindromes (e.g., EcoRI `GAATTC`, HindIII `AAGCTT`).
3. **Mutation-Tolerant NFA:** Parameterized Levenshtein $k$-mismatch state machine ($k \in \{0, 1, 2\}$) identifying Single Nucleotide Polymorphisms (SNPs) and point mutations, including the clinical mutation in the human Beta-Globin gene ($HBB$) that causes **Sickle Cell Anemia** (`GAG` $\rightarrow$ `GTG`).
4. **Interactive 3D Helical Workbench:** Parametric 3D double helix built with Three.js featuring active scanner camera tracking, nucleotide raycasting/hover tooltips, and interactive 2D state transition diagrams with directed bezier arcs and export options.
5. **Genomic Sequence Utilities:** FASTA file uploader, sequence sanitizer (strips headers and converts RNA `U` to `T`), and reverse complement computation ($3' \rightarrow 5'$ antiparallel strand).

---

## 2. Theoretical Formulations (Automata Definitions)

### A. Open Reading Frame (ORF) Recognizer DFA
* **Alphabet:** $\Sigma = \{\text{A}, \text{C}, \text{G}, \text{T}\}$
* **5-Tuple:** $M_{\text{ORF}} = (Q, \Sigma, \delta, q_{\text{scan}}, F)$
* **States ($Q$):**
  * $q_{\text{scan}}$: Initial scanning state before start codon.
  * $q_{\text{A}}$: Prefix `A` observed.
  * $q_{\text{AT}}$: Prefix `AT` observed.
  * $q_{\text{c1}}$: Inside active ORF, expecting nucleotide 1 of codon triplet.
  * $q_{\text{c2}}$: Expecting nucleotide 2 of codon triplet.
  * $q_{\text{c3}}$: Expecting nucleotide 3 of codon triplet.
  * $q_{\text{complete}}$: Accepting state upon recognizing a valid stop codon (`TAA`, `TAG`, `TGA`).
* **Language Recognized:**
  $$L(\text{ORF}) = \{ w \in \Sigma^* \mid w = \Sigma^* \cdot \text{ATG} \cdot (\Sigma^3)^* \cdot (\text{TAA} \cup \text{TAG} \cup \text{TGA}) \}$$

---

### B. Exact Motif Matcher DFA
* Given a target pattern $P = p_1 p_2 \dots p_m$ (e.g., EcoRI restriction site `GAATTC` where $m = 6$):
* **States:** $Q = \{q_0, q_1, q_2, \dots, q_m\}$
* **Start State:** $q_0$
* **Accepting State:** $F = \{q_m\}$
* **Transition Function ($\delta$):**
  $$\delta(q_s, c) = q_k \quad \text{where } k = \max \{ j \le m \mid P[1..j] \text{ is a suffix of } P[1..s]c \}$$

---

### C. Mutation-Tolerant NFA ($k$-Mismatch Levenshtein Automata)
* **Goal:** Detect whether a query DNA sequence contains a target gene segment with up to $k$ point mutations ($k \in \{0, 1, 2\}$).
* **States:** $Q = \{ q(i, e) \mid 0 \le i \le m, 0 \le e \le k \}$
  * $i$: Index of the pattern consumed ($0$ to $m$).
  * $e$: Accumulated mutation count / error distance ($0$ to $k$).
* **Transitions:**
  * **Exact Match (Horizontal):** $\delta(q(i, e), c) \ni q(i+1, e) \quad \text{if } c = P[i+1]$
  * **Point Mutation / SNP (Diagonal):** $\delta(q(i, e), c) \ni q(i+1, e+1) \quad \text{if } c \ne P[i+1] \text{ and } e < k$
* **Accepting States:** $F = \{ q(m, e) \mid 0 \le e \le k \}$
  * If accepted at $e = 0$: **Pure Wild-Type Homolog**.
  * If accepted at $e > 0$: **Mutant Variant (SNP)** with exact base substitutions tracked.

---

## 3. Real-World Case Studies Included in Presets

1. **Sickle Cell Anemia ($HBB$ Gene Mutation):**
   * *Wild-Type:* Codon 6 is `GAG` (Glutamic Acid).
   * *Mutant:* Transversion mutation `A` $\rightarrow$ `T` produces `GTG` (Valine).
   * *Automata Detection:* Mutation NFA isolates the exact nucleotide mismatch, reporting the substitution coordinates and amino acid change.
2. **Normal Human Beta-Globin ($HBB$ Wild-Type):**
   * Control sequence verifying that wild-type alleles trigger exact matches ($e=0$) without error branches.
3. **EcoRI & HindIII Restriction Endonuclease Cleavage Sites:**
   * Cleaves DNA at palindromic hexanucleotide sequences (`5'-GAATTC-3'` and `5'-AAGCTT-3'`).
   * The DFA identifies all cleavage coordinates for genomic recombinant cloning.
4. **SARS-CoV-2 Spike Receptor Binding Motif:**
   * Validates full coding reading frames and translation into amino acid sequences.
5. **Cystic Fibrosis ($CFTR$ Delta-F508 Locus):**
   * Inspects exon 11 codon boundaries and deletion hotspots.
6. **Huntington's Disease ($HTT$ Trinucleotide Repeats):**
   * Identifies tandem repetitive `CAG` iterations responsible for polyglutamine disorders.

---

## 4. Group Member Work Distribution (Max 3 Members)

| Member | Focus Area | Detailed Contributions |
| :--- | :--- | :--- |
| **Member 1** | **DFA Engine & Formal Specifications** | Implemented the Open Reading Frame (ORF) DFA (`dfa_orf_engine.js`), multi-frame translation logic, KMP transition matrix generator for arbitrary motif patterns, formal 5-tuple generator, and dynamic HTML transition table highlighting. |
| **Member 2** | **NFA Mutation Engine & Biological Data** | Implemented the Levenshtein $k$-mismatch state machine (`nfa_mutation.js`), parameterized tolerance $k \in \{0, 1, 2\}$, point mutation backtrace tracker, curated biological benchmark presets (`presets.js`), and genetic code translation tables. |
| **Member 3** | **Interactive 3D UI & State Visualizer** | Developed the Three.js 3D double helix (`dna_helix_3d.js`) with active scanner camera tracking and raycasting, built the 2D Canvas State Transition Diagram (`state_graph.js`) with interactive pan/zoom/export, and styled the institutional graphite dashboard. |

---

## 5. How to Run the Project Locally

The project is built entirely with standard modern Web technologies (HTML5, CSS3, ES6 JavaScript modules, Three.js via CDN) and has **no build steps or npm installations required**.

### Running via Local HTTP Server:
Because modern browsers restrict ES6 JavaScript module imports on the raw `file://` protocol due to CORS, run any simple local HTTP server:

#### Option A: Python (Built-in)
```bash
# In the project directory:
python -m http.server 8000
```
Then navigate to: `http://localhost:8000` in your browser.

#### Option B: Node.js (npx serve)
```bash
npx serve .
```

#### Option C: VS Code Live Server
* Open the folder in VS Code.
* Right-click `index.html` $\rightarrow$ **Open with Live Server**.

---

## 6. Viva / Defense Questions & Answers

**Q1: Why is a DFA suitable for exact motif search?**  
*Answer:* A DFA guarantees linear $O(n)$ time complexity where $n$ is the sequence length, regardless of pattern length. Each nucleotide requires exactly one transition lookup, avoiding backtracking and costly string comparisons.

**Q2: Why use an NFA instead of a DFA for mutation detection?**  
*Answer:* Point mutations introduce nondeterminism: when reading a mismatched nucleotide, the system can either treat it as a substitution or reset. An NFA naturally tracks all parallel mutation hypotheses simultaneously in an active state subset $S \subseteq Q$.

**Q3: How does the ORF DFA enforce triplet reading frames?**  
*Answer:* The ORF DFA contains a 3-state cycle $\{q_{\text{c1}}, q_{\text{c2}}, q_{\text{c3}}\}$. Stop codons are only evaluated when in $q_{\text{c3}}$, preventing false-positive stop signals that appear out-of-frame.

**Q4: How does the 3D visualizer keep up with long sequences?**  
*Answer:* Rather than arbitrary hardcoded limits, the 3D helix visualizer dynamically renders up to hundreds of base pairs and uses an automated camera tracker (`setAutoTrack`) that keeps the scanner and active nucleotide vertically centered in the viewport.
