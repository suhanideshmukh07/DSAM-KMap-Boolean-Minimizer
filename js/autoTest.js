// autoTest.js – Automated Testing: edge cases, don't-cares, wrap-around, verification

class AutomatedTester {
  constructor() {
    this.results = [];
  }

  runAllTests() {
    this.results = [];
    this.testEdgeCases();
    this.testDontCareConditions();
    this.testWrapAroundGroupings();
    this.testOutputVerification();
    this.testExpressionParsing();
    this.testTrivialFunctions();
    return this.summarize();
  }

  addResult(category, name, passed, details = '') {
    this.results.push({ category, name, passed, details });
  }

  testEdgeCases() {
    const cat = 'Edge Cases';

    // All minterms
    (() => {
      try {
        const solver = new KMapSolver(3, [0,1,2,3,4,5,6,7], []);
        const res = solver.solve();
        this.addResult(cat, 'All minterms (3-var) → F=1', res.sop === '1', `Got: ${res.sop}`);
      } catch(e) { this.addResult(cat, 'All minterms (3-var)', false, e.message); }
    })();

    // No minterms
    (() => {
      try {
        const solver = new KMapSolver(3, [], []);
        const res = solver.solve();
        this.addResult(cat, 'No minterms (3-var) → F=0', res.sop === '0', `Got: ${res.sop}`);
      } catch(e) { this.addResult(cat, 'No minterms (3-var)', false, e.message); }
    })();

    // Single minterm
    (() => {
      try {
        const solver = new KMapSolver(2, [3], []);
        const res = solver.solve();
        this.addResult(cat, 'Single minterm m(3) 2-var → AB', res.sop === 'AB', `Got: ${res.sop}`);
      } catch(e) { this.addResult(cat, 'Single minterm m(3)', false, e.message); }
    })();

    // 2-variable basic
    (() => {
      try {
        const solver = new KMapSolver(2, [0, 1], []);
        const res = solver.solve();
        this.addResult(cat, '2-var m(0,1) → A\'', res.sop === "A'", `Got: ${res.sop}`);
      } catch(e) { this.addResult(cat, '2-var m(0,1)', false, e.message); }
    })();

    // All dont-cares only (no minterms)
    (() => {
      try {
        const solver = new KMapSolver(2, [], [0,1,2,3]);
        const res = solver.solve();
        this.addResult(cat, 'All don\'t-cares, no minterms → F=0', res.sop === '0', `Got: ${res.sop}`);
      } catch(e) { this.addResult(cat, 'All don\'t-cares only', false, e.message); }
    })();
  }

  testDontCareConditions() {
    const cat = "Don't-Care Conditions";

    // Don't-cares help enlarge groups
    (() => {
      try {
        const solver = new KMapSolver(3, [1, 3, 5, 7], []);
        const res = solver.solve();
        this.addResult(cat, '3-var m(1,3,5,7) → C', res.sop === 'C', `Got: ${res.sop}`);
      } catch(e) { this.addResult(cat, '3-var m(1,3,5,7)', false, e.message); }
    })();

    // With don't-cares expanding a group
    (() => {
      try {
        const solver = new KMapSolver(3, [4, 5], [6, 7]);
        const res = solver.solve();
        // m(4,5) + d(6,7) should give A (covering 4,5,6,7)
        this.addResult(cat, '3-var m(4,5)+d(6,7) → A', res.sop === 'A', `Got: ${res.sop}`);
      } catch(e) { this.addResult(cat, '3-var with don\'t-cares', false, e.message); }
    })();

    // Don't-cares should not create groups alone
    (() => {
      try {
        const solver = new KMapSolver(2, [0], [3]);
        const res = solver.solve();
        // m(0)=A'B', d(3)=AB. These are not adjacent, so can't group.
        // Result should be A'B'
        this.addResult(cat, '2-var m(0)+d(3): don\'t-care not used if non-adjacent', 
          res.sop === "A'B'", `Got: ${res.sop}`);
      } catch(e) { this.addResult(cat, '2-var DC not used', false, e.message); }
    })();

    // K-Map and QM should agree with don't-cares
    (() => {
      try {
        const kmapS = new KMapSolver(4, [1,3,7,11,15], [0,2,5]);
        const kmapRes = kmapS.solve();
        const qmS = new QuineMcCluskey(4, [1,3,7,11,15], [0,2,5]);
        const qmRes = qmS.solve();
        const verif = verifyThreeWay([1,3,7,11,15], [0,2,5], kmapRes.sop, qmRes.sop, 4);
        this.addResult(cat, '4-var with DC: K-Map == QM', verif.isEquivalent, 
          `K-Map: ${kmapRes.sop}, QM: ${qmRes.sop}`);
      } catch(e) { this.addResult(cat, '4-var DC equivalence', false, e.message); }
    })();
  }

  testWrapAroundGroupings() {
    const cat = 'Wrap-Around Groupings';

    // 4-var corners: m(0,2,8,10) = B'D'
    (() => {
      try {
        const solver = new KMapSolver(4, [0, 2, 8, 10], []);
        const res = solver.solve();
        this.addResult(cat, '4-var corners m(0,2,8,10) → B\'D\'', 
          res.sop === "B'D'", `Got: ${res.sop}`);
      } catch(e) { this.addResult(cat, '4-var corners', false, e.message); }
    })();

    // 4-var top-bottom wrap: m(0,1,8,9) = B'C'
    (() => {
      try {
        const solver = new KMapSolver(4, [0, 1, 8, 9], []);
        const res = solver.solve();
        this.addResult(cat, '4-var top-bottom m(0,1,8,9) → B\'C\'', 
          res.sop === "B'C'", `Got: ${res.sop}`);
      } catch(e) { this.addResult(cat, '4-var top-bottom', false, e.message); }
    })();

    // 3-var left-right wrap: m(0, 2) = A'C' (wraps on 3-var map)
    (() => {
      try {
        const solver = new KMapSolver(3, [0, 2], []);
        const res = solver.solve();
        this.addResult(cat, '3-var left-right m(0,2) → A\'C\'', 
          res.sop === "A'C'", `Got: ${res.sop}`);
      } catch(e) { this.addResult(cat, '3-var left-right', false, e.message); }
    })();
  }

  testOutputVerification() {
    const cat = 'Output Verification';

    // Verify truth table matches for various inputs
    const testCases = [
      { vars: 3, minterms: [1,3,5,7], dc: [], expectedSOP: 'C' },
      { vars: 4, minterms: [0,2,8,10], dc: [], expectedSOP: "B'D'" },
      { vars: 2, minterms: [0,1,2,3], dc: [], expectedSOP: '1' },
      { vars: 2, minterms: [], dc: [], expectedSOP: '0' },
    ];

    testCases.forEach((tc, i) => {
      try {
        const solver = new KMapSolver(tc.vars, tc.minterms, tc.dc);
        const res = solver.solve();
        // Verify every minterm evaluates to 1 and every non-minterm/non-DC evaluates to 0
        const vars = getVarNames(tc.vars);
        const total = 1 << tc.vars;
        const mintermSet = new Set(tc.minterms);
        const dcSet = new Set(tc.dc);
        let allCorrect = true;

        for (let j = 0; j < total; j++) {
          const bin = toBinary(j, tc.vars);
          const varValues = {};
          vars.forEach((v, idx) => varValues[v] = bin[idx] === '1');
          const result = evaluateExpression(res.sop, varValues) ? 1 : 0;
          
          if (mintermSet.has(j) && result !== 1) { allCorrect = false; break; }
          if (!mintermSet.has(j) && !dcSet.has(j) && result !== 0) { allCorrect = false; break; }
        }

        this.addResult(cat, `Truth table verify: ${tc.vars}-var m(${tc.minterms.join(',') || 'none'})`,
          allCorrect, `SOP: ${res.sop}`);
      } catch(e) {
        this.addResult(cat, `Truth table verify case ${i}`, false, e.message);
      }
    });
  }

  testExpressionParsing() {
    const cat = 'Expression Parsing';

    // Valid expressions
    const validExprs = [
      { expr: "A'B + C", vars: 3, desc: 'SOP with complement' },
      { expr: '(A+B)(C+D)', vars: 4, desc: 'POS expression' },
      { expr: '!A & B | C', vars: 3, desc: 'Prefix NOT and operators' },
      { expr: 'AB', vars: 2, desc: 'Implicit AND' },
    ];

    validExprs.forEach(tc => {
      const res = validateBooleanExpression(tc.expr, tc.vars);
      this.addResult(cat, `Valid: "${tc.expr}" (${tc.desc})`, res.valid, res.error || 'OK');
    });

    // Invalid expressions
    const invalidExprs = [
      { expr: 'A + + B', vars: 2, desc: 'Double operator' },
      { expr: 'E + A', vars: 4, desc: 'Variable out of range' },
      { expr: '', vars: 2, desc: 'Empty expression' },
    ];

    invalidExprs.forEach(tc => {
      const res = validateBooleanExpression(tc.expr, tc.vars);
      this.addResult(cat, `Invalid: "${tc.expr}" (${tc.desc})`, !res.valid, res.error || 'No error returned');
    });
  }

  testTrivialFunctions() {
    const cat = 'Trivial Functions';

    // Constant 0
    (() => {
      try {
        const qm = new QuineMcCluskey(3, [], []);
        const res = qm.solve();
        this.addResult(cat, 'QM: no minterms → SOP=0', res.sop === '0', `Got: ${res.sop}`);
      } catch(e) { this.addResult(cat, 'QM empty', false, e.message); }
    })();

    // Constant 1
    (() => {
      try {
        const qm = new QuineMcCluskey(2, [0,1,2,3], []);
        const res = qm.solve();
        this.addResult(cat, 'QM: all minterms 2-var → SOP=1', res.sop === '1', `Got: ${res.sop}`);
      } catch(e) { this.addResult(cat, 'QM all minterms', false, e.message); }
    })();

    // K-Map and QM agree
    (() => {
      try {
        const minterms = [0,1,2,5,7,8,9,10,13,15];
        const km = new KMapSolver(4, minterms, []);
        const qm = new QuineMcCluskey(4, minterms, []);
        const kmRes = km.solve();
        const qmRes = qm.solve();
        const verif = verifyThreeWay(minterms, [], kmRes.sop, qmRes.sop, 4);
        this.addResult(cat, 'Complex 4-var: K-Map == QM equivalence', 
          verif.isEquivalent, `K-Map: ${kmRes.sop}, QM: ${qmRes.sop}`);
      } catch(e) { this.addResult(cat, 'K-Map QM equivalence', false, e.message); }
    })();
  }

  summarize() {
    const total = this.results.length;
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const categories = {};
    this.results.forEach(r => {
      if (!categories[r.category]) categories[r.category] = { passed: 0, failed: 0, tests: [] };
      categories[r.category].tests.push(r);
      if (r.passed) categories[r.category].passed++;
      else categories[r.category].failed++;
    });

    return {
      total,
      passed,
      failed,
      passRate: total > 0 ? ((passed / total) * 100).toFixed(1) : 0,
      categories,
      allPassed: failed === 0,
      results: this.results
    };
  }
}
