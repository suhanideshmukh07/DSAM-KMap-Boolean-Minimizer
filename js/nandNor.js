// nandNor.js – NAND-only and NOR-only circuit conversion

class NANDNORConverter {
  constructor(sopExpr, posExpr, numVars) {
    this.sopExpr = sopExpr;
    this.posExpr = posExpr;
    this.numVars = numVars;
  }

  /**
   * Convert SOP to NAND-only implementation.
   * SOP: F = AB + CD becomes F = ((AB)' · (CD)')' using double inversion
   * In NAND: F = NAND(NAND(A,B), NAND(C,D))
   * Complemented inputs use single-input NAND (inverter).
   */
  toNAND() {
    if (!this.sopExpr || this.sopExpr === '0' || this.sopExpr === '1') {
      return { expr: this.sopExpr, gates: 0, levels: 0, description: 'Constant output, no gates needed.' };
    }

    const terms = this.sopExpr.split('+').map(t => t.trim()).filter(Boolean);
    const nandTerms = [];
    let totalGates = 0;
    const invertedVars = new Set();

    terms.forEach(term => {
      const literals = term.match(/[A-D]'?/g) || [];
      literals.forEach(lit => {
        if (lit.endsWith("'")) invertedVars.add(lit[0]);
      });

      if (literals.length === 1) {
        // Single literal: just the input (or NAND inverter for complement)
        nandTerms.push(`NAND(${literals[0].replace("'", '')}, ${literals[0].replace("'", '')})`);
        if (!literals[0].endsWith("'")) {
          // Need double inversion to preserve: NAND(NAND(x,x)) 
          nandTerms[nandTerms.length - 1] = literals[0]; // pass through
        }
        totalGates += literals[0].endsWith("'") ? 1 : 0;
      } else {
        // Multi-literal: NAND of all inputs (with inverters for non-complemented in SOP->NAND)
        // SOP AND gate -> first level NAND
        const inputs = literals.map(lit => {
          if (lit.endsWith("'")) {
            return `NAND(${lit[0]},${lit[0]})`; // Inverter
          }
          return lit;
        });
        nandTerms.push(`NAND(${inputs.join(', ')})`);
        totalGates++;
      }
    });

    totalGates += invertedVars.size; // Inverter NANDs

    let finalExpr;
    if (nandTerms.length === 1) {
      finalExpr = nandTerms[0];
    } else {
      finalExpr = `NAND(${nandTerms.join(', ')})`;
      totalGates++; // Final OR-equivalent NAND
    }

    return {
      expr: finalExpr,
      gates: totalGates,
      levels: terms.length > 1 ? 3 : 2,
      description: `SOP → NAND-only: ${terms.length} first-level NAND gates${terms.length > 1 ? ' + 1 second-level NAND gate' : ''} + ${invertedVars.size} inverters.`,
      structure: {
        type: 'NAND-NAND',
        firstLevel: terms.map(t => ({ gate: 'NAND', inputs: (t.match(/[A-D]'?/g) || []) })),
        secondLevel: terms.length > 1 ? { gate: 'NAND', inputs: terms.length } : null,
        inverters: Array.from(invertedVars)
      }
    };
  }

  /**
   * Convert POS to NOR-only implementation.
   * POS: F = (A+B)(C+D) becomes F = ((A+B)' + (C+D)')' using double inversion
   * In NOR: F = NOR(NOR(A,B), NOR(C,D))
   */
  toNOR() {
    if (!this.posExpr || this.posExpr === '0' || this.posExpr === '1') {
      return { expr: this.posExpr, gates: 0, levels: 0, description: 'Constant output, no gates needed.' };
    }

    const factors = this.posExpr.match(/\([^)]+\)/g) || [this.posExpr];
    const norTerms = [];
    let totalGates = 0;
    const invertedVars = new Set();

    factors.forEach(factor => {
      const clean = factor.replace(/[()]/g, '');
      const literals = clean.split('+').map(t => t.trim()).filter(Boolean);
      const allLits = [];
      literals.forEach(lit => {
        const vars = lit.match(/[A-D]'?/g) || [lit];
        vars.forEach(v => {
          allLits.push(v);
          if (v.endsWith("'")) invertedVars.add(v[0]);
        });
      });

      if (allLits.length === 1) {
        norTerms.push(allLits[0].endsWith("'") ? allLits[0][0] : `NOR(${allLits[0]},${allLits[0]})`);
        if (!allLits[0].endsWith("'")) totalGates++;
      } else {
        const inputs = allLits.map(lit => {
          if (lit.endsWith("'")) {
            return `NOR(${lit[0]},${lit[0]})`;
          }
          return lit;
        });
        norTerms.push(`NOR(${inputs.join(', ')})`);
        totalGates++;
      }
    });

    totalGates += invertedVars.size;

    let finalExpr;
    if (norTerms.length === 1) {
      finalExpr = norTerms[0];
    } else {
      finalExpr = `NOR(${norTerms.join(', ')})`;
      totalGates++;
    }

    return {
      expr: finalExpr,
      gates: totalGates,
      levels: factors.length > 1 ? 3 : 2,
      description: `POS → NOR-only: ${factors.length} first-level NOR gates${factors.length > 1 ? ' + 1 second-level NOR gate' : ''} + ${invertedVars.size} inverters.`,
      structure: {
        type: 'NOR-NOR',
        firstLevel: factors.map(f => {
          const clean = f.replace(/[()]/g, '');
          return { gate: 'NOR', inputs: clean.split('+').map(t => t.trim()).filter(Boolean) };
        }),
        secondLevel: factors.length > 1 ? { gate: 'NOR', inputs: factors.length } : null,
        inverters: Array.from(invertedVars)
      }
    };
  }
}
