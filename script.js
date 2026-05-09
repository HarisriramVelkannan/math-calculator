'use strict';

/* ══════════════════════════════════════════════════════
   TOP-LEVEL NAVIGATION
   ══════════════════════════════════════════════════════ */
function switchTool(tool) {
  ['trap','gauss','rk'].forEach(t => {
    document.getElementById('sect-' + t).classList.toggle('active', t === tool);
    const btn = document.getElementById('nav' + t.charAt(0).toUpperCase() + t.slice(1));
    btn.className = 'nav-tab' + (t === tool ? ' active-' + t : '');
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ══════════════════════════════════════════════════════
   TRAPEZOIDAL RULE
   ══════════════════════════════════════════════════════ */
const T_EPS = 1e-12;
let currentMode = 'single';

function switchMode(mode) {
  currentMode = mode;
  const isSingle = mode === 'single';
  document.getElementById('panelSingle').classList.toggle('hidden', !isSingle);
  document.getElementById('panelDouble').classList.toggle('hidden',  isSingle);
  document.getElementById('fSingle').classList.toggle('hidden', !isSingle);
  document.getElementById('fDouble').classList.toggle('hidden',  isSingle);
  document.getElementById('btnSingle').classList.toggle('active',     isSingle);
  document.getElementById('btnDouble').classList.toggle('active',    !isSingle);
  document.getElementById('btnDouble').classList.toggle('vi-active', !isSingle);
}

function parseFunc(expr, vars = ['x']) {
  if (!expr || !expr.trim()) throw new Error('Please enter a function.');
  if (!/^[0-9xyXY\s\+\-\*\/\^\(\)\.\,a-zA-Z_]+$/.test(expr))
    throw new Error('Invalid characters in function.');
  let js = expr
    .replace(/\^/g,'**').replace(/\bsin\b/g,'Math.sin').replace(/\bcos\b/g,'Math.cos')
    .replace(/\btan\b/g,'Math.tan').replace(/\basin\b/g,'Math.asin').replace(/\bacos\b/g,'Math.acos')
    .replace(/\batan\b/g,'Math.atan').replace(/\bsinh\b/g,'Math.sinh').replace(/\bcosh\b/g,'Math.cosh')
    .replace(/\bexp\b/g,'Math.exp').replace(/\bln\b/g,'Math.log').replace(/\blog\b/g,'Math.log')
    .replace(/\bsqrt\b/g,'Math.sqrt').replace(/\babs\b/g,'Math.abs').replace(/\bcbrt\b/g,'Math.cbrt')
    .replace(/\bPI\b/g,'Math.PI').replace(/\bE\b/g,'Math.E');
  try {
    const fn = new Function(...vars, `"use strict"; return (${js});`);
    const t = fn(...vars.map(() => 1));
    if (typeof t !== 'number') throw new Error();
    return fn;
  } catch { throw new Error(`Could not parse function "${expr}". Check your syntax.`); }
}

function tfmt(x, dp = 6) {
  if (!isFinite(x)) return 'undef';
  const r = Math.round(x * 1e10) / 1e10;
  if (Math.abs(r) < T_EPS) return '0';
  return parseFloat(r.toFixed(dp)).toString();
}
const tf4 = x => tfmt(x,4), tf6 = x => tfmt(x,6), tf8 = x => tfmt(x,8);

function validateSingle(fn, a, b, n) {
  if (!fn) throw new Error('Please enter a function f(x).');
  if (isNaN(a)) throw new Error('Lower limit (a) must be a number.');
  if (isNaN(b)) throw new Error('Upper limit (b) must be a number.');
  if (a >= b) throw new Error('Lower limit a must be strictly less than b.');
  if (!Number.isInteger(n) || n < 1) throw new Error('n must be a positive integer.');
  if (n > 500) throw new Error('n too large (max 500).');
}
function validateDouble(fn, a, b, c, d, nx, ny) {
  if (!fn) throw new Error('Please enter a function f(x, y).');
  if (isNaN(a)||isNaN(b)) throw new Error('x-limits must be valid numbers.');
  if (isNaN(c)||isNaN(d)) throw new Error('y-limits must be valid numbers.');
  if (a >= b) throw new Error('x: lower limit a must be < upper limit b.');
  if (c >= d) throw new Error('y: lower limit c must be < upper limit d.');
  if (!Number.isInteger(nx)||nx<1) throw new Error('nₓ must be a positive integer.');
  if (!Number.isInteger(ny)||ny<1) throw new Error('nᵧ must be a positive integer.');
  if (nx > 30 || ny > 30) throw new Error('Max 30 sub-intervals per axis for display.');
}

const SINGLE_PRESETS = {
  x2:{fn:'x^2',a:0,b:1,n:6}, sinx:{fn:'sin(x)',a:0,b:3.14159,n:6},
  expx:{fn:'exp(x)',a:0,b:1,n:5}, sqrt:{fn:'sqrt(x)',a:0,b:4,n:8},
  poly:{fn:'x^3 - 2*x',a:-1,b:2,n:6}, inv:{fn:'1/x',a:1,b:4,n:6},
};
const DOUBLE_PRESETS = {
  xy:{fn:'x*y',a:0,b:1,c:0,d:1,nx:4,ny:4},
  x2y2:{fn:'x^2 + y^2',a:0,b:1,c:0,d:1,nx:4,ny:4},
  sinxy:{fn:'sin(x*y)',a:0,b:1,c:0,d:1,nx:4,ny:4},
  expxy:{fn:'exp(x+y)',a:0,b:1,c:0,d:1,nx:3,ny:3},
};

function sp(key) {
  const p = SINGLE_PRESETS[key]; if (!p) return;
  document.getElementById('s_fn').value=p.fn; document.getElementById('s_a').value=p.a;
  document.getElementById('s_b').value=p.b; document.getElementById('s_n').value=p.n;
  hideEl('s_error'); hideEl('s_output');
}
function dp(key) {
  const p = DOUBLE_PRESETS[key]; if (!p) return;
  ['fn','a','b','c','d','nx','ny'].forEach(k => { document.getElementById('d_'+k).value=p[k]; });
  hideEl('d_error'); hideEl('d_output');
}

function solveSingle() {
  const btn = document.querySelector('#panelSingle .btn-primary');
  btn.disabled=true; btn.innerHTML='<span>⟳</span> Calculating…';
  setTimeout(() => {
    try { _solveSingle(); } catch(e) { showError('s_error',e.message); hideEl('s_output'); }
    btn.disabled=false; btn.innerHTML='<span>▶</span> Calculate';
  }, 60);
}
function _solveSingle() {
  hideEl('s_error');
  const fnStr=document.getElementById('s_fn').value.trim();
  const a=parseFloat(document.getElementById('s_a').value);
  const b=parseFloat(document.getElementById('s_b').value);
  const n=parseInt(document.getElementById('s_n').value,10);
  validateSingle(fnStr,a,b,n);
  const fn=parseFunc(fnStr,['x']);
  const h=(b-a)/n; const xs=[],ys=[];
  for(let i=0;i<=n;i++){const xi=a+i*h;const yi=fn(xi);if(!isFinite(yi))throw new Error(`f(x) undefined at x=${tf4(xi)}`);xs.push(xi);ys.push(yi);}
  let wSum=ys[0]+ys[n]; for(let i=1;i<n;i++) wSum+=2*ys[i];
  const result=(h/2)*wSum;
  document.getElementById('s_badge').textContent=`${n+1} nodes`;
  document.getElementById('s_graphTitle').textContent=`f(x) = ${fnStr}`;
  renderSingleInfo(h,a,b,n); renderSingleTable(xs,ys,n,wSum);
  renderSingleFormula(fnStr,xs,ys,n,h,wSum,result); renderSingleResult(result,fnStr,a,b,n,h);
  drawSingleGraph(fn,xs,ys,a,b,n); showEl('s_output');
  document.getElementById('s_output').scrollIntoView({behavior:'smooth',block:'start'});
}
function renderSingleInfo(h,a,b,n) {
  document.getElementById('s_stepsInfo').innerHTML=`
    <div class="si"><span class="si-k">h</span><span class="si-v">${tf6(h)}</span></div>
    <div class="si"><span class="si-k">a</span><span class="si-v">${tf4(a)}</span></div>
    <div class="si"><span class="si-k">b</span><span class="si-v">${tf4(b)}</span></div>
    <div class="si"><span class="si-k">n</span><span class="si-v">${n}</span></div>
    <div class="si"><span class="si-k">Formula</span><span class="si-v">h/2 · [f₀ + 2Σfᵢ + fₙ]</span></div>`;
}
function renderSingleTable(xs,ys,n,wSum) {
  const tbody=document.getElementById('s_tbody'),tfoot=document.getElementById('s_tfoot');
  tbody.innerHTML='';
  xs.forEach((xi,i)=>{
    const yi=ys[i],isEnd=(i===0||i===n),coeff=isEnd?1:2,contrib=coeff*yi;
    const tr=document.createElement('tr'); tr.className=isEnd?'tr-end':'tr-mid';
    tr.innerHTML=`<td>${i}</td><td>${tf6(xi)}</td><td>${tf6(yi)}</td><td class="${isEnd?'w1':'w2'}">${coeff}</td><td class="cv">${tf6(contrib)}</td>`;
    tbody.appendChild(tr);
  });
  tfoot.innerHTML=`<tr><td colspan="4" class="tf-lbl">Weighted Sum</td><td class="tf-val">${tf6(wSum)}</td></tr>`;
}
function renderSingleFormula(fnStr,xs,ys,n,h,wSum,result) {
  const terms=ys.map((yi,i)=>`${(i===0||i===n)?'':'2·'}${tf4(yi)}`);
  const termsStr=terms.length<=7?terms.join(' + '):terms.slice(0,4).join(' + ')+' + ··· + '+terms[n];
  document.getElementById('s_formula').innerHTML=`
    <div class="fs-line"><span class="fk">① Step size:</span> h = (${tf4(xs[n])} − ${tf4(xs[0])}) / ${n} = <span class="fv">${tf6(h)}</span></div>
    <div class="fs-line"><span class="fk">② Node values:</span> ${xs.map((xi,i)=>`f(${tf4(xi)})=${tf4(ys[i])}`).slice(0,6).join(', ')}${xs.length>6?' …':''}</div>
    <div class="fs-line"><span class="fk">③ Weighted sum:</span> ${termsStr} = <span class="fv">${tf6(wSum)}</span></div>
    <div class="fs-line"><span class="fk">④ Apply h/2:</span> (${tf4(h)}/2) × ${tf6(wSum)} = <span class="fv">${tf6(h/2)} × ${tf6(wSum)}</span></div>
    <div class="fs-line main"><span class="fk">Result:</span> ∫<sub>${tf4(xs[0])}</sub><sup>${tf4(xs[n])}</sup> f(x) dx ≈ <span class="fr">${tf8(result)}</span></div>`;
}
function renderSingleResult(result,fnStr,a,b,n,h) {
  document.getElementById('s_result').innerHTML=`
    <div class="rd-label">Approximate Integral</div>
    <div class="rd-integral">∫<sub>${tf4(a)}</sub><sup>${tf4(b)}</sup> (${fnStr}) dx</div>
    <div class="rd-value">${tf8(result)}</div>
    <div class="rd-dp">≈ ${tf4(result)} (4 d.p.)</div>
    <div class="rd-stats">
      <div class="rd-stat"><div class="rd-stat-k">Step h</div><div class="rd-stat-v">${tf6(h)}</div></div>
      <div class="rd-stat"><div class="rd-stat-k">Intervals</div><div class="rd-stat-v">${n}</div></div>
    </div>`;
}
function drawSingleGraph(fn,xs,ys,a,b,n) {
  const canvas=document.getElementById('s_canvas');
  const dpr=window.devicePixelRatio||1,W=canvas.parentElement.clientWidth||700,H=320;
  canvas.width=W*dpr;canvas.height=H*dpr;canvas.style.width=W+'px';canvas.style.height=H+'px';
  const ctx=canvas.getContext('2d'); ctx.scale(dpr,dpr);
  const pad={top:28,right:20,bottom:38,left:55};
  const cw=W-pad.left-pad.right,ch=H-pad.top-pad.bottom;
  const S=500,cxArr=[],cyArr=[];
  for(let i=0;i<=S;i++){const xi=a+(b-a)*i/S;try{const yi=fn(xi);cxArr.push(xi);cyArr.push(isFinite(yi)?yi:NaN);}catch{cxArr.push(xi);cyArr.push(NaN);}}
  const allY=[...cyArr.filter(isFinite),...ys,0];
  let yMin=Math.min(...allY),yMax=Math.max(...allY);
  const yP=(yMax-yMin)*0.15||1; yMin-=yP; yMax+=yP;
  const mx=x=>pad.left+(x-a)/(b-a)*cw,my=y=>pad.top+(yMax-y)/(yMax-yMin)*ch,z=my(0);
  ctx.fillStyle='#0a0e18';ctx.fillRect(0,0,W,H);
  ctx.strokeStyle='rgba(34,211,238,.05)';ctx.lineWidth=1;
  for(let i=0;i<=6;i++){const gx=pad.left+cw*i/6,gy=pad.top+ch*i/6;ctx.beginPath();ctx.moveTo(gx,pad.top);ctx.lineTo(gx,pad.top+ch);ctx.stroke();ctx.beginPath();ctx.moveTo(pad.left,gy);ctx.lineTo(pad.left+cw,gy);ctx.stroke();}
  ctx.strokeStyle='rgba(221,232,248,.15)';ctx.lineWidth=1;
  if(z>=pad.top&&z<=pad.top+ch){ctx.beginPath();ctx.moveTo(pad.left,z);ctx.lineTo(pad.left+cw,z);ctx.stroke();}
  for(let i=0;i<n;i++){const x0=mx(xs[i]),y0=my(ys[i]),x1=mx(xs[i+1]),y1=my(ys[i+1]);ctx.beginPath();ctx.moveTo(x0,z);ctx.lineTo(x0,y0);ctx.lineTo(x1,y1);ctx.lineTo(x1,z);ctx.closePath();ctx.fillStyle='rgba(74,222,128,.11)';ctx.strokeStyle='rgba(74,222,128,.5)';ctx.lineWidth=1.5;ctx.fill();ctx.stroke();}
  ctx.beginPath();let started=false;
  for(let i=0;i<cxArr.length;i++){const px=mx(cxArr[i]),py=my(cyArr[i]);if(!isFinite(cyArr[i])){started=false;continue;}started?ctx.lineTo(px,py):(ctx.moveTo(px,py),started=true);}
  ctx.strokeStyle='#22d3ee';ctx.lineWidth=2.5;ctx.lineJoin='round';ctx.stroke();
  ctx.setLineDash([3,4]);ctx.strokeStyle='rgba(251,191,36,.2)';ctx.lineWidth=1;
  xs.forEach((xi,i)=>{const px=mx(xi),py=my(ys[i]);ctx.beginPath();ctx.moveTo(px,z);ctx.lineTo(px,py);ctx.stroke();});
  ctx.setLineDash([]);
  xs.forEach((xi,i)=>{const px=mx(xi),py=my(ys[i]);ctx.beginPath();ctx.arc(px,py,4.5,0,Math.PI*2);ctx.fillStyle='#fbbf24';ctx.strokeStyle='#0a0e18';ctx.lineWidth=1.5;ctx.fill();ctx.stroke();});
  ctx.fillStyle='rgba(122,144,176,.65)';ctx.font=`11px 'Fira Code',monospace`;ctx.textAlign='center';
  const step=Math.ceil((n+1)/8);
  for(let i=0;i<=n;i+=step) ctx.fillText(tf4(xs[i]),mx(xs[i]),pad.top+ch+15);
  ctx.textAlign='right';
  for(let i=0;i<=5;i++){const yv=yMin+(yMax-yMin)*i/5;ctx.fillText(tf4(yv),pad.left-6,my(yv)+4);}
  ctx.fillStyle='rgba(34,211,238,.55)';ctx.font=`italic 11px 'Fira Code',monospace`;ctx.textAlign='left';ctx.fillText('f(x)',pad.left+4,pad.top+13);
}

function solveDouble() {
  const btn=document.querySelector('#panelDouble .btn-primary');
  btn.disabled=true;btn.innerHTML='<span>⟳</span> Calculating…';
  setTimeout(()=>{
    try{_solveDouble();}catch(e){showError('d_error',e.message);hideEl('d_output');}
    btn.disabled=false;btn.innerHTML='<span>▶</span> Calculate';
  },60);
}
function _solveDouble() {
  hideEl('d_error');
  const fnStr=document.getElementById('d_fn').value.trim();
  const a=parseFloat(document.getElementById('d_a').value),b=parseFloat(document.getElementById('d_b').value);
  const c=parseFloat(document.getElementById('d_c').value),d=parseFloat(document.getElementById('d_d').value);
  const nx=parseInt(document.getElementById('d_nx').value,10),ny=parseInt(document.getElementById('d_ny').value,10);
  validateDouble(fnStr,a,b,c,d,nx,ny);
  const fn=parseFunc(fnStr,['x','y']);
  const hx=(b-a)/nx,hy=(d-c)/ny;
  const xs=[],ys=[]; for(let i=0;i<=nx;i++) xs.push(a+i*hx); for(let j=0;j<=ny;j++) ys.push(c+j*hy);
  const fGrid=[];
  for(let i=0;i<=nx;i++){fGrid[i]=[];for(let j=0;j<=ny;j++){const v=fn(xs[i],ys[j]);if(!isFinite(v))throw new Error(`f undefined at (${tf4(xs[i])},${tf4(ys[j])})`);fGrid[i][j]=v;}}
  let wSum=0;const wGrid=[];
  for(let i=0;i<=nx;i++){wGrid[i]=[];for(let j=0;j<=ny;j++){const onX=(i===0||i===nx),onY=(j===0||j===ny);const w=onX&&onY?1:onX||onY?2:4;wGrid[i][j]=w;wSum+=w*fGrid[i][j];}}
  const result=(hx*hy/4)*wSum;
  document.getElementById('d_badge').textContent=`${(nx+1)*(ny+1)} nodes`;
  document.getElementById('d_graphTitle').textContent=`f(x,y) = ${fnStr}`;
  document.getElementById('d_stepsInfo').innerHTML=`<div class="si"><span class="si-k">hₓ</span><span class="si-v vi">${tf6(hx)}</span></div><div class="si"><span class="si-k">hᵧ</span><span class="si-v vi">${tf6(hy)}</span></div><div class="si"><span class="si-k">x ∈</span><span class="si-v vi">[${tf4(a)},${tf4(b)}]</span></div><div class="si"><span class="si-k">y ∈</span><span class="si-v vi">[${tf4(c)},${tf4(d)}]</span></div><div class="si"><span class="si-k">nₓ×nᵧ</span><span class="si-v vi">${nx}×${ny}</span></div>`;
  let gh='<table class="grid-tbl"><thead><tr><th>x \\ y</th>';ys.forEach((yj,j)=>{gh+=`<th>y${j}=${tf4(yj)}</th>`;});gh+='</tr></thead><tbody>';
  for(let i=0;i<=nx;i++){gh+=`<tr><td class="row-lbl">x${i}=${tf4(xs[i])}</td>`;for(let j=0;j<=ny;j++) gh+=`<td>${tf4(fGrid[i][j])}</td>`;gh+='</tr>';}gh+='</tbody></table>';
  document.getElementById('d_gridTable').innerHTML=gh;
  let wh='<table class="grid-tbl"><thead><tr><th>x \\ y</th>';ys.forEach((yj,j)=>{wh+=`<th>y${j}</th>`;});wh+='</tr></thead><tbody>';
  for(let i=0;i<=nx;i++){wh+=`<tr><td class="row-lbl">x${i}</td>`;for(let j=0;j<=ny;j++){const w=wGrid[i][j];wh+=`<td class="${w===1?'gc-corner':w===2?'gc-edge':'gc-interior'}">${w}</td>`;}wh+='</tr>';}wh+='</tbody></table>';
  document.getElementById('d_weightTable').innerHTML=wh;
  document.getElementById('d_formula').innerHTML=`
    <div class="fs-line"><span class="fk">① Step sizes:</span> hₓ=${tf6(hx)}, hᵧ=${tf6(hy)}</div>
    <div class="fs-line"><span class="fk">② Weights:</span> Corners×1, Edges×2, Interior×4</div>
    <div class="fs-line"><span class="fk">③ Weighted sum:</span> <span class="fv vi">${tf6(wSum)}</span></div>
    <div class="fs-line main vi"><span class="fk">Result:</span> ∬f dx dy ≈ <span class="fr">${tf8(result)}</span></div>`;
  document.getElementById('d_result').innerHTML=`
    <div class="rd-label">Approximate Double Integral</div>
    <div class="rd-integral">∬<sub>[${tf4(a)},${tf4(b)}]×[${tf4(c)},${tf4(d)}]</sub> (${fnStr}) dx dy</div>
    <div class="rd-value vi">${tf8(result)}</div>
    <div class="rd-dp">≈ ${tf4(result)} (4 d.p.)</div>
    <div class="rd-stats">
      <div class="rd-stat"><div class="rd-stat-k">hₓ</div><div class="rd-stat-v">${tf6(hx)}</div></div>
      <div class="rd-stat"><div class="rd-stat-k">hᵧ</div><div class="rd-stat-v">${tf6(hy)}</div></div>
      <div class="rd-stat"><div class="rd-stat-k">nₓ×nᵧ</div><div class="rd-stat-v">${nx}×${ny}</div></div>
      <div class="rd-stat"><div class="rd-stat-k">Grid pts</div><div class="rd-stat-v">${(nx+1)*(ny+1)}</div></div>
    </div>`;
  drawHeatmap(fGrid,xs,ys,nx,ny); showEl('d_output');
  document.getElementById('d_output').scrollIntoView({behavior:'smooth',block:'start'});
}
function drawHeatmap(fGrid,xs,ys,nx,ny) {
  const canvas=document.getElementById('d_canvas');
  const dpr=window.devicePixelRatio||1,W=canvas.parentElement.clientWidth||700,H=320;
  canvas.width=W*dpr;canvas.height=H*dpr;canvas.style.width=W+'px';canvas.style.height=H+'px';
  const ctx=canvas.getContext('2d'); ctx.scale(dpr,dpr);
  const pad={top:28,right:20,bottom:36,left:50};
  const cw=W-pad.left-pad.right,ch=H-pad.top-pad.bottom;
  let vMin=Infinity,vMax=-Infinity;
  for(let i=0;i<=nx;i++) for(let j=0;j<=ny;j++){vMin=Math.min(vMin,fGrid[i][j]);vMax=Math.max(vMax,fGrid[i][j]);}
  const vRange=vMax-vMin||1;
  function colorMap(t){t=Math.max(0,Math.min(1,t));const stops=[[14,26,74],[30,64,175],[6,182,212],[74,222,128],[251,191,36],[239,68,68]];const idx=t*(stops.length-1);const lo=Math.floor(idx),hi=Math.min(lo+1,stops.length-1),f=idx-lo;return stops[lo].map((v,k)=>Math.round(v+(stops[hi][k]-v)*f));}
  ctx.fillStyle='#0a0e18';ctx.fillRect(0,0,W,H);
  for(let i=0;i<=nx;i++)for(let j=0;j<=ny;j++){const t=(fGrid[i][j]-vMin)/vRange;const[r,g,b]=colorMap(t);const x0=pad.left+(xs[i]-xs[0])/(xs[nx]-xs[0])*cw;const y0=pad.top+(ys[ny]-ys[j])/(ys[ny]-ys[0])*ch;const dx=i<nx?cw/nx:0,dy=j<ny?ch/ny:0;if(dx>0&&dy>0){ctx.fillStyle=`rgb(${r},${g},${b})`;ctx.globalAlpha=0.82;ctx.fillRect(x0,y0-dy,dx,dy);ctx.globalAlpha=1;}}
  ctx.strokeStyle='rgba(6,9,16,.6)';ctx.lineWidth=1;
  for(let i=0;i<=nx;i++){const gx=pad.left+i/nx*cw;ctx.beginPath();ctx.moveTo(gx,pad.top);ctx.lineTo(gx,pad.top+ch);ctx.stroke();}
  for(let j=0;j<=ny;j++){const gy=pad.top+j/ny*ch;ctx.beginPath();ctx.moveTo(pad.left,gy);ctx.lineTo(pad.left+cw,gy);ctx.stroke();}
  for(let i=0;i<=nx;i++)for(let j=0;j<=ny;j++){const px=pad.left+i/nx*cw,py=pad.top+(ny-j)/ny*ch;ctx.beginPath();ctx.arc(px,py,2.5,0,Math.PI*2);ctx.fillStyle='rgba(255,255,255,.45)';ctx.fill();}
  ctx.fillStyle='rgba(122,144,176,.7)';ctx.font=`10px 'Fira Code',monospace`;ctx.textAlign='center';
  const xStep=Math.ceil((nx+1)/7);for(let i=0;i<=nx;i+=xStep){const px=pad.left+i/nx*cw;ctx.fillText(tf4(xs[i]),px,pad.top+ch+14);}
  ctx.textAlign='right';const yStep=Math.ceil((ny+1)/6);for(let j=0;j<=ny;j+=yStep){const py=pad.top+(ny-j)/ny*ch;ctx.fillText(tf4(ys[j]),pad.left-5,py+4);}
}

function clearSingle(){['s_fn','s_a','s_b','s_n'].forEach(id=>document.getElementById(id).value='');hideEl('s_error');hideEl('s_output');}
function clearDouble(){['d_fn','d_a','d_b','d_c','d_d','d_nx','d_ny'].forEach(id=>document.getElementById(id).value='');hideEl('d_error');hideEl('d_output');}
function showError(id,msg){const el=document.getElementById(id);el.textContent=msg;el.classList.remove('hidden');}
function showEl(id){document.getElementById(id).classList.remove('hidden');}
function hideEl(id){document.getElementById(id).classList.add('hidden');}

/* ══════════════════════════════════════════════════════
   GAUSSIAN ELIMINATION
   ══════════════════════════════════════════════════════ */
const G_EPS=1e-10;
let G_N=3;
const G_VARNAMES=['x','y','z','w'];
const G_PRESETS={
  u3:{n:3,vals:[[2,1,-1,8],[-3,-1,2,-11],[-2,1,2,-3]]},
  u2:{n:2,vals:[[3,2,13],[1,-1,1]]},
  ns:{n:3,vals:[[1,1,1,3],[2,2,2,7],[3,3,3,10]]},
  inf:{n:3,vals:[[1,2,-1,3],[2,4,-2,6],[3,6,-3,9]]},
};

function buildMatrixInput(n){
  G_N=n;
  const area=document.getElementById('matrixArea'),vars=G_VARNAMES.slice(0,n);
  let html='<div class="matrix-shell"><div class="mat-brace l"></div><div class="mat-body">';
  for(let i=0;i<n;i++){html+='<div class="mat-row">';for(let j=0;j<n;j++) html+=`<input class="mi" type="number" id="m${i}${j}" step="any" placeholder="0"/>`;html+='<div class="aug-bar"></div>';html+=`<input class="mi aug" type="number" id="m${i}${n}" step="any" placeholder="0"/>`;html+='</div>';}
  html+='</div><div class="mat-brace r"></div></div>';
  html+='<div class="var-labels">';vars.forEach(v=>html+=`<span>${v}</span>`);html+=`<span class="al">b</span></div>`;
  area.innerHTML=html; hideGaussOutput();
}
function onSizeChangeDrop(){G_N=parseInt(document.getElementById('sizeSelect').value);buildMatrixInput(G_N);}
function readMatrix(){const m=[];for(let i=0;i<G_N;i++){const row=[];for(let j=0;j<=G_N;j++){const v=parseFloat(document.getElementById(`m${i}${j}`).value);row.push(isNaN(v)?0:v);}m.push(row);}return m;}
function gcp(m){return m.map(r=>[...r]);}
function gfmt(x){if(Math.abs(x)<G_EPS)return'0';const r=Math.round(x*1e9)/1e9;if(Math.abs(r-Math.round(r))<G_EPS)return String(Math.round(r));return parseFloat(r.toFixed(4)).toString();}
function fmtOp(ri,rj,k){const Ri=`R<sub>${ri+1}</sub>`,Rj=`R<sub>${rj+1}</sub>`;if(Math.abs(k-1)<G_EPS)return`${Ri} ← ${Ri} + ${Rj}`;if(Math.abs(k+1)<G_EPS)return`${Ri} ← ${Ri} − ${Rj}`;const ak=gfmt(Math.abs(k)),sg=k>0?'+':'−';return`${Ri} ← ${Ri} ${sg} ${ak}·${Rj}`;}
function fmtSwap(r1,r2){return`R<sub>${r1+1}</sub> ↔ R<sub>${r2+1}</sub>`;}
function buildTable(matrix,pivCol,changedRows,prev){
  const n=matrix.length,cols=matrix[0].length;
  let h='<div class="mtbl-wrap"><table class="mtbl"><tbody>';
  for(let i=0;i<n;i++){h+='<tr>';for(let j=0;j<cols;j++){if(j===cols-1)h+='<td class="sep">|</td>';let cls='';const v=matrix[i][j];if(j===cols-1)cls='aug';else if(j===pivCol&&i===pivCol)cls='piv';else if(Math.abs(v)<G_EPS)cls='zer';if(changedRows&&changedRows.includes(i)&&prev&&Math.abs(v-prev[i][j])>G_EPS)cls='chg';h+=`<td class="${cls}">${gfmt(v)}</td>`;}h+='</tr>';}
  h+='</tbody></table></div>';return h;
}
function gClassify(m){const n=m.length;for(let i=0;i<n;i++){const allZ=m[i].slice(0,n).every(v=>Math.abs(v)<G_EPS);if(allZ&&Math.abs(m[i][n])>G_EPS)return'nosol';}for(let i=0;i<n;i++)if(m[i].every(v=>Math.abs(v)<G_EPS))return'inf';return'unique';}
function backSub(m){const n=m.length,sol=new Array(n).fill(0),steps=[];
  for(let i=n-1;i>=0;i--){let rhs=m[i][n],expr=gfmt(m[i][n]),hasSub=false;
    for(let j=i+1;j<n;j++){if(Math.abs(m[i][j])>G_EPS){rhs-=m[i][j]*sol[j];const sg=m[i][j]>0?'−':'+';expr+=` ${sg} ${gfmt(Math.abs(m[i][j]))}·(${gfmt(sol[j])})`;hasSub=true;}}
    const piv=m[i][i];sol[i]=rhs/piv;const vn=G_VARNAMES[i];
    steps.push({variable:vn,eqLine:hasSub?`Row ${i+1}: ${gfmt(piv)}·${vn} = ${expr} = ${gfmt(rhs)}`:`Row ${i+1}: ${gfmt(piv)}·${vn} = ${gfmt(rhs)}`,result:`${vn} = ${gfmt(rhs)} ÷ ${gfmt(piv)} = ${gfmt(sol[i])}`,value:sol[i]});}
  return{sol,steps};}
function toFrac(x){if(Math.abs(x)<G_EPS)return'0';let bN=1,bD=1,bE=Infinity;for(let d=1;d<=100;d++){const n2=Math.round(x*d),e=Math.abs(x-n2/d);if(e<bE){bE=e;bN=n2;bD=d;}if(e<1e-6)break;}if(bE>1e-4)return null;if(bD===1)return String(bN);return`${bN}/${bD}`;}
function validateGaussInputs(){for(let i=0;i<G_N;i++)for(let j=0;j<=G_N;j++)if(document.getElementById(`m${i}${j}`).value.trim()==='')return false;return true;}

function solveGauss(){
  const btn=document.getElementById('solveBtn');btn.disabled=true;btn.innerHTML='<span>⟳</span> Solving…';
  setTimeout(()=>{_solveGauss();btn.disabled=false;btn.innerHTML='<span>▶</span> Solve System';},60);
}
function _solveGauss(){
  if(!validateGaussInputs()){showGaussBanner('err','✕  Fill in all matrix values before solving.');showGaussOutput(false,false);return;}
  const raw=readMatrix(),steps=[];let m=gcp(raw);
  steps.push({label:'Initial augmented matrix [A|b]',op:null,mat:gcp(m),changed:[],prev:null,pivCol:-1,init:true});
  const n=m.length;
  for(let col=0;col<n;col++){
    let maxR=col,maxV=Math.abs(m[col][col]);
    for(let r=col+1;r<n;r++)if(Math.abs(m[r][col])>maxV){maxV=Math.abs(m[r][col]);maxR=r;}
    if(maxR!==col){const prev=gcp(m);[m[col],m[maxR]]=[m[maxR],m[col]];steps.push({label:`Pivot: swap rows ${col+1} and ${maxR+1}`,op:fmtSwap(col,maxR),mat:gcp(m),changed:[col,maxR],prev,pivCol:col});}
    if(Math.abs(m[col][col])<G_EPS)continue;
    for(let row=col+1;row<n;row++){
      if(Math.abs(m[row][col])<G_EPS)continue;
      const k=-m[row][col]/m[col][col],prev=gcp(m);
      for(let c=col;c<=n;c++){m[row][c]+=k*m[col][c];if(Math.abs(m[row][c])<G_EPS)m[row][c]=0;}
      steps.push({label:`Eliminate column ${col+1} entry in row ${row+1}`,op:fmtOp(row,col,k),mat:gcp(m),changed:[row],prev,pivCol:col});
    }
  }
  const type=gClassify(m);let sol=null,bsSteps=[];
  if(type==='unique'){const res=backSub(m);sol=res.sol;bsSteps=res.steps;}
  gaussRender(steps,type,sol,bsSteps);
}
function gaussRender(steps,type,sol,bsSteps){
  showGaussOutput(type==='unique',true);
  if(type==='unique') showGaussBanner('ok','✓  Unique solution found — elimination and back substitution completed.');
  else if(type==='nosol') showGaussBanner('err','✕  Inconsistent system — no solution exists.');
  else showGaussBanner('inf','∞  Infinitely many solutions — free variables detected.');
  document.getElementById('gauss-stepsBadge').textContent=`${steps.length} step${steps.length!==1?'s':''}`;
  const sw=document.getElementById('gauss-stepsWrap');sw.innerHTML='';
  steps.forEach((st,idx)=>{
    const div=document.createElement('div');div.className='step-row';div.style.animationDelay=`${idx*.045}s`;
    const num=document.createElement('div');num.className=st.init?'step-num s0':'step-num';num.textContent=st.init?'0':String(idx);
    const body=document.createElement('div');body.className='step-body';
    body.innerHTML=`<div class="step-lbl">${st.label}</div>${st.op?`<div class="step-op">${st.op}</div>`:''}`+buildTable(st.mat,st.pivCol,st.changed,st.prev);
    div.appendChild(num);div.appendChild(body);sw.appendChild(div);
  });
  const bw=document.getElementById('gauss-bsubWrap');bw.innerHTML='';
  if(type==='unique'){
    document.getElementById('gauss-bsubCard').style.display='';
    bsSteps.forEach((bs,idx)=>{const d=document.createElement('div');d.className='bsub-item';d.style.animationDelay=`${idx*.07}s`;d.innerHTML=`<div class="bsub-var">${bs.variable}</div><div class="bsub-detail"><div class="bsub-eq">${bs.eqLine}</div><div class="bsub-res">→ ${bs.result}</div></div>`;bw.appendChild(d);});
  } else {document.getElementById('gauss-bsubCard').style.display='none';}
  const rw=document.getElementById('gauss-resultWrap');rw.innerHTML='';
  if(type==='unique'&&sol){
    const rv=document.createElement('div');rv.className='res-vars';
    G_VARNAMES.slice(0,G_N).forEach((v,i)=>{const valStr=gfmt(sol[i]),frac=toFrac(sol[i]);const d=document.createElement('div');d.className='res-var';d.style.animationDelay=`${i*.09}s`;d.innerHTML=`<div class="res-var-name">Variable ${v}</div><div class="res-val">${valStr}</div>${frac&&frac!==valStr?`<div class="res-frac">= ${frac}</div>`:''}`;rv.appendChild(d);});
    rw.appendChild(rv);
  } else if(type==='nosol'){
    rw.innerHTML=`<div class="res-special"><div class="res-special-icon" style="color:var(--ro)">∅</div><div class="res-special-title" style="color:var(--ro)">No Solution</div><div class="res-special-desc">The system is inconsistent. The equations represent parallel hyperplanes with no common point of intersection.</div></div>`;
  } else {
    rw.innerHTML=`<div class="res-special"><div class="res-special-icon" style="color:var(--gold)">∞</div><div class="res-special-title" style="color:var(--gold)">Infinitely Many Solutions</div><div class="res-special-desc">The system has one or more free variables. The equations share a line, plane, or hyperplane of solutions.</div></div>`;
  }
  document.getElementById('gauss-output').scrollIntoView({behavior:'smooth',block:'start'});
}
function showGaussOutput(bsub,show){
  document.getElementById('gauss-output').classList.remove('hidden');
  document.getElementById('gauss-stepsCard').style.display='';
  document.getElementById('gauss-resultCard').style.display='';
  if(bsub===false) document.getElementById('gauss-bsubCard').style.display='none';
}
function hideGaussOutput(){document.getElementById('gauss-output').classList.add('hidden');}
function showGaussBanner(cls,msg){const b=document.getElementById('gauss-banner');b.className=`gauss-banner ${cls}`;b.innerHTML=msg;}
function clearGauss(){for(let i=0;i<G_N;i++)for(let j=0;j<=G_N;j++){const el=document.getElementById(`m${i}${j}`);if(el)el.value='';}hideGaussOutput();}
function randomize(){const rng=()=>Math.round((Math.random()*10-5)*2)/2;for(let i=0;i<G_N;i++)for(let j=0;j<=G_N;j++){const el=document.getElementById(`m${i}${j}`);if(el)el.value=rng();}hideGaussOutput();}
function gaussPreset(key){const p=G_PRESETS[key];if(!p)return;G_N=p.n;document.getElementById('sizeSelect').value=String(p.n);buildMatrixInput(p.n);p.vals.forEach((row,i)=>{row.forEach((val,j)=>{const el=document.getElementById(`m${i}${j}`);if(el)el.value=val;});});hideGaussOutput();}

/* ══════════════════════════════════════════════════════
   RK4 ODE SOLVER
   ══════════════════════════════════════════════════════ */
let rkEndMode='xn';

const RK_PRESETS={
  xpy:{fn:'x + y',x0:0,y0:1,h:0.1,end:1},
  decay:{fn:'-2 * y',x0:0,y0:1,h:0.1,end:1},
  xty:{fn:'x * y',x0:0,y0:1,h:0.1,end:1},
  sin:{fn:'sin(x) - y',x0:0,y0:0,h:0.2,end:2},
  logistic:{fn:'y - y^2',x0:0,y0:0.1,h:0.2,end:4},
  poly:{fn:'x^2 - y',x0:0,y0:0,h:0.1,end:1},
};
function rkLoadPreset(key){
  const p=RK_PRESETS[key];if(!p)return;
  document.getElementById('rk_fn').value=p.fn;document.getElementById('rk_x0').value=p.x0;
  document.getElementById('rk_y0').value=p.y0;document.getElementById('rk_h').value=p.h;
  document.getElementById('rk_endVal').value=p.end;
  if(rkEndMode!=='xn')rkSwapMode();
  rkClearErr();rkHideOutput();
}
function rkSwapMode(){
  rkEndMode=rkEndMode==='xn'?'steps':'xn';
  const lbl=document.getElementById('rk_endLabel'),note=document.getElementById('rk_endNote'),inp=document.getElementById('rk_endVal');
  if(rkEndMode==='xn'){lbl.textContent='Target xₙ';note.textContent='Final x value to integrate to';inp.placeholder='1';inp.step='any';}
  else{lbl.textContent='Steps n';note.textContent='Number of RK4 steps to compute';inp.placeholder='10';inp.step='1';}
  inp.value='';
}
function rkParseFunc(expr){
  if(!expr||!expr.trim())throw new Error('Please enter a differential equation f(x, y).');
  if(!/^[0-9xy\s\+\-\*\/\^\(\)\.\,a-zA-Z_]+$/.test(expr))throw new Error('Invalid characters in function.');
  const js=expr.replace(/\^/g,'**').replace(/\bsin\b/g,'Math.sin').replace(/\bcos\b/g,'Math.cos')
    .replace(/\btan\b/g,'Math.tan').replace(/\basin\b/g,'Math.asin').replace(/\bacos\b/g,'Math.acos')
    .replace(/\batan\b/g,'Math.atan').replace(/\bsinh\b/g,'Math.sinh').replace(/\bcosh\b/g,'Math.cosh')
    .replace(/\bexp\b/g,'Math.exp').replace(/\bln\b/g,'Math.log').replace(/\blog\b/g,'Math.log')
    .replace(/\bsqrt\b/g,'Math.sqrt').replace(/\babs\b/g,'Math.abs').replace(/\bPI\b/g,'Math.PI').replace(/\bE\b/g,'Math.E');
  try{const fn=new Function('x','y',`"use strict"; return (${js});`);if(typeof fn(1,1)!=='number')throw 0;return fn;}
  catch{throw new Error(`Cannot parse "${expr}". Check syntax.`);}
}
function rkValidate(fnStr,x0,y0,h,ev){
  if(!fnStr)throw new Error('Please enter a function f(x, y).');
  if(isNaN(x0))throw new Error('x₀ must be a valid number.');
  if(isNaN(y0))throw new Error('y₀ must be a valid number.');
  if(isNaN(h)||h<=0)throw new Error('Step size h must be a positive number.');
  if(isNaN(ev))throw new Error(rkEndMode==='xn'?'Target xₙ must be a valid number.':'Step count must be a positive integer.');
  if(rkEndMode==='xn'&&ev<=x0)throw new Error('Target xₙ must be greater than x₀.');
  if(rkEndMode==='steps'&&(!Number.isInteger(ev)||ev<1))throw new Error('Step count must be a positive integer (≥ 1).');
}
function rkFmt(x,dp=8){if(!isFinite(x))return'undef';const r=Math.round(x*1e12)/1e12;if(Math.abs(r)<1e-12)return'0';return parseFloat(r.toFixed(dp)).toString();}
const rkf4=x=>rkFmt(x,4),rkf6=x=>rkFmt(x,6),rkf8=x=>rkFmt(x,8);

function rk4Step(f,xn,yn,h){const k1=h*f(xn,yn),k2=h*f(xn+h/2,yn+k1/2),k3=h*f(xn+h/2,yn+k2/2),k4=h*f(xn+h,yn+k3);return{k1,k2,k3,k4,yn1:yn+(k1+2*k2+2*k3+k4)/6};}

function rkSolve(){
  const btn=document.getElementById('rk_btnCalc');btn.disabled=true;btn.innerHTML='<span>⟳</span> Computing…';
  setTimeout(()=>{
    try{
      rkClearErr();
      const fnStr=document.getElementById('rk_fn').value.trim();
      const x0=parseFloat(document.getElementById('rk_x0').value),y0=parseFloat(document.getElementById('rk_y0').value);
      const h=parseFloat(document.getElementById('rk_h').value);
      const ev=rkEndMode==='steps'?parseInt(document.getElementById('rk_endVal').value,10):parseFloat(document.getElementById('rk_endVal').value);
      rkValidate(fnStr,x0,y0,h,ev);
      const f=rkParseFunc(fnStr);
      let N=rkEndMode==='xn'?Math.round((ev-x0)/h):ev;
      if(N<1)throw new Error('Step size h is too large for the given interval.');
      if(N>2000)throw new Error('Too many steps (max 2000). Increase h or reduce the interval.');
      const rows=[];let xn=x0,yn=y0;
      for(let i=0;i<N;i++){const r=rk4Step(f,xn,yn,h);if(!isFinite(r.yn1))throw new Error(`Solution diverged at step ${i+1}.`);rows.push({step:i+1,xn,yn,...r});xn=+(x0+(i+1)*h).toPrecision(14);yn=r.yn1;}
      document.getElementById('rk_graphSubtitle').textContent=`y′ = ${fnStr}`;
      document.getElementById('rk_stepCount').textContent=`${N} step${N>1?'s':''} computed`;
      rkRenderParams(x0,y0,h,N,rows[rows.length-1].xn+h);
      rkRenderTable(rows);rkRenderBreakdown(rows[rows.length-1],h);rkRenderResult(rows,fnStr,x0,y0,h);rkDrawGraph(rows,x0,y0,h);
      rkShowOutput();document.getElementById('rk_btnPdf').classList.remove('hidden');
      document.getElementById('rk_outputWrap').scrollIntoView({behavior:'smooth',block:'start'});
    }catch(e){rkShowErr(e.message);rkHideOutput();}
    btn.disabled=false;btn.innerHTML='<span>▶</span> Calculate';
  },70);
}
function rkRenderParams(x0,y0,h,N,xf){document.getElementById('rk_paramsRow').innerHTML=`<div class="pr-item"><span class="pr-k">x₀</span><span class="pr-v">${rkf6(x0)}</span></div><div class="pr-item"><span class="pr-k">y₀</span><span class="pr-v">${rkf6(y0)}</span></div><div class="pr-item"><span class="pr-k">h</span><span class="pr-v">${rkf6(h)}</span></div><div class="pr-item"><span class="pr-k">Steps</span><span class="pr-v">${N}</span></div><div class="pr-item"><span class="pr-k">x final</span><span class="pr-v">${rkf6(xf)}</span></div>`;}
function rkRenderTable(rows){const tbody=document.getElementById('rkBody');tbody.innerHTML='';rows.forEach(r=>{const tr=document.createElement('tr');tr.innerHTML=`<td>${r.step}</td><td>${rkf8(r.xn)}</td><td>${rkf8(r.yn)}</td><td>${rkf8(r.k1)}</td><td>${rkf8(r.k2)}</td><td>${rkf8(r.k3)}</td><td>${rkf8(r.k4)}</td><td>${rkf8(r.yn1)}</td>`;tbody.appendChild(tr);});}
function rkRenderBreakdown(r,h){
  const ws=r.k1+2*r.k2+2*r.k3+r.k4;
  document.getElementById('rk_breakdownBlock').innerHTML=`
    <div class="bd-cell"><div class="bd-cell-title">Step ${r.step} — Context</div><div class="bd-line">xₙ = <b style="color:var(--k3)">${rkf8(r.xn)}</b></div><div class="bd-line">yₙ = <b>${rkf8(r.yn)}</b></div><div class="bd-line">h  = <b>${rkf8(h)}</b></div></div>
    <div class="bd-cell"><div class="bd-cell-title">Slope Estimates</div><div class="bd-line"><b style="color:var(--k1)">k₁</b> = ${rkf8(r.k1)}</div><div class="bd-line"><b style="color:var(--k2)">k₂</b> = ${rkf8(r.k2)}</div><div class="bd-line"><b style="color:var(--k3)">k₃</b> = ${rkf8(r.k3)}</div><div class="bd-line"><b style="color:var(--k4)">k₄</b> = ${rkf8(r.k4)}</div></div>
    <div class="bd-cell"><div class="bd-cell-title">Weighted Sum</div><div class="bd-line">k₁ + 2k₂ + 2k₃ + k₄</div><div class="bd-line" style="color:var(--rk-gold);font-weight:600;margin-top:4px">= ${rkf8(ws)}</div></div>
    <div class="bd-cell"><div class="bd-cell-title">Update</div><div class="bd-line">yₙ₊₁ = yₙ + (1/6) × weighted sum</div><div class="bd-line">= ${rkf8(r.yn)} + ${rkf8(ws/6)}</div></div>
    <div class="bd-cell bd-full"><div class="bd-cell-title">yₙ₊₁ = yₙ + ⅙(k₁ + 2k₂ + 2k₃ + k₄)</div><div class="bd-answer">${rkf8(r.yn1)}</div></div>`;
}
function rkRenderResult(rows,fnStr,x0,y0,h){
  const last=rows[rows.length-1],xf=last.xn+h;
  document.getElementById('rk_resultBlock').innerHTML=`
    <div class="rk-res-primary"><div class="res-tag">FINAL COMPUTED VALUE</div><div class="res-expr">y(${rkf4(xf)}) =</div><div class="res-big">${rkf8(last.yn1)}</div><div class="res-dp">≈ ${rkf4(last.yn1)} (4 d.p.)</div></div>
    <div class="rk-res-meta">
      <div class="rk-res-stat"><div class="rs-k">Equation</div><div class="rs-v">y′ = ${fnStr}</div></div>
      <div class="rk-res-stat"><div class="rs-k">Initial Condition</div><div class="rs-v">y(${rkf4(x0)}) = ${rkf4(y0)}</div></div>
      <div class="rk-res-stat"><div class="rs-k">Range · Steps</div><div class="rs-v">[${rkf4(x0)}, ${rkf4(xf)}] · ${rows.length} step${rows.length>1?'s':''}</div></div>
      <div class="rk-res-stat"><div class="rs-k">Method</div><div class="rs-v">Runge–Kutta 4th Order</div></div>
    </div>`;
}
function rkDrawGraph(rows,x0,y0,h){
  const canvas=document.getElementById('solCanvas');
  const dpr=window.devicePixelRatio||1,W=canvas.parentElement.clientWidth||700,H=300;
  canvas.width=W*dpr;canvas.height=H*dpr;canvas.style.width=W+'px';canvas.style.height=H+'px';
  const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);
  const pad={top:28,right:22,bottom:40,left:60};const cw=W-pad.left-pad.right,ch=H-pad.top-pad.bottom;
  const allPts=[{x:x0,y:y0},...rows.map(r=>({x:r.xn+h,y:r.yn1}))];
  const xArr=allPts.map(p=>p.x),yArr=allPts.map(p=>p.y);
  let xMin=Math.min(...xArr),xMax=Math.max(...xArr),yMin=Math.min(...yArr,0),yMax=Math.max(...yArr);
  const xP=(xMax-xMin)*.05||.1,yP=(yMax-yMin)*.15||1;xMin-=xP;xMax+=xP;yMin-=yP;yMax+=yP;
  const mx=x=>pad.left+(x-xMin)/(xMax-xMin)*cw,my=y=>pad.top+(yMax-y)/(yMax-yMin)*ch;
  ctx.fillStyle='#12151e';ctx.fillRect(0,0,W,H);
  ctx.strokeStyle='rgba(201,168,76,.06)';ctx.lineWidth=1;
  for(let i=0;i<=7;i++){const gx=pad.left+cw*i/7;ctx.beginPath();ctx.moveTo(gx,pad.top);ctx.lineTo(gx,pad.top+ch);ctx.stroke();}
  for(let i=0;i<=4;i++){const gy=pad.top+ch*i/4;ctx.beginPath();ctx.moveTo(pad.left,gy);ctx.lineTo(pad.left+cw,gy);ctx.stroke();}
  ctx.strokeStyle='rgba(232,223,200,.12)';ctx.lineWidth=1;const zy=my(0);
  if(zy>=pad.top&&zy<=pad.top+ch){ctx.beginPath();ctx.moveTo(pad.left,zy);ctx.lineTo(pad.left+cw,zy);ctx.stroke();}
  ctx.beginPath();ctx.moveTo(mx(allPts[0].x),my(0));allPts.forEach(p=>ctx.lineTo(mx(p.x),my(p.y)));ctx.lineTo(mx(allPts[allPts.length-1].x),my(0));ctx.closePath();
  const grad=ctx.createLinearGradient(0,pad.top,0,pad.top+ch);grad.addColorStop(0,'rgba(201,168,76,.2)');grad.addColorStop(1,'rgba(201,168,76,.01)');ctx.fillStyle=grad;ctx.fill();
  ctx.beginPath();allPts.forEach((p,i)=>i===0?ctx.moveTo(mx(p.x),my(p.y)):ctx.lineTo(mx(p.x),my(p.y)));ctx.strokeStyle='rgba(201,168,76,.25)';ctx.lineWidth=7;ctx.lineJoin='round';ctx.stroke();
  ctx.beginPath();allPts.forEach((p,i)=>i===0?ctx.moveTo(mx(p.x),my(p.y)):ctx.lineTo(mx(p.x),my(p.y)));ctx.strokeStyle='#c9a84c';ctx.lineWidth=2;ctx.stroke();
  ctx.setLineDash([2,5]);ctx.strokeStyle='rgba(78,201,176,.18)';ctx.lineWidth=1;allPts.forEach(p=>{ctx.beginPath();ctx.moveTo(mx(p.x),my(0));ctx.lineTo(mx(p.x),my(p.y));ctx.stroke();});ctx.setLineDash([]);
  allPts.forEach(p=>{const px=mx(p.x),py=my(p.y);ctx.beginPath();ctx.arc(px,py,5,0,Math.PI*2);ctx.fillStyle='rgba(78,201,176,.2)';ctx.fill();ctx.beginPath();ctx.arc(px,py,2.8,0,Math.PI*2);ctx.fillStyle='#4ec9b0';ctx.strokeStyle='#12151e';ctx.lineWidth=1.5;ctx.fill();ctx.stroke();});
  ctx.fillStyle='rgba(154,143,120,.65)';ctx.font=`11px 'Source Code Pro',monospace`;ctx.textAlign='center';
  const xStep=Math.max(1,Math.ceil(allPts.length/8));for(let i=0;i<allPts.length;i+=xStep)ctx.fillText(rkf4(allPts[i].x),mx(allPts[i].x),pad.top+ch+16);
  ctx.textAlign='right';for(let i=0;i<=4;i++){const v=yMin+(yMax-yMin)*i/4;ctx.fillText(rkf4(v),pad.left-6,my(v)+4);}
  ctx.fillStyle='rgba(201,168,76,.6)';ctx.font=`italic 11px 'Source Code Pro',monospace`;ctx.textAlign='left';ctx.fillText('y(x)',pad.left+5,pad.top+13);
}

function rkShowOutput(){document.getElementById('rk_outputWrap').classList.remove('hidden');}
function rkHideOutput(){document.getElementById('rk_outputWrap').classList.add('hidden');}
function rkShowErr(msg){document.getElementById('rk_errMsg').textContent=msg;document.getElementById('rk_errBar').classList.remove('hidden');}
function rkClearErr(){document.getElementById('rk_errBar').classList.add('hidden');}
function rkClearAll(){['rk_fn','rk_x0','rk_y0','rk_h','rk_endVal'].forEach(id=>document.getElementById(id).value='');rkClearErr();rkHideOutput();document.getElementById('rk_btnPdf').classList.add('hidden');}
function rkExportPDF(){
  const fn=document.getElementById('rk_fn').value.trim(),h=document.getElementById('rk_h').value,rows=[];
  document.querySelectorAll('#rkBody tr').forEach(tr=>{rows.push(Array.from(tr.querySelectorAll('td')).map(c=>c.textContent));});
  const win=window.open('','_blank');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>RK4 Results</title><style>body{font-family:'Courier New',monospace;background:#fff;color:#111;padding:32px;font-size:12px}h1{font-size:20px;font-family:Georgia,serif;margin-bottom:4px}.sub{color:#555;margin-bottom:20px;font-size:12px}table{width:100%;border-collapse:collapse;font-size:11px}th{background:#141824;color:#c9a84c;padding:8px 12px;text-align:left;font-size:10px;letter-spacing:.1em}td{padding:7px 12px;border-bottom:1px solid #ddd}tr:nth-child(even) td{background:#f9f8f6}.foot{margin-top:22px;color:#888;font-size:10px;letter-spacing:.12em}</style></head><body><h1>Runge–Kutta 4th Order — Results</h1><div class="sub">y′ = ${fn} &nbsp;|&nbsp; h = ${h} &nbsp;|&nbsp; ${new Date().toLocaleString()}</div><table><thead><tr><th>STEP</th><th>xₙ</th><th>yₙ</th><th>k₁</th><th>k₂</th><th>k₃</th><th>k₄</th><th>yₙ₊₁</th></tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table><div class="foot">RUNGE–KUTTA 4TH ORDER METHOD · NUMERICAL ODE SOLVER</div></body></html>`);
  win.document.close();setTimeout(()=>win.print(),400);
}

/* ══════════════════════════════════════════════════════
   KEYBOARD SHORTCUTS & RESIZE
   ══════════════════════════════════════════════════════ */
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const activeSect = document.querySelector('.tool-section.active');
  if (activeSect.id === 'sect-trap') { currentMode==='single'?solveSingle():solveDouble(); }
  else if (activeSect.id === 'sect-gauss') { solveGauss(); }
  else if (activeSect.id === 'sect-rk') { rkSolve(); }
});

let _rt;
window.addEventListener('resize', () => {
  clearTimeout(_rt); _rt = setTimeout(() => {
    if (!document.getElementById('s_output').classList.contains('hidden')) {
      try {
        const fnStr=document.getElementById('s_fn').value.trim(),a=parseFloat(document.getElementById('s_a').value),b=parseFloat(document.getElementById('s_b').value),n=parseInt(document.getElementById('s_n').value,10);
        if(fnStr&&!isNaN(a)&&!isNaN(b)&&n>0){const fn=parseFunc(fnStr,['x']);const h=(b-a)/n,xs=[],ys=[];for(let i=0;i<=n;i++){xs.push(a+i*h);ys.push(fn(xs[i]));}drawSingleGraph(fn,xs,ys,a,b,n);}
      } catch {}
    }
    if (!document.getElementById('rk_outputWrap').classList.contains('hidden')) {
      const rows=[];
      document.querySelectorAll('#rkBody tr').forEach(tr=>{const c=tr.querySelectorAll('td');rows.push({xn:+c[1].textContent,yn:+c[2].textContent,yn1:+c[7].textContent});});
      if(rows.length){const x0=parseFloat(document.getElementById('rk_x0').value),y0=parseFloat(document.getElementById('rk_y0').value),h=parseFloat(document.getElementById('rk_h').value);rkDrawGraph(rows,x0,y0,h);}
    }
  }, 200);
});

/* ══════════════════════════════════════════════════════
   INIT
   ══════════════════════════════════════════════════════ */
buildMatrixInput(3);
gaussPreset('u3');
