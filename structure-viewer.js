/* global $3Dmol */

const SAMPLE_SI = `data_si
_cell_length_a 5.4307
_cell_length_b 5.4307
_cell_length_c 5.4307
_cell_angle_alpha 90
_cell_angle_beta 90
_cell_angle_gamma 90
_symmetry_space_group_name_H-M 'P 1'
loop_
 _atom_site_type_symbol
 _atom_site_label
 _atom_site_fract_x
 _atom_site_fract_y
 _atom_site_fract_z
 Si Si1 0 0 0
 Si Si2 0.25 0.25 0.25
`;

const state = { viewer: null, model: null, structure: null, scene: null, boundary: { min: [0, 0, 0], max: [1, 1, 1] }, displayAtoms: [], displayTranslations: [], defaultView: null, history: [], showCell: true, showAxis: true, showLabels: false, style: "ballstick" };
const $ = (id) => document.getElementById(id);
const elements = {
  dropzone: $("dropzone"), fileInput: $("fileInput"), sampleButton: $("sampleButton"), fapbSampleButton: $("fapbSampleButton"), viewer: $("viewer"), molViewer: $("molViewer"), emptyState: $("emptyState"), toast: $("toast"),
  fileName: $("fileName"), fileSubline: $("fileSubline"), sourceCheck: $("sourceCheck"), viewerTitle: $("viewerTitle"), footerMessage: $("footerMessage"), footerAtomCount: $("footerAtomCount"), footerCellStatus: $("footerCellStatus"), undoButton: $("undoButton"),
  structureName: $("structureName"), structureCaption: $("structureCaption"), formatPill: $("formatPill"), atomCount: $("atomCount"), elementCount: $("elementCount"), cellMetric: $("cellMetric"), modeMetric: $("modeMetric"), latticeGrid: $("latticeGrid"), compositionList: $("compositionList"), styleSelect: $("styleSelect"),
  superA: $("superA"), superB: $("superB"), superC: $("superC"), supercellButton: $("supercellButton"), boundaryAMin: $("boundaryAMin"), boundaryBMin: $("boundaryBMin"), boundaryCMin: $("boundaryCMin"), boundaryA: $("boundaryA"), boundaryB: $("boundaryB"), boundaryC: $("boundaryC"), boundaryButton: $("boundaryButton"), exportFormat: $("exportFormat"), exportButton: $("exportButton"), conversionHelp: $("conversionHelp"), atomTableBody: $("atomTableBody"),
  axisCard: $("orientationAxes"), axisVectors: $("axisVectors"),
};

// The same rotation quaternion as 3Dmol's model group; zoom and translation do not affect directions.
function projectOrientationAxes(view) {
  const values = view.slice(4, 8), length = Math.hypot(...values);
  if (values.length !== 4 || !Number.isFinite(length) || length < 1e-10) return [];
  const [x, y, z, w] = values.map(v => v / length);
  const columns = [
    [1-2*(y*y+z*z), 2*(x*y+w*z), 2*(x*z-w*y)],
    [2*(x*y-w*z), 1-2*(x*x+z*z), 2*(y*z+w*x)],
    [2*(x*z+w*y), 2*(y*z-w*x), 1-2*(x*x+y*y)],
  ];
  return columns.map((v,i) => ({ name: ['X','Y','Z'][i], vector: v, x: 56+34*v[0], y: 56-34*v[1], depth: v[2] }));
}
function updateOrientationAxes(view) {
  if (!state.showAxis) return;
  for (const axis of projectOrientationAxes(view).sort((a,b) => a.depth-b.depth)) {
    const line = $(`axisLine${axis.name}`), label = $(`axisText${axis.name}`), dot = $(`axisDot${axis.name}`);
    const projection = Math.hypot(axis.vector[0],axis.vector[1]), facing = projection < .15;
    line.setAttribute('x2',axis.x.toFixed(3)); line.setAttribute('y2',axis.y.toFixed(3));
    line.setAttribute('visibility', facing ? 'hidden' : 'visible');
    dot.setAttribute('visibility', facing ? 'visible' : 'hidden');
    dot.setAttribute('fill', axis.depth > 0 ? 'currentColor' : 'none');
    label.setAttribute('x',(facing ? 68 : axis.x+12*axis.vector[0]/projection).toFixed(3));
    label.setAttribute('y',(facing ? 44 : axis.y-12*axis.vector[1]/projection).toFixed(3));
    const group = $(`axis${axis.name}`);
    group.setAttribute('opacity',axis.depth < -.15 ? '.55' : '1');
    elements.axisVectors.appendChild(group);
  }
}

function showToast(message) { elements.toast.textContent = message; elements.toast.classList.add("is-visible"); clearTimeout(showToast.timer); showToast.timer = setTimeout(() => elements.toast.classList.remove("is-visible"), 3600); }
function extensionOf(name) { const base = name.split(/[\\/]/).pop().toLowerCase(); if (base === "poscar" || base === "contcar") return "poscar"; const ext = base.split(".").pop(); return ext === "vasp" ? "poscar" : ext; }
function mod1(value) { return ((value % 1) + 1) % 1; }
function cleanElement(value) { const match = String(value || "").match(/[A-Z][a-z]?/); return match ? match[0] : String(value || "?"); }
function add(a, b) { return a.map((v, i) => v + b[i]); }
function vectorLength(v) { return Math.sqrt(v.reduce((sum, value) => sum + value * value, 0)); }
function latticeAngles(lattice) { const angle = (a, b) => Math.acos(Math.max(-1, Math.min(1, a.reduce((s, v, i) => s + v * b[i], 0) / (vectorLength(a) * vectorLength(b))))) * 180 / Math.PI; return [angle(lattice[1], lattice[2]), angle(lattice[0], lattice[2]), angle(lattice[0], lattice[1])]; }
function cartFromFrac(frac, lattice) { return [frac[0] * lattice[0][0] + frac[1] * lattice[1][0] + frac[2] * lattice[2][0], frac[0] * lattice[0][1] + frac[1] * lattice[1][1] + frac[2] * lattice[2][1], frac[0] * lattice[0][2] + frac[1] * lattice[1][2] + frac[2] * lattice[2][2]]; }
function xyzFromAtoms(atoms) { return `${atoms.length}\nAtomica quick viewer\n${atoms.map((a) => `${a.element} ${a.cart.map((v) => v.toFixed(6)).join(" ")}`).join("\n")}`; }
function invert3(m) { const [a, b, c] = m; const det = a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0]); if (Math.abs(det) < 1e-10) throw new Error("晶格矩阵不可逆"); return [[(b[1] * c[2] - b[2] * c[1]) / det, (a[2] * c[1] - a[1] * c[2]) / det, (a[1] * b[2] - a[2] * b[1]) / det], [(b[2] * c[0] - b[0] * c[2]) / det, (a[0] * c[2] - a[2] * c[0]) / det, (a[2] * b[0] - a[0] * b[2]) / det], [(b[0] * c[1] - b[1] * c[0]) / det, (a[1] * c[0] - a[0] * c[1]) / det, (a[0] * b[1] - a[1] * b[0]) / det]]; }

function parsePoscar(text) {
  const lines = text.replace(/\r/g, "").split("\n").map((line) => line.trim()).filter(Boolean); if (lines.length < 8) throw new Error("POSCAR 内容不完整");
  const scale = Number(lines[1]); if (!Number.isFinite(scale) || scale === 0) throw new Error("POSCAR 缩放因子无效"); const lattice = lines.slice(2, 5).map((line) => line.split(/\s+/).slice(0, 3).map(Number)); if (lattice.some((row) => row.length !== 3 || row.some((value) => !Number.isFinite(value)))) throw new Error("POSCAR 晶格向量无效"); lattice.forEach((row) => row.forEach((_, index) => { row[index] *= scale; }));
  let cursor = 5; let symbols = lines[cursor].split(/\s+/); let counts = symbols.every((value) => /^\d+$/.test(value)) ? symbols.map(Number) : null; if (!counts) { cursor += 1; counts = lines[cursor].split(/\s+/).map(Number); } if (!counts.length || counts.some((n) => !Number.isInteger(n) || n < 0)) throw new Error("POSCAR 元素数量无效"); if (counts.length !== symbols.length) symbols = symbols.slice(0, counts.length); cursor += 1; if (/^selective/i.test(lines[cursor])) cursor += 1; const direct = !/^cart/i.test(lines[cursor]); cursor += 1;
  const inverse = invert3(lattice); const atoms = []; let symbolIndex = 0; let remaining = counts[0]; const total = counts.reduce((a, b) => a + b, 0); const cartesian = (v) => direct ? cartFromFrac(v, lattice) : v.map((value) => value * scale); const fractional = (v) => [v[0] * inverse[0][0] + v[1] * inverse[1][0] + v[2] * inverse[2][0], v[0] * inverse[0][1] + v[1] * inverse[1][1] + v[2] * inverse[2][1], v[0] * inverse[0][2] + v[1] * inverse[1][2] + v[2] * inverse[2][2]];
  for (let index = 0; index < total; index += 1) { while (remaining === 0) { symbolIndex += 1; remaining = counts[symbolIndex]; } const parts = lines[cursor + index].split(/\s+/).map(Number); if (parts.length < 3 || parts.slice(0, 3).some((value) => !Number.isFinite(value))) throw new Error(`POSCAR 坐标第 ${index + 1} 行无效`); const vector = parts.slice(0, 3); const cart = cartesian(vector); atoms.push({ element: cleanElement(symbols[symbolIndex]), cart, frac: direct ? vector : fractional(cart) }); remaining -= 1; }
  return { format: "POSCAR", atoms, lattice, periodic: true, sourceMode: direct ? "Direct" : "Cartesian" };
}

function parseXyz(text) {
  const lines = text.replace(/\r/g, "").trimStart().split("\n");
  const count = Number(lines[0]);
  if (!Number.isInteger(count) || count < 1 || lines.length < count + 2) throw new Error("XYZ 原子数量或坐标不完整");
  const atoms = lines.slice(2, count + 2).map((line, index) => {
    const parts = line.trim().split(/\s+/), cart = parts.slice(1, 4).map(Number);
    if (cart.length !== 3 || cart.some(v => !Number.isFinite(v))) throw new Error(`XYZ 第 ${index + 1} 行坐标无效`);
    return { element: cleanElement(parts[0]), cart };
  });
  return { format: "XYZ", atoms, periodic: false, sourceMode: "Cartesian" };
}
function parseMol(text) {
  const lines = text.replace(/\r/g, "").split("\n"), counts = lines[3] || "";
  if (/V3000/.test(counts)) throw new Error("当前支持 MOL V2000，请将 V3000 转为 V2000 后导入");
  const count = Number(counts.slice(0, 3).trim()), bondCount = Number(counts.slice(3, 6).trim());
  if (!Number.isInteger(count) || count < 1 || !Number.isInteger(bondCount) || bondCount < 0 || lines.length < 4 + count + bondCount) throw new Error("MOL 原子或键表不完整");
  const atoms = lines.slice(4, 4 + count).map((line, index) => {
    const cart = [line.slice(0,10),line.slice(10,20),line.slice(20,30)].map(Number), element = cleanElement(line.slice(31,34).trim());
    if (!cart.every(Number.isFinite) || element === "?") throw new Error(`MOL 第 ${index + 1} 个原子无效`);
    return { element, cart };
  });
  const bonds = lines.slice(4 + count, 4 + count + bondCount).map(line => {
    const from = Number(line.slice(0,3)) - 1, to = Number(line.slice(3,6)) - 1, order = Number(line.slice(6,9));
    if (![from,to].every(i => Number.isInteger(i) && i >= 0 && i < count) || from === to || ![1,2,3,4].includes(order)) throw new Error("MOL 键表含无效连接或键级");
    return { from, to, order };
  });
  return { format: "MOL", atoms, bonds, periodic: false, sourceMode: "Cartesian" };
}

function cifTokens(line) { return line.match(/'(?:[^']*)'|"(?:[^"]*)"|\S+/g)?.map((v) => v.replace(/^['"]|['"]$/g, "")) || []; }
function cifLoops(text) { const lines = text.replace(/\r/g, "").split("\n"); const loops = []; for (let i = 0; i < lines.length; i += 1) { if (lines[i].trim().toLowerCase() !== "loop_") continue; const headers = []; let cursor = i + 1; while (cursor < lines.length && lines[cursor].trim().startsWith("_")) { headers.push(lines[cursor].trim().split(/\s+/)[0]); cursor += 1; } if (!headers.length) continue; const rows = []; while (cursor < lines.length && lines[cursor].trim() && !lines[cursor].trim().toLowerCase().startsWith("loop_") && !lines[cursor].trim().startsWith("_")) { const tokens = cifTokens(lines[cursor].trim()); if (tokens.length >= headers.length) rows.push(tokens.slice(0, headers.length)); cursor += 1; } loops.push({ headers, rows }); i = cursor - 1; } return loops; }
function evalCifExpr(expr, vars) { const clean = expr.replace(/\s+/g, "").replace(/x/g, `(${vars[0]})`).replace(/y/g, `(${vars[1]})`).replace(/z/g, `(${vars[2]})`).replace(/(\d+)\/(\d+)/g, "($1/$2)"); if (!/^[0-9+*/().-]+$/.test(clean)) throw new Error("CIF 对称操作无法解析"); return Number(Function(`"use strict"; return (${clean})`)()); }
function applySymmetry(op, frac) { const parts = op.split(",").map((part) => part.trim()); if (parts.length !== 3) return frac; return parts.map((part) => mod1(evalCifExpr(part, frac))); }
function parseCif(text) {
  const get = (key) => { const match = text.match(new RegExp(`${key}\\s+['"]?([-+0-9.eE]+)`)); return match ? Number(match[1]) : null; }; const a = get("_cell_length_a"), b = get("_cell_length_b"), c = get("_cell_length_c"), alpha = get("_cell_angle_alpha") ?? 90, beta = get("_cell_angle_beta") ?? 90, gamma = get("_cell_angle_gamma") ?? 90; if (![a, b, c].every((v) => Number.isFinite(v))) throw new Error("CIF 缺少有效晶格参数");
  const rad = Math.PI / 180; const lattice = [[a, 0, 0], [b * Math.cos(gamma * rad), b * Math.sin(gamma * rad), 0], [c * Math.cos(beta * rad), c * (Math.cos(alpha * rad) - Math.cos(beta * rad) * Math.cos(gamma * rad)) / Math.sin(gamma * rad), 0]]; lattice[2][2] = Math.sqrt(Math.max(0, c * c - lattice[2][0] ** 2 - lattice[2][1] ** 2));
  const loops = cifLoops(text); const atomLoop = loops.find((loop) => loop.headers.some((h) => /_atom_site_fract_x/i.test(h)) && loop.headers.some((h) => /_atom_site_type_symbol/i.test(h))); if (!atomLoop) throw new Error("CIF 找不到原子分数坐标表"); const indexOf = (needle) => atomLoop.headers.findIndex((h) => h.toLowerCase().includes(needle)); const ix = indexOf("_atom_site_fract_x"), iy = indexOf("_atom_site_fract_y"), iz = indexOf("_atom_site_fract_z"), ie = indexOf("_atom_site_type_symbol");
  const symLoop = loops.find((loop) => loop.headers.some((h) => /symmetry_equiv_pos_as_xyz|space_group_symop_operation_xyz/i.test(h))); const symIndex = symLoop?.headers.findIndex((h) => /symmetry_equiv_pos_as_xyz|space_group_symop_operation_xyz/i.test(h)); const operations = symLoop && symIndex >= 0 ? symLoop.rows.map((row) => row[symIndex]) : ["x,y,z"]; const atoms = []; const seen = new Set();
  atomLoop.rows.forEach((row) => { const frac = [Number(row[ix]), Number(row[iy]), Number(row[iz])]; if (frac.some((v) => !Number.isFinite(v))) return; const element = cleanElement(row[ie]); operations.forEach((operation) => { let expanded; try { expanded = applySymmetry(operation, frac); } catch { expanded = frac; } const key = `${element}:${expanded.map((v) => v.toFixed(5)).join(",")}`; if (seen.has(key)) return; seen.add(key); atoms.push({ element, frac: expanded, cart: cartFromFrac(expanded, lattice) }); }); });
  return { format: "CIF", raw: text, atoms, lattice, periodic: true, sourceMode: "Fractional", symmetryCount: operations.length };
}
function parseStructure(name, text) { const format = extensionOf(name); if (format === "poscar") return parsePoscar(text); if (format === "xyz") return parseXyz(text); if (format === "mol" || format === "sdf") return parseMol(text); if (format === "cif") return parseCif(text); throw new Error("当前快速版支持 MOL、CIF、POSCAR/CONTCAR 和 XYZ"); }

function drawCell(lattice) { if (!state.showCell || !lattice || !state.viewer) return; const a = lattice[0], b = lattice[1], c = lattice[2]; const points = [[0, 0, 0], a, b, c, add(a, b), add(a, c), add(b, c), add(add(a, b), c)]; [[0, 1], [0, 2], [0, 3], [1, 4], [1, 5], [2, 4], [2, 6], [3, 5], [3, 6], [4, 7], [5, 7], [6, 7]].forEach(([start, end]) => state.viewer.addLine({ start: { x: points[start][0], y: points[start][1], z: points[start][2] }, end: { x: points[end][0], y: points[end][1], z: points[end][2] }, color: "#253238", opacity: .82, linewidth: 1.5 })); }
function drawPolyhedra() {
  const colors = { I: "#a02b9c", S: "#d4b444", O: "#d85752", N: "#5979c7" };
  for (const polyhedron of state.scene?.polyhedra || []) {
    const result = polyhedron.result;
    const vertexArr = [], normalArr = [];
    for (const face of result.faces) {
      const points = face.map(i => result.neighbors[i].cart);
      const a = points[1].map((v,i) => v - points[0][i]), b = points[2].map((v,i) => v - points[0][i]);
      const cross = [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]], length = Math.hypot(...cross);
      for (const p of points) { vertexArr.push({x:p[0],y:p[1],z:p[2]}); normalArr.push({x:cross[0]/length,y:cross[1]/length,z:cross[2]/length}); }
    }
    state.viewer.addCustom({ vertexArr, normalArr, faceArr: vertexArr.map((_,i) => i),
      color: colors[result.neighbors[0]?.element] || "#79a9ac", opacity: .38, side: 2 });
  }
}
function updateSceneStatus() {
  if (!state.scene) return;
  const scene = state.scene, count = scene.polyhedra.length;
  const description = state.style === "polyhedral" ? ` · ${count} 个配位多面体` : "";
  elements.footerMessage.textContent = `${scene.displayedAtoms.length} 个显示原子 · ${scene.bonds.length} 条键${description}`;
  elements.structureCaption.textContent = `${state.structure.periodic ? "周期晶体" : "分子结构"} · 结构原子 ${state.structure.atoms.length}${description}`;
  elements.footerAtomCount.textContent = `结构 ${state.structure.atoms.length} 原子`;
  elements.footerCellStatus.textContent = state.structure.periodic ? "原始晶胞" : "非周期";
}
function refreshShapes() {
  state.viewer.removeAllShapes();
  drawCell(state.structure?.lattice);
  if (state.style === "polyhedral") drawPolyhedra();
  updateSceneStatus();
  state.viewer.render();
}
function applyStyle() {
  if (!state.model) return;
  state.viewer.removeAllLabels();
  const spheres = state.style === "spacefill" ? {scale:.85,colorscheme:"Jmol"} : {scale:.25,colorscheme:"Jmol"};
  const style = state.style === "line" ? {line:{linewidth:2,colorscheme:"Jmol"}} : state.style === "spacefill" ? {sphere:spheres}
    : {sphere:spheres,stick:{radius:.11,colorscheme:"Jmol"}};
  state.model.setStyle({},style);
  for (const [elem,color] of Object.entries({Pb:"#55565a",I:"#a02299",C:"#9a603b",N:"#5979c7",H:"#f7e1df",Mo:"#57929b",S:"#d4b444"})) {
    const custom = state.style === "line" ? {line:{linewidth:2,color}} : state.style === "spacefill" ? {sphere:{scale:spheres.scale,color}}
      : {sphere:{scale:spheres.scale,color},stick:{radius:.11,color}};
    state.model.setStyle({elem},custom);
  }
  if (state.showLabels) state.model.addPropertyLabels("elem", {}, {font:"sans",fontSize:11,fontColor:"#172126",backgroundColor:"white"});
}
function focusStructure(data) {
  if (!data || !state.viewer) return;
  if (state.defaultView) state.viewer.setView(state.defaultView);
  state.viewer.zoomTo();
  state.viewer.center({});
  const box = elements.molViewer.getBoundingClientRect();
  state.viewer.zoom(.85 * Math.min(1, box.width / Math.max(box.height, 1)));
  state.viewer.render();
}
function renderStructure(data, name, options = {}) {
  const scene = window.CrystalCore.buildDisplayScene(data, state.boundary);
  const atoms = scene.displayedAtoms.map((atom,index) => ({elem:atom.element,x:atom.cart[0],y:atom.cart[1],z:atom.cart[2],serial:index+1,bonds:[],bondOrder:[]}));
  const indices = new Map(scene.displayedAtoms.map((atom,index) => [atom.key,index]));
  for (const bond of scene.bonds) {
    const a=indices.get(bond.centerKey), b=indices.get(bond.ligandKey);
    if (a === undefined || b === undefined) throw new Error("显示键端点缺失");
    atoms[a].bonds.push(b); atoms[a].bondOrder.push(bond.order);
    atoms[b].bonds.push(a); atoms[b].bondOrder.push(bond.order);
  }
  if (options.resetHistory) state.history=[];
  state.structure=data; state.scene=scene; state.displayAtoms=scene.displayedAtoms;
  state.viewer.removeAllModels(); state.viewer.removeAllShapes();
  state.model=state.viewer.addModel(); state.model.addAtoms(atoms);
  elements.emptyState.hidden=true; elements.viewerTitle.textContent=name; elements.fileName.textContent=name;
  elements.fileSubline.textContent=`${data.format} · ${data.periodic ? "周期结构" : "非周期结构"}`;
  elements.sourceCheck.textContent="✓";
  updateInspector(name); updateConversionOptions(); updateUndoButton();
  applyStyle(); refreshShapes(); focusStructure(data);
}
function updateInspector(name) { const data = state.structure; const atoms = data.atoms.length ? data.atoms : (state.model ? state.model.selectedAtoms({}) : []); const counts = {}; atoms.forEach((atom) => { const element = cleanElement(atom.element || atom.elem); counts[element] = (counts[element] || 0) + 1; }); const lattice = data.lattice; const atomCount = atoms.length || "—"; elements.structureName.textContent = name.replace(/\.[^.]+$/, ""); elements.structureCaption.textContent = data.periodic ? `周期晶体 · ${data.symmetryCount ? "已展开 CIF 对称操作" : "结构已解析"}` : "非周期结构 · 结构已解析"; elements.formatPill.textContent = data.format; elements.atomCount.textContent = atomCount; elements.elementCount.textContent = Object.keys(counts).length || "—"; elements.cellMetric.textContent = lattice ? "periodic" : "open"; elements.modeMetric.textContent = data.sourceMode || "—"; elements.footerAtomCount.textContent = `${atomCount} atoms`; elements.footerCellStatus.textContent = lattice ? "periodic cell" : "non-periodic"; elements.compositionList.innerHTML = Object.entries(counts).sort().map(([element, count]) => `<div class="element-chip"><strong>${element}</strong><span>×${count}</span></div>`).join("") || '<span class="empty-value">—</span>'; elements.atomTableBody.innerHTML = atoms.length ? atoms.map((atom, index) => `<tr><td>${index + 1}</td><td>${cleanElement(atom.element || atom.elem)}</td><td>${Number(atom.cart?.[0] ?? atom.x).toFixed(4)}</td><td>${Number(atom.cart?.[1] ?? atom.y).toFixed(4)}</td><td>${Number(atom.cart?.[2] ?? atom.z).toFixed(4)}</td></tr>`).join("") : '<tr><td colspan="5" class="empty-table">导入结构后显示原子坐标</td></tr>'; if (lattice) { const lengths = lattice.map(vectorLength); const angles = latticeAngles(lattice); elements.latticeGrid.innerHTML = [["a", lengths[0]], ["b", lengths[1]], ["c", lengths[2]], ["α", angles[0]], ["β", angles[1]], ["γ", angles[2]]].map(([label, value]) => `<div class="lattice-value"><span>${label}</span><strong>${value.toFixed(2)}${label.length === 1 && !"αβγ".includes(label) ? " Å" : "°"}</strong></div>`).join(""); } else elements.latticeGrid.innerHTML = '<span class="empty-value">非周期结构，没有晶格参数</span>'; }

function supercell(data, nx, ny, nz) { if (!data?.periodic || !data.lattice) throw new Error("只有包含晶格的周期结构可以扩胞"); const lattice = data.lattice.map((row, i) => row.map((value) => value * [nx, ny, nz][i])); const atoms = []; data.atoms.forEach((atom) => { const f = atom.frac || [0, 0, 0]; for (let i = 0; i < nx; i += 1) for (let j = 0; j < ny; j += 1) for (let k = 0; k < nz; k += 1) { const frac = [(f[0] + i) / nx, (f[1] + j) / ny, (f[2] + k) / nz]; atoms.push({ element: atom.element, frac, cart: cartFromFrac(frac, lattice) }); } }); return { ...data, atoms, lattice, raw: undefined, supercell: [nx, ny, nz] }; }
function setDownload(name, content, mime) { const blob = new Blob([content], { type: mime }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = name; link.click(); URL.revokeObjectURL(link.href); }
function exportXyz(data) { return xyzFromAtoms(data.atoms); }
function exportPoscar(data) { const inverse = invert3(data.lattice); const order = []; const grouped = {}; data.atoms.forEach((atom) => { const e = cleanElement(atom.element); if (!grouped[e]) { grouped[e] = []; order.push(e); } const frac = atom.frac || [atom.cart[0] * inverse[0][0] + atom.cart[1] * inverse[1][0] + atom.cart[2] * inverse[2][0], atom.cart[0] * inverse[0][1] + atom.cart[1] * inverse[1][1] + atom.cart[2] * inverse[2][1], atom.cart[0] * inverse[0][2] + atom.cart[1] * inverse[1][2] + atom.cart[2] * inverse[2][2]]; grouped[e].push(frac.map(mod1)); }); return `Atomica quick viewer\n1.0\n${data.lattice.map((row) => row.map((v) => v.toFixed(8).padStart(14)).join(" ")).join("\n")}\n${order.join(" ")}\n${order.map((e) => grouped[e].length).join(" ")}\nDirect\n${order.flatMap((e) => grouped[e]).map((f) => f.map((v) => v.toFixed(8).padStart(14)).join(" ")).join("\n")}\n`; }
function exportCif(data) { const lengths = data.lattice.map(vectorLength); const angles = latticeAngles(data.lattice); const inverse = invert3(data.lattice); return `data_atomica\n_cell_length_a ${lengths[0].toFixed(8)}\n_cell_length_b ${lengths[1].toFixed(8)}\n_cell_length_c ${lengths[2].toFixed(8)}\n_cell_angle_alpha ${angles[0].toFixed(8)}\n_cell_angle_beta ${angles[1].toFixed(8)}\n_cell_angle_gamma ${angles[2].toFixed(8)}\n_symmetry_space_group_name_H-M 'P 1'\n_symmetry_Int_Tables_number 1\nloop_\n _symmetry_equiv_pos_as_xyz\n 'x, y, z'\nloop_\n _atom_site_type_symbol\n _atom_site_label\n _atom_site_fract_x\n _atom_site_fract_y\n _atom_site_fract_z\n${data.atoms.map((atom, i) => { const f = atom.frac || [atom.cart[0] * inverse[0][0] + atom.cart[1] * inverse[1][0] + atom.cart[2] * inverse[2][0], atom.cart[0] * inverse[0][1] + atom.cart[1] * inverse[1][1] + atom.cart[2] * inverse[2][1], atom.cart[0] * inverse[0][2] + atom.cart[1] * inverse[1][2] + atom.cart[2] * inverse[2][2]]; return ` ${cleanElement(atom.element)} ${cleanElement(atom.element)}${i + 1} ${f.map(mod1).map((v) => v.toFixed(8)).join(" ")}`; }).join("\n")}\n`; }
function exportMol(data) {
  if (data.atoms.length > 999) throw new Error("MOL V2000 最多支持 999 个原子");
  const scene = window.CrystalCore.buildDisplayScene(data);
  const bonds = scene.bonds;
  if (bonds.length > 999) throw new Error("MOL V2000 最多支持 999 条键");
  const header = `Atomica quick viewer\n  Atomica\n\n${String(data.atoms.length).padStart(3)}${String(bonds.length).padStart(3)}  0  0  0  0            999 V2000\n`;
  const atoms = data.atoms.map(atom => `${atom.cart.map(v=>v.toFixed(4).padStart(10)).join("")} ${cleanElement(atom.element).padEnd(3)} 0  0  0  0  0  0  0  0  0  0  0  0`).join("\n");
  const lines = bonds.map(b => `${String(b.centerIndex+1).padStart(3)}${String(b.ligandIndex+1).padStart(3)}${String(b.order).padStart(3)}  0  0  0  0`).join("\n");
  return `${header}${atoms}\n${lines ? lines + "\n" : ""}M  END\n`;
}

function conversionRules(data) { return [{ value: "xyz", label: "XYZ · 通用坐标", allowed: true }, { value: "cif", label: "CIF · 保留晶格", allowed: Boolean(data?.periodic) }, { value: "poscar", label: "VASP / POSCAR · .vasp", allowed: Boolean(data?.periodic) }, { value: "mol", label: "MOL · 分子坐标", allowed: Boolean(data && !data.periodic) }]; }
function updateConversionOptions() { const data = state.structure; elements.exportFormat.innerHTML = ""; conversionRules(data).forEach((rule) => { const option = document.createElement("option"); option.value = rule.value; option.textContent = rule.label; option.disabled = !rule.allowed; elements.exportFormat.appendChild(option); }); const allowed = conversionRules(data).filter((rule) => rule.allowed); elements.exportButton.disabled = !allowed.length; elements.conversionHelp.textContent = data?.periodic ? "周期结构可导出 CIF / VASP（.vasp） / XYZ；转换为 MOL 会丢失晶格信息，快速版将其禁用。" : "分子结构可导出 MOL / XYZ；没有晶格时不能生成 CIF 或 POSCAR。"; }
function updateUndoButton() { elements.undoButton.disabled = state.history.length === 0; elements.undoButton.title = state.history.length ? `撤销上一步结构操作（${state.history.length}）` : "撤销上一步结构操作"; }
function cloneStructure(data) { return JSON.parse(JSON.stringify(data)); }
function pushHistory(name) { if (!state.structure) return; state.history.push({ data: cloneStructure(state.structure), name }); if (state.history.length > 20) state.history.shift(); updateUndoButton(); }
function undoStructure() { const previous = state.history.pop(); if (!previous) return; renderStructure(previous.data, previous.name); showToast("已撤销上一步结构操作"); }
async function loadFile(file) { try { const text = await file.text(); const data = parseStructure(file.name, text); renderStructure(data, file.name, { resetHistory: true }); showToast(`${file.name} 已载入`); } catch (error) { showToast(error.message || "文件解析失败"); } }
async function loadSampleFile(path, name, fallback = null) { try { const response = await fetch(path, { cache: "no-store" }); if (!response.ok) throw new Error(`示例文件请求失败（${response.status}）`); const text = await response.text(); renderStructure(parseCif(text), name, { resetHistory: true }); showToast(`${name} 已载入`); } catch (error) { if (!fallback) { showToast(error.message || "示例载入失败"); return; } renderStructure(parseCif(fallback), name, { resetHistory: true }); showToast(`${name} 已使用内置副本载入`); } }
async function loadSample() { await loadSampleFile("./sample-fapbi3.cif", "FAPbI3.cif"); }

function setup() {
  state.viewer = $3Dmol.createViewer(elements.molViewer, { backgroundColor: "#fbfcfa", antialias: true, disableFog: true, orthographic: true }); state.defaultView = state.viewer.getView();
  state.viewer.setViewChangeCallback(updateOrientationAxes);
  updateOrientationAxes(state.defaultView);
  elements.fileInput.addEventListener("change", (event) => { const [file] = event.target.files; if (file) loadFile(file); }); elements.sampleButton.addEventListener("click", loadSample);
  ["dragenter", "dragover"].forEach((eventName) => elements.dropzone.addEventListener(eventName, (event) => { event.preventDefault(); elements.dropzone.classList.add("is-dragging"); })); ["dragleave", "drop"].forEach((eventName) => elements.dropzone.addEventListener(eventName, (event) => { event.preventDefault(); elements.dropzone.classList.remove("is-dragging"); })); elements.dropzone.addEventListener("drop", (event) => { const [file] = event.dataTransfer.files; if (file) loadFile(file); }); elements.dropzone.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); elements.fileInput.click(); } });
  $("undoButton").addEventListener("click", undoStructure); $("resetView").addEventListener("click", () => { focusStructure(state.structure); }); $("fitView").addEventListener("click", () => { focusStructure(state.structure); }); $("fullscreenButton").addEventListener("click", () => { elements.viewer.classList.toggle("is-expanded"); $("fullscreenButton").setAttribute("aria-label", elements.viewer.classList.contains("is-expanded") ? "退出全屏查看" : "全屏查看"); requestAnimationFrame(() => { state.viewer.resize(); focusStructure(state.structure); }); }); elements.styleSelect.addEventListener("change", (event) => { state.style = event.target.value; applyStyle(); refreshShapes(); });
  elements.boundaryButton.addEventListener("click", () => { try { if (!state.structure?.periodic) throw new Error("请先导入周期结构"); const next = { min: [elements.boundaryAMin, elements.boundaryBMin, elements.boundaryCMin].map(e => Number(e.value)), max: [elements.boundaryA, elements.boundaryB, elements.boundaryC].map(e => Number(e.value)) }; if ([...next.min, ...next.max].some(v => !Number.isFinite(v) || v < -4 || v > 4) || next.min.some((v,i) => v >= next.max[i])) throw new Error("范围须在 -4 到 4 之间，且下限小于上限"); const previous = state.boundary; state.boundary = next; try { renderStructure(state.structure, elements.fileName.textContent); } catch (error) { state.boundary = previous; throw error; } showToast("显示范围已更新，原始结构保持不变"); } catch (error) { showToast(error.message); } });
  elements.supercellButton.addEventListener("click", () => { try { const nx = Number(elements.superA.value), ny = Number(elements.superB.value), nz = Number(elements.superC.value); if (![nx, ny, nz].every((n) => Number.isInteger(n) && n >= 1 && n <= 8)) throw new Error("扩胞倍数必须是 1 到 8 的整数"); if (nx * ny * nz === 1) { showToast("当前已经是 1 × 1 × 1"); return; } pushHistory(elements.fileName.textContent); renderStructure(supercell(state.structure, nx, ny, nz), `${elements.fileName.textContent.replace(/ · \d+×\d+×\d+$/, "")} · ${nx}×${ny}×${nz}`); showToast(`已生成 ${nx} × ${ny} × ${nz} 周期扩胞`); } catch (error) { showToast(error.message); } });
  elements.exportButton.addEventListener("click", () => { const type = elements.exportFormat.value; const data = state.structure; if (!data) return; if ((type === "cif" || type === "poscar") && !data.periodic) { showToast("非周期结构没有可导出的晶格"); return; } const content = type === "xyz" ? exportXyz(data) : type === "cif" ? exportCif(data) : type === "poscar" ? exportPoscar(data) : exportMol(data); const extension = type === "poscar" ? "vasp" : type; setDownload(`${elements.fileName.textContent.replace(/\.[^.]+$/, "")}.${extension}`, content, "text/plain;charset=utf-8"); showToast(`已导出 ${extension.toUpperCase()}`); });
  [["cellToggle", "showCell"], ["axisToggle", "showAxis"], ["labelToggle", "showLabels"]].forEach(([id, key]) => $(id).addEventListener("click", (event) => { state[key] = !state[key]; event.currentTarget.classList.toggle("is-on", state[key]); event.currentTarget.setAttribute("aria-pressed", String(state[key])); if (key === "showLabels") applyStyle(); if (key === "showCell" || key === "showLabels") refreshShapes(); if (key === "showAxis") { elements.axisCard.hidden = !state.showAxis; if (state.showAxis) updateOrientationAxes(state.viewer.getView()); } }));
  document.addEventListener("keydown", event => { if (event.key === "Escape" && elements.viewer.classList.contains("is-expanded")) { elements.viewer.classList.remove("is-expanded"); $("fullscreenButton").setAttribute("aria-label", "全屏查看"); requestAnimationFrame(() => { state.viewer.resize(); focusStructure(state.structure); }); } }); document.querySelector(".axis-card").hidden = false; elements.exportButton.disabled = true; window.addEventListener("resize", () => state.viewer.resize());
}
window.addEventListener("DOMContentLoaded", setup);
