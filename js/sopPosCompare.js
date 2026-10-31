// sopPosCompare.js – SOP vs POS comparison with gate estimation and recommendation

class SOPPOSComparer {
  constructor(sopExpr, posExpr, numVars) {
    this.sopExpr = sopExpr;
    this.posExpr = posExpr;
    this.numVars = numVars;
  }

  analyze() {
    const sopMetrics = this.analyzeForm(this.sopExpr, false);
    const posMetrics = this.analyzeForm(this.posExpr, true);

    const sopGates = this.estimateGates(this.sopExpr, false);
    const posGates = this.estimateGates(this.posExpr, true);

    const sopTotal = sopGates.andGates + sopGates.orGates + sopGates.notGates;
    const posTotal = posGates.andGates + posGates.orGates + posGates.notGates;

    let recommendation = 'equal';
    let reason = 'Both forms have equal complexity.';

    if (sopTotal < posTotal) {
      recommendation = 'SOP';
      reason = `SOP requires ${posTotal - sopTotal} fewer gate(s) (${sopTotal} vs ${posTotal}).`;
    } else if (posTotal < sopTotal) {
      recommendation = 'POS';
      reason = `POS requires ${sopTotal - posTotal} fewer gate(s) (${posTotal} vs ${sopTotal}).`;
    } else if (sopMetrics.literals < posMetrics.literals) {
      recommendation = 'SOP';
      reason = `Equal gates, but SOP has fewer literals (${sopMetrics.literals} vs ${posMetrics.literals}).`;
    } else if (posMetrics.literals < sopMetrics.literals) {
      recommendation = 'POS';
      reason = `Equal gates, but POS has fewer literals (${posMetrics.literals} vs ${sopMetrics.literals}).`;
    }

    return {
      sop: { expr: this.sopExpr, metrics: sopMetrics, gates: sopGates, totalGates: sopTotal },
      pos: { expr: this.posExpr, metrics: posMetrics, gates: posGates, totalGates: posTotal },
      recommendation,
      reason
    };
  }

  analyzeForm(expr, isPOS) {
    return getExpressionMetrics(expr, isPOS);
  }

  estimateGates(expr, isPOS) {
    if (!expr || expr === '0' || expr === '1') {
      return { andGates: 0, orGates: 0, notGates: 0 };
    }

    const invertedVars = new Set();

    if (!isPOS) {
      // SOP: terms joined by +, each term is AND of literals
      const terms = expr.split('+').map(t => t.trim()).filter(Boolean);
      let andGates = 0;
      terms.forEach(t => {
        const literals = t.match(/[A-D]'?/g) || [];
        if (literals.length > 1) andGates++;
        literals.forEach(lit => {
          if (lit.endsWith("'")) invertedVars.add(lit[0]);
        });
      });
      const orGates = terms.length > 1 ? 1 : 0;
      return { andGates, orGates, notGates: invertedVars.size };
    } else {
      // POS: factors are (A+B)(C+D), each factor is OR of literals
      const factors = expr.match(/\([^)]+\)/g) || [expr];
      let orGates = 0;
      factors.forEach(f => {
        const clean = f.replace(/[()]/g, '');
        const literals = clean.split('+').map(t => t.trim()).filter(Boolean);
        if (literals.length > 1) orGates++;
        literals.forEach(lit => {
          const vars = lit.match(/[A-D]'?/g) || [];
          vars.forEach(v => {
            if (v.endsWith("'")) invertedVars.add(v[0]);
          });
        });
      });
      const andGates = factors.length > 1 ? 1 : 0;
      return { andGates, orGates, notGates: invertedVars.size };
    }
  }
}
