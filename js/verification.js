// verification.js – Verify 3-way equivalence between Original, K-Map, and Quine-McCluskey results via Truth Table evaluations

/**
 * Three-way verification:
 * Checks whether:
 * 1. Original vs K-Map matches on all non-don't-care rows
 * 2. Original vs QM matches on all non-don't-care rows
 * 3. K-Map vs QM matches on ALL 2^N rows
 * Also verifies POS expressions against SOP expressions.
 */
function verifyThreeWay(minterms, dontCares, kmapSop, qmSop, numVars, kmapPos = null, qmPos = null) {
  const vars = getVarNames(numVars);
  const total = 1 << numVars;
  const table = [];
  const mintermSet = new Set(minterms);
  const dontCareSet = new Set(dontCares);

  let origEqualsKmap = true;
  let origEqualsQm = true;
  let kmapEqualsQm = true;
  let posMatchesSop = true;

  for (let i = 0; i < total; i++) {
    const bin = toBinary(i, numVars);
    const varValues = {};
    vars.forEach((v, idx) => {
      varValues[v] = bin[idx] === '1';
    });

    const isDC = dontCareSet.has(i);
    const origTarget = mintermSet.has(i) ? 1 : (isDC ? 'X' : 0);

    const kmapVal = evaluateExpression(kmapSop, varValues) ? 1 : 0;
    const qmVal = evaluateExpression(qmSop, varValues) ? 1 : 0;

    // Check POS if available
    let posVal = null;
    if (kmapPos) {
      posVal = evaluateExpression(kmapPos, varValues) ? 1 : 0;
      if (posVal !== kmapVal) {
        posMatchesSop = false;
      }
    }

    if (!isDC) {
      if (origTarget !== kmapVal) origEqualsKmap = false;
      if (origTarget !== qmVal) origEqualsQm = false;
    }

    if (kmapVal !== qmVal) {
      kmapEqualsQm = false;
    }

    const rowMatch = isDC || (origTarget === kmapVal && origTarget === qmVal);

    table.push({
      index: i,
      bin: bin,
      origVal: origTarget,
      kmapVal: kmapVal,
      qmVal: qmVal,
      posVal: posVal,
      isDC: isDC,
      match: rowMatch
    });
  }

  const allThreeEquivalent = origEqualsKmap && origEqualsQm && kmapEqualsQm;

  return {
    isEquivalent: kmapEqualsQm,
    origEqualsKmap,
    origEqualsQm,
    kmapEqualsQm,
    posMatchesSop,
    allThreeEquivalent,
    table
  };
}
