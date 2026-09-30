/**
 * Biological Benchmark Presets for Automata-based DNA Analysis
 * Real-world genomic sequences demonstrating exact patterns and point mutations.
 */

export const DNA_PRESETS = [
  {
    id: "sickle_cell_normal",
    name: "Sickle Cell Normal (HBB Wild-Type)",
    description: "Human beta-globin gene segment encoding normal Hemoglobin A. Contains 'GAG' codon (Glutamic acid) at position 6.",
    sequence: "ATGGTGCACCTGACTCCTGAGGAGAAGTCTGCCGTTACTGCCCTGTGGGGCAAGGTGAACGTGGATGAAGTTGGTGGTGAGGCCCTGGGCAGGCTGCTGGTTGTCTACCCTTGGACCCAGAGGTTCTTTGAGTCCTTTGGGGATCTGTCCACTCCTGATGCTGTTATGGGCAACCCTAAGGTGAAGGCTCATGGCAAGAAAGTGCTCGGTGCCTTTAGTGATGGCCTGGCTCACCTGGACAACCTCAAGGGCACCTTTGCCACACTGAGTGAGCTGCACTGTGACAAGCTGCACGTGGATCCTGAGAACTTCAGGCTCCTGGGCAACGTGCTGGTCTGTGTGCTGGCCCATCACTTTGGCAAAGAATTCACCCCACCAGTGCAGGCTGCCTATCAGAAAGTGGTGGCTGGTGTGGCTAATGCCCTGGCCCACAAGTATCACTAA",
    reference: "ATGGTGCACCTGACTCCTGAGGAGAAGTCTGCCGTTACTGCCCTGTGGGGCAAGGTGAACGTGGATGAAGTTGGTGGTGAGGCCCTGGGCAGG",
    targetMotif: "CCTGAGGAG", // Normal allele signature with GAG
    expectedType: "Wild-Type (HbA)",
    mutationPos: null
  },
  {
    id: "sickle_cell_mutant",
    name: "Sickle Cell Anemia (HBB Point Mutation)",
    description: "Human beta-globin with A->T transversion at codon 6 (GAG -> GTG), replacing Glutamic acid with Valine (HbS).",
    sequence: "ATGGTGCACCTGACTCCTGTGGAGAAGTCTGCCGTTACTGCCCTGTGGGGCAAGGTGAACGTGGATGAAGTTGGTGGTGAGGCCCTGGGCAGGCTGCTGGTTGTCTACCCTTGGACCCAGAGGTTCTTTGAGTCCTTTGGGGATCTGTCCACTCCTGATGCTGTTATGGGCAACCCTAAGGTGAAGGCTCATGGCAAGAAAGTGCTCGGTGCCTTTAGTGATGGCCTGGCTCACCTGGACAACCTCAAGGGCACCTTTGCCACACTGAGTGAGCTGCACTGTGACAAGCTGCACGTGGATCCTGAGAACTTCAGGCTCCTGGGCAACGTGCTGGTCTGTGTGCTGGCCCATCACTTTGGCAAAGAATTCACCCCACCAGTGCAGGCTGCCTATCAGAAAGTGGTGGCTGGTGTGGCTAATGCCCTGGCCCACAAGTATCACTAA",
    reference: "ATGGTGCACCTGACTCCTGAGGAGAAGTCTGCCGTTACTGCCCTGTGGGGCAAGGTGAACGTGGATGAAGTTGGTGGTGAGGCCCTGGGCAGG",
    targetMotif: "CCTGTGGAG", // Mutant allele signature with GTG
    expectedType: "Pathogenic SNP (HbS)",
    mutationPos: 20 // 0-indexed position: A -> T at index 20
  },
  {
    id: "ecori_restriction",
    name: "EcoRI Restriction Cleavage Sequence",
    description: "Palindromic recognition sequence (5'-GAATTC-3') where the EcoRI endonuclease cuts double-stranded DNA.",
    sequence: "ACGTGGATGAAGTTGGTGGTGAGGCCCTGGGCAGGCTGCTGGTTGTCTACCCTTGGACCCAGAGGTTCTTTGAGTCCTTTGGGGATCTGTCCACTCCTGATGCTGTTATGGGCAACCCTAAGGTGAAGGCTCATGGCAAGAAAGTGCTCGGTGCCTTTAGTGATGGCCTGGCTCACCTGGACAACCTCAAGGGCACCTTTGCCACACTGAGTGAGCTGCACTGTGACAAGCTGCACGTGGATCCTGAGAACTTCAGGCTCCTGGGCAACGTGCTGGTCTGTGTGCTGGCCCATCACTTTGGCAAAGAATTCACCCCACCAGTGCAGGCTGCCTATCAGAAAGTGGTGGCTGGTGTG",
    targetMotif: "GAATTC",
    expectedType: "Restriction Enzyme Site (EcoRI)",
    mutationPos: null
  },
  {
    id: "sars_cov2_spike_snippet",
    name: "SARS-CoV-2 Spike Receptor Binding Motif",
    description: "Coding region of the Spike glycoprotein receptor-binding domain containing start codon and critical recognition motifs.",
    sequence: "ATGTTCGTCTTTTGCGTTCTTGCTGCCATAACATCTGTTTACGCTGACACTTGTTTTCACAGTAACCCTAATTTTTCTGACTATACTAACGTCACAGATGTTAACACATGTGGTCCTGAGCAGCTGTCTTGTAGTCTGGCTAATAAGTACTCTGCTTGTCTACCGTTTTCACTTGCTTCCTAG",
    targetMotif: "ATG",
    expectedType: "Viral ORF",
    mutationPos: null
  },
  {
    id: "huntington_cag_repeats",
    name: "Huntington's Disease (CAG Trinucleotide Repeats)",
    description: "HTT gene polyglutamine tract. Normal individuals have <35 repeats; >40 repeats leads to Huntington's neurodegeneration.",
    sequence: "ATGGCGACCCTGGAAAAGCTGATGAAGGCCTTCGAGTCCCTCAAGTCCTTCCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAACAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAACAGCCGCCACCGCCGCCGCCGCCGCCGCCTCCTCAGCTTCCTCAGCCGCCGCCGCAGGCACAGCCGCTGCTGCCTCAGCCGCAGCCGCCCCCGCCGCCGCCCCCGCCGCCACCCGGCCCGGCTGTGGCTGAGGAGCCGCTGCACCGACCGTGATGA",
    targetMotif: "CAGCAGCAG",
    expectedType: "Tandem Repeat Expansion",
    mutationPos: null
  }
];

export const GENETIC_CODE = {
  // Phenylalanine & Leucine
  "TTT": "Phe (F)", "TTC": "Phe (F)", "TTA": "Leu (L)", "TTG": "Leu (L)",
  // Leucine
  "CTT": "Leu (L)", "CTC": "Leu (L)", "CTA": "Leu (L)", "CTG": "Leu (L)",
  // Isoleucine & Start (Methionine)
  "ATT": "Ile (I)", "ATC": "Ile (I)", "ATA": "Ile (I)", "ATG": "Met (M) [START]",
  // Valine
  "GTT": "Val (V)", "GTC": "Val (V)", "GTA": "Val (V)", "GTG": "Val (V)",
  // Serine
  "TCT": "Ser (S)", "TCC": "Ser (S)", "TCA": "Ser (S)", "TCG": "Ser (S)",
  // Proline
  "CCT": "Pro (P)", "CCC": "Pro (P)", "CCA": "Pro (P)", "CCG": "Pro (P)",
  // Threonine
  "ACT": "Thr (T)", "ACC": "Thr (T)", "ACA": "Thr (T)", "ACG": "Thr (T)",
  // Alanine
  "GCT": "Ala (A)", "GCC": "Ala (A)", "GCA": "Ala (A)", "GCG": "Ala (A)",
  // Tyrosine & Stop
  "TAT": "Tyr (Y)", "TAC": "Tyr (Y)", "TAA": "[STOP]", "TAG": "[STOP]",
  // Histidine & Glutamine
  "CAT": "His (H)", "CAC": "His (H)", "CAA": "Gln (Q)", "CAG": "Gln (Q)",
  // Asparagine & Lysine
  "AAT": "Asn (N)", "AAC": "Asn (N)", "AAA": "Lys (K)", "AAG": "Lys (K)",
  // Aspartic Acid & Glutamic Acid
  "GAT": "Asp (D)", "GAC": "Asp (D)", "GAA": "Glu (E)", "GAG": "Glu (E)",
  // Cysteine, Stop & Tryptophan
  "TGT": "Cys (C)", "TGC": "Cys (C)", "TGA": "[STOP]", "TGG": "Trp (W)",
  // Arginine
  "CGT": "Arg (R)", "CGC": "Arg (R)", "CGA": "Arg (R)", "CGG": "Arg (R)",
  // Serine & Arginine
  "AGT": "Ser (S)", "AGC": "Ser (S)", "AGA": "Arg (R)", "AGG": "Arg (R)",
  // Glycine
  "GGT": "Gly (G)", "GGC": "Gly (G)", "GGA": "Gly (G)", "GGG": "Gly (G)"
};

export const BASE_COLORS = {
  "A": { hex: 0x2ea043, css: "#2ea043", name: "Adenine", comp: "T" },
  "T": { hex: 0xda3633, css: "#da3633", name: "Thymine", comp: "A" },
  "C": { hex: 0x1f6feb, css: "#1f6feb", name: "Cytosine", comp: "G" },
  "G": { hex: 0xd29922, css: "#d29922", name: "Guanine", comp: "C" }
};
