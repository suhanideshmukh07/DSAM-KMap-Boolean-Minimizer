// utils.js – Shared utility functions for binary conversion, set logic, and formatting

/**
 * Convert an integer to a binary string padded to specified bit length.
 */
function toBinary(num, length) {
  return num.toString(2).padStart(length, '0');
}

/**
 * Count the number of 1s in a binary string or number.
 */
function countOnes(binaryStr) {
  return (binaryStr.match(/1/g) || []).length;
}

/**
 * Standard variable names based on count.
 */
function getVarNames(count) {
  const vars = ['A', 'B', 'C', 'D'];
  return vars.slice(0, count);
}

/**
 * Parse a comma or space separated list of numbers into a unique array of integers.
 */
function parseTermList(str) {
  if (!str || !str.trim()) return [];
  const parts = str.trim().split(/[\s,]+/);
  const nums = parts.map(p => parseInt(p, 10)).filter(n => !isNaN(n));
  return Array.from(new Set(nums)).sort((a, b) => a - b);
}

/**
 * Validate minterm and don't care inputs thoroughly.
 * Returns { valid: boolean, error: string|null, minterms: number[], dontCares: number[] }
 */
function validateInputs(mintermStr, dontCareStr, numVars) {
  const maxTerm = (1 << numVars) - 1;
  const rawM = (mintermStr || '').trim();
  const rawD = (dontCareStr || '').trim();

  // Helper to parse and check non-numeric tokens
  function extractAndCheckTokens(str, label) {
    if (!str) return { list: [], error: null };
    const tokens = str.split(/[\s,]+/).filter(t => t.length > 0);
    const nums = [];
    const seen = new Set();
    const duplicates = new Set();

    for (const tok of tokens) {
      if (!/^\d+$/.test(tok)) {
        return { list: [], error: `Invalid ${label} "${tok}". Please enter non-negative integers only.` };
      }
      const val = parseInt(tok, 10);
      if (val < 0 || val > maxTerm) {
        return { list: [], error: `Term ${val} is out of range! For ${numVars} variables (${getVarNames(numVars).join(', ')}), valid terms are 0 to ${maxTerm}.` };
      }
      if (seen.has(val)) {
        duplicates.add(val);
      }
      seen.add(val);
      nums.push(val);
    }

    if (duplicates.size > 0) {
      // We can warn or auto-deduplicate; let's deduplicate gracefully or return notice
    }

    return { list: Array.from(seen).sort((a, b) => a - b), error: null };
  }

  const mRes = extractAndCheckTokens(rawM, "minterm");
  if (mRes.error) return { valid: false, error: mRes.error };

  const dRes = extractAndCheckTokens(rawD, "don't-care");
  if (dRes.error) return { valid: false, error: dRes.error };

  // Check overlap between minterms and don't-cares
  const mSet = new Set(mRes.list);
  const overlap = dRes.list.filter(x => mSet.has(x));
  if (overlap.length > 0) {
    return {
      valid: false,
      error: `Conflict detected: Term(s) [${overlap.join(', ')}] cannot be both a Minterm and a Don't-Care term.`
    };
  }

  return {
    valid: true,
    error: null,
    minterms: mRes.list,
    dontCares: dRes.list
  };
}

/**
 * Convert a binary term with '-' don't-cares into an SOP or POS Boolean term string.
 * Example: "1-0" with vars ['A','B','C'] -> SOP: "AC'", POS: "(A' + C)"
 */
function termToExpression(term, vars, isPOS = false) {
  let res = [];
  for (let i = 0; i < term.length; i++) {
    const ch = term[i];
    const v = vars[i];
    if (ch === '-') continue;
    if (!isPOS) {
      // SOP: 1 -> A, 0 -> A'
      res.push(ch === '1' ? v : `${v}'`);
    } else {
      // POS: 0 -> A, 1 -> A' (Sum term: F=0 when term is 0)
      res.push(ch === '0' ? v : `${v}'`);
    }
  }
  if (res.length === 0) return isPOS ? '0' : '1';
  return isPOS ? `(${res.join(' + ')})` : res.join('');
}

/**
 * Count literals and terms in an expression
 */
function getExpressionMetrics(expr, isPOS = false) {
  if (!expr || expr === '0' || expr === '1') {
    return { terms: expr === '0' || expr === '1' ? 1 : 0, literals: 0 };
  }
  if (!isPOS) {
    const terms = expr.split('+').map(t => t.trim()).filter(Boolean);
    let lits = 0;
    terms.forEach(t => {
      const matches = t.match(/[A-D]'?/g) || [];
      lits += matches.length;
    });
    return { terms: terms.length, literals: lits };
  } else {
    // POS: (A + B')(C + D)
    const factorMatches = expr.match(/\(([^)]+)\)/g) || [expr];
    let lits = 0;
    factorMatches.forEach(f => {
      const clean = f.replace(/[()]/g, '');
      const terms = clean.split('+').map(t => t.trim()).filter(Boolean);
      terms.forEach(t => {
        const matches = t.match(/[A-D]'?/g) || [];
        lits += matches.length;
      });
    });
    return { terms: factorMatches.length, literals: lits };
  }
}
