// kmap.js – Karnaugh Map generation, visual grouping, POS/SOP, and interactive explanation

class KMapSolver {
  constructor(numVars, minterms, dontCares) {
    this.numVars = numVars;
    this.minterms = new Set(minterms);
    this.dontCares = new Set(dontCares);
    this.grid = [];
    this.groups = [];
    this.posGroups = [];
    this.initGridSetup();
  }

  initGridSetup() {
    if (this.numVars === 2) {
      this.rowVars = ['A'];
      this.colVars = ['B'];
      this.rowGray = [0, 1];
      this.colGray = [0, 1];
    } else if (this.numVars === 3) {
      this.rowVars = ['A'];
      this.colVars = ['B', 'C'];
      this.rowGray = [0, 1];
      this.colGray = [0, 1, 3, 2];
    } else if (this.numVars === 4) {
      this.rowVars = ['A', 'B'];
      this.colVars = ['C', 'D'];
      this.rowGray = [0, 1, 3, 2];
      this.colGray = [0, 1, 3, 2];
    }
  }

  getCellIndex(r, c) {
    const rowVal = this.rowGray[r];
    const colVal = this.colGray[c];
    if (this.numVars === 2) {
      return (rowVal << 1) | colVal;
    } else if (this.numVars === 3) {
      return (rowVal << 2) | colVal;
    } else if (this.numVars === 4) {
      return (rowVal << 2) | colVal;
    }
    return 0;
  }

  getCellValue(r, c) {
    const idx = this.getCellIndex(r, c);
    if (this.minterms.has(idx)) return '1';
    if (this.dontCares.has(idx)) return 'X';
    return '0';
  }

  /**
   * Generates all valid power-of-2 rectangular groupings on the torus (wrap-around).
   * @param {boolean} forPOS If true, groups 0-cells and X-cells instead of 1-cells and X-cells.
   */
  findValidGroups(forPOS = false) {
    const numRows = this.rowGray.length;
    const numCols = this.colGray.length;
    const heights = [1, 2, 4].filter(h => h <= numRows);
    const widths = [1, 2, 4].filter(w => w <= numCols);

    const validGroups = [];
    const targetVal = forPOS ? '0' : '1';
    const forbiddenVal = forPOS ? '1' : '0';

    for (let h of heights) {
      for (let w of widths) {
        const size = h * w;
        if ((size & (size - 1)) !== 0) continue; // Must be power of 2

        for (let r = 0; r < numRows; r++) {
          for (let c = 0; c < numCols; c++) {
            const cells = [];
            let allValid = true;
            let containsTarget = false;

            for (let dr = 0; dr < h; dr++) {
              for (let dc = 0; dc < w; dc++) {
                const currR = (r + dr) % numRows;
                const currC = (c + dc) % numCols;
                const val = this.getCellValue(currR, currC);
                const idx = this.getCellIndex(currR, currC);

                if (val === forbiddenVal) {
                  allValid = false;
                  break;
                }
                if (val === targetVal) {
                  containsTarget = true;
                }
                cells.push({ r: currR, c: currC, idx: idx });
              }
              if (!allValid) break;
            }

            if (allValid && containsTarget) {
              const indices = Array.from(new Set(cells.map(c => c.idx))).sort((a,b)=>a-b);
              if (indices.length === size) {
                validGroups.push({
                  r, c, h, w,
                  indices,
                  size,
                  forPOS
                });
              }
            }
          }
        }
      }
    }

    // Deduplicate groups with identical minterm indices
    const uniqueGroups = [];
    const seenGroupKeys = new Set();
    for (let g of validGroups) {
      const key = g.indices.join(',');
      if (!seenGroupKeys.has(key)) {
        seenGroupKeys.add(key);
        uniqueGroups.push(g);
      }
    }

    // Filter out non-prime groups (completely covered by a larger group of the same target)
    const primeGroups = uniqueGroups.filter(g1 => {
      return !uniqueGroups.some(g2 => {
        if (g1 === g2 || g2.size <= g1.size) return false;
        return g1.indices.every(idx => g2.indices.includes(idx));
      });
    });

    return primeGroups;
  }

  /**
   * Optimal Set Cover to cover all target minterms with minimum number of prime groups.
   */
  findOptimalCover(primeGroups, targetTerms) {
    const termArr = Array.from(targetTerms);
    if (termArr.length === 0) return [];

    let bestCover = null;
    let bestLiterals = Infinity;

    function search(index, currentCover, coveredTerms) {
      if (bestCover && currentCover.length > bestCover.length) {
        return; // Branch and bound on term count
      }

      const allCovered = termArr.every(m => coveredTerms.has(m));
      if (allCovered) {
        // Among equal-length covers, prefer the one with fewer total literals
        // Larger groups eliminate more variables => fewer literals per term
        // literalsInTerm = numVarsInPattern - dashesInPattern = effectively related to group size
        // We use negative total group size as a proxy: bigger groups = fewer literals
        let litScore = 0;
        currentCover.forEach(g => { litScore -= g.size; });

        if (!bestCover || currentCover.length < bestCover.length ||
            (currentCover.length === bestCover.length && litScore < bestLiterals)) {
          bestCover = [...currentCover];
          bestLiterals = litScore;
        }
        return;
      }

      if (index >= primeGroups.length) return;

      // Option 1: Include this prime group
      const nextGroup = primeGroups[index];
      const nextCovered = new Set(coveredTerms);
      nextGroup.indices.forEach(idx => {
        if (termArr.includes(idx)) nextCovered.add(idx);
      });

      currentCover.push(nextGroup);
      search(index + 1, currentCover, nextCovered);
      currentCover.pop();

      // Option 2: Skip this prime group
      search(index + 1, currentCover, coveredTerms);
    }

    search(0, [], new Set());
    return bestCover || [];
  }

  /**
   * Get detailed group analysis for UI hover / modals / explanations
   */
  getGroupExplanation(group, isPOS = false) {
    const vars = getVarNames(this.numVars);
    const commonVars = [];
    const eliminatedVars = [];
    const bits = [];

    for (let bitIdx = 0; bitIdx < this.numVars; bitIdx++) {
      const bitShift = this.numVars - 1 - bitIdx;
      const firstBit = (group.indices[0] >> bitShift) & 1;
      let allSame = true;

      for (let idx of group.indices) {
        if (((idx >> bitShift) & 1) !== firstBit) {
          allSame = false;
          break;
        }
      }

      const v = vars[bitIdx];
      if (allSame) {
        bits.push(firstBit.toString());
        commonVars.push({
          variable: v,
          val: firstBit,
          text: `${v} = ${firstBit}`
        });
      } else {
        bits.push('-');
        eliminatedVars.push(v);
      }
    }

    const termStr = termToExpression(bits.join(''), vars, isPOS);
    let typeName = "Single cell";
    if (group.size === 2) typeName = "Pair";
    else if (group.size === 4) typeName = "Quad";
    else if (group.size === 8) typeName = "Octet";
    else if (group.size === 16) typeName = "16-Cell Group";

    const reason = eliminatedVars.length > 0
      ? `Eliminated variable${eliminatedVars.length > 1 ? 's' : ''} [${eliminatedVars.join(', ')}] because values toggle between 0 and 1 across the group cells.`
      : `No variables eliminated (single cell term).`;

    return {
      term: termStr,
      rawPattern: bits.join(''),
      size: group.size,
      typeName,
      indices: group.indices,
      commonVars,
      eliminatedVars,
      explanation: reason
    };
  }

  /**
   * Get the Boolean term corresponding to a group of cells.
   */
  groupToTerm(group, isPOS = false) {
    return this.getGroupExplanation(group, isPOS).term;
  }

  solve() {
    const totalCells = 1 << this.numVars;

    // Check all-zero or all-one trivial edge cases
    if (this.minterms.size === 0) {
      return {
        sop: '0',
        pos: '0',
        groups: [],
        posGroups: [],
        primeGroups: []
      };
    }
    if (this.minterms.size + this.dontCares.size === totalCells && this.minterms.size > 0) {
      return {
        sop: '1',
        pos: '1',
        groups: [],
        posGroups: [],
        primeGroups: []
      };
    }

    // SOP Calculation (Covering 1-cells)
    const primeSOP = this.findValidGroups(false);
    const optimalSOP = this.findOptimalCover(primeSOP, Array.from(this.minterms));
    const sopTerms = optimalSOP.map(g => this.groupToTerm(g, false));
    const sop = sopTerms.length > 0 ? sopTerms.join(' + ') : '0';

    // POS Calculation (Covering 0-cells directly!)
    const zeroCells = [];
    for (let i = 0; i < totalCells; i++) {
      if (!this.minterms.has(i) && !this.dontCares.has(i)) {
        zeroCells.push(i);
      }
    }

    let pos = '1';
    let optimalPOS = [];
    if (zeroCells.length === 0) {
      pos = '1';
    } else {
      const primePOS = this.findValidGroups(true);
      optimalPOS = this.findOptimalCover(primePOS, zeroCells);
      const posTerms = optimalPOS.map(g => this.groupToTerm(g, true));
      pos = posTerms.length > 0 ? posTerms.join(' ') : '1';
    }

    return {
      sop,
      pos,
      groups: optimalSOP,
      posGroups: optimalPOS,
      primeGroups: primeSOP
    };
  }
}
