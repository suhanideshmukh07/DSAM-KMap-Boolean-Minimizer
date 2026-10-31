// complexity.js – Algorithm Complexity Analyzer: K-Map vs Quine-McCluskey

class ComplexityAnalyzer {
  constructor(numVars, minterms, dontCares) {
    this.numVars = numVars;
    this.minterms = minterms;
    this.dontCares = dontCares;
    this.totalTerms = minterms.length + dontCares.length;
  }

  analyzeKMap() {
    const n = this.numVars;
    const totalCells = 1 << n;
    const start = performance.now();
    
    // Run K-Map solver and count operations
    const solver = new KMapSolver(n, this.minterms, this.dontCares);
    const result = solver.solve();
    
    const elapsed = performance.now() - start;

    // Count operations
    const numRows = n <= 2 ? 2 : (n <= 3 ? 2 : 4);
    const numCols = n <= 2 ? 2 : 4;
    const cellComparisons = totalCells; // Reading all cells
    // Group enumeration: for each possible (height, width, startRow, startCol)
    const heights = [1, 2, 4].filter(h => h <= numRows);
    const widths = [1, 2, 4].filter(w => w <= numCols);
    let groupEnumerations = 0;
    heights.forEach(h => {
      widths.forEach(w => {
        if ((h * w & (h * w - 1)) === 0) {
          groupEnumerations += numRows * numCols; // Each starting position
        }
      });
    });

    // Set cover is exponential in worst case
    const primeGroupCount = result.primeGroups ? result.primeGroups.length : 0;
    const setCoverOps = Math.min(Math.pow(2, primeGroupCount), 1000000);

    return {
      method: 'K-Map',
      executionTimeMs: elapsed,
      operations: {
        cellReads: cellComparisons,
        groupEnumerations: groupEnumerations,
        cellChecksPerGroup: 'O(h × w) per group candidate',
        setCoverOps: setCoverOps,
        total: cellComparisons + groupEnumerations + setCoverOps
      },
      complexity: {
        groupFinding: `O(${numRows} × ${numCols} × H × W × cells)`,
        setCover: `O(2^${primeGroupCount}) worst case`,
        overall: `Practical for n ≤ 4 variables`,
        theoretical: 'Exponential in number of prime implicants'
      },
      result: result
    };
  }

  analyzeQM() {
    const n = this.numVars;
    const start = performance.now();
    
    const solver = new QuineMcCluskey(n, this.minterms, this.dontCares);
    const result = solver.solve();
    
    const elapsed = performance.now() - start;

    // Count operations
    const allTerms = this.totalTerms;
    // Round 1: Compare all pairs of adjacent-weight groups
    // Each round: O(terms^2) comparisons per weight pair
    let pairComparisons = 0;
    const rounds = result.steps ? result.steps.length : 0;
    const combinationCount = result.combinationLogs ? result.combinationLogs.length : 0;
    
    // Each combination requires n-bit comparison
    pairComparisons = combinationCount * n;

    // PI chart construction: O(PIs × minterms)
    const piCount = result.primeImplicants ? result.primeImplicants.length : 0;
    const chartOps = piCount * this.minterms.length;

    // Essential PI identification: O(minterms × PIs)
    const essentialOps = this.minterms.length * piCount;

    // Branch-and-bound cover: exponential worst case
    const coverOps = Math.min(Math.pow(2, piCount), 1000000);

    return {
      method: 'Quine-McCluskey',
      executionTimeMs: elapsed,
      operations: {
        initialGrouping: allTerms,
        pairComparisons: pairComparisons,
        combinationsFound: combinationCount,
        rounds: rounds,
        chartConstruction: chartOps,
        essentialIdentification: essentialOps,
        setCoverOps: coverOps,
        total: allTerms + pairComparisons + chartOps + essentialOps + coverOps
      },
      complexity: {
        tabularReduction: `O(3^n / n) theoretical, ${rounds} rounds observed`,
        piChart: `O(${piCount} × ${this.minterms.length})`,
        setCover: `O(2^${piCount}) worst case`,
        overall: `Systematic, scalable to n > 4 variables`,
        theoretical: 'O(3^n/n) for prime implicant generation'
      },
      result: result
    };
  }

  compare() {
    const kmapAnalysis = this.analyzeKMap();
    const qmAnalysis = this.analyzeQM();

    const speedup = qmAnalysis.executionTimeMs > 0 
      ? (qmAnalysis.executionTimeMs / Math.max(kmapAnalysis.executionTimeMs, 0.001)).toFixed(2)
      : 'N/A';

    return {
      kmap: kmapAnalysis,
      qm: qmAnalysis,
      comparison: {
        fasterMethod: kmapAnalysis.executionTimeMs <= qmAnalysis.executionTimeMs ? 'K-Map' : 'Quine-McCluskey',
        speedRatio: speedup,
        totalOpsKMap: kmapAnalysis.operations.total,
        totalOpsQM: qmAnalysis.operations.total,
        fewerOpsMethod: kmapAnalysis.operations.total <= qmAnalysis.operations.total ? 'K-Map' : 'Quine-McCluskey',
        equivalentResults: kmapAnalysis.result.sop === qmAnalysis.result.sop
      },
      summary: `For ${this.numVars} variables with ${this.minterms.length} minterms: ` +
        `K-Map took ${kmapAnalysis.executionTimeMs.toFixed(3)}ms (${kmapAnalysis.operations.total} ops), ` +
        `QM took ${qmAnalysis.executionTimeMs.toFixed(3)}ms (${qmAnalysis.operations.total} ops).`
    };
  }
}
