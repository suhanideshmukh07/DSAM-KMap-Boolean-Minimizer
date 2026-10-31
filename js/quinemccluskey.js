// quinemccluskey.js – Exact Quine-McCluskey & Petrick's / Essential Prime Implicant reduction with POS & SOP

class QuineMcCluskey {
  constructor(numVars, minterms, dontCares) {
    this.numVars = numVars;
    this.minterms = Array.from(new Set(minterms)).sort((a,b)=>a-b);
    this.dontCares = Array.from(new Set(dontCares)).sort((a,b)=>a-b);
    this.allTerms = Array.from(new Set([...this.minterms, ...this.dontCares])).sort((a,b)=>a-b);
    this.steps = [];
    this.primeImplicants = [];
    this.essentialPrimeImplicants = [];
    this.detailedSteps = [];
  }

  /**
   * Checks if two binary terms differ by exactly one bit.
   * Returns merged term with '-' at the differing position, or null.
   */
  combineTerms(term1, term2) {
    let diffCount = 0;
    let diffIdx = -1;
    for (let i = 0; i < term1.length; i++) {
      if (term1[i] !== term2[i]) {
        diffCount++;
        diffIdx = i;
        if (diffCount > 1) return null;
      }
    }
    if (diffCount === 1) {
      return {
        term: term1.substring(0, diffIdx) + '-' + term1.substring(diffIdx + 1),
        diffIdx: diffIdx
      };
    }
    return null;
  }

  /**
   * Run the tabular reduction for a given target set of terms (for SOP: minterms; for POS: maxterms/0-cells).
   */
  runTabularReduction(targetTerms, dontCareTerms, isPOS = false) {
    const totalTerms = 1 << this.numVars;
    const all = Array.from(new Set([...targetTerms, ...dontCareTerms])).sort((a, b) => a - b);

    if (targetTerms.length === 0) {
      return {
        sop: isPOS ? '1' : '0',
        steps: [],
        primeImplicants: [],
        essentialPIs: [],
        chart: {},
        finalCover: [],
        combinationLogs: []
      };
    }

    if (targetTerms.length + dontCareTerms.length === totalTerms && targetTerms.length > 0) {
      const allDashes = '-'.repeat(this.numVars);
      const singlePI = { term: allDashes, minterms: all, used: false };
      return {
        sop: isPOS ? '0' : '1',
        steps: [],
        primeImplicants: [singlePI],
        essentialPIs: [singlePI],
        chart: {},
        finalCover: [singlePI],
        combinationLogs: []
      };
    }

    // Step 1: Initial grouping by number of 1s (Hamming weight)
    let currentGroups = {};
    for (let m of all) {
      const bin = toBinary(m, this.numVars);
      const ones = countOnes(bin);
      if (!currentGroups[ones]) currentGroups[ones] = [];
      currentGroups[ones].push({
        term: bin,
        minterms: [m],
        used: false
      });
    }

    let round = 1;
    let primeImplicants = [];
    const steps = [];
    const combinationLogs = [];
    const vars = getVarNames(this.numVars);

    // Iteratively combine adjacent groups round by round
    while (Object.keys(currentGroups).length > 0) {
      const nextGroups = {};
      let anyCombined = false;
      const groupKeys = Object.keys(currentGroups).map(Number).sort((a, b) => a - b);

      steps.push({
        round: round,
        groups: JSON.parse(JSON.stringify(currentGroups))
      });

      for (let i = 0; i < groupKeys.length - 1; i++) {
        const k1 = groupKeys[i];
        const k2 = groupKeys[i + 1];

        // Must differ by exactly 1 in weight
        if (k2 - k1 !== 1) continue;

        const list1 = currentGroups[k1];
        const list2 = currentGroups[k2];

        for (let item1 of list1) {
          for (let item2 of list2) {
            const res = this.combineTerms(item1.term, item2.term);
            if (res) {
              anyCombined = true;
              item1.used = true;
              item2.used = true;

              const mergedMinterms = Array.from(new Set([...item1.minterms, ...item2.minterms])).sort((a,b)=>a-b);
              const ones = countOnes(res.term.replace(/-/g, ''));

              if (!nextGroups[ones]) nextGroups[ones] = [];

              // Prevent duplicates in the next round
              const exists = nextGroups[ones].some(x => x.term === res.term && x.minterms.join(',') === mergedMinterms.join(','));
              if (!exists) {
                nextGroups[ones].push({
                  term: res.term,
                  minterms: mergedMinterms,
                  used: false
                });

                combinationLogs.push({
                  round,
                  term1: item1.term,
                  term2: item2.term,
                  result: res.term,
                  eliminatedVar: vars[res.diffIdx],
                  minterms: mergedMinterms,
                  explanation: `Combined "${item1.term}" and "${item2.term}" (1-bit difference at bit ${res.diffIdx}). Variable ${vars[res.diffIdx]} eliminated.`
                });
              }
            }
          }
        }
      }

      // Collect unused terms from current round as Prime Implicants
      for (let k of groupKeys) {
        for (let item of currentGroups[k]) {
          if (!item.used) {
            const exists = primeImplicants.some(pi => pi.term === item.term);
            if (!exists) {
              primeImplicants.push({
                term: item.term,
                minterms: item.minterms,
                used: false
              });
            }
          }
        }
      }

      if (!anyCombined) break;
      currentGroups = nextGroups;
      round++;
    }

    // Step 2: Build Prime Implicant Chart for original target minterms only
    const chart = {};
    for (let m of targetTerms) {
      chart[m] = [];
      for (let i = 0; i < primeImplicants.length; i++) {
        if (primeImplicants[i].minterms.includes(m)) {
          chart[m].push(i);
        }
      }
    }

    // Step 3: Identify Essential Prime Implicants
    const essentialIndices = new Set();
    const essentialReasons = [];

    for (let m of targetTerms) {
      if (chart[m] && chart[m].length === 1) {
        const piIdx = chart[m][0];
        essentialIndices.add(piIdx);
        essentialReasons.push({
          minterm: m,
          piIdx: piIdx,
          piTerm: primeImplicants[piIdx].term,
          explanation: `Minterm m(${m}) is covered ONLY by prime implicant ${primeImplicants[piIdx].term}, making it Essential.`
        });
      }
    }

    const essentialPIs = Array.from(essentialIndices).map(idx => primeImplicants[idx]);

    // Track covered minterms
    const coveredTerms = new Set();
    essentialPIs.forEach(pi => {
      pi.minterms.forEach(m => {
        if (targetTerms.includes(m)) coveredTerms.add(m);
      });
    });

    const remainingTerms = targetTerms.filter(m => !coveredTerms.has(m));
    let finalCover = [...essentialPIs];

    // Step 4: Branch and bound minimal cover for remaining minterms
    if (remainingTerms.length > 0) {
      const remainingPIs = primeImplicants.filter((_, idx) => !essentialIndices.has(idx));
      let bestRemainingCover = null;

      function findCover(idx, current, covered) {
        if (bestRemainingCover && current.length >= bestRemainingCover.length) return;
        const allDone = remainingTerms.every(m => covered.has(m));
        if (allDone) {
          if (!bestRemainingCover || current.length < bestRemainingCover.length) {
            bestRemainingCover = [...current];
          }
          return;
        }
        if (idx >= remainingPIs.length) return;

        // Choose current PI
        const pi = remainingPIs[idx];
        const nextCovered = new Set(covered);
        pi.minterms.forEach(m => {
          if (remainingTerms.includes(m)) nextCovered.add(m);
        });

        current.push(pi);
        findCover(idx + 1, current, nextCovered);
        current.pop();

        // Skip current PI
        findCover(idx + 1, current, covered);
      }

      findCover(0, [], new Set());
      if (bestRemainingCover) {
        finalCover.push(...bestRemainingCover);
      }
    }

    const termsStr = finalCover.map(pi => termToExpression(pi.term, vars, isPOS));
    const sop = isPOS ? (termsStr.length > 0 ? termsStr.join(' ') : '1') : (termsStr.length > 0 ? termsStr.join(' + ') : '0');

    return {
      sop,
      steps,
      primeImplicants,
      essentialPIs,
      essentialReasons,
      chart,
      finalCover,
      combinationLogs
    };
  }

  solve() {
    const totalCells = 1 << this.numVars;

    // SOP Solution
    const sopRes = this.runTabularReduction(this.minterms, this.dontCares, false);
    this.steps = sopRes.steps;
    this.primeImplicants = sopRes.primeImplicants;
    this.essentialPrimeImplicants = sopRes.essentialPIs;

    // POS Solution (Targeting 0-cells)
    const zeroCells = [];
    for (let i = 0; i < totalCells; i++) {
      if (!this.minterms.includes(i) && !this.dontCares.includes(i)) {
        zeroCells.push(i);
      }
    }
    const posRes = this.runTabularReduction(zeroCells, this.dontCares, true);

    return {
      sop: sopRes.sop,
      pos: posRes.sop, // Formatted as POS product of sums
      steps: sopRes.steps,
      primeImplicants: sopRes.primeImplicants,
      essentialPIs: sopRes.essentialPIs,
      essentialReasons: sopRes.essentialReasons,
      chart: sopRes.chart,
      finalCover: sopRes.finalCover,
      combinationLogs: sopRes.combinationLogs,
      posResult: posRes
    };
  }
}
