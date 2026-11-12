/**
 * Biological Benchmark Presets for Automata-based DNA Analysis
 * Real-world genomic sequences demonstrating exact patterns, reading frames, and point mutations.
 */

export const DNA_PRESETS = [
  {
    id: "sickle_cell_mutant",
    name: "Sickle Cell Anemia (HBB Point Mutation)",
    organism: "Homo sapiens",
    gene: "HBB (Beta-Globin)",
    mode: "mutation_nfa",
    targetMotif: "CCTGTGGAG",
    referencePattern: "CCTGAGGAG",
    tolerance: 1,
    description: "Pathogenic single-nucleotide mutation (A\u2192T transversion) at codon 6 of human beta-globin. Converts normal Glutamic acid (GAG) to Valine (GTG), producing sickle hemoglobin (HbS).",
    clinicalContext: "Homozygous individuals develop sickle cell disease, causing red blood cells to deform into sickled shapes under low oxygen, leading to vaso-occlusive crises.",
    sequence: "ATGGTGCACCTGACTCCTGTGGAGAAGTCTGCCGTTACTGCCCTGTGGGGCAAGGTGAACGTGGATGAAGTTGGTGGTGAGGCCCTGGGCAGGCTGCTGGTTGTCTACCCTTGGACCCAGAGGTTCTTTGAGTCCTTTGGGGATCTGTCCACTCCTGATGCTGTTATGGGCAACCCTAAGGTGAAGGCTCATGGCAAGAAAGTGCTCGGTGCCTTTAGTGATGGCCTGGCTCACCTGGACAACCTCAAGGGCACCTTTGCCACACTGAGTGAGCTGCACTGTGACAAGCTGCACGTGGATCCTGAGAACTTCAGGCTCCTGGGCAACGTGCTGGTCTGTGTGCTGGCCCATCACTTTGGCAAAGAATTCACCCCACCAGTGCAGGCTGCCTATCAGAAAGTGGTGGCTGGTGTGGCTAATGCCCTGGCCCACAAGTATCACTAA",
    mutationDetails: {
      position: 20,
      wildTypeCodon: "GAG",
      mutantCodon: "GTG",
      wildTypeAA: "Glutamic acid (Glu / E)",
      mutantAA: "Valine (Val / V)",
      consequence: "Pathogenic missense mutation (HbS allele)"
    }
  },
  {
    id: "sickle_cell_normal",
    name: "Beta-Globin Wild-Type (Normal HbA)",
    organism: "Homo sapiens",
    gene: "HBB (Beta-Globin)",
    mode: "orf",
    targetMotif: "CCTGAGGAG",
    referencePattern: "CCTGAGGAG",
    tolerance: 0,
    description: "Wild-type human beta-globin gene segment encoding normal adult Hemoglobin A (HbA). Contains the canonical GAG codon (Glutamic acid) at position 6.",
    clinicalContext: "Standard adult hemoglobin subunit responsible for normal oxygen transport in human erythrocytes.",
    sequence: "ATGGTGCACCTGACTCCTGAGGAGAAGTCTGCCGTTACTGCCCTGTGGGGCAAGGTGAACGTGGATGAAGTTGGTGGTGAGGCCCTGGGCAGGCTGCTGGTTGTCTACCCTTGGACCCAGAGGTTCTTTGAGTCCTTTGGGGATCTGTCCACTCCTGATGCTGTTATGGGCAACCCTAAGGTGAAGGCTCATGGCAAGAAAGTGCTCGGTGCCTTTAGTGATGGCCTGGCTCACCTGGACAACCTCAAGGGCACCTTTGCCACACTGAGTGAGCTGCACTGTGACAAGCTGCACGTGGATCCTGAGAACTTCAGGCTCCTGGGCAACGTGCTGGTCTGTGTGCTGGCCCATCACTTTGGCAAAGAATTCACCCCACCAGTGCAGGCTGCCTATCAGAAAGTGGTGGCTGGTGTGGCTAATGCCCTGGCCCACAAGTATCACTAA"
  },
  {
    id: "ecori_restriction",
    name: "EcoRI Endonuclease Restriction Site",
    organism: "Escherichia coli RY13",
    gene: "Restriction Cleavage Locus",
    mode: "motif_dfa",
    targetMotif: "GAATTC",
    referencePattern: "GAATTC",
    tolerance: 0,
    description: "Palindromic hexanucleotide cleavage sequence (5'-GAATTC-3') where the EcoRI endonuclease cuts double-stranded DNA between G and A, producing sticky 5' cohesive overhangs.",
    clinicalContext: "Foundation of recombinant DNA technology and molecular cloning used globally to insert therapeutic genes into plasmid vectors.",
    sequence: "ACGTGGATGAAGTTGGTGGTGAGGCCCTGGGCAGGCTGCTGGTTGTCTACCCTTGGACCCAGAGGTTCTTTGAGTCCTTTGGGGATCTGTCCACTCCTGATGCTGTTATGGGCAACCCTAAGGTGAAGGCTCATGGCAAGAAAGTGCTCGGTGCCTTTAGTGATGGCCTGGCTCACCTGGACAACCTCAAGGGCACCTTTGCCACACTGAGTGAGCTGCACTGTGACAAGCTGCACGTGGATCCTGAGAACTTCAGGCTCCTGGGCAACGTGCTGGTCTGTGTGCTGGCCCATCACTTTGGCAAAGAATTCACCCCACCAGTGCAGGCTGCCTATCAGAAAGTGGTGGCTGGTGTG"
  },
  {
    id: "hindiii_restriction",
    name: "HindIII Restriction Site (Haemophilus)",
    organism: "Haemophilus influenzae Rd",
    gene: "Type II Restriction Locus",
    mode: "motif_dfa",
    targetMotif: "AAGCTT",
    referencePattern: "AAGCTT",
    tolerance: 0,
    description: "Canonical restriction endonuclease recognition site (5'-AAGCTT-3') that cleaves between the two adenines (A/AGCTT), leaving 4-base 5' single-stranded projections.",
    clinicalContext: "Widely used in DNA fingerprinting, plasmid mapping, and genetic diagnosis of human hereditary disorders.",
    sequence: "GATCCACCGTCAAGCTTCGGATGCATCGATCGATCGGAAGCTTCCTAGGTACCAAGCTTTACCGT"
  },
  {
    id: "sars_cov2_spike_snippet",
    name: "SARS-CoV-2 Spike Protein Coding Region",
    organism: "SARS-CoV-2 Coronavirus",
    gene: "Spike (S) Glycoprotein",
    mode: "orf",
    targetMotif: "ATG",
    referencePattern: "ATG",
    tolerance: 0,
    description: "Terminal coding sequence of the coronavirus Spike glycoprotein receptor-binding domain. Validates translation from initiator methionine (ATG) to stop signal (TAG).",
    clinicalContext: "Primary target of COVID-19 mRNA vaccines and neutralizing antibodies that block viral entry via the human ACE2 receptor.",
    sequence: "ATGTTCGTCTTTTGCGTTCTTGCTGCCATAACATCTGTTTACGCTGACACTTGTTTTCACAGTAACCCTAATTTTTCTGACTATACTAACGTCACAGATGTTAACACATGTGGTCCTGAGCAGCTGTCTTGTAGTCTGGCTAATAAGTACTCTGCTTGTCTACCGTTTTCACTTGCTTCCTAG"
  },
  {
    id: "huntington_cag_repeats",
    name: "Huntington's Disease (CAG Repeats)",
    organism: "Homo sapiens",
    gene: "HTT (Huntingtin)",
    mode: "motif_dfa",
    targetMotif: "CAGCAGCAG",
    referencePattern: "CAGCAGCAG",
    tolerance: 0,
    description: "Exon 1 of the HTT gene containing an expanded trinucleotide CAG repeat tract encoding a polyglutamine (polyQ) tract. Normal alleles have 10-26 repeats; >=40 repeats cause progressive neurodegeneration.",
    clinicalContext: "Autosomal dominant neurodegenerative disorder characterized by involuntary choreic movements, cognitive decline, and psychiatric disturbances.",
    sequence: "ATGGCGACCCTGGAAAAGCTGATGAAGGCCTTCGAGTCCCTCAAGTCCTTCCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAACAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAACAGCCGCCACCGCCGCCGCCGCCGCCGCCTCCTCAGCTTCCTCAGCCGCCGCCGCAGGCACAGCCGCTGCTGCCTCAGCCGCAGCCGCCCCCGCCGCCGCCCCCGCCGCCACCCGGCCCGGCTGTGGCTGAGGAGCCGCTGCACCGACCGTGATGA"
  },
  {
    id: "cftr_delta_f508",
    name: "Cystic Fibrosis (CFTR Delta-F508)",
    organism: "Homo sapiens",
    gene: "CFTR (ABC Transporter)",
    mode: "mutation_nfa",
    targetMotif: "ATCATCTTT",
    referencePattern: "ATCATTGTT",
    tolerance: 1,
    description: "The most common genetic cause of Cystic Fibrosis worldwide (~70% of mutant alleles). A 3-base variation or substitution affecting phenylalanine codon 508 in the CFTR chloride channel.",
    clinicalContext: "Disrupts epithelial chloride and water transport, causing thick viscous mucus in lungs and pancreas, leading to recurrent infections and organ damage.",
    sequence: "ATCATCTTTGGTGTTTCCTATGATGAATATAGATACAGAAGCGTCATCAAAGCATGCCAACTAGAAGAGGACATCTCCAAGTTTGCAGAGAAAGACAATATAGTTCTTGGAGAAGGTGGAATCACACTGAGTGGAGGTCAACGAGCAAGAATTTCTTTAGCAAGAGCAGTATACAAAGATGCTGATTTGTATTTATTAGACTCTCCTTTTGGATACCTAGATGTTTTAACAGAAAAAGAAATATTTGAAAGCTGTGTCTGTAAACTGATGGCTAACAAAACTAGGATTTTGGTCACTTCTAAAATGGAACATTTAAAGAAAGCTGACAAAATATTAATTTTGCATGAAGGTAGCAGCTATTTTTATGGGACATTTTCAGAACTCCAAAATCTACAGCCAGACTTTAGCTCAAAACTCATGGGATGTGATTCTTTCGACCAATTTAGTGCAGAAAGAAGAAATTCAATCCTAA"
  }
];

export const GENETIC_CODE = {
  // Phenylalanine & Leucine
  "TTT": { name: "Phenylalanine", short: "Phe", letter: "F", type: "nonpolar" },
  "TTC": { name: "Phenylalanine", short: "Phe", letter: "F", type: "nonpolar" },
  "TTA": { name: "Leucine", short: "Leu", letter: "L", type: "nonpolar" },
  "TTG": { name: "Leucine", short: "Leu", letter: "L", type: "nonpolar" },
  // Leucine
  "CTT": { name: "Leucine", short: "Leu", letter: "L", type: "nonpolar" },
  "CTC": { name: "Leucine", short: "Leu", letter: "L", type: "nonpolar" },
  "CTA": { name: "Leucine", short: "Leu", letter: "L", type: "nonpolar" },
  "CTG": { name: "Leucine", short: "Leu", letter: "L", type: "nonpolar" },
  // Isoleucine & Methionine (Start)
  "ATT": { name: "Isoleucine", short: "Ile", letter: "I", type: "nonpolar" },
  "ATC": { name: "Isoleucine", short: "Ile", letter: "I", type: "nonpolar" },
  "ATA": { name: "Isoleucine", short: "Ile", letter: "I", type: "nonpolar" },
  "ATG": { name: "Methionine", short: "Met", letter: "M", type: "start", isStart: true },
  // Valine
  "GTT": { name: "Valine", short: "Val", letter: "V", type: "nonpolar" },
  "GTC": { name: "Valine", short: "Val", letter: "V", type: "nonpolar" },
  "GTA": { name: "Valine", short: "Val", letter: "V", type: "nonpolar" },
  "GTG": { name: "Valine", short: "Val", letter: "V", type: "nonpolar" },
  // Serine
  "TCT": { name: "Serine", short: "Ser", letter: "S", type: "polar" },
  "TCC": { name: "Serine", short: "Ser", letter: "S", type: "polar" },
  "TCA": { name: "Serine", short: "Ser", letter: "S", type: "polar" },
  "TCG": { name: "Serine", short: "Ser", letter: "S", type: "polar" },
  // Proline
  "CCT": { name: "Proline", short: "Pro", letter: "P", type: "nonpolar" },
  "CCC": { name: "Proline", short: "Pro", letter: "P", type: "nonpolar" },
  "CCA": { name: "Proline", short: "Pro", letter: "P", type: "nonpolar" },
  "CCG": { name: "Proline", short: "Pro", letter: "P", type: "nonpolar" },
  // Threonine
  "ACT": { name: "Threonine", short: "Thr", letter: "T", type: "polar" },
  "ACC": { name: "Threonine", short: "Thr", letter: "T", type: "polar" },
  "ACA": { name: "Threonine", short: "Thr", letter: "T", type: "polar" },
  "ACG": { name: "Threonine", short: "Thr", letter: "T", type: "polar" },
  // Alanine
  "GCT": { name: "Alanine", short: "Ala", letter: "A", type: "nonpolar" },
  "GCC": { name: "Alanine", short: "Ala", letter: "A", type: "nonpolar" },
  "GCA": { name: "Alanine", short: "Ala", letter: "A", type: "nonpolar" },
  "GCG": { name: "Alanine", short: "Ala", letter: "A", type: "nonpolar" },
  // Tyrosine & Stop
  "TAT": { name: "Tyrosine", short: "Tyr", letter: "Y", type: "polar" },
  "TAC": { name: "Tyrosine", short: "Tyr", letter: "Y", type: "polar" },
  "TAA": { name: "Ochre Stop", short: "Stop", letter: "*", type: "stop", isStop: true },
  "TAG": { name: "Amber Stop", short: "Stop", letter: "*", type: "stop", isStop: true },
  // Histidine & Glutamine
  "CAT": { name: "Histidine", short: "His", letter: "H", type: "basic" },
  "CAC": { name: "Histidine", short: "His", letter: "H", type: "basic" },
  "CAA": { name: "Glutamine", short: "Gln", letter: "Q", type: "polar" },
  "CAG": { name: "Glutamine", short: "Gln", letter: "Q", type: "polar" },
  // Asparagine & Lysine
  "AAT": { name: "Asparagine", short: "Asn", letter: "N", type: "polar" },
  "AAC": { name: "Asparagine", short: "Asn", letter: "N", type: "polar" },
  "AAA": { name: "Lysine", short: "Lys", letter: "K", type: "basic" },
  "AAG": { name: "Lysine", short: "Lys", letter: "K", type: "basic" },
  // Aspartic Acid & Glutamic Acid
  "GAT": { name: "Aspartic Acid", short: "Asp", letter: "D", type: "acidic" },
  "GAC": { name: "Aspartic Acid", short: "Asp", letter: "D", type: "acidic" },
  "GAA": { name: "Glutamic Acid", short: "Glu", letter: "E", type: "acidic" },
  "GAG": { name: "Glutamic Acid", short: "Glu", letter: "E", type: "acidic" },
  // Cysteine, Stop & Tryptophan
  "TGT": { name: "Cysteine", short: "Cys", letter: "C", type: "polar" },
  "TGC": { name: "Cysteine", short: "Cys", letter: "C", type: "polar" },
  "TGA": { name: "Opal Stop", short: "Stop", letter: "*", type: "stop", isStop: true },
  "TGG": { name: "Tryptophan", short: "Trp", letter: "W", type: "nonpolar" },
  // Arginine
  "CGT": { name: "Arginine", short: "Arg", letter: "R", type: "basic" },
  "CGC": { name: "Arginine", short: "Arg", letter: "R", type: "basic" },
  "CGA": { name: "Arginine", short: "Arg", letter: "R", type: "basic" },
  "CGG": { name: "Arginine", short: "Arg", letter: "R", type: "basic" },
  // Serine & Arginine
  "AGT": { name: "Serine", short: "Ser", letter: "S", type: "polar" },
  "AGC": { name: "Serine", short: "Ser", letter: "S", type: "polar" },
  "AGA": { name: "Arginine", short: "Arg", letter: "R", type: "basic" },
  "AGG": { name: "Arginine", short: "Arg", letter: "R", type: "basic" },
  // Glycine
  "GGT": { name: "Glycine", short: "Gly", letter: "G", type: "nonpolar" },
  "GGC": { name: "Glycine", short: "Gly", letter: "G", type: "nonpolar" },
  "GGA": { name: "Glycine", short: "Gly", letter: "G", type: "nonpolar" },
  "GGG": { name: "Glycine", short: "Gly", letter: "G", type: "nonpolar" }
};

export const BASE_COLORS = {
  "A": { hex: 0x2ea043, css: "#2ea043", name: "Adenine", comp: "T" },
  "T": { hex: 0xda3633, css: "#da3633", name: "Thymine", comp: "A" },
  "C": { hex: 0x1f6feb, css: "#1f6feb", name: "Cytosine", comp: "G" },
  "G": { hex: 0xd29922, css: "#d29922", name: "Guanine", comp: "C" }
};
