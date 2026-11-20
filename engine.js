// 공공임대주택 사업성 분석 — 계산 엔진 (화면과 분리된 순수 함수)
// 금액 단위: 내부 계산은 원. 입력은 백만원(사업비·재원), 만원(시세), 원(월임대료 등).
(function (G) {
  const M = 1e6, MAN = 1e4;

  // 공공건설임대주택 표준건축비 (천원/㎡, 주택공급면적) — 국토교통부 고시 제2023-64호 / 제2016-339호
  const STD = {
    '2023': [[1126.7, 1145.2, 1109.5, 1120.8], [1209.8, 1226.1, 1188.5, 1192.3], [1143.0, 1154.1, 1119.3, 1118.8], [1162.6, 1173.8, 1139.2, 1138.4]],
    '2016': [[1026.1, 1043.0, 1010.5, 1020.8], [1101.8, 1116.7, 1082.4, 1085.9], [1041.0, 1051.1, 1019.4, 1018.9], [1058.8, 1069.0, 1037.5, 1036.8]]
  };
  const fb = f => f <= 5 ? 0 : f <= 10 ? 1 : f <= 20 ? 2 : 3;
  const ab = a => a <= 40 ? 0 : a <= 50 ? 1 : a <= 60 ? 2 : 3;
  const unitPrice = (tbl, floor, e) => STD[tbl][fb(floor)][ab(e)] * 1000;

  // 통합공공임대 소득구간 계수(고시 제3조) / 행복주택 공급대상 계수(고시 제3조)
  const TONG = [['중위소득 30% 이하', 0.35], ['30~50%', 0.40], ['50~70%', 0.50], ['70~100%', 0.65], ['100~130%', 0.80], ['130~150%', 0.90]];
  const HAPPY = [['대학생·소득 없는 청년', 0.68], ['소득 있는 청년·창업·지역전략산업', 0.72], ['신혼부부·한부모·중기 장기근속자', 0.80], ['고령자', 0.76], ['주거급여수급자', 0.60], ['산업단지근로자', 0.80]];
  const DUTY = { tong: 30, happy: 30, kuk: 30, young: 50, jeonse: 20, buy: 0, custom: 0 }; // 시행령 제54조 임대의무기간
  const TYPE_NAME = { tong: '통합공공임대', happy: '행복주택', kuk: '국민임대', young: '영구임대', buy: '매입임대', jeonse: '장기전세', custom: '직접 입력' };

  function cost(S) {
    const u = S.units, m = S.meta, c = S.cost;
    let std = 0, base = 0, area = 0, hh = 0;
    const per = u.map(x => {
      const p = unitPrice(m.tbl, m.floor, x.e);
      std += p * x.s * x.n; base += p * 0.63 * x.b * x.n; area += x.s * x.n; hh += x.n;
      return p;
    });
    const stdAdd = std * (c.struct + c.sash + c.island) / 100 + c.stdAdd * M;
    const stdCap = std + base + stdAdd;                       // 표준건축비 상한 (별표 7 제2호라목1))
    const direct = c.direct * M;
    const design = direct * c.designP / 100, sup = direct * c.superP / 100, other = direct * c.otherP / 100;
    const cont = (direct + design + sup + other) * c.contP / 100;
    const bldReal = direct + design + sup + other + cont;    // 실제 건축비
    const bldAllowed = Math.min(bldReal, stdCap);             // 임대료·분양전환 산정에 인정되는 건축비
    const land = c.land * M, fin = c.finCost * M;
    const TC = bldReal + land + fin;                          // 총사업비
    const house = bldAllowed + land;                          // 최초 주택가격(별표 7 제2호가목1))
    return { per, std, base, stdAdd, stdCap, direct, design, sup, other, cont, bldReal, bldAllowed, land, fin, TC, house, area, hh, stdMonthlyBase: std + base };
  }

  function rent(S, C) {
    const t = S.meta.type, R = S.rent, r = R.rate / 100, rd = R.depRate / 100;
    const F = S.fin, area = C.area || 1;
    const gl = (F.gov + F.loc) * M;
    const rows = S.units.map(u => {
      const sh = u.s / area;                    // 세대 1호당 배분 비율(공급면적 기준)
      const P = C.house * sh, B = C.bldAllowed * sh, fund = F.loan * M * sh;
      const ins = C.bldReal * S.op.insP / 100 * sh, fi = fund * F.loanRate / 100;
      const mkt = u.mkt * MAN;
      let dep = 0, mon = 0, note = '';
      if (t === 'tong') {
        const k = TONG.reduce((a, g, i) => a + g[1] * (R.tong[i] || 0), 0) / Math.max(1, R.tong.reduce((a, b) => a + b, 0));
        dep = mkt * k * 0.35; mon = mkt * k * 0.65 * r / 12; note = `가중 계수 ${k.toFixed(3)}`;
      } else if (t === 'happy') {
        const k = HAPPY.reduce((a, g, i) => a + g[1] * (R.happy[i] || 0), 0) / Math.max(1, R.happy.reduce((a, b) => a + b, 0));
        dep = mkt * k * 0.5; mon = dep * r / 12; note = `가중 계수 ${k.toFixed(3)}`;
      } else if (t === 'kuk') {
        const ar = Math.floor(u.e);
        const sk = R.kukSpecial === 'improve' && ar <= 30 ? 0.25 : ar <= 36 ? (R.kukSpecial === 'recip' ? 0.5 : 0.75) : Math.min(ar / 36, 1.3);
        dep = P * 0.2 * sk * R.kukRegion;
        const self = Math.max(0, P - fund - gl * sh - dep);
        mon = (B * 0.9 / 50 + B * 0.004 + ins + fi + self * rd * 0.5) / 12;
        note = `규모계수 ${sk.toFixed(3)}`;
      } else if (t === 'young') {
        const g = R.youngGrade.split(',').map(Number), x = R.youngShare / 100;
        const rD = g[0] * u.e, rM = g[1] * u.e;
        const gD = P * 0.2, base = B * 0.9 / 50 + B * 0.005 + ins + fi, gA = P * 0.1 * rd + base * 1.01;
        dep = rD * x + gD * (1 - x); mon = rM * x + gA / 12 * (1 - x); note = `수급자 ${R.youngShare}%`;
      } else if (t === 'buy') {
        dep = u.sd * MAN * R.buyPct / 100; mon = u.sm * MAN * R.buyPct / 100; note = `감정가 × ${R.buyPct}%`;
      } else if (t === 'jeonse') {
        dep = mkt * 0.8; mon = 0; note = '전세 평균 × 80%';
      } else {
        dep = u.cd * MAN; mon = u.cm;
      }
      return { t: u.t, n: u.n, dep, mon, note, P };
    });
    const depTotal = rows.reduce((a, x) => a + x.dep * x.n, 0);
    const annual = rows.reduce((a, x) => a + x.mon * 12 * x.n, 0);
    return { rows, depTotal, annual };
  }

  function funding(S, C, Rn) {
    const F = S.fin;
    const gov = F.gov * M, loc = F.loc * M, inv = F.inv * M, loan = F.loan * M, ink = F.ink * M, bond = F.bond * M, dep = Rn.depTotal;
    const own = C.TC - (gov + loc + inv + loan + ink + bond + dep); // 공사 자체자금(자기자본) = 부족분
    return { gov, loc, inv, loan, ink, bond, dep, own, sum: C.TC };
  }

  function irr(cf) {
    const npv = r => cf.reduce((a, v, t) => a + v / Math.pow(1 + r, t), 0);
    let lo = -0.99, hi = 1.0, flo = npv(lo), fhi = npv(hi);
    if (!isFinite(flo) || !isFinite(fhi) || flo * fhi > 0) return null;
    for (let i = 0; i < 200; i++) {
      const mid = (lo + hi) / 2, f = npv(mid);
      if (Math.abs(f) < 1) return mid;
      if (f * flo > 0) { lo = mid; flo = f; } else hi = mid;
    }
    return (lo + hi) / 2;
  }
  const npvAt = (cf, d) => cf.reduce((a, v, t) => a + v / Math.pow(1 + d, t), 0);

  function evaluate(S, C, Rn, Fd) {
    const O = S.op, E = S.eval, F = S.fin;
    const Cy = Math.max(1, S.meta.constr | 0), N = S.meta.period | 0, T = Cy + N;
    const proj = new Array(T + 1).fill(0), eq = new Array(T + 1).fill(0);
    const rows = [];
    const outEq = C.TC - Fd.gov - Fd.loc - Fd.inv - Fd.loan - Fd.ink - Fd.bond; // 공사가 공사기간에 부담(보증금 받기 전 브리지 포함)
    for (let t = 1; t <= Cy; t++) {
      proj[t] -= C.TC / Cy; eq[t] -= outEq / Cy;
      rows.push({ t, k: 0, phase: '공사', proj: -C.TC / Cy, eq: -outEq / Cy });
    }
    const step = O.rentStep / 100, every = Math.max(1, O.rentEvery | 0), cg = O.costG / 100;
    const units = C.hh;
    let bal = Fd.loan, prevDep = 0, minDSCR = Infinity, sumNOI = 0;
    const amort = Fd.loan / Math.max(1, F.loanTerm - F.loanGrace);
    for (let k = 1; k <= N; k++) {
      const t = Cy + k;
      const g = Math.pow(1 + step, Math.floor((k - 1) / every)), c = Math.pow(1 + cg, k - 1);
      const rentInc = Rn.annual * g * (1 - O.vac / 100);
      const bad = rentInc * O.bad / 100;
      const depK = Rn.depTotal * g;
      const depInc = depK * O.depYield / 100;
      const other = O.other * M * g;
      const mgmt = O.mgmt * 12 * units * c;
      const repair = C.bldReal * O.repairP / 100 * c;
      const special = k >= 2 ? C.stdMonthlyBase * 4 / 10000 * 12 : 0;  // 시행령 제57조⑤: 표준건축비의 1만분의 4, 사용검사 1년 후부터 매달
      const ins = C.bldReal * O.insP / 100 * c;
      const tax = O.tax * M * c;
      const opex = mgmt + repair + special + ins + tax + bad;
      const income = rentInc + depInc + other;
      const NOI = income - opex;
      const lInt = bal * F.loanRate / 100;
      const lPrin = k > F.loanGrace && k <= F.loanTerm ? Math.min(bal, amort) : 0;
      bal -= lPrin;
      const bInt = Fd.bond * F.bondRate / 100;
      const ds = lInt + lPrin + bInt;
      const dDep = k === 1 ? depK : depK - prevDep; prevDep = depK;
      const depr = C.bldReal / Math.max(1, E.life);
      const pl = NOI - lInt - bInt - depr;
      proj[t] += NOI;
      eq[t] += NOI - ds + dDep;
      if (ds > 0) minDSCR = Math.min(minDSCR, NOI / ds);
      sumNOI += NOI;
      rows.push({ t, k, phase: '운영', rentInc, depInc, other, income, mgmt, repair, special, ins, tax, bad, opex, NOI, lInt, lPrin, bInt, ds, dDep, pl, proj: NOI, eq: NOI - ds + dDep, bal });
    }
    // 종료 시점 처리
    const yrs = T, app = Math.pow(1 + E.appG / 100, yrs);
    const appraisal = (C.land + C.bldReal) * app;
    const book = C.land + C.bldReal * Math.max(0, 1 - N / Math.max(1, E.life));
    let value = book, exitNote = '보유(장부가: 토지 + 건축비 미상각잔액)';
    if (E.exit === 'sell') { value = appraisal; exitNote = '매각(감정가 추정)'; }
    if (E.exit === 'conv10') { value = appraisal; exitNote = '분양전환(임대의무 10년: 감정가 이하, 별표 7 제1호가목)'; }
    if (E.exit === 'conv5') {
      const rAvg = E.convRate / 100;
      const selfInt = Math.max(0, C.house - Fd.loan - Rn.depTotal) * rAvg * N;
      const depAcc = C.bldAllowed * Math.min(N, E.life) / E.life;
      const costBasis = C.house + selfInt - depAcc;                       // 건설원가
      const calcPrice = C.stdCap + C.land + C.land * rAvg * N;            // 산정가격
      value = Math.min((costBasis + appraisal) / 2, calcPrice - depAcc);
      exitNote = '분양전환(임대의무 5년: 건설원가·감정가 산술평균, 산정가격 − 감가상각비 상한)';
    }
    const depEnd = Rn.depTotal * Math.pow(1 + step, Math.floor((N - 1) / every));
    const eqTerm = value - depEnd - bal - Fd.bond;
    proj[T] += value; eq[T] += eqTerm;
    rows.push({ t: T, k: N, phase: '종료', value, depEnd, loanBal: bal, bondBal: Fd.bond, proj: value, eq: eqTerm });

    const d = E.disc / 100;
    const cum = []; let s = 0, payback = null, sd = 0, dpay = null;
    eq.forEach((v, t) => { s += v; sd += v / Math.pow(1 + d, t); cum.push(s); if (payback === null && t > Cy && s >= 0) payback = t; if (dpay === null && t > Cy && sd >= 0) dpay = t; });
    return {
      Cy, N, T, proj, eq, rows, cum,
      npvProj: npvAt(proj, d), npvEq: npvAt(eq, d), irrProj: irr(proj), irrEq: irr(eq),
      payback, dpay, minDSCR: isFinite(minDSCR) ? minDSCR : null, avgNOI: sumNOI / Math.max(1, N),
      value, exitNote, appraisal, book, outEq
    };
  }

  function run(S) {
    const C = cost(S), Rn = rent(S, C), Fd = funding(S, C, Rn), Ev = evaluate(S, C, Rn, Fd);
    return { C, Rn, Fd, Ev };
  }

  function sensitivity(S) {
    const base = run(S).Ev;
    const clone = () => JSON.parse(JSON.stringify(S));
    const tests = [
      ['공사비 ±10%', x => { x.cost.direct *= 1.1; }, x => { x.cost.direct *= 0.9; }],
      ['임대료 ±10% (시세)', x => { x.units.forEach(u => { u.mkt *= 0.9; u.sd *= 0.9; u.sm *= 0.9; u.cd *= 0.9; u.cm *= 0.9; }); }, x => { x.units.forEach(u => { u.mkt *= 1.1; u.sd *= 1.1; u.sm *= 1.1; u.cd *= 1.1; u.cm *= 1.1; }); }],
      ['금리 ±1%p (기금·사채)', x => { x.fin.loanRate += 1; x.fin.bondRate += 1; }, x => { x.fin.loanRate = Math.max(0, x.fin.loanRate - 1); x.fin.bondRate = Math.max(0, x.fin.bondRate - 1); }],
      ['공가율 ±3%p', x => { x.op.vac += 3; }, x => { x.op.vac = Math.max(0, x.op.vac - 3); }],
      ['운영비 ±10%', x => { x.op.mgmt *= 1.1; x.op.repairP *= 1.1; x.op.insP *= 1.1; x.op.tax *= 1.1; }, x => { x.op.mgmt *= 0.9; x.op.repairP *= 0.9; x.op.insP *= 0.9; x.op.tax *= 0.9; }],
      ['할인율 ±1%p', x => { x.eval.disc += 1; }, x => { x.eval.disc = Math.max(0, x.eval.disc - 1); }]
    ];
    return {
      base, rows: tests.map(([name, worse, better]) => {
        const a = clone(); worse(a); const b = clone(); better(b);
        const ra = run(a).Ev, rb = run(b).Ev;
        return { name, low: ra.npvEq, high: rb.npvEq, irrLow: ra.irrEq, irrHigh: rb.irrEq };
      })
    };
  }

  G.FE = { run, sensitivity, cost, rent, funding, evaluate, irr, npvAt, unitPrice, TONG, HAPPY, DUTY, TYPE_NAME, STD, M, MAN };
})(typeof window !== 'undefined' ? window : globalThis);
