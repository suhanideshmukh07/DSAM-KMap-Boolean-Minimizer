// circuit.js – Dynamic SVG generation for logic circuits with interactive simulation

class CircuitRenderer {
  constructor(containerId, onInputChange = null) {
    this.container = document.getElementById(containerId);
    this.onInputChange = onInputChange;
    this.currentExpr = '';
    this.numVars = 4;
    this.inputStates = { A: 0, B: 0, C: 0, D: 0 };
    this.svgNS = 'http://www.w3.org/2000/svg';
  }

  setExpr(sopExpr, numVars) {
    this.currentExpr = sopExpr;
    this.numVars = numVars;
    // Reset inputs for unused variables
    const vars = getVarNames(numVars);
    const allVars = ['A','B','C','D'];
    allVars.forEach(v => {
      if (!vars.includes(v)) this.inputStates[v] = 0;
    });
    this.render();
  }

  toggleInput(varName) {
    this.inputStates[varName] = this.inputStates[varName] ? 0 : 1;
    this.render();
    if (this.onInputChange) {
      this.onInputChange(this.inputStates);
    }
  }

  setInputStates(states) {
    this.inputStates = { ...this.inputStates, ...states };
    this.render();
    if (this.onInputChange) {
      this.onInputChange(this.inputStates);
    }
  }

  getGateCounts(sopExpr, numVars) {
    if (!sopExpr || sopExpr === '0' || sopExpr === '1') {
      return { andGates: 0, orGates: 0, notGates: 0 };
    }
    const terms = sopExpr.split('+').map(t => t.trim()).filter(Boolean);
    const invertedVars = new Set();
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
  }

  getGateCountsPOS(posExpr) {
    if (!posExpr || posExpr === '0' || posExpr === '1') {
      return { andGates: 0, orGates: 0, notGates: 0 };
    }
    const factors = posExpr.match(/\([^)]+\)/g) || [posExpr];
    const invertedVars = new Set();
    let orGates = 0;
    factors.forEach(f => {
      const clean = f.replace(/[()]/g, '');
      const lits = clean.split('+').map(t => t.trim()).filter(Boolean);
      const allLits = [];
      lits.forEach(l => { (l.match(/[A-D]'?/g) || []).forEach(v => allLits.push(v)); });
      if (allLits.length > 1) orGates++;
      allLits.forEach(v => { if (v.endsWith("'")) invertedVars.add(v[0]); });
    });
    const andGates = factors.length > 1 ? 1 : 0;
    return { andGates, orGates, notGates: invertedVars.size };
  }

  // --- SVG Helper Methods ---
  _createSVG(width, height) {
    const svg = document.createElementNS(this.svgNS, 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', height);
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.style.background = 'var(--color-card, #ffffff)';
    svg.style.borderRadius = '8px';
    svg.style.border = '1px solid var(--color-border, #e2e8f0)';
    svg.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
    return svg;
  }

  _wireColor(val) { return val ? '#10b981' : '#94a3b8'; }
  _wireWidth(val) { return val ? '2.5' : '1.8'; }

  _drawLine(svg, x1, y1, x2, y2, val) {
    const line = document.createElementNS(this.svgNS, 'line');
    line.setAttribute('x1', x1); line.setAttribute('y1', y1);
    line.setAttribute('x2', x2); line.setAttribute('y2', y2);
    line.setAttribute('stroke', this._wireColor(val));
    line.setAttribute('stroke-width', this._wireWidth(val));
    svg.appendChild(line);
    return line;
  }

  _drawPath(svg, d, val, fill) {
    const path = document.createElementNS(this.svgNS, 'path');
    path.setAttribute('d', d);
    path.setAttribute('fill', fill || 'none');
    path.setAttribute('stroke', this._wireColor(val));
    path.setAttribute('stroke-width', this._wireWidth(val));
    svg.appendChild(path);
    return path;
  }

  _drawDot(svg, cx, cy, val) {
    const dot = document.createElementNS(this.svgNS, 'circle');
    dot.setAttribute('cx', cx); dot.setAttribute('cy', cy);
    dot.setAttribute('r', '3');
    dot.setAttribute('fill', this._wireColor(val));
    svg.appendChild(dot);
    return dot;
  }

  _drawText(svg, x, y, text, opts = {}) {
    const el = document.createElementNS(this.svgNS, 'text');
    el.setAttribute('x', x); el.setAttribute('y', y);
    el.setAttribute('font-family', 'system-ui, sans-serif');
    el.setAttribute('font-size', opts.size || '13');
    el.setAttribute('font-weight', opts.weight || 'bold');
    el.setAttribute('text-anchor', opts.anchor || 'middle');
    el.setAttribute('fill', opts.fill || '#334155');
    el.textContent = text;
    svg.appendChild(el);
    return el;
  }

  _drawNotBubble(svg, cx, cy, val) {
    const c = document.createElementNS(this.svgNS, 'circle');
    c.setAttribute('cx', cx); c.setAttribute('cy', cy);
    c.setAttribute('r', '5');
    c.setAttribute('fill', val ? '#dcfce7' : '#ffffff');
    c.setAttribute('stroke', this._wireColor(val));
    c.setAttribute('stroke-width', '1.8');
    svg.appendChild(c);
  }

  _drawANDGate(svg, x, y, w, h, active) {
    // IEEE AND gate: flat left, rounded right (D-shape)
    const halfH = h / 2;
    const d = `M ${x} ${y - halfH} L ${x + w * 0.5} ${y - halfH} A ${halfH} ${halfH} 0 0 1 ${x + w * 0.5} ${y + halfH} L ${x} ${y + halfH} Z`;
    const path = document.createElementNS(this.svgNS, 'path');
    path.setAttribute('d', d);
    path.setAttribute('fill', active ? '#ecfdf5' : '#f8fafc');
    path.setAttribute('stroke', active ? '#10b981' : '#6366f1');
    path.setAttribute('stroke-width', '2');
    svg.appendChild(path);
    // Label
    this._drawText(svg, x + w * 0.3, y + 4, '&', { size: '11', fill: active ? '#065f46' : '#64748b' });
    return { outX: x + w * 0.5 + halfH, outY: y }; // output point (tip of the D)
  }

  _drawORGate(svg, x, y, w, h, active) {
    // IEEE OR gate: curved back, pointed front
    const halfH = h / 2;
    const backCurve = w * 0.15;
    const d = `M ${x} ${y - halfH} Q ${x + backCurve} ${y} ${x} ${y + halfH} Q ${x + w * 0.6} ${y + halfH * 0.7} ${x + w} ${y} Q ${x + w * 0.6} ${y - halfH * 0.7} ${x} ${y - halfH} Z`;
    const path = document.createElementNS(this.svgNS, 'path');
    path.setAttribute('d', d);
    path.setAttribute('fill', active ? '#ecfdf5' : '#f0fdfa');
    path.setAttribute('stroke', active ? '#10b981' : '#0d9488');
    path.setAttribute('stroke-width', '2');
    svg.appendChild(path);
    this._drawText(svg, x + w * 0.4, y + 4, '≥1', { size: '10', fill: active ? '#065f46' : '#0f766e' });
    return { outX: x + w, outY: y };
  }

  _drawNANDGate(svg, x, y, w, h, active) {
    const result = this._drawANDGate(svg, x, y, w, h, active);
    this._drawNotBubble(svg, result.outX + 5, result.outY, active);
    return { outX: result.outX + 10, outY: result.outY };
  }

  _drawNORGate(svg, x, y, w, h, active) {
    const result = this._drawORGate(svg, x, y, w, h, active);
    this._drawNotBubble(svg, result.outX + 5, result.outY, active);
    return { outX: result.outX + 10, outY: result.outY };
  }

  // --- Main Render ---
  render() {
    if (!this.container) return;
    this.container.innerHTML = '';

    const sopExpr = this.currentExpr;
    const numVars = this.numVars;
    const vars = getVarNames(numVars);

    const minCounts = this.getGateCounts(sopExpr, numVars);

    // Control bar with interactive switches
    const controlBar = this._createControlBar(vars, sopExpr);
    this.container.appendChild(controlBar);

    // Gate statistics
    const statsDiv = this._createStatsDisplay(minCounts);
    this.container.appendChild(statsDiv);

    // Handle trivial cases
    if (!sopExpr || sopExpr === '0') {
      this._renderConstant('0'); return;
    }
    if (sopExpr === '1') {
      this._renderConstant('1'); return;
    }

    // Parse terms and render circuit
    const terms = sopExpr.split('+').map(t => t.trim()).filter(Boolean);
    const svg = this._renderSOPCircuit(terms, vars);
    this.container.appendChild(svg);
  }

  _createControlBar(vars, sopExpr) {
    const controlBar = document.createElement('div');
    controlBar.style.cssText = 'display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;padding:0.75rem 1rem;background:var(--color-surface,#f8faff);border-radius:8px;margin-bottom:1rem;border:1px solid var(--color-border,#e2e8f0)';

    let switchesHtml = `<div style="display:flex;align-items:center;gap:0.6rem;flex-wrap:wrap">
      <span style="font-weight:600;font-size:0.9rem">Interactive Inputs:</span>`;
    vars.forEach(v => {
      const st = this.inputStates[v] || 0;
      switchesHtml += `<button type="button" class="btn-input-switch" data-var="${v}" style="
        padding:0.35rem 0.75rem;border-radius:6px;border:1px solid ${st ? '#10b981' : '#cbd5e1'};
        background:${st ? '#10b981' : '#ffffff'};color:${st ? '#fff' : '#334155'};
        font-weight:bold;cursor:pointer;transition:all 0.2s">${v} = ${st}</button>`;
    });
    switchesHtml += '</div>';

    const varVals = {};
    vars.forEach(v => varVals[v] = Boolean(this.inputStates[v]));
    const currentF = evaluateExpression(sopExpr, varVals) ? 1 : 0;

    switchesHtml += `<div style="font-weight:bold;font-size:1.05rem;padding:0.4rem 1rem;border-radius:6px;background:${currentF ? '#dcfce7' : '#fee2e2'};color:${currentF ? '#15803d' : '#b91c1c'};border:1px solid ${currentF ? '#86efac' : '#fca5a5'}">Output F = ${currentF} (${currentF ? 'HIGH / 5V' : 'LOW / 0V'})</div>`;

    controlBar.innerHTML = switchesHtml;

    // Attach events
    controlBar.querySelectorAll('.btn-input-switch').forEach(btn => {
      btn.addEventListener('click', () => this.toggleInput(btn.getAttribute('data-var')));
    });

    return controlBar;
  }

  _createStatsDisplay(counts) {
    const div = document.createElement('div');
    div.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:0.75rem;margin-bottom:1.25rem';
    const total = counts.andGates + counts.orGates + counts.notGates;
    div.innerHTML = `
      <div style="padding:0.6rem;border-radius:6px;background:#eff6ff;border:1px solid #bfdbfe;text-align:center">
        <div style="font-size:0.75rem;color:#1e40af;font-weight:600;text-transform:uppercase">AND Gates</div>
        <div style="font-size:1.3rem;font-weight:bold;color:#1d4ed8">${counts.andGates}</div>
      </div>
      <div style="padding:0.6rem;border-radius:6px;background:#f0fdf4;border:1px solid #bbf7d0;text-align:center">
        <div style="font-size:0.75rem;color:#166534;font-weight:600;text-transform:uppercase">OR Gates</div>
        <div style="font-size:1.3rem;font-weight:bold;color:#15803d">${counts.orGates}</div>
      </div>
      <div style="padding:0.6rem;border-radius:6px;background:#faf5ff;border:1px solid #e9d5ff;text-align:center">
        <div style="font-size:0.75rem;color:#6b21a8;font-weight:600;text-transform:uppercase">NOT Gates</div>
        <div style="font-size:1.3rem;font-weight:bold;color:#7e22ce">${counts.notGates}</div>
      </div>
      <div style="padding:0.6rem;border-radius:6px;background:#f8fafc;border:1px solid #e2e8f0;text-align:center">
        <div style="font-size:0.75rem;color:#475569;font-weight:600;text-transform:uppercase">Total Gates</div>
        <div style="font-size:1.3rem;font-weight:bold;color:#0f172a">${total}</div>
      </div>`;
    return div;
  }

  _renderConstant(val) {
    const div = document.createElement('div');
    div.style.cssText = 'padding:2rem;text-align:center;background:#f8fafc;border-radius:8px;color:#64748b';
    div.innerHTML = val === '0'
      ? '<strong>Constant 0:</strong> Circuit output is permanently connected to Ground (GND). No logic gates required.'
      : '<strong>Constant 1:</strong> Circuit output is permanently connected to Supply (VCC). No logic gates required.';
    this.container.appendChild(div);
  }

  _renderSOPCircuit(terms, vars) {
    // Layout constants
    const railStartX = 60;
    const railSpacing = 50;
    const gateW = 60;
    const gateH = 44;
    const termSpacing = Math.max(65, gateH + 20);
    const andGateX = railStartX + vars.length * railSpacing + 80;
    const orGateX = andGateX + gateW + 120;
    const svgWidth = orGateX + gateW + 140;
    const svgHeight = Math.max(200, terms.length * termSpacing + 80);

    const svg = this._createSVG(svgWidth, svgHeight);

    // Draw input rails
    const railX = {};
    vars.forEach((v, i) => {
      const x = railStartX + i * railSpacing;
      railX[v] = x;
      const val = Boolean(this.inputStates[v]);

      this._drawText(svg, x, 25, v, { size: '14', weight: 'bold', fill: val ? '#10b981' : '#334155' });
      this._drawLine(svg, x, 35, x, svgHeight - 15, val);
    });

    const andOutputs = [];

    // Draw each term
    terms.forEach((term, idx) => {
      const gateY = 60 + idx * termSpacing;
      const literals = term.match(/[A-D]'?/g) || [];

      // Evaluate term
      let termVal = true;
      literals.forEach(lit => {
        const v = lit[0];
        const isNot = lit.endsWith("'");
        const bitVal = Boolean(this.inputStates[v]);
        termVal = termVal && (isNot ? !bitVal : bitVal);
      });

      // Draw input wires from rails to gate
      const inputCount = literals.length;
      const inputSpacing = Math.min(12, (gateH - 8) / Math.max(inputCount, 1));
      const inputStartY = gateY - (inputCount - 1) * inputSpacing / 2;

      literals.forEach((lit, lIdx) => {
        const v = lit[0];
        const isNot = lit.endsWith("'");
        const bitVal = Boolean(this.inputStates[v]);
        const litVal = isNot ? !bitVal : bitVal;
        const fromX = railX[v];
        const inY = inputStartY + lIdx * inputSpacing;
        const toX = isNot ? andGateX - 12 : andGateX;

        // Horizontal wire from rail
        this._drawLine(svg, fromX, inY, toX, inY, bitVal);
        // Dot on rail
        this._drawDot(svg, fromX, inY, bitVal);

        // NOT bubble if complemented
        if (isNot) {
          this._drawNotBubble(svg, andGateX - 6, inY, litVal);
          this._drawLine(svg, andGateX - 1, inY, andGateX, inY, litVal);
        }
      });

      let outX, outY;
      if (literals.length > 1) {
        // Draw AND gate
        const result = this._drawANDGate(svg, andGateX, gateY, gateW, gateH, termVal);
        outX = result.outX;
        outY = result.outY;
      } else {
        // Single literal - just a wire through
        outX = andGateX + gateW * 0.5 + gateH / 2;
        outY = gateY;
        this._drawLine(svg, andGateX, gateY, outX, gateY, termVal);
      }

      // Draw output wire from AND gate
      const wireEndX = terms.length > 1 ? orGateX - 10 : orGateX + gateW + 80;
      this._drawLine(svg, outX, outY, wireEndX, outY, termVal);

      andOutputs.push({ x: wireEndX, y: outY, val: termVal });
    });

    // Compute final output
    const varVals = {};
    vars.forEach(v => varVals[v] = Boolean(this.inputStates[v]));
    const currentF = evaluateExpression(this.currentExpr, varVals) ? 1 : 0;

    if (terms.length > 1) {
      // Draw OR gate
      const orGateY = (andOutputs[0].y + andOutputs[andOutputs.length - 1].y) / 2;

      // Route wires to OR gate inputs
      andOutputs.forEach(pt => {
        // Vertical segment to align with OR gate
        const targetY = orGateY + (pt.y - orGateY) * 0.5;
        this._drawPath(svg, `M ${pt.x} ${pt.y} L ${orGateX} ${targetY}`, pt.val, 'none');
      });

      const orResult = this._drawORGate(svg, orGateX, orGateY, gateW + 10, gateH + 20, currentF);

      // Final output wire
      this._drawLine(svg, orResult.outX, orResult.outY, orResult.outX + 60, orResult.outY, currentF);
      this._drawText(svg, orResult.outX + 75, orResult.outY + 5, `F = ${currentF}`, {
        size: '15', weight: 'bold', fill: currentF ? '#10b981' : '#1e293b'
      });
    } else {
      // Single term - output directly
      const pt = andOutputs[0];
      this._drawText(svg, pt.x + 15, pt.y + 5, `F = ${currentF}`, {
        size: '15', weight: 'bold', anchor: 'start', fill: currentF ? '#10b981' : '#1e293b'
      });
    }

    return svg;
  }

  // --- Side-by-side comparison ---
  renderComparison(origExpr, minExpr, numVars) {
    if (!this.container) return;

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-top:1rem';

    // Original circuit
    const origCard = document.createElement('div');
    origCard.style.cssText = 'border:1px solid var(--color-border,#e2e8f0);border-radius:8px;padding:1rem';
    origCard.innerHTML = `<h4 style="margin:0 0 0.5rem;font-size:0.95rem;color:var(--color-text-muted)">Original Expression</h4>
      <div style="font-weight:700;margin-bottom:0.75rem;color:var(--color-text)">F = ${origExpr || 'N/A'}</div>
      <div id="circuit-compare-orig"></div>`;
    wrapper.appendChild(origCard);

    // Minimized circuit
    const minCard = document.createElement('div');
    minCard.style.cssText = 'border:1px solid var(--color-border,#e2e8f0);border-radius:8px;padding:1rem';
    minCard.innerHTML = `<h4 style="margin:0 0 0.5rem;font-size:0.95rem;color:var(--color-success,#10b981)">Minimized Expression</h4>
      <div style="font-weight:700;margin-bottom:0.75rem;color:var(--color-text)">F = ${minExpr || 'N/A'}</div>
      <div id="circuit-compare-min"></div>`;
    wrapper.appendChild(minCard);

    this.container.appendChild(wrapper);

    // Render both circuits
    if (origExpr && origExpr !== '0' && origExpr !== '1') {
      const origTerms = origExpr.split('+').map(t => t.trim()).filter(Boolean);
      const origSvg = this._renderSOPCircuit(origTerms, getVarNames(numVars));
      document.getElementById('circuit-compare-orig').appendChild(origSvg);
    }
    if (minExpr && minExpr !== '0' && minExpr !== '1') {
      const minTerms = minExpr.split('+').map(t => t.trim()).filter(Boolean);
      const minSvg = this._renderSOPCircuit(minTerms, getVarNames(numVars));
      document.getElementById('circuit-compare-min').appendChild(minSvg);
    }

    // Gate count comparison
    const origCounts = this.getGateCounts(origExpr, numVars);
    const minCounts = this.getGateCounts(minExpr, numVars);
    const origTotal = origCounts.andGates + origCounts.orGates + origCounts.notGates;
    const minTotal = minCounts.andGates + minCounts.orGates + minCounts.notGates;
    const savings = origTotal > 0 ? ((origTotal - minTotal) / origTotal * 100).toFixed(1) : 0;

    const compDiv = document.createElement('div');
    compDiv.style.cssText = 'margin-top:1rem;padding:1rem;border-radius:8px;background:var(--color-surface,#f8fafc);border:1px solid var(--color-border,#e2e8f0)';
    compDiv.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:1rem;text-align:center">
        <div><div style="font-size:0.75rem;color:var(--color-text-muted);font-weight:600">ORIGINAL GATES</div><div style="font-size:1.3rem;font-weight:bold">${origTotal}</div></div>
        <div><div style="font-size:0.75rem;color:var(--color-text-muted);font-weight:600">MINIMIZED GATES</div><div style="font-size:1.3rem;font-weight:bold;color:var(--color-success)">${minTotal}</div></div>
        <div><div style="font-size:0.75rem;color:var(--color-text-muted);font-weight:600">SAVINGS</div><div style="font-size:1.3rem;font-weight:bold;color:var(--color-success)">${savings}%</div></div>
      </div>`;
    this.container.appendChild(compDiv);
  }

  // --- NAND circuit rendering ---
  renderNANDCircuit(nandData, numVars) {
    if (!nandData || !nandData.structure) return;
    const vars = getVarNames(numVars);

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'margin-top:1rem;border:1px solid var(--color-border,#e2e8f0);border-radius:8px;padding:1rem';
    wrapper.innerHTML = `<h4 style="margin:0 0 0.5rem;color:#7c3aed">NAND-Only Implementation</h4>
      <div style="font-size:0.9rem;margin-bottom:0.75rem;color:var(--color-text-muted)">${nandData.description}</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0.5rem;margin-bottom:0.75rem">
        <div style="text-align:center;padding:0.4rem;background:#faf5ff;border-radius:6px;border:1px solid #e9d5ff">
          <div style="font-size:0.7rem;color:#6b21a8;font-weight:600">NAND GATES</div>
          <div style="font-size:1.2rem;font-weight:bold;color:#7e22ce">${nandData.gates}</div>
        </div>
        <div style="text-align:center;padding:0.4rem;background:#faf5ff;border-radius:6px;border:1px solid #e9d5ff">
          <div style="font-size:0.7rem;color:#6b21a8;font-weight:600">LEVELS</div>
          <div style="font-size:1.2rem;font-weight:bold;color:#7e22ce">${nandData.levels}</div>
        </div>
        <div style="text-align:center;padding:0.4rem;background:#faf5ff;border-radius:6px;border:1px solid #e9d5ff">
          <div style="font-size:0.7rem;color:#6b21a8;font-weight:600">INVERTERS</div>
          <div style="font-size:1.2rem;font-weight:bold;color:#7e22ce">${nandData.structure.inverters.length}</div>
        </div>
      </div>`;

    // Draw NAND circuit SVG
    const struct = nandData.structure;
    const numFirst = struct.firstLevel.length;
    const termSpacing = 65;
    const svgHeight = Math.max(180, numFirst * termSpacing + 60);
    const svgWidth = 700;
    const svg = this._createSVG(svgWidth, svgHeight);

    // Input rails
    const railX = {};
    vars.forEach((v, i) => {
      const x = 50 + i * 45;
      railX[v] = x;
      const val = Boolean(this.inputStates[v]);
      this._drawText(svg, x, 22, v, { size: '13', fill: val ? '#10b981' : '#334155' });
      this._drawLine(svg, x, 30, x, svgHeight - 10, val);
    });

    const gateX = 260;
    const gateW = 55;
    const gateH = 40;
    const firstOutputs = [];

    struct.firstLevel.forEach((level, idx) => {
      const gateY = 50 + idx * termSpacing;
      const inputs = level.inputs;

      let termVal = true;
      const inputSpacing = Math.min(10, (gateH - 6) / Math.max(inputs.length, 1));
      const startY = gateY - (inputs.length - 1) * inputSpacing / 2;

      inputs.forEach((lit, lIdx) => {
        const v = lit[0];
        const isNot = lit.endsWith("'");
        const bitVal = Boolean(this.inputStates[v]);
        const litVal = isNot ? !bitVal : bitVal;
        termVal = termVal && litVal;
        const inY = startY + lIdx * inputSpacing;

        this._drawLine(svg, railX[v], inY, isNot ? gateX - 12 : gateX, inY, bitVal);
        this._drawDot(svg, railX[v], inY, bitVal);
        if (isNot) {
          this._drawNotBubble(svg, gateX - 6, inY, !bitVal);
        }
      });

      // NAND gate = AND + NOT bubble
      const nandVal = !termVal;
      const result = this._drawNANDGate(svg, gateX, gateY, gateW, gateH, nandVal);

      const wireEndX = struct.secondLevel ? 450 : 550;
      this._drawLine(svg, result.outX, result.outY, wireEndX, result.outY, nandVal);
      firstOutputs.push({ x: wireEndX, y: result.outY, val: nandVal });
    });

    // Second level NAND gate
    if (struct.secondLevel && firstOutputs.length > 1) {
      const secGateX = 460;
      const secGateY = (firstOutputs[0].y + firstOutputs[firstOutputs.length - 1].y) / 2;

      firstOutputs.forEach(pt => {
        this._drawPath(svg, `M ${pt.x} ${pt.y} L ${secGateX} ${secGateY + (pt.y - secGateY) * 0.4}`, pt.val, 'none');
      });

      let secondInput = firstOutputs.some(p => p.val);
      const secondNandVal = !firstOutputs.every(p => p.val);
      const secResult = this._drawNANDGate(svg, secGateX, secGateY, gateW + 5, gateH + 10, secondNandVal);

      this._drawLine(svg, secResult.outX, secResult.outY, secResult.outX + 50, secResult.outY, secondNandVal);

      const varVals = {};
      vars.forEach(v => varVals[v] = Boolean(this.inputStates[v]));
      const actualF = evaluateExpression(this.currentExpr, varVals) ? 1 : 0;
      this._drawText(svg, secResult.outX + 65, secResult.outY + 5, `F = ${actualF}`, {
        size: '14', fill: actualF ? '#10b981' : '#1e293b'
      });
    }

    wrapper.appendChild(svg);
    this.container.appendChild(wrapper);
  }

  // --- NOR circuit rendering ---
  renderNORCircuit(norData, numVars) {
    if (!norData || !norData.structure) return;
    const vars = getVarNames(numVars);

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'margin-top:1rem;border:1px solid var(--color-border,#e2e8f0);border-radius:8px;padding:1rem';
    wrapper.innerHTML = `<h4 style="margin:0 0 0.5rem;color:#0d9488">NOR-Only Implementation</h4>
      <div style="font-size:0.9rem;margin-bottom:0.75rem;color:var(--color-text-muted)">${norData.description}</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0.5rem;margin-bottom:0.75rem">
        <div style="text-align:center;padding:0.4rem;background:#f0fdfa;border-radius:6px;border:1px solid #99f6e4">
          <div style="font-size:0.7rem;color:#0f766e;font-weight:600">NOR GATES</div>
          <div style="font-size:1.2rem;font-weight:bold;color:#0d9488">${norData.gates}</div>
        </div>
        <div style="text-align:center;padding:0.4rem;background:#f0fdfa;border-radius:6px;border:1px solid #99f6e4">
          <div style="font-size:0.7rem;color:#0f766e;font-weight:600">LEVELS</div>
          <div style="font-size:1.2rem;font-weight:bold;color:#0d9488">${norData.levels}</div>
        </div>
        <div style="text-align:center;padding:0.4rem;background:#f0fdfa;border-radius:6px;border:1px solid #99f6e4">
          <div style="font-size:0.7rem;color:#0f766e;font-weight:600">INVERTERS</div>
          <div style="font-size:1.2rem;font-weight:bold;color:#0d9488">${norData.structure.inverters.length}</div>
        </div>
      </div>`;

    const struct = norData.structure;
    const numFirst = struct.firstLevel.length;
    const termSpacing = 65;
    const svgHeight = Math.max(180, numFirst * termSpacing + 60);
    const svgWidth = 700;
    const svg = this._createSVG(svgWidth, svgHeight);

    const railX = {};
    vars.forEach((v, i) => {
      const x = 50 + i * 45;
      railX[v] = x;
      const val = Boolean(this.inputStates[v]);
      this._drawText(svg, x, 22, v, { size: '13', fill: val ? '#10b981' : '#334155' });
      this._drawLine(svg, x, 30, x, svgHeight - 10, val);
    });

    const gateX = 260;
    const gateW = 55;
    const gateH = 40;
    const firstOutputs = [];

    struct.firstLevel.forEach((level, idx) => {
      const gateY = 50 + idx * termSpacing;
      const inputs = level.inputs;

      let orVal = false;
      const inputSpacing = Math.min(10, (gateH - 6) / Math.max(inputs.length, 1));
      const startY = gateY - (inputs.length - 1) * inputSpacing / 2;

      inputs.forEach((lit, lIdx) => {
        const litStr = lit.trim();
        const varMatch = litStr.match(/[A-D]'?/g) || [litStr];
        const v = varMatch[0][0];
        const isNot = varMatch[0].endsWith("'");
        const bitVal = Boolean(this.inputStates[v]);
        const litVal = isNot ? !bitVal : bitVal;
        orVal = orVal || litVal;
        const inY = startY + lIdx * inputSpacing;

        this._drawLine(svg, railX[v], inY, isNot ? gateX - 12 : gateX, inY, bitVal);
        this._drawDot(svg, railX[v], inY, bitVal);
        if (isNot) {
          this._drawNotBubble(svg, gateX - 6, inY, !bitVal);
        }
      });

      const norVal = !orVal;
      const result = this._drawNORGate(svg, gateX, gateY, gateW, gateH, norVal);
      const wireEndX = struct.secondLevel ? 450 : 550;
      this._drawLine(svg, result.outX, result.outY, wireEndX, result.outY, norVal);
      firstOutputs.push({ x: wireEndX, y: result.outY, val: norVal });
    });

    if (struct.secondLevel && firstOutputs.length > 1) {
      const secGateX = 460;
      const secGateY = (firstOutputs[0].y + firstOutputs[firstOutputs.length - 1].y) / 2;

      firstOutputs.forEach(pt => {
        this._drawPath(svg, `M ${pt.x} ${pt.y} L ${secGateX} ${secGateY + (pt.y - secGateY) * 0.4}`, pt.val, 'none');
      });

      const secondNorVal = !firstOutputs.some(p => p.val);
      const secResult = this._drawNORGate(svg, secGateX, secGateY, gateW + 5, gateH + 10, secondNorVal);

      this._drawLine(svg, secResult.outX, secResult.outY, secResult.outX + 50, secResult.outY, secondNorVal);

      const varVals = {};
      vars.forEach(v => varVals[v] = Boolean(this.inputStates[v]));
      const actualF = evaluateExpression(this.currentExpr, varVals) ? 1 : 0;
      this._drawText(svg, secResult.outX + 65, secResult.outY + 5, `F = ${actualF}`, {
        size: '14', fill: actualF ? '#10b981' : '#1e293b'
      });
    }

    wrapper.appendChild(svg);
    this.container.appendChild(wrapper);
  }
}
