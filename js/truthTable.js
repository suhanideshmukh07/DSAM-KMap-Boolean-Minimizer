// truthTable.js – Interactive Truth Table generation, output toggling, and comparison

class TruthTable {
  constructor(containerId, numVars, onCellChange, onRowSelect = null) {
    this.container = document.getElementById(containerId);
    this.numVars = numVars;
    this.onCellChange = onCellChange;
    this.onRowSelect = onRowSelect;
    this.minterms = new Set();
    this.dontCares = new Set();
    this.simplifiedExpr = null;
    this.activeRowIdx = null;
  }

  highlightRow(idx) {
    this.activeRowIdx = idx;
    if (!this.container) return;
    const rows = this.container.querySelectorAll('tbody tr');
    rows.forEach(r => {
      const rIdx = parseInt(r.getAttribute('data-row-idx'), 10);
      if (rIdx === idx) {
        r.classList.add('tt-row-active');
        r.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } else {
        r.classList.remove('tt-row-active');
      }
    });
  }

  setNumVars(numVars) {
    this.numVars = numVars;
    this.render();
  }

  setData(minterms, dontCares, simplifiedExpr = null) {
    this.minterms = new Set(minterms);
    this.dontCares = new Set(dontCares);
    this.simplifiedExpr = simplifiedExpr;
    this.render();
  }

  render() {
    if (!this.container) return;
    this.container.innerHTML = '';

    const vars = getVarNames(this.numVars);
    const tableWrap = document.createElement('div');
    tableWrap.className = 'table-responsive';
    tableWrap.style.maxHeight = '420px';
    tableWrap.style.overflowY = 'auto';
    tableWrap.style.border = '1px solid var(--color-border, #e2e8f0)';
    tableWrap.style.borderRadius = '8px';

    const table = document.createElement('table');
    table.className = 'truth-table';
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';

    // Header row
    const thead = document.createElement('thead');
    thead.style.position = 'sticky';
    thead.style.top = '0';
    thead.style.background = 'var(--color-table-header, #f1f5f9)';
    thead.style.zIndex = '2';

    const headerRow = document.createElement('tr');
    
    // Index col
    const thIdx = document.createElement('th');
    thIdx.innerText = 'm#';
    thIdx.style.padding = '0.6rem';
    thIdx.style.borderBottom = '2px solid #cbd5e1';
    headerRow.appendChild(thIdx);

    // Variable columns
    vars.forEach(v => {
      const th = document.createElement('th');
      th.innerText = v;
      th.style.padding = '0.6rem';
      th.style.borderBottom = '2px solid #cbd5e1';
      headerRow.appendChild(th);
    });

    // Original Output column
    const thOut = document.createElement('th');
    thOut.innerHTML = 'F (Original)<br><small style="font-weight:normal; font-size:0.75rem;">Click cell: 0→1→X</small>';
    thOut.style.padding = '0.6rem';
    thOut.style.borderBottom = '2px solid #cbd5e1';
    headerRow.appendChild(thOut);

    // Simplified Output column (if expression available)
    if (this.simplifiedExpr !== null) {
      const thSimp = document.createElement('th');
      thSimp.innerHTML = `F (Simplified)<br><small style="font-weight:normal; font-size:0.75rem;">${this.simplifiedExpr}</small>`;
      thSimp.style.padding = '0.6rem';
      thSimp.style.borderBottom = '2px solid #cbd5e1';
      headerRow.appendChild(thSimp);

      const thStatus = document.createElement('th');
      thStatus.innerText = 'Match';
      thStatus.style.padding = '0.6rem';
      thStatus.style.borderBottom = '2px solid #cbd5e1';
      headerRow.appendChild(thStatus);
    }

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Body rows
    const tbody = document.createElement('tbody');
    const totalRows = 1 << this.numVars;

    for (let i = 0; i < totalRows; i++) {
      const row = document.createElement('tr');
      const bin = toBinary(i, this.numVars);
      row.style.borderBottom = '1px solid var(--color-border, #f1f5f9)';
      row.setAttribute('data-row-idx', i);
      if (this.activeRowIdx === i) {
        row.classList.add('tt-row-active');
      }

      // Index cell
      const tdIdx = document.createElement('td');
      tdIdx.innerText = i;
      tdIdx.style.textAlign = 'center';
      tdIdx.style.padding = '0.45rem';
      tdIdx.style.color = '#64748b';
      row.appendChild(tdIdx);

      // Variable value cells
      const varValues = {};
      for (let b = 0; b < this.numVars; b++) {
        const td = document.createElement('td');
        td.innerText = bin[b];
        td.style.textAlign = 'center';
        td.style.fontFamily = 'monospace';
        td.style.padding = '0.45rem';
        row.appendChild(td);
        varValues[vars[b]] = bin[b] === '1';
      }

      row.addEventListener('click', (e) => {
        if (e.target.closest('.tt-cell')) return; // don't trigger when toggling F cell
        this.highlightRow(i);
        if (this.onRowSelect) {
          this.onRowSelect(i, varValues);
        }
      });

      // Output value cell (Clickable: 0 -> 1 -> X -> 0)
      const tdOut = document.createElement('td');
      tdOut.style.textAlign = 'center';
      tdOut.style.cursor = 'pointer';
      tdOut.style.fontWeight = 'bold';
      tdOut.style.padding = '0.45rem';

      let val = '0';
      if (this.minterms.has(i)) val = '1';
      else if (this.dontCares.has(i)) val = 'X';

      tdOut.innerText = val;
      tdOut.className = `tt-cell val-${val}`;
      if (val === '1') {
        tdOut.style.color = '#2563eb';
        tdOut.style.background = '#eff6ff';
      } else if (val === 'X') {
        tdOut.style.color = '#d97706';
        tdOut.style.background = '#fef3c7';
      } else {
        tdOut.style.color = '#64748b';
      }

      tdOut.addEventListener('click', () => {
        let nextVal = '0';
        if (val === '0') {
          nextVal = '1';
          this.minterms.add(i);
          this.dontCares.delete(i);
        } else if (val === '1') {
          nextVal = 'X';
          this.minterms.delete(i);
          this.dontCares.add(i);
        } else {
          nextVal = '0';
          this.minterms.delete(i);
          this.dontCares.delete(i);
        }
        if (this.onCellChange) {
          this.onCellChange(Array.from(this.minterms), Array.from(this.dontCares));
        }
      });

      row.appendChild(tdOut);

      // Comparison with Simplified expression
      if (this.simplifiedExpr !== null) {
        const simpVal = evaluateExpression(this.simplifiedExpr, varValues) ? 1 : 0;
        const tdSimp = document.createElement('td');
        tdSimp.innerText = simpVal;
        tdSimp.style.textAlign = 'center';
        tdSimp.style.fontWeight = 'bold';
        tdSimp.style.padding = '0.45rem';
        tdSimp.style.color = simpVal ? '#16a34a' : '#64748b';
        row.appendChild(tdSimp);

        const tdStatus = document.createElement('td');
        tdStatus.style.textAlign = 'center';
        tdStatus.style.padding = '0.45rem';
        const isMatch = (val === 'X') || (parseInt(val, 10) === simpVal);
        tdStatus.innerHTML = isMatch
          ? '<span style="color:#16a34a; font-weight:600;">✓ Match</span>'
          : '<span style="color:#dc2626; font-weight:600;">✗ Diff</span>';
        row.appendChild(tdStatus);
      }

      tbody.appendChild(row);
    }

    table.appendChild(tbody);
    tableWrap.appendChild(table);
    this.container.appendChild(tableWrap);
  }
}
