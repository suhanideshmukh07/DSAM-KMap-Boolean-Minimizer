// report.js – Generate downloadable solution report

class ReportGenerator {
  constructor() {}

  generate(data) {
    const {
      numVars, minterms, dontCares,
      kmapResult, qmResult, verifResult,
      sopPosComparison, complexityData
    } = data;

    const vars = getVarNames(numVars);
    const timestamp = new Date().toLocaleString();
    let report = '';

    // Header
    report += '═══════════════════════════════════════════════════════════════\n';
    report += '             BOOLEAN LOGIC MINIMIZATION REPORT                \n';
    report += '     K-Map + Quine-McCluskey Boolean Function Analysis        \n';
    report += '═══════════════════════════════════════════════════════════════\n';
    report += `Generated: ${timestamp}\n\n`;

    // Input Specification
    report += '───────────────────────────────────────────────────────────────\n';
    report += ' 1. INPUT SPECIFICATION\n';
    report += '───────────────────────────────────────────────────────────────\n';
    report += `  Variables:    ${vars.join(', ')} (${numVars} variables)\n`;
    report += `  Minterms:     Σm(${minterms.join(', ') || 'none'})\n`;
    report += `  Don't-Cares:  d(${dontCares.join(', ') || 'none'})\n`;
    report += `  Total cells:  ${1 << numVars}\n\n`;

    // Truth Table
    report += '───────────────────────────────────────────────────────────────\n';
    report += ' 2. TRUTH TABLE\n';
    report += '───────────────────────────────────────────────────────────────\n';
    const mintermSet = new Set(minterms);
    const dcSet = new Set(dontCares);
    const total = 1 << numVars;

    report += '  m# | ' + vars.join(' ') + ' | F\n';
    report += '  ---+-' + vars.map(() => '-').join('-') + '-+---\n';
    for (let i = 0; i < total; i++) {
      const bin = toBinary(i, numVars);
      let fVal = '0';
      if (mintermSet.has(i)) fVal = '1';
      else if (dcSet.has(i)) fVal = 'X';
      report += `  ${String(i).padStart(2)} | ${bin.split('').join(' ')} | ${fVal}\n`;
    }
    report += '\n';

    // K-Map Result
    report += '───────────────────────────────────────────────────────────────\n';
    report += ' 3. K-MAP MINIMIZATION\n';
    report += '───────────────────────────────────────────────────────────────\n';
    report += `  SOP: F = ${kmapResult.sop}\n`;
    report += `  POS: F = ${kmapResult.pos}\n`;
    if (kmapResult.groups) {
      report += `  Groups used: ${kmapResult.groups.length}\n`;
      kmapResult.groups.forEach((g, i) => {
        const solver = new KMapSolver(numVars, minterms, dontCares);
        const expl = solver.getGroupExplanation(g, false);
        report += `    Group ${i+1}: ${expl.term} (${expl.typeName}, cells: m(${expl.indices.join(',')}))\n`;
      });
    }
    report += '\n';

    // QM Result
    report += '───────────────────────────────────────────────────────────────\n';
    report += ' 4. QUINE-McCLUSKEY TABULAR METHOD\n';
    report += '───────────────────────────────────────────────────────────────\n';
    report += `  SOP: F = ${qmResult.sop}\n`;
    report += `  POS: F = ${qmResult.pos}\n`;
    if (qmResult.primeImplicants) {
      report += `  Prime Implicants: ${qmResult.primeImplicants.length}\n`;
      qmResult.primeImplicants.forEach((pi, i) => {
        const expr = termToExpression(pi.term, vars, false);
        const isEssential = qmResult.essentialPIs && qmResult.essentialPIs.some(e => e.term === pi.term);
        report += `    PI ${i+1}: ${pi.term} → ${expr} [m(${pi.minterms.join(',')})]${isEssential ? ' ★ ESSENTIAL' : ''}\n`;
      });
    }
    if (qmResult.combinationLogs && qmResult.combinationLogs.length > 0) {
      report += `  Combination Steps: ${qmResult.combinationLogs.length}\n`;
      qmResult.combinationLogs.forEach(c => {
        report += `    R${c.round}: ${c.term1} + ${c.term2} → ${c.result} (eliminated ${c.eliminatedVar})\n`;
      });
    }
    report += '\n';

    // Verification
    report += '───────────────────────────────────────────────────────────────\n';
    report += ' 5. VERIFICATION\n';
    report += '───────────────────────────────────────────────────────────────\n';
    if (verifResult) {
      report += `  Original ≡ K-Map:    ${verifResult.origEqualsKmap ? 'PASS ✓' : 'FAIL ✗'}\n`;
      report += `  Original ≡ QM:       ${verifResult.origEqualsQm ? 'PASS ✓' : 'FAIL ✗'}\n`;
      report += `  K-Map ≡ QM:          ${verifResult.kmapEqualsQm ? 'PASS ✓' : 'FAIL ✗'}\n`;
      report += `  All Equivalent:      ${verifResult.allThreeEquivalent ? 'YES ✓' : 'NO ✗'}\n`;
    }
    report += '\n';

    // SOP vs POS Comparison
    if (sopPosComparison) {
      report += '───────────────────────────────────────────────────────────────\n';
      report += ' 6. SOP vs POS COMPARISON\n';
      report += '───────────────────────────────────────────────────────────────\n';
      report += `  SOP: ${sopPosComparison.sop.expr}\n`;
      report += `    Terms: ${sopPosComparison.sop.metrics.terms}, Literals: ${sopPosComparison.sop.metrics.literals}\n`;
      report += `    Gates: AND=${sopPosComparison.sop.gates.andGates} OR=${sopPosComparison.sop.gates.orGates} NOT=${sopPosComparison.sop.gates.notGates} Total=${sopPosComparison.sop.totalGates}\n`;
      report += `  POS: ${sopPosComparison.pos.expr}\n`;
      report += `    Terms: ${sopPosComparison.pos.metrics.terms}, Literals: ${sopPosComparison.pos.metrics.literals}\n`;
      report += `    Gates: AND=${sopPosComparison.pos.gates.andGates} OR=${sopPosComparison.pos.gates.orGates} NOT=${sopPosComparison.pos.gates.notGates} Total=${sopPosComparison.pos.totalGates}\n`;
      report += `  Recommendation: ${sopPosComparison.recommendation} (${sopPosComparison.reason})\n`;
      report += '\n';
    }

    // Complexity
    if (complexityData) {
      report += '───────────────────────────────────────────────────────────────\n';
      report += ' 7. ALGORITHM COMPLEXITY COMPARISON\n';
      report += '───────────────────────────────────────────────────────────────\n';
      report += `  ${complexityData.summary}\n`;
      report += `  Faster method: ${complexityData.comparison.fasterMethod}\n`;
      report += `  Results equivalent: ${complexityData.comparison.equivalentResults ? 'Yes' : 'No'}\n`;
      report += '\n';
    }

    report += '═══════════════════════════════════════════════════════════════\n';
    report += '                        END OF REPORT                         \n';
    report += '═══════════════════════════════════════════════════════════════\n';

    return report;
  }

  download(reportText, filename = 'boolean_minimization_report.txt') {
    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
