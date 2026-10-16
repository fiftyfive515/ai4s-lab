/* Geometry uses row lattice vectors. Display images retain their integer translations. */
(function attachCrystalCore(global) {
  const EPS = 1e-7;
  const add = (a, b) => a.map((v, i) => v + b[i]);
  const sub = (a, b) => a.map((v, i) => v - b[i]);
  const dot = (a, b) => a.reduce((sum, v, i) => sum + v * b[i], 0);
  const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
  const norm = (v) => Math.hypot(...v);
  const unit = (v) => v.map(x => x / norm(v));
  const elementOf = (atom) => String(atom.element || '').match(/[A-Z][a-z]?/)?.[0] || '?';
  const imageKey = (index, shift) => `${index}:${shift.join(',')}`;
  function determinant(m) { return dot(m[0], cross(m[1], m[2])); }
  function inverse(m) {
    const det = determinant(m);
    if (!Number.isFinite(det) || Math.abs(det) < 1e-10) throw new Error('晶格矩阵不可逆');
    const cofactors = [cross(m[1], m[2]), cross(m[2], m[0]), cross(m[0], m[1])];
    return [0,1,2].map(i => cofactors.map(row => row[i] / det));
  }
  function fracToCart(frac, lattice) { return [0,1,2].map(i => frac.reduce((s, v, j) => s + v * lattice[j][i], 0)); }
  function cartToFrac(cart, lattice) { return fracToCart(cart, inverse(lattice)); }
  function fractional(atom, structure) { return atom.frac || cartToFrac(atom.cart, structure.lattice); }
  function displayedAtom(index, shift, structure) {
    const atom = structure.atoms[index];
    const frac = structure.periodic ? add(fractional(atom, structure), shift) : undefined;
    return { ...atom, key: imageKey(index, shift), atomIndex: index, displayShift: [...shift], frac,
      cart: frac ? fracToCart(frac, structure.lattice) : [...atom.cart] };
  }
  function findNeighbors(structure, centerIndex, options = {}) {
    const center = structure.atoms[centerIndex];
    if (!center) return [];
    const cutoff = options.cutoff ?? 3;
    const min = options.minDistance ?? 0.35;
    const allowed = options.ligandElements && new Set(options.ligandElements);
    const periodic = Boolean(structure.periodic && structure.lattice);
    const cf = periodic ? fractional(center, structure) : null;
    const inv = periodic ? inverse(structure.lattice) : null;
    // A sphere of radius r projects onto fractional axis i by r * |reciprocal_i|.
    const extent = periodic ? [0,1,2].map(i => cutoff * norm(inv.map(row => row[i]))) : [0,0,0];
    const neighbors = [];
    structure.atoms.forEach((atom, atomIndex) => {
      if (allowed && !allowed.has(elementOf(atom))) return;
      const af = periodic ? fractional(atom, structure) : null;
      const lo = periodic ? cf.map((v,i) => Math.ceil(v - af[i] - extent[i] - EPS)) : [0,0,0];
      const hi = periodic ? cf.map((v,i) => Math.floor(v - af[i] + extent[i] + EPS)) : [0,0,0];
      for (let i=lo[0]; i<=hi[0]; i++) for (let j=lo[1]; j<=hi[1]; j++) for (let k=lo[2]; k<=hi[2]; k++) {
        const translation = [i,j,k];
        if (atomIndex === centerIndex && translation.every(v => v === 0)) continue;
        const image = displayedAtom(atomIndex, translation, structure);
        const distance = norm(sub(image.cart, center.cart));
        if (distance >= min - EPS && distance <= cutoff + EPS) neighbors.push({ atomIndex, element: elementOf(atom), translation,
          frac: image.frac, cart: image.cart, distance });
      }
    });
    return neighbors.sort((a,b) => a.distance-b.distance || a.atomIndex-b.atomIndex || a.translation.join(',').localeCompare(b.translation.join(',')));
  }

  // Conservative distance defaults, not a bond-order/valence or oxidation-state solver.
  const radii = { H:.31,B:.85,C:.76,N:.71,O:.66,F:.57,Si:1.11,P:1.07,S:1.05,Cl:1.02,Se:1.20,Br:1.20,I:1.39,
    Li:1.28,Na:1.66,K:2.03,Mg:1.41,Ca:1.76,Al:1.21,Ti:1.60,V:1.53,Cr:1.39,Mn:1.39,Fe:1.32,Co:1.26,Ni:1.24,Cu:1.32,Zn:1.22,Zr:1.75,Nb:1.64,Mo:1.54,Sn:1.39,W:1.62,Pb:1.46,Bi:1.48,Cd:1.44 };
  const covalent = new Set(['H','B','C','N','O','F','Si','P','S','Cl','Se','Br','I']);
  const ligands = new Set(['N','O','F','S','Cl','Se','Br','I']);
  function makeBondSpecs(structure) {
    if (structure.bondSpecs) return structure.bondSpecs.filter(s => s.enabled !== false);
    const elements = [...new Set(structure.atoms.map(elementOf))].sort();
    const specs = [];
    for (let i=0;i<elements.length;i++) for(let j=i;j<elements.length;j++) {
      let a=elements[i], b=elements[j];
      if (!radii[a] || !radii[b]) continue;
      if (covalent.has(a) && covalent.has(b)) {
        specs.push({ centerElement:a, ligandElement:b, minDistance:.4, maxDistance:1.2*(radii[a]+radii[b]), kind:'covalent', polyhedral:false, source:'covalent-radius-default' });
      } else {
        if (covalent.has(a)) [a,b]=[b,a];
        if (!covalent.has(a) && ligands.has(b)) specs.push({ centerElement:a, ligandElement:b,
          minDistance:.5, maxDistance:1.2*(radii[a]+radii[b]), kind:'coordination', polyhedral:true, source:'coordination-radius-default' });
      }
    }
    return specs;
  }
  function normalizeBoundary(boundary = {}) {
    const min = boundary.min || [0,0,0];
    const max = boundary.max || [boundary.a ?? 1,boundary.b ?? 1,boundary.c ?? 1];
    if (min.length !== 3 || max.length !== 3 || min.some((v,i) => !Number.isFinite(v) || !Number.isFinite(max[i]) || v >= max[i])) throw new Error('显示范围的最小值必须小于最大值');
    return { min:[...min], max:[...max] };
  }
  function templateEdges(structure, specs) {
    const unique = new Map();
    function put(i,j,translation,order,spec) {
      const forward = `${i}|${j}|${translation.join(',')}`;
      const reverse = `${j}|${i}|${translation.map(v=>-v).join(',')}`;
      const key = forward < reverse ? forward : reverse;
      if (unique.has(key)) return;
      unique.set(key,{centerIndex:i,ligandIndex:j,translation:[...translation],order:order||1,spec});
    }
    if (Array.isArray(structure.bonds)) {
      for (const b of structure.bonds) put(b.from,b.to,b.translation || [0,0,0],b.order,{kind:'covalent',polyhedral:false,source:'file'});
    } else {
      for (const spec of specs) structure.atoms.forEach((a,index) => {
        if (elementOf(a) !== spec.centerElement) return;
        for (const neighbor of findNeighbors(structure,index,{ ligandElements:[spec.ligandElement], cutoff:spec.maxDistance, minDistance:spec.minDistance })) put(index,neighbor.atomIndex,neighbor.translation,1,spec);
      });
    }
    return [...unique.values()];
  }

  // Convex supporting planes preserve the actual ligand geometry, including distorted polyhedra.
  function polyhedronFromNeighbors(center, input) {
    const neighbors = input.map(n => ({...n,vector:sub(n.cart,center)}));
    const points = neighbors.map(n=>n.cart);
    const unknown = { status:'unknown',polyhedron:null,neighbors,faces:[],geometryValid:false };
    if (points.length < 4 || points.length > 24 || new Set(points.map(p=>p.map(v=>v.toFixed(7)).join(','))).size !== points.length) return unknown;
    const centroid = [0,1,2].map(i=>points.reduce((sum,p)=>sum+p[i],0)/points.length);
    const scale = Math.max(...points.map(p=>norm(sub(p,centroid))),1);
    const tolerance = scale*1e-6;
    const planes = [];
    for (let i=0;i<points.length;i++) for (let j=i+1;j<points.length;j++) for (let k=j+1;k<points.length;k++) {
      let normal = cross(sub(points[j],points[i]),sub(points[k],points[i]));
      if(norm(normal)<tolerance*tolerance) continue;
      normal = unit(normal);
      let offset = dot(normal,points[i]);
      const distances = points.map(p=>dot(normal,p)-offset);
      if(distances.some(v=>v>tolerance) && distances.some(v=>v < -tolerance)) continue;
      if(dot(normal,centroid)>offset) { normal=normal.map(v=>-v);offset=-offset; }
      if(planes.some(p=>norm(sub(p.normal,normal))<1e-5 && Math.abs(p.offset-offset)<tolerance)) continue;
      planes.push({normal,offset,indices:points.map((p,index)=>Math.abs(dot(normal,p)-offset)<tolerance?index:-1).filter(index=>index>=0)});
    }
    if (planes.length<4 || planes.some(p=>dot(p.normal,center)-p.offset > tolerance)) return unknown;
    const faces = [];
    for (const plane of planes) {
      const pc = [0,1,2].map(i=>plane.indices.reduce((sum,index)=>sum+points[index][i],0)/plane.indices.length);
      const u=unit(sub(points[plane.indices[0]],pc)), v=cross(plane.normal,u);
      const indices=plane.indices.slice().sort((a,b)=>Math.atan2(dot(sub(points[a],pc),v),dot(sub(points[a],pc),u))-Math.atan2(dot(sub(points[b],pc),v),dot(sub(points[b],pc),u)));
      for(let i=1;i<indices.length-1;i++) faces.push([indices[0],indices[i],indices[i+1]]);
    }
    const volume = Math.abs(faces.reduce((sum,[a,b,c])=>sum+dot(sub(points[a],centroid),cross(sub(points[b],centroid),sub(points[c],centroid)))/6,0));
    if(volume < tolerance*tolerance*tolerance) return unknown;
    const sizes=planes.map(p=>p.indices.length);
    const polyhedron = points.length===6 && sizes.length===5 && sizes.filter(n=>n===3).length===2 && sizes.filter(n=>n===4).length===3 ? 'trigonal-prism'
      : points.length===6 && sizes.length===8 && sizes.every(n=>n===3) ? 'octahedron' : points.length===4 ? 'tetrahedron' : `coordination-${points.length}`;
    return {status:'verified',geometryValid:true,polyhedron,neighbors,faces,volume,faceSizes:sizes};
  }
  function buildPolyhedron(structure,centerIndex,options={}) {
    let neighbors=findNeighbors(structure,centerIndex,options);
    if(options.coordinationNumber) neighbors=neighbors.slice(0,options.coordinationNumber);
    return {...polyhedronFromNeighbors(structure.atoms[centerIndex].cart,neighbors),centerIndex};
  }

  function buildDisplayScene(structure,boundary) {
    const range=normalizeBoundary(boundary);
    const periodic=Boolean(structure.periodic && structure.lattice);
    const bondSpecs=makeBondSpecs(structure);
    const template=templateEdges(structure,bondSpecs);
    const displayed=new Map(), seedKeys=new Set(), bonds=new Map(), polyhedra=[];
    const adjacency=structure.atoms.map(()=>[]);
    for(const edge of template) {
      adjacency[edge.centerIndex].push({...edge,from:edge.centerIndex,to:edge.ligandIndex,delta:edge.translation});
      if(edge.spec.kind==='covalent') adjacency[edge.ligandIndex].push({...edge,from:edge.ligandIndex,to:edge.centerIndex,delta:edge.translation.map(v=>-v)});
    }
    function ensure(index,shift) {
      const key=imageKey(index,shift);
      if(!displayed.has(key)) {
        if(displayed.size>=50000) throw new Error('显示原子超过 50,000，请缩小显示范围');
        displayed.set(key,displayedAtom(index,shift,structure));
      }
      return displayed.get(key);
    }
    structure.atoms.forEach((atom,index)=>{
      if(!periodic) { const a=ensure(index,[0,0,0]);seedKeys.add(a.key);return; }
      const f=fractional(atom,structure);
      const lo=f.map((v,i)=>Math.ceil(range.min[i]-v-EPS)), hi=f.map((v,i)=>Math.floor(range.max[i]-v+EPS));
      for(let a=lo[0];a<=hi[0];a++) for(let b=lo[1];b<=hi[1];b++) for(let c=lo[2];c<=hi[2];c++) seedKeys.add(ensure(index,[a,b,c]).key);
    });
    function addEdge(edge,shift) {
      const a=ensure(edge.from,shift), b=ensure(edge.to,add(shift,edge.delta));
      const key=[a.key,b.key].sort().join('|');
      if(!bonds.has(key)) bonds.set(key,{centerKey:a.key,ligandKey:b.key,centerIndex:a.atomIndex,ligandIndex:b.atomIndex,
        translation:sub(b.displayShift,a.displayShift),distance:norm(sub(b.cart,a.cart)),order:edge.order,spec:edge.spec});
      return b;
    }
    // Detect finite molecules by consistent image offsets. Periodic covalent networks get one shell, never infinite recursion.
    const components=new Map();
    function component(start) {
      if(components.has(start)) return components.get(start);
      const offsets=new Map([[start,[0,0,0]]]), queue=[start];let network=false;
      for(let q=0;q<queue.length;q++) for(const edge of adjacency[queue[q]].filter(e=>e.spec.kind==='covalent')) {
        const shift=add(offsets.get(edge.from),edge.delta);
        if(offsets.has(edge.to)) { if(norm(sub(offsets.get(edge.to),shift))>EPS) network=true; }
        else { offsets.set(edge.to,shift);queue.push(edge.to); }
      }
      const result={offsets,network};for(const i of queue)components.set(i,result);return result;
    }
    const seeds=[...seedKeys].map(k=>displayed.get(k));
    for(const seed of seeds) {
      const comp=component(seed.atomIndex);
      const offset=sub(seed.displayShift,comp.offsets.get(seed.atomIndex));
      const molecularAtoms=comp.network ? [seed] : [...comp.offsets].map(([index,shift])=>ensure(index,add(offset,shift)));
      for(const a of molecularAtoms) for(const edge of adjacency[a.atomIndex].filter(e=>e.spec.kind==='covalent')) addEdge(edge,a.displayShift);
      const neighbors=[];
      for(const edge of adjacency[seed.atomIndex].filter(e=>e.spec.kind==='coordination')) {
        const b=addEdge(edge,seed.displayShift);
        if(edge.spec.polyhedral!==false) neighbors.push({atomIndex:b.atomIndex,element:elementOf(b),key:b.key,translation:b.displayShift,frac:b.frac,cart:b.cart,distance:norm(sub(b.cart,seed.cart))});
      }
      if(neighbors.length) {
        const unique=[...new Map(neighbors.map(n=>[n.key,n])).values()];
        const result=polyhedronFromNeighbors(seed.cart,unique);
        if(result.geometryValid) polyhedra.push({centerIndex:seed.atomIndex,centerKey:seed.key,shift:seed.displayShift,result});
      }
    }
    return {boundary:range,bondSpecs,displayedAtoms:[...displayed.values()],bonds:[...bonds.values()],polyhedra,seedKeys:[...seedKeys]};
  }
  function buildBondGraph(structure,specs) { return buildDisplayScene({...structure,bondSpecs:specs}); }
  const api={determinant,inverse,fracToCart,cartToFrac,findNeighbors,buildPolyhedron,makeBondSpecs,buildBondGraph,buildDisplayScene,normalizeBoundary};
  if(typeof module!=='undefined' && module.exports) module.exports=api;else global.CrystalCore=api;
})(typeof window==='undefined'?globalThis:window);
