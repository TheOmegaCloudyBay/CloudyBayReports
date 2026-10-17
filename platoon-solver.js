// RotE platoon assignment, shared by rote-platoons.html (the planner) and tb-required.html
// (required toons), so both pages always agree on what the guild can fill.
//
// Rules: a member donates at most `cap` units PER PLANET; a given owned unit copy can be donated
// once (across all planets solved together); a platoon only counts if ALL its slots fill at once.
// Manual locks go first; then platoons are staffed by planet priority (array order) and, within a
// planet, hardest (scarcest) coverable first.
window.PlatoonSolver = (function(){
  const skey = (planet, platoon, si) => planet + '#' + platoon + '#' + si;

  // Gate one planet's slots by its relic requirement: s.cand = member indexes eligible for the slot.
  function applyGate(p, req){
    p.platoons.forEach(pl => pl.slots.forEach(s => {
      s.cand = (s.own || []).filter(o => o.r >= req).map(o => o.m);
    }));
  }

  // planets: gated planets in priority order. locks: Map(slotKey -> {m, b}).
  // Returns {asn: Map(slotKey -> m), remGet(planet, m), used: Set('m|baseId')}.
  function solve(planets, cap, locks){
    const rem = new Map();
    const used = new Set();
    const asn = new Map();
    const remGet = (planet, m) => { const k = planet + '\u0000' + m; return rem.has(k) ? rem.get(k) : cap; };
    const remDec = (planet, m) => { const k = planet + '\u0000' + m; rem.set(k, remGet(planet, m) - 1); };
    const selSet = new Set(planets.map(p => p.planet));

    // 1) manual locks (only for slots on the planets being solved)
    for (const [key, lk] of (locks || new Map())){
      const planet = key.split('#')[0];
      if (!selSet.has(planet)) continue;
      asn.set(key, lk.m); used.add(lk.m + '|' + lk.b); remDec(planet, lk.m);
    }

    // 2) remaining (unlocked) slots, grouped per platoon
    const plats = [];
    planets.forEach((p, pi) => p.platoons.forEach(pl => {
      const open = pl.slots.map((s, si) => ({ key: skey(p.planet, pl.platoon, si), baseId: s.baseId, cand: s.cand }))
                           .filter(s => !asn.has(s.key));
      const coverable = open.every(s => s.cand.length > 0);
      const scarcity = open.reduce((a, s) => a + (s.cand.length ? 1 / s.cand.length : 99), 0);
      plats.push({ open, coverable, scarcity, prio: pi, planet: p.planet });
    }));
    // coverable first; then by planet priority; then hardest (scarcest) first
    plats.sort((a, b) => (a.coverable ? 0 : 1) - (b.coverable ? 0 : 1) || a.prio - b.prio || b.scarcity - a.scarcity);

    // 3) greedily complete each platoon's open slots around the locks
    for (const P of plats){
      if (!P.coverable || P.open.length === 0) continue;
      const match = tryComplete(P.open, P.planet, remGet, used);
      if (match){
        for (const [key, { m, b }] of match){ asn.set(key, m); used.add(m + '|' + b); remDec(P.planet, m); }
      }
    }
    return { asn, remGet, used };
  }

  // Max matching for ONE platoon on `planet`:
  // source -> slot -> (member, unit copy) -> member -> sink (capacity = member's remaining cap there).
  // Default: Map(slotKey -> {m, b}) if every slot fills at once, else null.
  // partial=true: always returns {out, missing} — the best partial fill and the slot keys left empty.
  function tryComplete(slots, planet, remGet, used, partial){
    let N = 0; const src = N++;
    const slotNode = slots.map(() => N++);
    const instOf = new Map(), instMB = new Map(), memOf = new Map();
    const inst = (m, b) => { const k = m + '|' + b; if (!instOf.has(k)){ const n = N++; instOf.set(k, n); instMB.set(n, { m, b }); } return instOf.get(k); };
    const mem = m => { if (!memOf.has(m)) memOf.set(m, N++); return memOf.get(m); };
    const raw = [];
    const instEdge = new Set();
    slots.forEach((s, i) => {
      raw.push([src, slotNode[i], 1]);
      for (const m of s.cand){
        if (used.has(m + '|' + s.baseId)) continue;
        const ii = inst(m, s.baseId), mm = mem(m);
        raw.push([slotNode[i], ii, 1]);
        if (!instEdge.has(ii)){ instEdge.add(ii); raw.push([ii, mm, 1]); }
      }
    });
    const sink = N++;
    memOf.forEach((node, m) => { const c = remGet(planet, m); if (c > 0) raw.push([node, sink, c]); });

    const to = [], capa = [], head = Array(N).fill(-1), nxt = [];
    const add = (u, v, c) => { to.push(v); capa.push(c); nxt.push(head[u]); head[u] = to.length - 1;
                               to.push(u); capa.push(0); nxt.push(head[v]); head[v] = to.length - 1; };
    raw.forEach(([u, v, c]) => add(u, v, c));

    let flow = 0;
    while (true){
      const par = Array(N).fill(-1), pe = Array(N).fill(-1); par[src] = src;
      const q = [src];
      while (q.length){ const u = q.shift();
        for (let e = head[u]; e !== -1; e = nxt[e]) if (capa[e] > 0 && par[to[e]] === -1){ par[to[e]] = u; pe[to[e]] = e; q.push(to[e]); } }
      if (par[sink] === -1) break;
      for (let v = sink; v !== src; v = par[v]){ capa[pe[v]]--; capa[pe[v] ^ 1]++; }
      flow++;
    }
    if (!partial && flow !== slots.length) return null;

    const out = new Map();
    slots.forEach((s, i) => {
      for (let e = head[slotNode[i]]; e !== -1; e = nxt[e]){
        if ((e % 2 === 0) && capa[e] === 0 && instMB.has(to[e])){ out.set(s.key, instMB.get(to[e])); break; }
      }
    });
    if (!partial) return out;
    return { out, missing: slots.filter(s => !out.has(s.key)).map(s => s.key) };
  }

  return { skey, applyGate, solve, tryComplete };
})();
