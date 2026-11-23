// 공공임대주택 사업성 분석 — 화면
{
const $ = id => document.getElementById(id);
const M = 1e6;
const n0 = v => Math.round(v).toLocaleString('ko-KR');
// 단위 설정 (설정 버튼) — 요약 지표 / 표·입력칸 / 세대별 금액
const UNITS = { '조원': 1e12, '억원': 1e8, '천만원': 1e7, '백만원': 1e6, '만원': 1e4, '천원': 1e3, '원': 1 };
const UDEF = { kpi: '억원', kpiDp: 1, grid: '백만원', gridDp: 0, hh: '원', hhDp: 0 };
let U = Object.assign({}, UDEF, (() => { try { return JSON.parse(localStorage.getItem('fs-units')) || {}; } catch (e) { return {}; } })());
const fmtU = (v, unit, dp) => (v / UNITS[unit]).toLocaleString('ko-KR', { minimumFractionDigits: 0, maximumFractionDigits: dp });
const eok = v => fmtU(v, U.kpi, U.kpiDp) + U.kpi;            // 요약 지표
const mil = v => fmtU(v, U.grid, U.gridDp);                     // 표 숫자 (단위는 머리글에)
const won = v => fmtU(v, U.hh, U.hhDp) + U.hh;                 // 세대별 금액
const NUMF = v => (v === '' || v === null || v === undefined || !isFinite(v)) ? '' : Number(v).toLocaleString('ko-KR', { maximumFractionDigits: 6 });
const numOf = el => parseFloat(String(el.value).replace(/,/g, '')) || 0;
const eokTxt = won => (won / 1e8).toLocaleString('ko-KR', { maximumFractionDigits: 2 }) + '억원';
const GRID_IN = 1e6;                                            // 상태값 저장 단위(금액)
const pct = (v, d = 1) => v === null || !isFinite(v) ? '산출 불가' : (v * 100).toLocaleString('ko-KR', { maximumFractionDigits: d }) + '%';
const store = { get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
const clone = o => JSON.parse(JSON.stringify(o));

// ---------- 기본 예시 사업 ----------
const DEF = {
  meta: { addr: '', umd: '석사동', name: '춘천 ○○ 통합공공임대 (예시)', lawd: '51110', type: 'tong', period: 30, constr: 2, floor: 15, tbl: '2023', kind: 'house' },
  units: [
    { t: '26형', e: 26, s: 37.5, n: 80, b: 18, mkt: 10000, sd: 1500, sm: 42, cd: 2000, cm: 180000, cnt: 0 },
    { t: '36형', e: 36, s: 50.8, n: 60, b: 24, mkt: 13000, sd: 2500, sm: 50, cd: 2700, cm: 240000, cnt: 0 },
    { t: '44형', e: 44, s: 61.6, n: 40, b: 29, mkt: 16000, sd: 4000, sm: 55, cd: 3300, cm: 300000, cnt: 0 }
  ],
  survey: { sameUmd: false, months: 12, apt: true, rh: true, offi: true, sh: false, band: 5, trim: 10 },
  rent: { rate: 6.0, depRate: 3.0, tong: [10, 15, 25, 25, 15, 10], happy: [30, 20, 30, 10, 10, 0], kukRegion: 1.0, kukSpecial: 'none', youngShare: 50, youngGrade: '101268,2015', buyPct: 50 },
  cost: { direct: 35000, designP: 3, superP: 3, otherP: 5, contP: 3, land: 3000, finCost: 500, struct: 0, sash: 0, island: 0, stdAdd: 0 },
  fin: { gov: 13000, loc: 3000, inv: 0, loan: 9000, ink: 3000, bond: 5000, loanRate: 2.0, loanGrace: 10, loanTerm: 30, bondRate: 3.8 },
  op: { vac: 3, mgmt: 15000, repairP: 0.4, insP: 0.05, tax: 0, bad: 1, rentStep: 3, rentEvery: 2, costG: 2.0, depYield: 2.5, other: 0 },
  eval: { disc: 4.5, exit: 'hold', appG: 1.5, life: 40, convRate: 3.0 },
  corp: { founder: 'sido', net: 80000, cap: 60000, debt: 90000, bondBal: 30000, loss: '0', eq: 0, eqPrev: 0, exempt: 'none', reg: '70', col: 20000, ins: '5', pubL: '' }
};
let S = store.get('fs-current', null) || clone(DEF);
let projId = store.get('fs-current-id', null);
let SV = null; // 시세 조사 결과

// ---------- 강원특별자치도 시군구 코드(LAWD_CD, 법정동코드 앞 5자리) ----------
const GW = [['51110', '춘천시'], ['51130', '원주시'], ['51150', '강릉시'], ['51170', '동해시'], ['51190', '태백시'], ['51210', '속초시'], ['51230', '삼척시'], ['51720', '홍천군'], ['51730', '횡성군'], ['51750', '영월군'], ['51760', '평창군'], ['51770', '정선군'], ['51780', '철원군'], ['51790', '화천군'], ['51800', '양구군'], ['51810', '인제군'], ['51820', '고성군'], ['51830', '양양군']];

// ---------- 사업지 위치: 강원특별자치도 > 시군구 > 읍면동 ----------
// 춘천시 읍면동: 「춘천시 읍ㆍ면ㆍ동과 리의 명칭 및 관할구역에 관한 조례」(2026.8.13) 별표 1·2
const UMD = {
  '51110': ['교동', '근화동', '낙원동', '봉의동', '사농동', '삼천동', '석사동', '소양로1가', '소양로2가', '소양로3가', '소양로4가', '송암동', '신동', '약사동', '옥천동', '온의동', '요선동', '우두동', '운교동', '조양동', '죽림동', '중도동', '중앙로1가', '중앙로2가', '중앙로3가', '칠전동', '퇴계동', '효자동', '후평동', '신북읍', '남면', '남산면', '동내면', '동면', '동산면', '북산면', '사북면', '서면', '신동면']
};
const umdCache = store.get('fs-umd', {});
const normU = s => String(s || '').replace(/\s/g, '').replace(/동$/, '');
function umdList(code) { return [...new Set([...(UMD[code] || []), ...(umdCache[code] || [])])].sort((a, b) => a.localeCompare(b, 'ko')); }
function locHTML() {
  const list = umdList(S.meta.lawd);
  return `<div class="f"><label>도</label><div><input value="강원특별자치도" readonly aria-label="도" style="background:var(--soft)"></div></div>
<div class="f"><label for="k-meta-lawd">시군구</label><button type="button" class="q" data-h="meta.lawd" aria-expanded="false" aria-label="시군구 넣는 법">?</button><div><select id="k-meta-lawd" data-p="meta.lawd">${GW.map(g => `<option value="${g[0]}">${g[1]}</option>`).join('')}</select></div></div>
<div class="f"><label for="k-meta-umd">읍면동</label><button type="button" class="q" data-h="meta.umd" aria-expanded="false" aria-label="읍면동 넣는 법">?</button><div><select id="k-meta-umd" data-p="meta.umd"><option value="">선택 안 함 (시군구 전체)</option>${list.map(u => `<option>${u}</option>`).join('')}</select></div><div id="umdNote" class="note" style="margin-top:4px">${list.length ? '' : '이 시군의 읍면동 목록은 배포 후 실거래 자료로 채워집니다.'}</div></div>
<div class="f"><label for="k-meta-addr">상세 주소 (지번·도로명, 선택)</label><div><input id="k-meta-addr" data-p="meta.addr" type="text" placeholder="예: 석사동 123-4" autocomplete="off"></div></div>
<div class="f"><label for="lawdShow">시군구 코드 (자동)</label><div><input id="lawdShow" readonly style="background:var(--soft);font-variant-numeric:tabular-nums"></div></div>`;
}
async function loadUmd(code) {
  if (UMD[code] || (umdCache[code] && umdCache[code].length)) return;
  try {
    const j = await api('/api/umd?lawd=' + code);
    if (j.umd && j.umd.length) { umdCache[code] = j.umd; store.set('fs-umd', umdCache); if (S.meta.lawd === code) { buildFields(); fillFields(); } }
  } catch (e) { const n = $('umdNote'); if (n) n.textContent = '읍면동 목록은 서버(실거래가 API) 연결 후 채워집니다. 지금은 시군구 전체로 분석합니다.'; }
}
function rememberUmd(rows) {
  const names = [...new Set(rows.map(x => x.dong).filter(Boolean))];
  if (!names.length) return;
  umdCache[S.meta.lawd] = [...new Set([...(umdCache[S.meta.lawd] || []), ...names])]; store.set('fs-umd', umdCache);
}

// ---------- 입력칸 정의: [경로, 라벨, 단위 또는 선택지, 옵션] ----------
const sel = a => ({ sel: a });
const FIELDS = {
  'f-meta': [
    ['meta.type', '공급 유형', sel([['tong', '통합공공임대'], ['happy', '행복주택'], ['kuk', '국민임대'], ['young', '영구임대'], ['buy', '매입임대'], ['jeonse', '장기전세'], ['custom', '임대료 직접 입력']])],
    ['meta.period', '운영 분석 기간', sel([['10', '10년'], ['30', '30년'], ['50', '50년']])],
    ['meta.constr', '공사 기간', '년'],
    ['meta.floor', '동 최고층수', '층'],
    ['meta.tbl', '표준건축비 고시', sel([['2023', '2023.2.1 (현행)'], ['2016', '2016.6.8 (종전)']])],
    ['meta.kind', '주택 구분', sel([['house', '주택(공동주택 등)'], ['semi', '준주택(오피스텔·기숙사 등)'], ['rural', '수도권 외 비도시 읍·면 주택']])]
  ],
  'f-survey': [
    ['survey.months', '조회 기간', sel([['6', '최근 6개월'], ['12', '최근 12개월'], ['24', '최근 24개월']])],
    ['survey.band', '면적 허용 범위 (±)', '㎡'],
    ['survey.trim', '이상치 제외 (상·하위 각)', '%'],
    ['rent.rate', '시장전환율', '%'],
    ['survey.sameUmd', '같은 읍면동 사례만', 'chk'], ['survey.apt', '아파트', 'chk'], ['survey.rh', '연립·다세대', 'chk'], ['survey.offi', '오피스텔', 'chk'], ['survey.sh', '단독·다가구', 'chk']
  ],
  'f-cost': [
    ['cost.direct', '직접공사비 (실제)', '백만원'], ['cost.designP', '설계비', '%'], ['cost.superP', '감리비', '%'], ['cost.otherP', '부대비 (인입·부담금 등)', '%'],
    ['cost.contP', '예비비', '%'], ['cost.land', '택지비', '백만원'], ['cost.finCost', '건설 중 금융비용', '백만원']
  ],
  'f-std': [
    ['cost.struct', '구조형식 가산', sel([['0', '벽식 등 (없음)'], ['5', '라멘·무량판 (+5%)'], ['10', '철골철근콘크리트 (+10%)'], ['16', '철골조 (+16%)']])],
    ['cost.sash', '발코니 새시 일괄시공', '%'],
    ['cost.island', '도서지역', sel([['0', '해당 없음'], ['3', '도서지역 (+3%)']])],
    ['cost.stdAdd', '보증수수료·법령개정 등 가산액', '백만원']
  ],
  'f-fin': [
    ['fin.gov', '국고 재정지원', '백만원'], ['fin.loc', '지방비 보조', '백만원'], ['fin.inv', '주택도시기금 출자', '백만원'], ['fin.loan', '주택도시기금 융자', '백만원'],
    ['fin.ink', '지자체 현물출자 (토지 등)', '백만원'], ['fin.bond', '공사채 발행', '백만원'],
    ['fin.loanRate', '기금 융자 금리', '%'], ['fin.loanGrace', '기금 거치기간', '년'], ['fin.loanTerm', '기금 융자기간 (거치 포함)', '년'], ['fin.bondRate', '사채 금리', '%']
  ],
  'f-col': [
    ['corp.reg', '지역', sel([['80', '수도권 과밀억제권역 (80%)'], ['75', '광역시 (75%)'], ['70', '기타지역 (70%)']])],
    ['corp.col', '순담보가격 (대지 담보조사가격)', '백만원'],
    ['corp.ins', '화재보험 가입 약정', sel([['0', '없음'], ['5', '준공 즉시 가입 약정 (+5%p)']])],
    ['corp.pubL', '공공기관 분양토지 담보비율 (선택)', '%']
  ],
  'f-corp': [
    ['corp.founder', '설립 주체', sel([['sido', '시·도 설립 공사 (강원개발공사, 고정)']])],
    ['corp.net', '순자산 (자본총계)', '백만원'], ['corp.cap', '자본금', '백만원'], ['corp.debt', '부채총계', '백만원'], ['corp.bondBal', '기존 사채 잔액', '백만원'],
    ['corp.loss', '3년 이상 연속 당기순손실', sel([['0', '아니오'], ['1', '예']])],
    ['corp.eq', '다른 법인(리츠 등) 출자 예정액', '백만원'], ['corp.eqPrev', '기존 다른 법인 출자 잔액', '백만원'],
    ['corp.exempt', '타당성 검토 면제 사유', sel([['none', '없음'], ['inv', '설립 지자체 투자심사 거침'], ['pre', '예비타당성조사 거침·면제'], ['law', '법령상 의무 사업'], ['nat', '국무회의 확정 국가정책 사업']])]
  ],
  'f-op': [
    ['op.vac', '공가율', '%'], ['op.bad', '대손율 (임대료 대비)', '%'], ['op.mgmt', '사업자 부담 관리·위탁비', '원/세대·월'], ['op.repairP', '수선유지비 (건축비 대비, 연)', '%'],
    ['op.insP', '화재보험료 (건축비 대비, 연)', '%'], ['op.tax', '제세공과금 (연)', '백만원'], ['op.rentStep', '임대료 증액률 (회당)', '%'], ['op.rentEvery', '증액 주기', '년'],
    ['op.costG', '운영비 상승률 (연)', '%'], ['op.depYield', '보증금 운용수익률 (연)', '%'], ['op.other', '부대·복리시설 임대수입 (연)', '백만원']
  ],
  'f-eval': [
    ['eval.disc', '할인율', '%'],
    ['eval.exit', '분석 종료 시 처리', sel([['hold', '계속 보유 (장부가로 평가)'], ['sell', '매각 (감정가 추정)'], ['conv10', '분양전환 — 임대의무 10년 (감정가 이하)'], ['conv5', '분양전환 — 임대의무 5년 (별표 7 산식)']])],
    ['eval.appG', '감정가 상승률 (연)', '%'], ['eval.life', '건축물 내용연수', '년'], ['eval.convRate', '분양전환 이자율 (정기예금 평균)', '%']
  ]
};

// ---------- 넣는 법 / 근거 ----------
const HOW = {
  'meta.lawd': '사업지 시군을 고르면 실거래가 조회용 시군구 코드(법정동코드 앞 5자리)가 자동으로 정해집니다. 강원특별자치도 18개 시군만 다룹니다.',
  'meta.umd': '사업지 읍면동(법정동). 고르면 시세 조사에서 "같은 읍면동 사례만"을 켤 수 있습니다. 춘천시는 조례 별표 목록, 다른 시군은 실거래 자료에 나온 법정동 이름으로 채워집니다.',
  'meta.type': '공급할 공공임대 유형. 임대료 산식과 임대의무기간이 이 선택으로 정해집니다.',
  'meta.period': '임대 운영을 분석할 기간. 통합·국민·행복은 임대의무 30년, 영구 50년, 분양전환형은 10년.',
  'meta.constr': '착공부터 준공(입주)까지 기간. 공사비가 이 기간에 나눠 지출된다고 봅니다.',
  'meta.floor': '가장 높은 동의 최고층수. 표준건축비 단가 구간을 정합니다.',
  'meta.tbl': '입주자모집공고 시점이 2023.2.1 이후면 2023 고시.',
  'meta.kind': '건축물 용도. 기금 지원 대상(국민주택규모 85㎡, 비도시 읍·면 100㎡) 판단에 씁니다.',
  'survey.band': '타입 전용면적에서 몇 ㎡ 차이까지 비슷한 사례로 볼지. 보통 ±5㎡.',
  'survey.trim': '너무 비싸거나 싼 거래를 빼는 비율. 상·하위 각 10%면 가운데 80%만 평균합니다.',
  'rent.rate': '그 지역 실제 전월세 전환율(%). 시세 조사 탭에서 실거래가를 조회하면 같은 단지 전세·월세 거래로 전환율을 추정해 주고, "시장전환율에 적용"으로 바로 넣을 수 있습니다. 한국부동산원 통계값을 직접 넣어도 됩니다.',
  'survey.months': '고시 기준은 최근 1년. 사례가 적으면 24개월로 늘려 보세요.',
  'survey.sh': '단독·다가구는 전용면적이 아니라 건물 연면적으로 신고되어 면적 비교가 부정확합니다. 군 지역처럼 아파트 거래가 적을 때만 보조로 켜세요.',
  'survey.sameUmd': '개요 탭에서 고른 읍면동과 같은 법정동 거래만 씁니다. 사례가 너무 적으면 끄세요(고시 기준은 같거나 인접한 시·군·구).',
  'rent.depRate': '국민·영구임대 임대료 산식의 1년 만기 정기예금 이율(%).',
  'rent.kukRegion': '춘천 같은 도청소재지는 2권역(1.0), 그 밖의 시·군은 3권역(0.85).',
  'rent.kukSpecial': '입주자가 기초생활수급자이거나 주거환경개선사업지구 안 30㎡ 이하일 때만.',
  'rent.youngShare': '전체 세대 중 생계·의료급여 수급자에게 공급할 비율(%).',
  'rent.youngGrade': '사업지 급지. 춘천처럼 도청소재지·인구 30만 이상은 3급지.',
  'rent.buyPct': '매입임대 사업유형별 감정평가금액 대비 비율.',
  'cost.direct': '도급(예정)금액 기준 직접공사비 총액(금액). 기본·실시설계 공사비 내역서 합계를 넣습니다.',
  'cost.designP': '설계비 ÷ 직접공사비(%). 공공발주 건축설계 대가기준으로 산정한 금액의 비율.',
  'cost.superP': '감리비 ÷ 직접공사비(%). 건설사업관리·전기·통신·소방 감리 대가 합계 비율.',
  'cost.otherP': '전기·가스·상수도 인입비, 각종 부담금, 인허가비 등 ÷ 직접공사비(%).',
  'cost.contP': '공사비 증액에 대비한 예비비 비율(%).',
  'cost.land': '택지 공급가격 또는 감정가(금액). 지자체가 현물출자하는 토지라면 재원 탭 현물출자에도 같은 금액을 넣습니다.',
  'cost.finCost': '공사 기간 중 기금 융자·사채 이자 등(금액).',
  'cost.struct': '구조계산서의 구조형식.', 'cost.sash': '발코니 새시를 일괄 시공하면 그 비용 비율(최대 5%).',
  'cost.island': '도서개발 촉진법상 도서지역이면 선택.', 'cost.stdAdd': '보증수수료, 법령·조례 개정 증감, 음식물 처리시설, 발코니 확장비 등 별표 7 가산 금액 합계.',
  'fin.gov': '국고 보조금(금액). 그해 국토교통부 사업 지침의 호당 지원단가 × 세대수.',
  'fin.loc': '도·시군 보조금(금액). 협약서·예산서 기준.',
  'fin.inv': '주택도시기금 출자(리츠 방식일 때만). 아니면 0.',
  'fin.loan': '주택도시기금 융자(금액). 기금운용계획의 호당 융자한도 × 세대수.',
  'fin.ink': '지자체가 토지 등으로 현물출자하는 금액(금액).',
  'fin.bond': '이번 사업으로 새로 발행할 공사채(금액). 분석 기간 동안 차환하며 이자만 내다가 종료 시 상환한다고 봅니다.',
  'fin.loanRate': '그해 기금운용계획의 해당 자금 금리(%).', 'fin.loanGrace': '이자만 내는 기간(년).', 'fin.loanTerm': '거치 포함 전체 융자기간(년). 거치 후 원금 균등 분할상환으로 계산합니다.',
  'fin.bondRate': '공사채 발행 금리(%).',
  'corp.col': '기금이 담보로 잡을 사업대지의 담보조사가격(금액).', 'corp.reg': '강원 등 비수도권 도 지역은 기타지역(70%).',
  'corp.ins': '준공 즉시 화재보험 가입을 약정하면 담보비율 +5%p.', 'corp.pubL': '공공기관에서 분양받은 토지라 수탁은행이 별도 담보비율을 정했으면 입력. 아니면 비움.',
  'corp.founder': '강원개발공사는 강원특별자치도가 세운 시·도 설립 공사라 고정했습니다. 신규투자사업 타당성 검토 기준은 총사업비 500억원 이상입니다.', 'corp.net': '직전 사업연도 결산 자본총계(금액).', 'corp.cap': '직전 연도 결산 자본금(금액).',
  'corp.debt': '직전 연도 결산 부채총계(금액).', 'corp.bondBal': '현재 남아 있는 공사채 잔액(금액).', 'corp.loss': '최근 3개 사업연도 이상 계속 당기순손실이면 "예".',
  'corp.eq': '리츠·SPC 등 다른 법인에 새로 출자할 금액(금액).', 'corp.eqPrev': '이미 다른 법인에 출자한 잔액(금액).', 'corp.exempt': '투자심사를 이미 받았거나 법령상 의무 사업이면 고르세요.',
  'op.vac': '비어 있는 세대 비율(%). 유사 단지 평균 공가율을 넣습니다.', 'op.bad': '받지 못할 임대료 비율(%).',
  'op.mgmt': '관리비 중 임차인이 아니라 사업자가 부담하는 위탁수수료·인건비 등(원/세대·월).', 'op.repairP': '연간 수선유지비 ÷ 건축비(%). 국민임대 고시는 0.4%, 영구임대 0.5%.',
  'op.insP': '연간 화재보험료 ÷ 건축비(%).', 'op.tax': '재산세 등 연간 제세공과(금액). 지방세특례제한법 감면을 반영한 금액.',
  'op.rentStep': '한 번 올릴 때 비율(%). 법 제49조② 한도는 5%.', 'op.rentEvery': '증액 간격(년). 갱신 주기가 2년이면 2. 법상 1년 이내 재증액은 안 됩니다.',
  'op.costG': '운영비 연 상승률(%). 소비자물가 상승률 수준.', 'op.depYield': '받은 임대보증금을 예치·운용해 얻는 수익률(%).',
  'op.other': '상가·어린이집 등 부대·복리시설 연 임대수입(금액).',
  'eval.disc': '현금흐름을 현재가치로 바꾸는 할인율(%). 공사 자금조달 비용이나 투자심사 기준값을 넣습니다.',
  'eval.exit': '분석 기간이 끝날 때 자산을 어떻게 볼지. 임대의무기간 전에는 매각·분양전환이 제한됩니다(법 제50조의2).',
  'eval.appG': '종료 시 감정가를 추정할 연 상승률(%).', 'eval.life': '철근콘크리트조 40년(30~50년).', 'eval.convRate': '분양전환가격 산정용 이자율: 임대시작일과 분양전환 당시 은행 1년 정기예금 평균이자율의 산술평균.'
};
// 드롭다운 선택지 설명: [선택값, 언제 고르나]
const OPT = {
  'meta.type': [
    ['tong', '통합공공임대: 국민·영구·행복을 하나로 합친 현행 주력 유형. 임대료는 시세의 35~90%(소득구간별)이고 그중 35%를 보증금, 나머지를 월세로 환산. 임대의무 30년.'],
    ['happy', '행복주택: 청년·신혼부부·고령자 등 대상. 시세의 60~80%, 보증금 50%. 임대의무 30년.'],
    ['kuk', '국민임대: 종전 방식 사업(통합 전환 전 승인 단지 등). 보증금 = 주택가격 × 20% × 규모계수 × 지역계수. 임대의무 30년.'],
    ['young', '영구임대: 생계·의료급여 수급자 등 최저소득층. 수급자는 ㎡당 고시 단가, 일반은 주택가격 20%. 임대의무 50년.'],
    ['buy', '매입임대: 새로 짓지 않고 기존·신축 주택을 사들여 임대. 감정가 대비 비율로 임대조건 결정.'],
    ['jeonse', '장기전세: 월세 없이 전세로만 공급. 시세 80% 이하. 임대의무 20년.'],
    ['custom', '임대료 직접 입력: 협약서·지침 등으로 임대조건이 이미 정해져 있을 때.']],
  'meta.period': [
    ['10', '10년: 10년 후 분양전환하는 사업이나, 초기 10년 수지만 빠르게 볼 때.'],
    ['30', '30년: 통합·국민·행복주택의 임대의무기간. 대부분 이것.'],
    ['50', '50년: 영구임대의 임대의무기간, 또는 장기 보유를 전제로 볼 때.']],
  'meta.tbl': [
    ['2023', '2023.2.1 고시(현행): 2023년 2월 1일 이후 입주자모집공고 사업. 신규 사업은 이것.'],
    ['2016', '2016.6.8 고시(종전): 그 전에 모집공고한 사업을 재검토하거나 비교할 때.']],
  'meta.kind': [
    ['house', '주택(공동주택 등): 아파트·연립 등. 기금 지원은 국민주택규모(전용 85㎡) 이하.'],
    ['semi', '준주택: 오피스텔·기숙사 등. 주택도시기금법 제9조①1호 다목의 준주택 건설 지원 대상.'],
    ['rural', '수도권 외 비도시 읍·면 주택: 도시지역이 아닌 읍·면이면 국민주택규모가 전용 100㎡까지 인정(주택법 제2조제6호). 강원 군 지역 사업은 해당 여부 확인.']],
  'survey.months': [
    ['6', '최근 6개월: 춘천·원주 시내처럼 거래가 많고 최근 시세 변화를 반영하고 싶을 때.'],
    ['12', '최근 12개월: 행복·통합 고시 기준(최근 1년). 기본값.'],
    ['24', '최근 24개월: 군 지역처럼 거래 사례가 너무 적을 때. 시세가 과거값에 끌릴 수 있음.']],
  'cost.struct': [
    ['0', '벽식 등: 일반 아파트 벽식 구조. 가산 없음.'],
    ['5', '라멘·무량판: 기둥·보 구조나 무량판 구조면 표준건축비 +5%.'],
    ['10', '철골철근콘크리트(SRC): +10%.'],
    ['16', '철골조: +16%.']],
  'cost.island': [
    ['0', '해당 없음: 강원 내륙 사업은 모두 이것.'],
    ['3', '도서지역: 「도서개발 촉진법」상 도서지역이면 +3%.']],
  'corp.reg': [
    ['80', '수도권 과밀억제권역: 담보비율 80%.'],
    ['75', '광역시: 75%.'],
    ['70', '기타지역: 70%. 강원특별자치도 사업은 이것.']],
  'corp.ins': [
    ['0', '없음: 화재보험 가입 약정을 하지 않을 때.'],
    ['5', '준공 즉시 가입 약정: 담보비율 +5%p(기타지역 70% → 75%). 보통 약정하므로 대부분 이것.']],
  'corp.loss': [
    ['0', '아니오: 최근 결산에서 3년 연속 당기순손실이 아닐 때.'],
    ['1', '예: 3개 사업연도 이상 연속 손실이면 공사채 발행 시 행정안전부장관 승인 대상으로 판정.']],
  'corp.exempt': [
    ['none', '없음: 면제 사유가 없음. 총사업비 500억원 이상이면 전문기관 타당성 검토 대상.'],
    ['inv', '설립 지자체 투자심사 거침: 강원특별자치도 투자심사를 이미 받은 사업.'],
    ['pre', '예비타당성조사 거침·면제: 국가 예타를 거쳤거나 면제받은 사업.'],
    ['law', '법령상 의무 사업: 법령에 따라 반드시 추진해야 하는 사업.'],
    ['nat', '국무회의 확정 국가정책 사업: 국가 정책으로 확정되어 추진하는 사업.']],
  'eval.exit': [
    ['hold', '계속 보유: 임대를 계속 운영. 종료 시점 자산을 토지 + 감가상각 후 건물 장부가로 평가. 30·50년 공공임대 기본.'],
    ['sell', '매각: 종료 시 감정가로 판다고 가정. 임대의무기간이 지난 뒤에만 가능.'],
    ['conv10', '분양전환(10년 임대): 임차인에게 감정가 이하로 분양전환. 감정가로 회수한다고 봄.'],
    ['conv5', '분양전환(5년 임대): 시행규칙 별표 7 산식(건설원가와 감정가 평균, 산정가격 상한)으로 회수.']],
  'rent.kukRegion': [
    ['1.15', '1권역(1.15): 수도권 과밀억제권역, 인구 50만 이상 시. 강원에는 해당 없음.'],
    ['1', '2권역(1.0): 그 밖의 수도권·광역시·도청소재지. 강원에서는 춘천시.'],
    ['0.85', '3권역(0.85): 그 밖의 지역. 원주·강릉 등 춘천 외 강원 17개 시군.']],
  'rent.kukSpecial': [
    ['none', '해당 없음: 일반 국민임대.'],
    ['recip', '기초생활수급자: 전용 36㎡ 이하 규모계수 0.75 대신 0.5 적용.'],
    ['improve', '주거환경개선사업지구: 지구 안 전용 30㎡ 이하 규모계수 0.25.']],
  'rent.youngGrade': [
    ['112672,2244', '1급지(서울): 강원 해당 없음.'],
    ['106852,2127', '2급지(광역시·수도권): 강원 해당 없음.'],
    ['101268,2015', '3급지(인구 30만 이상·도청소재지): 강원에서는 춘천시·원주시.'],
    ['96123,1911', '4급지(그 밖의 지역): 강릉 등 나머지 강원 16개 시군.']],
  'rent.buyPct': [
    ['50', '일반·청년·신혼신생아Ⅰ: 감정가 대비 50% 수준.'],
    ['80', '신혼신생아Ⅱ·장기미임대: 80%.'],
    ['90', '전세형: 90%.'],
    ['100', '시행규칙 제31조 단서: 별도 기준으로 100%까지 정하는 경우.']]
};
const LAW = {
  'meta.type': '공공주택 특별법 시행령 제2조(유형), 제54조(임대의무기간: 영구 50, 국민·행복·통합 30, 장기전세 20년)',
  'meta.floor': '시행규칙 별표 7 제2호라목1)가): 건축비는 표준건축비가 상한, 층수는 동별 최고층 기준',
  'meta.kind': '주택법 제2조제5호·제6호, 주택도시기금법 제9조①1호',
  'rent.rate': '행복·통합 고시 제2조·제5조: 시장전환율 = 해당 지역 실제 전월세 전환율',
  'survey.months': '행복·통합 고시 제2조②: 최근 1년간 전세·월세 계약 사례',
  'rent.kukRegion': '국민임대 고시 제2호: 보증금 = 주택가격 × 20/100 × 규모계수 × 지역계수(1.15/1.0/0.85)',
  'rent.kukSpecial': '국민임대 고시 제2호나목: 36㎡ 이하 0.75(수급자 0.5), 초과 전용/36(1.3 상한), 개선지구 30㎡ 이하 0.25',
  'rent.youngShare': '영구임대 고시 제2호: 일반등 보증금 주택가격 × 20%, 임대료 = 주택가격 10% × 정기예금 + 감가상각 + 수선(5/1000) + 보험·기금이자 + 대손 1%',
  'rent.youngGrade': '2026년 영구임대 수급자 고시(제2026-180호): 주거전용 ㎡당 단가',
  'rent.buyPct': '시행규칙 제31조, 매입임대 지침 제15조(50·80·90%)',
  'cost.struct': '별표 7 제2호라목1)나): 라멘 5%, 철골철근콘크리트 10%, 철골조 16%',
  'cost.sash': '별표 7 제2호라목1)바)(1)', 'cost.island': '별표 7 제2호라목1)바)(2)', 'cost.stdAdd': '별표 7 제2호라목1)다)·마)·바)',
  'cost.land': '별표 7 제2호라목2): 공공택지 공급가격 + 선납이자 + 필요적 경비',
  'fin.gov': '공공주택 특별법 제3조의2①③', 'fin.loc': '지방공기업법 제71조의2', 'fin.inv': '주택도시기금 운용 및 관리규정 제43조~제47조',
  'fin.loan': '주택도시기금법 제9조①, 운용 및 관리규정 제24조~제28조', 'fin.ink': '지방공기업법 제53조, 지방재정법 제18조',
  'fin.bond': '지방공기업법 제68조, 시행령 제62조(순자산 4배, 행정안전부장관 승인 기준)',
  'corp.reg': '기금 운용 및 관리규정 별표 1', 'corp.eq': '지방공기업법 제54조, 시행령 제47조의2', 'corp.founder': '지방공기업법 제65조의3, 시행령 제58조의2(500억/300억)',
  'op.rentStep': '공공주택 특별법 제49조②: 5% 이내, 증액 후 1년 이내 재증액 금지',
  'op.repairP': '국민임대 고시 제3호(4/1000), 영구임대 고시 제2호(5/1000)',
  'eval.exit': '공공주택 특별법 제50조의2(매각제한), 시행규칙 별표 7(분양전환가격)',
  'eval.life': '법인세법 시행령 제26조, 시행규칙 별표 5'
};

// ---------- 값 읽기·쓰기 ----------
const getP = p => p.split('.').reduce((o, k) => o[k], S);
const setP = (p, v) => { const ks = p.split('.'); const last = ks.pop(); ks.reduce((o, k) => o[k], S)[last] = v; };
const idOf = p => 'k-' + p.replace(/\./g, '-');

function fieldHTML([p, label, u]) {
  const id = idOf(p);
  if (u === 'chk') return `<div class="f"><label style="display:flex;gap:8px;align-items:center;min-height:42px;color:var(--ink)"><input type="checkbox" id="${id}" data-p="${p}" style="width:20px;min-height:20px"> ${label}</label></div>`;
  let ctl;
  if (u === 'list') ctl = `<input id="${id}" data-p="${p}" list="gwList" inputmode="numeric" autocomplete="off"><datalist id="gwList">${GW.map(g => `<option value="${g[0]}">${g[1]}</option>`).join('')}</datalist>`;
  else if (u && u.sel) ctl = `<select id="${id}" data-p="${p}">${u.sel.map(o => `<option value="${o[0]}">${o[1]}</option>`).join('')}</select>`;
  else ctl = `<div class="unit"><input id="${id}" data-p="${p}" type="text" inputmode="decimal" autocomplete="off" data-num="1"${u === '백만원' ? ' data-money="1"' : ''}><span>${u === '백만원' ? U.grid : u}</span></div>${u === '백만원' ? `<small class="eok" data-eok="${p}"></small>` : ''}`;
  const q = HOW[p] || LAW[p] || OPT[p] ? `<button type="button" class="q" data-h="${p}" aria-expanded="false" aria-label="${label} 넣는 법과 근거">?</button>` : '';
  return `<div class="f"><label for="${id}">${label}</label>${q}<div>${ctl}</div></div>`;
}
function buildFields() {
  for (const box in FIELDS) $(box).innerHTML = (box === 'f-meta' ? locHTML() : '') + FIELDS[box].map(fieldHTML).join('');
}
function fillFields() {
  document.querySelectorAll('[data-p]').forEach(el => {
    if (el === document.activeElement) return;
    const v = getP(el.dataset.p);
    if (el.type === 'checkbox') el.checked = !!v;
    else if (el.dataset.money && v !== '' && v !== null && isFinite(v)) el.value = NUMF(+(v * GRID_IN / UNITS[U.grid]).toFixed(6));
    else if (el.dataset.num) el.value = NUMF(v);
    else el.value = v ?? '';
  });
  if (document.activeElement !== $('projName')) $('projName').value = S.meta.name;
  if ($('lawdShow')) $('lawdShow').value = S.meta.lawd;
  eokHelpers();
}
document.addEventListener('click', e => {
  const b = e.target.closest('.q'); if (!b) return;
  e.preventDefault();
  const f = b.closest('.f'), open = f.querySelector('.pop'), k = b.dataset.h;
  document.querySelectorAll('.pop').forEach(p => p.remove()); document.querySelectorAll('.q').forEach(x => x.setAttribute('aria-expanded', 'false'));
  if (open && open.dataset.h === k) return;
  const p = document.createElement('div'); p.className = 'pop'; p.dataset.h = k;
  const cur = (f.querySelector('select') || {}).value;
  const opt = OPT[k] ? `<b style="margin-top:6px">선택지</b><ul class="opts">${OPT[k].map(([v, t]) => `<li${v === cur ? ' class="on"' : ''}>${v === cur ? '✓ ' : ''}${t}</li>`).join('')}</ul>` : '';
  p.innerHTML = (HOW[k] ? `<b>넣는 법</b>${HOW[k]}` : '') + opt + (LAW[k] ? `<b style="margin-top:6px">근거</b>${LAW[k]}` : '');
  b.parentElement.querySelector('div').after(p); b.setAttribute('aria-expanded', 'true');
});

// ---------- 세대 타입 표 ----------
const UCOLS = [['t', 'text'], ['e', 'number'], ['s', 'number'], ['n', 'number'], ['b', 'number']];
function unitTable() {
  $('unitTbl').tBodies[0].innerHTML = S.units.map((u, i) => `<tr>${UCOLS.map(([k, ty]) => `<td><input type="${ty}" step="any" data-u="${i}" data-c="${k}" value="${u[k]}" aria-label="${i + 1}번 타입 ${k}"></td>`).join('')}<td><button class="btn" data-del="${i}" aria-label="${i + 1}번 타입 삭제">×</button></td></tr>`).join('');
}
$('addUnit').addEventListener('click', () => { S.units.push({ t: '59형', e: 59, s: 80, n: 20, b: 35, mkt: 20000, sd: 5000, sm: 60, cd: 4000, cm: 350000, cnt: 0 }); unitTable(); update(); });
$('unitTbl').addEventListener('click', e => { const d = e.target.closest('[data-del]'); if (!d || S.units.length < 2) return; S.units.splice(+d.dataset.del, 1); unitTable(); update(); });

// ---------- 입력 이벤트 ----------
document.addEventListener('input', onEdit); document.addEventListener('change', onEdit);
function onEdit(e) {
  const t = e.target;
  if (t.dataset.p) {
    let v = t.type === 'checkbox' ? t.checked : t.dataset.num ? String(t.value).replace(/,/g, '') : t.value;
    const cur = getP(t.dataset.p);
    if (t.type === 'number' || t.dataset.num || (typeof cur === 'number' && t.tagName === 'SELECT')) v = parseFloat(v) || 0;
    if (t.dataset.money && t.value !== '') v = v * UNITS[U.grid] / GRID_IN;
    else if (t.dataset.money) v = t.dataset.p === 'corp.pubL' ? '' : 0;
    setP(t.dataset.p, v);
    if (t.dataset.p === 'meta.lawd' && e.type === 'change') { S.meta.umd = ''; buildFields(); fillFields(); loadUmd(S.meta.lawd); }
    if (e.type === 'change' && /^(eval\.exit|meta\.type|meta\.period|fin\.)/.test(t.dataset.p)) setTimeout(() => showLaw(false), 0);
    if (t.dataset.p === 'meta.type' && e.type === 'change') { const d = FE.DUTY[v]; if (d) { S.meta.period = d >= 50 ? 50 : 30; } if (v === 'buy') S.meta.period = 10; fillFields(); }
  } else if (t.dataset.u !== undefined) {
    S.units[+t.dataset.u][t.dataset.c] = t.type === 'number' ? (parseFloat(t.value) || 0) : t.value;
  } else if (t.dataset.mix !== undefined) {
    S.rent[t.dataset.mix][+t.dataset.i] = numOf(t);
  } else if (t.dataset.mk !== undefined) {
    S.units[+t.dataset.mk][t.dataset.c] = numOf(t);
  } else if (t.id === 'projName') { S.meta.name = t.value; }
  else return;
  if (SV && t.dataset.p && /^(survey|rent\.rate)/.test(t.dataset.p)) processSurvey();
  update(t);
}

// ---------- 공용 그리기 ----------
function bars(el, rows, max) {
  el.innerHTML = rows.map(r => `<div class="brow"><span>${r.l}</span><div class="track">${r.p.map(p => `<i class="${p.c}" style="width:${max > 0 ? Math.max(0, p.v / max * 100) : 0}%" title="${p.n || ''}"></i>`).join('')}</div><span class="v">${r.v}</span></div>`).join('');
}
const big = items => items.map(([l, v, c]) => `<div class="${c || ''}"><small>${l}</small><b data-k="${l}">${v}</b></div>`).join('');
const chk = list => list.map(x => `<p class="warn ${x[0]}">${x[1]}${x[2] ? `<br><small>${x[2]}</small>` : ''}</p>`).join('');

// ---------- 계산·화면 갱신 ----------
let R = null;
function update(src) {
  R = FE.run(S);
  renderOv(); renderSvTable(src); renderRn(src); renderTc(); renderFd(); renderEv(); renderStrip(); tweenNums(); eokHelpers();
  if ($('v-ev').classList.contains('imp')) renderImprove();
  store.set('fs-current', S);
}

function renderOv() {
  const { C, Rn, Fd, Ev } = R, g = GW.find(x => x[0] === S.meta.lawd);
  $('ovBig').innerHTML = big([['총사업비', eok(C.TC)], ['세대수', n0(C.hh) + '세대'], ['공사 관점 NPV', eok(Ev.npvEq), Ev.npvEq >= 0 ? 'pos' : 'neg'], ['공사 관점 IRR', pct(Ev.irrEq), Ev.irrEq !== null && Ev.irrEq >= S.eval.disc / 100 ? 'pos' : 'neg']]);
  $('ovSum').innerHTML = `<table><tbody>
<tr><td>위치</td><td>강원특별자치도 ${g ? g[1] : ''} ${S.meta.umd || ''} ${S.meta.addr || ''} <small style="color:var(--mute)">(${S.meta.lawd})</small></td></tr>
<tr><td>공급 유형</td><td>${FE.TYPE_NAME[S.meta.type]} · 임대의무 ${FE.DUTY[S.meta.type] || '해당 유형 기준'}${FE.DUTY[S.meta.type] ? '년' : ''}</td></tr>
<tr><td>분석 기간</td><td>공사 ${S.meta.constr}년 + 운영 ${S.meta.period}년${(FE.DUTY[S.meta.type] || 0) > S.meta.period ? ` <button type="button" class="lawflag" data-lawopen style="margin-left:6px;padding:2px 8px">⚠ 임대의무 ${FE.DUTY[S.meta.type]}년보다 짧음</button>` : ''}</td></tr>
<tr><td>주택공급면적 합계</td><td>${n0(C.area)}㎡</td></tr>
<tr><td>임대보증금 합계 / 연 임대료</td><td>${eok(Rn.depTotal)} / ${eok(Rn.annual)}</td></tr>
<tr><td>공사 자체자금 (부족분)</td><td>${eok(Fd.own)}</td></tr>
<tr><td>연평균 운영수지 (NOI)</td><td>${eok(Ev.avgNOI)}</td></tr>
<tr><td>투자금 회수</td><td>${Ev.payback ? `${Ev.payback}년차 (운영 ${Ev.payback - Ev.Cy}년차)` : '분석 기간 안에 회수 안 됨'}</td></tr></tbody></table>`;
}

// 시세 조사
function renderSvTable(src) {
  if (src && src.dataset && src.dataset.mk !== undefined) return;
  $('mktTbl').tBodies[0].innerHTML = S.units.map((u, i) => {
    const s = SV && SV.per[i];
    return `<tr><td>${u.t}<br><small style="color:var(--mute)">${u.e}㎡</small></td><td class="n">${s ? s.cnt : (u.cnt || '-')}</td><td class="n">${s ? n0(s.dep) : n0(u.sd)}만</td><td class="n">${s ? n0(s.mon) : n0(u.sm)}만</td><td><div class="unit"><input type="text" inputmode="decimal" autocomplete="off" data-num="1" data-mk="${i}" data-c="mkt" value="${NUMF(u.mkt)}" aria-label="${u.t} 전세 환산 시세"><span>만원</span></div><small class="eok">= ${eokTxt(u.mkt * 1e4)}</small>${s ? `<small style="color:var(--mute)">조회값 ${n0(s.conv)}만원</small>` : ''}</td></tr>`;
  }).join('');
}
// 실거래로 전월세전환율 추정: 같은 단지·같은 면적의 전세 중앙값과 월세 거래를 짝지어
// 전환율 = 월세 × 12 ÷ (전세보증금 − 월세보증금)
function estRate() {
  if (!SV || !SV.rows) return null;
  const med = a => { const b = [...a].sort((x, y) => x - y), m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };
  const g = {};
  SV.rows.forEach(x => { if (!(x.area > 0) || !(x.deposit >= 0)) return; const k = (x.name || '') + '|' + (x.dong || '') + '|' + Math.round(x.area); (g[k] = g[k] || []).push(x); });
  const rates = []; let groups = 0;
  for (const k in g) {
    const js = g[k].filter(x => !x.monthly).map(x => x.deposit), ws = g[k].filter(x => x.monthly > 0);
    if (!js.length || !ws.length) continue;
    const J = med(js); let used = 0;
    ws.forEach(w => { const gap = J - w.deposit; if (gap > 0) { const r = w.monthly * 12 / gap * 100; if (r >= 0.5 && r <= 20) { rates.push(r); used++; } } });
    if (used) groups++;
  }
  if (!rates.length) return null;
  return { rate: med(rates), n: rates.length, groups };
}
function processSurvey() {
  if (!SV) return;
  const r = S.rent.rate / 100, band = S.survey.band, trim = S.survey.trim / 100;
  SV.per = S.units.map(u => {
    const um = S.survey.sameUmd && S.meta.umd ? normU(S.meta.umd) : '';
    let a = SV.rows.filter(x => x.area > 0 && Math.abs(x.area - u.e) <= band && (!um || normU(x.dong) === um)).map(x => ({ ...x, conv: x.deposit + (r > 0 ? x.monthly * 12 / r : 0) }));
    a.sort((p, q) => p.conv - q.conv);
    const cut = Math.floor(a.length * trim); if (a.length - 2 * cut >= 3) a = a.slice(cut, a.length - cut);
    const avg = k => a.length ? a.reduce((s, x) => s + x[k], 0) / a.length : 0;
    return { cnt: a.length, conv: avg('conv'), dep: avg('deposit'), mon: avg('monthly'), list: a };
  });
  drawSurvey(); renderSvTable();
  const by = {};
  SV.per.flatMap(p => p.list).forEach(x => { const k = x.type + ' · ' + (x.name || x.dong); (by[k] = by[k] || []).push(x.conv); });
  const top = Object.entries(by).sort((a, b) => b[1].length - a[1].length).slice(0, 8);
  $('svList').innerHTML = top.length ? `<h2 style="margin-top:14px">사례가 많은 단지</h2><table><tbody>${top.map(([k, v]) => `<tr><td>${k}</td><td class="n">${v.length}건</td><td class="n">${n0(v.reduce((a, b) => a + b, 0) / v.length)}만원</td></tr>`).join('')}</tbody></table>` : '<p class="warn">면적 범위 안 사례가 없습니다. 범위나 기간을 늘려 보세요.</p>';
  const er = estRate(); SV.est = er;
  $('svList').insertAdjacentHTML('beforeend', er
    ? `<h2 style="margin-top:14px">실거래 기반 전월세전환율</h2><p>추정 <b>${er.rate.toFixed(2)}%</b> <small style="color:var(--mute)">(같은 단지·같은 면적 전세–월세 ${er.n}쌍, ${er.groups}개 단지 묶음의 중앙값)</small> · 현재 입력 ${S.rent.rate}%</p><div class="row"><button class="btn" id="btnRate">시장전환율에 적용</button></div><p class="note">전환율 = 월세 × 12 ÷ (같은 단지 전세 중앙값 − 그 월세의 보증금). 0.5~20% 밖 값은 뺐습니다.</p>`
    : `<p class="note" style="margin-top:14px">같은 단지·면적의 전세와 월세 거래가 짝지어지지 않아 전환율을 추정하지 못했습니다. 조회 기간을 늘리거나 한국부동산원 통계값을 넣으세요.</p>`);
}
document.addEventListener('click', e => {
  if (e.target.id !== 'btnRate' || !SV || !SV.est) return;
  S.rent.rate = +SV.est.rate.toFixed(2); fillFields(); processSurvey(); update();
});
const svFig = $('svFig');
function drawSurvey() {
  if (!SV) { svFig.innerHTML = '<p class="note">조회하면 사례가 여기에 점으로 찍힙니다.</p>'; return; }
  const W = svFig.clientWidth || 600, H = svFig.clientHeight || 300, L = 54, B = 28, T = 10, Rr = 10;
  const pts = SV.rows.filter(x => x.area > 0).map(x => ({ x: x.area, y: x.deposit + (S.rent.rate > 0 ? x.monthly * 12 / (S.rent.rate / 100) : 0), t: x.type }));
  if (!pts.length) { svFig.innerHTML = '<p class="note">조회 결과가 없습니다.</p>'; return; }
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y).sort((a, b) => a - b);
  const xmax = Math.min(120, Math.max(...xs, ...S.units.map(u => u.e)) + 5), ymax = ys[Math.floor(ys.length * 0.98)] * 1.1 || 1;
  const X = v => L + (v / xmax) * (W - L - Rr), Y = v => H - B - Math.min(1, v / ymax) * (H - B - T);
  const col = { '아파트': 'var(--sky)', '연립다세대': '#f0a020', '오피스텔': 'var(--mag)', '단독다가구': 'var(--ok)' };
  let g = '';
  for (let i = 0; i <= 4; i++) { const v = ymax * i / 4; g += `<line x1="${L}" x2="${W - Rr}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)"/><text x="${L - 6}" y="${Y(v) + 4}" text-anchor="end">${n0(v / 10000)}억</text>`; }
  for (let v = 0; v <= xmax; v += W < 520 ? 40 : 20) g += `<text x="${X(v)}" y="${H - 8}" text-anchor="middle">${v}</text>`;
  S.units.forEach(u => { g += `<rect x="${X(u.e - S.survey.band)}" y="${T}" width="${X(u.e + S.survey.band) - X(u.e - S.survey.band)}" height="${H - B - T}" fill="var(--soft)" opacity=".7"/>`; });
  pts.forEach(p => { g += `<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="2.6" fill="${col[p.t] || 'var(--mute)'}" opacity=".75"/>`; });
  S.units.forEach((u, i) => { const s = SV.per && SV.per[i]; if (s && s.cnt) g += `<line x1="${X(u.e - S.survey.band)}" x2="${X(u.e + S.survey.band)}" y1="${Y(s.conv)}" y2="${Y(s.conv)}" stroke="var(--ink)" stroke-width="2.5"/><text x="${X(u.e)}" y="${Y(s.conv) - 7}" text-anchor="middle">${u.t}</text>`; });
  svFig.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="면적별 전세 환산 금액 분포">${g}</svg>`;
}
new ResizeObserver(() => { drawSurvey(); drawEv(); }).observe(document.body);

const pass = () => store.get('fs-pass', '');
async function api(path, opt = {}) {
  const r = await fetch(path, { ...opt, headers: { 'Content-Type': 'application/json', 'x-passcode': pass(), ...(opt.headers || {}) } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.error || ('서버 오류 ' + r.status)), { status: r.status });
  return j;
}
$('btnFetch').addEventListener('click', async () => {
  const types = ['apt', 'rh', 'offi', 'sh'].filter(t => S.survey[t]).join(',');
  if (!types) { $('svMsg').textContent = '조회할 주택유형을 하나 이상 체크하세요.'; return; }
  if (!/^\d{5}$/.test(S.meta.lawd)) { $('svMsg').textContent = '개요 탭에서 시군구 코드(숫자 5자리)를 먼저 넣으세요.'; return; }
  $('svMsg').textContent = '국토교통부 실거래가를 조회하는 중입니다… (월·유형별로 나눠 불러 10~30초 걸릴 수 있습니다)';
  try {
    const j = await api(`/api/rent?lawd=${S.meta.lawd}&months=${S.survey.months}&types=${types}`);
    SV = { rows: j.rows }; rememberUmd(j.rows);
    $('svMsg').textContent = `${j.months[j.months.length - 1]}~${j.months[0]} 계약 ${n0(j.count)}건을 받았습니다.` + (j.errors.length ? ` 일부 실패: ${j.errors.slice(0, 2).join(' / ')}` : '') + ' 결과가 맞으면 "임대시세로 적용"을 누르세요.';
    processSurvey();
  } catch (e) {
    $('svMsg').textContent = e.status === 401 ? '접근코드가 필요합니다. 위쪽 "접근코드"를 눌러 넣어 주세요.'
      : !hasServer || !e.status ? '실거래가 자동 조회는 정식 사이트(배포 후)에서만 됩니다. 지금은 “타입별 임대시세” 표에 주변 시세를 직접 넣어 주세요.'
      : e.status === 501 ? '서버에 국토교통부 API 키(DATA_GO_KR_KEY)가 아직 설정되지 않았습니다. Vercel 환경변수에 넣은 뒤 다시 배포하세요.'
      : `조회하지 못했습니다 (${e.message || '원인 미상'}). 오른쪽 표에 시세를 직접 넣어도 됩니다.`;
  }
});
$('btnApply').addEventListener('click', () => {
  if (!SV || !SV.per) { $('svMsg').textContent = '먼저 실거래가를 조회하세요.'; return; }
  SV.per.forEach((p, i) => { if (p.cnt) { const u = S.units[i]; u.mkt = Math.round(p.conv); u.sd = Math.round(p.dep); u.sm = Math.round(p.mon); u.cnt = p.cnt; } });
  $('svMsg').textContent = '조회 결과를 타입별 임대시세로 적용했습니다. 사례가 0건인 타입은 기존 값을 유지했습니다.';
  update();
});

// 임대수입
function renderRn(src) {
  const t = S.meta.type, Rr = S.rent;
  $('rnTitle').textContent = FE.TYPE_NAME[t] + ' 임대료 산정 조건';
  if (!(src && src.closest && (src.closest('#f-rent') || src.closest('#mixBox')))) {
    const F = [['rent.rate', '시장전환율', '%']];
    if (t === 'kuk' || t === 'young') F.push(['rent.depRate', '1년 만기 정기예금 이율', '%']);
    if (t === 'kuk') F.push(['rent.kukRegion', '지역계수 (권역)', sel([['1.15', '1권역 — 과밀억제권역·인구 50만 이상 (1.15)'], ['1', '2권역 — 그 밖의 수도권·광역시·도청소재지 (1.0)'], ['0.85', '3권역 — 기타 (0.85)']])], ['rent.kukSpecial', '규모계수 특례', sel([['none', '해당 없음'], ['recip', '기초생활수급자 (36㎡ 이하 0.5)'], ['improve', '주거환경개선사업지구 30㎡ 이하 (0.25)']])]);
    if (t === 'young') F.push(['rent.youngShare', '수급자 공급 비율', '%'], ['rent.youngGrade', '수급자 급지 (2026년 고시)', sel([['112672,2244', '1급지 — 서울'], ['106852,2127', '2급지 — 광역시·수도권'], ['101268,2015', '3급지 — 인구 30만 이상·도청소재지'], ['96123,1911', '4급지 — 그 밖의 지역']])]);
    if (t === 'buy') F.push(['rent.buyPct', '매입임대 사업유형', sel([['50', '일반·청년·신혼신생아Ⅰ (50%)'], ['80', '신혼신생아Ⅱ·장기미임대 (80%)'], ['90', '전세형 (90%)'], ['100', '시행규칙 제31조 단서 (100%)']])]);
    $('f-rent').innerHTML = F.map(fieldHTML).join('');
    let mix = '';
    if (t === 'tong' || t === 'happy') {
      const G = t === 'tong' ? FE.TONG : FE.HAPPY;
      mix = `<h2 style="margin-top:14px">${t === 'tong' ? '입주자 소득구간 구성' : '공급대상 구성'} (%)</h2><table class="tbl"><thead><tr><th>${t === 'tong' ? '소득구간' : '공급대상'}</th><th class="n">계수</th><th>비율</th></tr></thead><tbody>${G.map((g, i) => `<tr><td>${g[0]}</td><td class="n">${g[1].toFixed(2)}</td><td><div class="unit"><input type="number" step="any" data-mix="${t}" data-i="${i}" value="${Rr[t][i]}" aria-label="${g[0]} 비율"><span>%</span></div></td></tr>`).join('')}</tbody></table><p class="note">예상 입주자 구성 비율을 넣으면 가중평균 계수로 계산합니다. ${t === 'tong' ? '통합공공임대 고시 제3조·제4조·제5조: 보증금 = 시세 × 계수 × 35%, 임대료 = 시세 × 계수 × 65% × 시장전환율.' : '행복주택 고시 제3조·제4조·제5조: 보증금 = 시세 × 계수 × 50%, 임대료 = 보증금 × 시장전환율.'}</p>`;
    }
    if (t === 'custom') mix = `<h2 style="margin-top:14px">타입별 임대조건 직접 입력</h2><table class="tbl"><thead><tr><th>타입</th><th>보증금 (만원)</th><th>월임대료 (원)</th></tr></thead><tbody>${S.units.map((u, i) => `<tr><td>${u.t}</td><td><input type="text" inputmode="decimal" autocomplete="off" data-num="1" data-mk="${i}" data-c="cd" value="${NUMF(u.cd)}" aria-label="${u.t} 보증금"></td><td><input type="text" inputmode="decimal" autocomplete="off" data-num="1" data-mk="${i}" data-c="cm" value="${NUMF(u.cm)}" aria-label="${u.t} 월임대료"></td></tr>`).join('')}</tbody></table>`;
    $('mixBox').innerHTML = mix;
    fillFields();
  }
  const Rn = R.Rn;
  $('rnBig').innerHTML = big([['임대보증금 합계', eok(Rn.depTotal)], ['연 임대료 합계', eok(Rn.annual)], ['세대당 평균 월임대료', won(Rn.annual / 12 / Math.max(1, R.C.hh))]]);
  $('rnTbl').innerHTML = `<thead><tr><th>타입</th><th class="n">세대</th><th class="n">임대시세</th><th class="n">보증금</th><th class="n">월임대료</th><th>비고</th></tr></thead><tbody>${Rn.rows.map((x, i) => `<tr><td>${x.t}</td><td class="n">${x.n}</td><td class="n">${n0(S.units[i].mkt)}만</td><td class="n">${won(x.dep)}</td><td class="n">${won(x.mon)}</td><td>${x.note}</td></tr>`).join('')}</tbody>`;
  $('rnNote').textContent = { tong: '통합공공임대 고시 원문 기준. 표준임대료 식이 연액이라 12로 나눴습니다.', happy: '행복주택 고시 원문 기준.', kuk: '국민임대 고시 원문 기준. 주택가격·건축비·기금은 총사업비·재원 탭 값을 공급면적 비율로 나눠 씁니다.', young: '영구임대 고시와 2026년 수급자 고시 원문 기준. 일반등은 주택가격으로 산정합니다.', buy: '매입임대 지침 제15조. 시세 조사의 평균 보증금·월세를 감정평가 시중 임대료로 봅니다.', jeonse: '시행규칙 제30조: 인근 2~3개 단지 전세 평균의 80%. 전세 환산 시세를 평균 전세금으로 봅니다.', custom: '타입별로 직접 넣은 임대조건입니다.' }[t];
}

// 총사업비
function renderTc() {
  const C = R.C;
  $('tcBig').innerHTML = big([['총사업비', eok(C.TC)], ['세대당 사업비', eok(C.TC / Math.max(1, C.hh))], ['표준건축비 상한', eok(C.stdCap)], ['실제 건축비 / 상한', pct(C.bldReal / C.stdCap, 0), C.bldReal > C.stdCap ? 'neg' : 'pos']]);
  const parts = [['직접공사비', C.direct, 'c2'], ['설계·감리', C.design + C.sup, 'c4'], ['부대비·예비비', C.other + C.cont, 'c6'], ['택지비', C.land, 'c1'], ['금융비용', C.fin, 'c3']];
  bars($('tcBars'), [{ l: '총사업비', v: eok(C.TC), p: parts.map(p => ({ c: p[2], v: p[1], n: p[0] })) }, { l: '표준건축비 상한', v: eok(C.stdCap), p: [{ c: 'c5', v: C.stdCap }] }, { l: '인정 건축비', v: eok(C.bldAllowed), p: [{ c: 'c5', v: C.bldAllowed }] }], Math.max(C.TC, C.stdCap));
  const row = (a, b, c = '') => `<tr><td>${a}</td><td class="n">${b}</td><td class="n" style="color:var(--mute)">${c}</td></tr>`;
  $('tcTbl').innerHTML = `<thead><tr><th>항목</th><th class="n">${U.grid}</th><th class="n">비고</th></tr></thead><tbody>
${row('직접공사비', mil(C.direct))}${row('설계비', mil(C.design), S.cost.designP + '%')}${row('감리비', mil(C.sup), S.cost.superP + '%')}${row('부대비', mil(C.other), S.cost.otherP + '%')}${row('예비비', mil(C.cont), S.cost.contP + '%')}
${row('<b>실제 건축비</b>', '<b>' + mil(C.bldReal) + '</b>')}${row('택지비', mil(C.land))}${row('건설 중 금융비용', mil(C.fin))}${row('<b>총사업비</b>', '<b>' + mil(C.TC) + '</b>', '세대당 ' + mil(C.TC / Math.max(1, C.hh)))}
${row('표준건축비 (지상, 단가 × 공급면적)', mil(C.std), S.units.map((u, i) => u.t + ' ' + n0(C.per[i] / 1000) + '천원/㎡').join(', '))}${row('지하층 (단가 × 63%)', mil(C.base))}${row('구조·새시·도서·기타 가산', mil(C.stdAdd))}
${row('<b>표준건축비 상한</b>', '<b>' + mil(C.stdCap) + '</b>', '별표 7 제2호라목1)')}${row('인정 건축비 (실제와 상한 중 작은 값)', mil(C.bldAllowed))}${row('최초 주택가격 (인정 건축비 + 택지비)', mil(C.house), '별표 7 제2호가목1)')}
${row('최초 임대보증금 합계 상한 (주택가격 − 기금 융자)', mil(C.house - S.fin.loan * M), '시행령 제44조③')}</tbody>`;
}

// 재원
function renderFd() {
  const { C, Rn, Fd } = R, F = S.fin, K = S.corp;
  $('fdBig').innerHTML = big([['공공 지원 (재정·기금)', eok(Fd.gov + Fd.loc + Fd.inv + Fd.loan)], ['공사 부담 (자체+사채)', eok(Fd.own + Fd.bond), Fd.own < 0 ? 'neg' : ''], ['공사 자체자금', eok(Fd.own), Fd.own < 0 ? 'neg' : '']]);
  const parts = [['국고', Fd.gov, 'c2'], ['지방비', Fd.loc, 'c2'], ['기금 출자', Fd.inv, 'c4'], ['기금 융자', Fd.loan, 'c4'], ['임대보증금', Fd.dep, 'c3'], ['현물출자', Fd.ink, 'c1'], ['사채', Fd.bond, 'c6'], ['자체자금', Math.max(0, Fd.own), 'c5']];
  bars($('fdBars'), [{ l: '총사업비', v: eok(C.TC), p: [{ c: 'c1', v: C.TC }] }, { l: '재원', v: eok(C.TC), p: parts.map(p => ({ c: p[2], v: p[1], n: p[0] })) }], C.TC);
  $('fdLegend').innerHTML = parts.filter(p => p[1] > 0).map(p => `<span><i class="${p[2]}"></i>${p[0]} ${pct(p[1] / C.TC, 0)}</span>`).join('');
  const L = [], ok = (a, b) => L.push(['ok', a, b]), ng = (a, b) => L.push(['', a, b]), info = (a, b) => L.push(['info', a, b]);
  if (Fd.own < 0) ng(`재원 합계가 총사업비보다 ${eok(-Fd.own)} 많습니다. 사채나 보조금을 줄이세요.`, '');
  const maxE = Math.max(...S.units.map(u => u.e)), semi = S.meta.kind === 'semi', lim = S.meta.kind === 'rural' ? 100 : 85;
  if (Fd.inv + Fd.loan > 0) {
    if (semi) ok('준주택 건설은 기금 주택계정 출자·융자 대상입니다.', '주택도시기금법 제9조①1호다목');
    else if (maxE <= lim) ok(`최대 전용 ${maxE}㎡ — 국민주택규모(${lim}㎡ 이하)라 기금 출자·융자 대상입니다.`, '주택도시기금법 제9조①1호가목, 주택법 제2조제5호·제6호');
    else ng(`전용 ${maxE}㎡ 타입이 국민주택규모(${lim}㎡)를 넘습니다. 해당 타입은 국민주택 건설자금 대상이 아닙니다.`, '주택도시기금법 제9조①1호가목');
  }
  if (Fd.loan > 0) {
    const pub = parseFloat(K.pubL), r = Math.min(100, (isFinite(pub) ? pub : +K.reg) + +K.ins), cap = K.col * M * r / 100;
    (Fd.loan <= cap ? ok : ng)(`기금 융자 ${eok(Fd.loan)} / 대지 담보한도 ${eok(cap)} (순담보가격 × ${r}%)${Fd.loan > cap ? ' — 차액은 HUG·주택금융신용보증기금 보증서 등 다른 담보 필요' : ''}`, '기금 운용 및 관리규정 제24조·제27조, 별표 1');
  }
  const depCap = C.house - Fd.loan;
  (Rn.depTotal <= depCap ? ok : ng)(`임대보증금 합계 ${eok(Rn.depTotal)} / 상한 ${eok(depCap)} (주택가격 − 기금 융자)`, '공공주택 특별법 시행령 제44조③ (상호전환 시 최초 보증금 상한)');
  if (Fd.ink > 0) ok(`지자체 현물출자 ${eok(Fd.ink)} — 법령 근거가 있을 때만 출자할 수 있고 미리 지방의회 의결을 받아야 합니다.`, '지방공기업법 제53조①, 지방재정법 제18조');
  if (Fd.loc > 0) ok(`지방비 보조 ${eok(Fd.loc)} — 보조금·장기대부 가능. 예산 편성 전 투자심사 대상인지 확인.`, '지방공기업법 제71조의2, 지방재정법 제37조');
  if (Fd.bond > 0) {
    const lim2 = K.net * M * 4, after = (K.bondBal + F.bond) * M;
    (after <= lim2 ? ok : ng)(`사채 잔액(발행 후) ${eok(after)} / 한도 ${eok(lim2)} (주택사업 공사: 순자산 × 4배)`, '지방공기업법 제68조①, 시행령 제62조②1호');
    const dr = K.net > 0 ? (K.debt + F.bond) / K.net : Infinity, why = [];
    if (dr >= 2) why.push(`발행 예정액 포함 부채비율 ${pct(dr, 0)}`); if (K.loss === '1') why.push('3년 이상 연속 당기순손실'); if (F.bond * M >= 300e8) why.push('발행 예정액 300억 원 이상');
    if (why.length) ng('지자체장 승인 전에 행정안전부장관 승인이 필요합니다: ' + why.join(', ') + '.', '지방공기업법 제68조③, 시행령 제62조④');
    else ok(`지자체장 승인으로 발행 가능 (발행 예정액 포함 부채비율 ${pct(dr, 0)}).`, '지방공기업법 제68조①, 시행령 제62조④');
  }
  if (K.eq > 0) {
    const dr0 = K.net > 0 ? K.debt / K.net : Infinity, rr = dr0 < 1 ? 0.5 : dr0 < 2 ? 0.25 : 0.1, lim3 = K.cap * M * rr;
    ((K.eq + K.eqPrev) * M <= lim3 ? ok : ng)(`다른 법인 출자 합계 ${eok((K.eq + K.eqPrev) * M)} / 한도 ${eok(lim3)} (부채비율 ${pct(dr0, 0)} → 자본금의 ${rr * 100}%)`, '지방공기업법 제54조④, 시행령 제47조의2⑥');
    if (K.eq * M <= 1e8) ok('출자액 1억 원 이하 — 출자 타당성 검토 제외(지자체장·의회 보고).', '지방공기업법 제54조③, 시행령 제47조의2④');
    else ng('지자체장 승인, 전문기관 출자 타당성 사전검토, 의회 의결이 필요합니다(투자심사 등을 거친 사업은 제외).', '지방공기업법 제54조①~③, 시행령 제47조의2①');
  }
  const th = 500e8; // 시·도 설립 공사(강원개발공사) 고정
  if (C.TC >= th) { if (K.exempt === 'none') ng(`총사업비 ${eok(C.TC)} — ${th / 1e8}억 원 이상이라 신규 투자사업 타당성 검토 후 지자체장 보고·의회 의결이 필요합니다.`, '지방공기업법 제65조의3, 시행령 제58조의2'); else ok('타당성 검토 면제 사유가 있습니다. 제외 대상 확인요구서를 지자체장에게 내고 의회에 보고하세요.', '지방공기업법 제65조의3②, 시행령 제58조의2④'); }
  else ok(`총사업비 ${eok(C.TC)} — ${th / 1e8}억 원 미만이라 신규 투자사업 타당성 검토 대상이 아닙니다.`, '지방공기업법 시행령 제58조의2①');
  if ((Fd.loc + Fd.ink) > 0 && C.TC >= 500e8) info('지자체 부담이 있는 총사업비 500억 원 이상 신규사업은 투자심사 전 전문기관 타당성조사 대상입니다.', '지방재정법 제37조의2');
  $('fdChk').innerHTML = chk(L);
}

// 수익성
function renderEv() {
  const { Ev, C } = R, d = S.eval.disc / 100;
  $('evTitle').textContent = `수익성 — 공사 ${Ev.Cy}년 + 운영 ${Ev.N}년`;
  $('evBig').innerHTML = big([
    ['공사 관점 NPV', eok(Ev.npvEq), Ev.npvEq >= 0 ? 'pos' : 'neg'], ['공사 관점 IRR', pct(Ev.irrEq), Ev.irrEq !== null && Ev.irrEq >= d ? 'pos' : 'neg'],
    ['투자금 회수', Ev.payback ? `운영 ${Ev.payback - Ev.Cy}년차` : '기간 내 미회수', Ev.payback ? 'pos' : 'neg'],
    ['사업 전체 NPV', eok(Ev.npvProj), Ev.npvProj >= 0 ? 'pos' : 'neg'], ['사업 전체 IRR', pct(Ev.irrProj)], ['최저 DSCR', Ev.minDSCR === null ? '부채상환 없음' : Ev.minDSCR.toFixed(2) + '배', Ev.minDSCR !== null && Ev.minDSCR < 1 ? 'neg' : 'pos']
  ]);
  const L = [], duty = FE.DUTY[S.meta.type];
  L.push(['info', `공사 관점: 공사가 낸 돈(공사기간 지출 − 보조금·기금·현물·사채) 대비 운영수지·보증금·부채상환·종료가치. 국고·지방비·기금 출자는 상환 의무가 없는 외부 재원으로 봅니다. 사업 전체 관점: 총사업비 전체 대비 운영수지와 종료가치(보조금 포함 사업 자체의 수익성).`, '']);
  if (S.eval.exit !== 'hold' && duty && Ev.N < duty) L.push(['', `${FE.TYPE_NAME[S.meta.type]}은 임대의무기간 ${duty}년 안에는 매각·분양전환이 제한됩니다. 분석 기간 ${Ev.N}년에서 ${S.eval.exit === 'sell' ? '매각' : '분양전환'} 가정은 법적으로 맞지 않습니다.`, '공공주택 특별법 제50조의2, 시행령 제54조']);
  if (S.eval.exit.startsWith('conv') && ['tong', 'happy', 'kuk', 'young', 'jeonse'].includes(S.meta.type)) L.push(['', `${FE.TYPE_NAME[S.meta.type]}은 분양전환공공임대 유형이 아닙니다. 분양전환 시나리오는 분양전환형 공공임대·매입임대에 쓰세요.`, '시행령 제2조, 제54조']);
  if (S.op.rentStep > 5) L.push(['', '임대료 증액률이 5%를 넘습니다(법 제49조② 한도).', '공공주택 특별법 제49조②']);
  if (S.op.rentEvery < 1) L.push(['', '증액 후 1년 이내 재증액은 할 수 없습니다.', '공공주택 특별법 제49조②']);
  if (Ev.minDSCR !== null && Ev.minDSCR < 1) L.push(['', `운영수지로 원리금을 다 갚지 못하는 해가 있습니다(최저 DSCR ${Ev.minDSCR.toFixed(2)}). 보증금 운용·재정지원 확대나 상환 조건 조정이 필요합니다.`, '']);
  L.push(['info', `종료 시 처리: ${Ev.exitNote} — 자산가치 ${eok(Ev.value)}에서 보증금 반환 ${eok(Ev.rows[Ev.rows.length - 1].depEnd)}, 기금 잔액 ${eok(Ev.rows[Ev.rows.length - 1].loanBal)}, 사채 ${eok(R.Fd.bond)}를 뺍니다.`, '']);
  $('evChk').innerHTML = chk(L);
  drawEv(); renderSens(); renderCF();
}
const evFig = $('evFig');
function drawEv() {
  if (!R) return;
  const Ev = R.Ev, W = evFig.clientWidth || 600, H = evFig.clientHeight || 300, Lm = 62, B = 26, T = 12, Rm = 12;
  let cp = 0; const cumP = Ev.proj.map(v => cp += v), cumE = Ev.cum;
  const all = cumP.concat(cumE), mn = Math.min(0, ...all), mx = Math.max(0, ...all);
  const X = t => Lm + t / Ev.T * (W - Lm - Rm), Y = v => T + (mx - v) / ((mx - mn) || 1) * (H - T - B);
  let g = '';
  for (let i = 0; i <= 4; i++) { const v = mn + (mx - mn) * i / 4; g += `<line x1="${Lm}" x2="${W - Rm}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)"/><text x="${Lm - 6}" y="${Y(v) + 4}" text-anchor="end">${n0(v / 1e8)}억</text>`; }
  g += `<line x1="${Lm}" x2="${W - Rm}" y1="${Y(0)}" y2="${Y(0)}" stroke="var(--ink)" stroke-width="1.2"/>`;
  g += `<rect x="${X(0)}" y="${T}" width="${X(Ev.Cy) - X(0)}" height="${H - T - B}" fill="var(--soft)" opacity=".8"/><text x="${(X(0) + X(Ev.Cy)) / 2}" y="${H - B - 6}" text-anchor="middle">공사</text>`;
  const step = W < 520 ? 10 : 5;
  for (let t = 0; t <= Ev.T; t += step) g += `<text x="${X(t)}" y="${H - 7}" text-anchor="middle">${t}년</text>`;
  const path = (arr, c) => `<polyline pathLength="1" fill="none" stroke="${c}" stroke-width="2.6" points="${arr.map((v, t) => `${X(t).toFixed(1)},${Y(v).toFixed(1)}`).join(' ')}"/>`;
  const area = `${X(0)},${Y(0)} ` + cumE.map((v, t) => `${X(t).toFixed(1)},${Y(v).toFixed(1)}`).join(' ') + ` ${X(cumE.length - 1)},${Y(0)}`;
  g += `<defs><clipPath id="cpUp"><rect x="0" y="0" width="${W}" height="${Y(0)}"/></clipPath><clipPath id="cpDn"><rect x="0" y="${Y(0)}" width="${W}" height="${H}"/></clipPath></defs>`
    + `<g class="shade"><polygon class="gain" clip-path="url(#cpUp)" points="${area}"/><polygon class="loss" clip-path="url(#cpDn)" points="${area}"/></g>`;
  g += path(cumP, 'var(--sky)') + path(cumE, 'var(--mag)');
  if (Ev.payback) {
    const px = X(Ev.payback), py = Y(cumE[Ev.payback]), lab = `운영 ${Ev.payback - Ev.Cy}년차 회수`, right = px > W - 120;
    g += `<g class="pb"><line class="pbline" x1="${px}" x2="${px}" y1="${T}" y2="${H - B}"/><circle cx="${px}" cy="${py}" r="5.5" fill="var(--mag)" stroke="var(--panel)" stroke-width="2"/><text x="${px + (right ? -8 : 8)}" y="${T + 14}" text-anchor="${right ? 'end' : 'start'}" style="fill:var(--ink);font-weight:600">${lab}</text></g>`;
  } else g += `<text x="${W - Rm}" y="${T + 14}" text-anchor="end" style="fill:var(--mag);font-weight:600">분석 기간 안에 회수 안 됨</text>`;
  evFig.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="누적 현금흐름">${g}</svg>`;
}
function renderSens() {
  const s = FE.sensitivity(S), base = s.base.npvEq;
  const span = Math.max(1, ...s.rows.map(r => Math.max(Math.abs(r.low - base), Math.abs(r.high - base))));
  $('sens').innerHTML = `<p class="note" style="margin-top:0">기준 NPV ${eok(base)} · IRR ${pct(s.base.irrEq)}</p>` + s.rows.map(r => {
    const lo = Math.min(r.low, r.high) - base, hi = Math.max(r.low, r.high) - base;
    return `<div class="brow sens"><span>${r.name}</span><div style="position:relative;height:24px;background:var(--soft);border-radius:6px"><i style="position:absolute;top:0;bottom:0;left:50%;width:1px;background:var(--ink)"></i><i class="c3" style="position:absolute;top:3px;bottom:3px;right:50%;width:${Math.abs(Math.min(0, lo)) / span * 50}%"></i><i class="c5" style="position:absolute;top:3px;bottom:3px;left:50%;width:${Math.max(0, hi) / span * 50}%"></i></div><span class="v">${eok(r.low)} ~ ${eok(r.high)}</span></div>`;
  }).join('');
}
let CSV = '';
function renderCF() {
  const Ev = R.Ev, op = Ev.rows.filter(r => r.phase === '운영');
  const show = op.filter((r, i) => Ev.N <= 30 || i < 10 || (r.k % 5 === 0) || i === op.length - 1);
  const head = ['구분', '연차', '임대료', '보증금 운용', '기타', '수입 계', '관리·위탁', '수선유지', '특별수선충당', '보험·제세', '대손', '운영비 계', '운영수지(NOI)', '기금 이자', '기금 원금', '사채 이자', '보증금 증감', '공사 현금흐름', '회계 손익', '누적(공사)'];
  const f = v => mil(v);
  const line = r => r.phase === '공사' ? ['공사', r.t + '년', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', f(r.eq), '', f(Ev.cum[r.t])] :
    r.phase === '종료' ? ['종료', r.t + '년', '자산가치 ' + f(r.value), '', '', '', '', '', '', '', '', '', '', '', '기금 잔액 ' + f(r.loanBal), '사채 ' + f(r.bondBal), '보증금 반환 ' + f(r.depEnd), f(r.eq), '', f(Ev.cum[Ev.T])] :
      ['운영', r.k + '년차', f(r.rentInc), f(r.depInc), f(r.other), f(r.income), f(r.mgmt), f(r.repair), f(r.special), f(r.ins + r.tax), f(r.bad), f(r.opex), f(r.NOI), f(r.lInt), f(r.lPrin), f(r.bInt), f(r.dDep), f(r.eq), f(r.pl), f(Ev.cum[r.t])];
  const all = Ev.rows.filter(r => r.phase !== '운영').slice(0, Ev.Cy).concat(op, Ev.rows.filter(r => r.phase === '종료'));
  const vis = Ev.rows.filter(r => r.phase === '공사').concat(show, Ev.rows.filter(r => r.phase === '종료'));
  $('cfTbl').innerHTML = `<thead><tr>${head.map((h, i) => `<th class="${i > 1 ? 'n' : ''}">${h}</th>`).join('')}</tr></thead><tbody>${vis.map(r => `<tr>${line(r).map((c, i) => `<td class="${i > 1 ? 'n' : ''}${typeof c === 'string' && c.startsWith('-') ? ' neg' : ''}">${c}</td>`).join('')}</tr>`).join('')}</tbody>`;
  CSV = [head.join('\t')].concat(all.map(r => line(r).join('\t'))).join('\n');
  $('csvMsg').textContent = `단위: ${U.grid}. ${Ev.N > 30 ? '화면에는 10년차까지와 5년 단위만 보이고, 복사하면 전체 연도가 들어갑니다.' : ''}`;
}
$('btnCSV').addEventListener('click', async () => { try { await navigator.clipboard.writeText(CSV); $('csvMsg').textContent = '전체 연도 표를 복사했습니다. 엑셀에 붙여넣으세요. (단위: ' + U.grid + ')'; } catch (e) { $('csvMsg').textContent = '복사가 막혔습니다. 브라우저 권한을 확인하세요.'; } });

// ---------- 저장·불러오기·비교 ----------
function summary() {
  const { C, Fd, Ev, Rn } = R, g = GW.find(x => x[0] === S.meta.lawd);
  return { name: S.meta.name, region: g ? g[1] : S.meta.lawd, type: FE.TYPE_NAME[S.meta.type], period: S.meta.period, hh: C.hh, TC: C.TC, perHH: C.TC / Math.max(1, C.hh), pub: Fd.gov + Fd.loc + Fd.inv + Fd.loan, own: Fd.own + Fd.bond, dep: Rn.depTotal, rent: Rn.annual, npvEq: Ev.npvEq, irrEq: Ev.irrEq, npvProj: Ev.npvProj, payback: Ev.payback ? Ev.payback - Ev.Cy : null, avgNOI: Ev.avgNOI, dscr: Ev.minDSCR };
}
const LOCAL = 'fs-projects';
let serverOK = false;
async function saveProject() {
  const body = { id: projId, data: S, summary: summary() };
  try {
    if (!serverOK) throw new Error('local');
    const j = await api('/api/projects', { method: 'POST', body: JSON.stringify(body) });
    projId = j.id; store.set('fs-current-id', projId);
    flash(`사업을 저장했습니다 (${new Date(j.savedAt).toLocaleString('ko-KR')}).`);
  } catch (e) {
    const all = store.get(LOCAL, {}); projId = projId || 'l' + Date.now().toString(36); store.set('fs-current-id', projId);
    all[projId] = { id: projId, savedAt: new Date().toISOString(), data: clone(S), summary: { ...summary(), id: projId, savedAt: new Date().toISOString(), local: true } };
    store.set(LOCAL, all);
    flash(e.message === 'local' ? '사업을 이 브라우저에 저장했습니다.' : `서버 저장 실패(${e.message}) — 이 브라우저에 대신 저장했습니다.`);
  }
  loadList();
}
function flash(t) { $('status').innerHTML = t; toast(t); setTimeout(health, 6000); }
$('btnSave').addEventListener('click', saveProject);
$('btnNew').addEventListener('click', () => { S = clone(DEF); S.meta.name = '새 사업'; projId = null; store.set('fs-current-id', null); SV = null; boot(); });
$('btnExport').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ app: 'public-housing-feasibility', v: 1, data: S }, null, 1)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = (S.meta.name || '사업') + '.json'; a.click(); URL.revokeObjectURL(a.href);
});
$('fileImport').addEventListener('change', async e => {
  const f = e.target.files[0]; if (!f) return;
  try { const j = JSON.parse(await f.text()); S = Object.assign(clone(DEF), j.data || j); projId = null; boot(); flash('파일을 불러왔습니다.'); } catch (err) { flash('불러올 수 없는 파일입니다.'); }
  e.target.value = '';
});
let LIST = [];
async function loadList() {
  let list = [];
  if (serverOK) { try { list = (await api('/api/projects')).list; } catch (e) { $('cpMsg').textContent = '서버 목록을 불러오지 못했습니다: ' + e.message; } }
  const loc = Object.values(store.get(LOCAL, {})).map(x => x.summary);
  LIST = list.concat(loc);
  const S_ = v => v === null || v === undefined ? '-' : v;
  $('cpTbl').innerHTML = LIST.length ? `<thead><tr><th></th><th>사업명</th><th>지역·유형</th><th class="n">세대</th><th class="n">총사업비</th><th class="n">공사 NPV</th><th class="n">공사 IRR</th><th class="n">회수</th><th>저장</th><th></th></tr></thead><tbody>${LIST.map((p, i) => `<tr><td><input type="checkbox" data-pick="${i}" aria-label="${p.name} 비교 선택" style="width:20px;min-height:20px"></td><td>${p.name}</td><td>${p.region} · ${p.type}</td><td class="n">${n0(p.hh)}</td><td class="n">${eok(p.TC)}</td><td class="n${p.npvEq < 0 ? ' neg' : ''}">${eok(p.npvEq)}</td><td class="n">${pct(p.irrEq)}</td><td class="n">${p.payback ? '운영 ' + p.payback + '년차' : '-'}</td><td>${p.local ? '이 브라우저' : '서버'} · ${new Date(p.savedAt).toLocaleDateString('ko-KR')}</td><td><button class="btn" data-open="${i}">불러오기</button> <button class="btn" data-rm="${i}">삭제</button></td></tr>`).join('')}</tbody>` : '<tbody><tr><td>저장된 사업이 없습니다. 위쪽 "사업 저장"을 누르면 여기에 쌓입니다.</td></tr></tbody>';
}
$('cpTbl').addEventListener('click', async e => {
  const o = e.target.closest('[data-open]'), rm = e.target.closest('[data-rm]');
  if (o) {
    const p = LIST[+o.dataset.open];
    try {
      const full = p.local ? store.get(LOCAL, {})[p.id] : await api('/api/projects?id=' + p.id);
      S = Object.assign(clone(DEF), full.data); projId = p.id; store.set('fs-current-id', projId); SV = null; boot(); flash(`"${p.name}"을 불러왔습니다.`);
    } catch (err) { $('cpMsg').textContent = '불러오지 못했습니다: ' + err.message; }
  }
  if (rm) {
    const p = LIST[+rm.dataset.rm];
    if (rm.dataset.sure !== '1') { rm.dataset.sure = '1'; rm.textContent = '정말 삭제'; return; }
    try { if (p.local) { const all = store.get(LOCAL, {}); delete all[p.id]; store.set(LOCAL, all); } else await api('/api/projects?id=' + p.id, { method: 'DELETE' }); loadList(); } catch (err) { $('cpMsg').textContent = '삭제하지 못했습니다: ' + err.message; }
  }
});
$('btnReload').addEventListener('click', loadList);
$('btnCompare').addEventListener('click', () => {
  const picks = [...document.querySelectorAll('[data-pick]:checked')].map(x => LIST[+x.dataset.pick]);
  const cur = { ...summary(), name: S.meta.name + ' (현재 화면)' };
  const cols = picks.length ? picks : [cur];
  const rows = [['지역', p => p.region], ['공급 유형', p => p.type], ['운영 기간', p => p.period + '년'], ['세대수', p => n0(p.hh)], ['총사업비', p => eok(p.TC)], ['세대당 사업비', p => eok(p.perHH)], ['공공 지원(재정·기금)', p => eok(p.pub)], ['공사 부담(자체·사채)', p => eok(p.own)], ['보증금 합계', p => eok(p.dep)], ['연 임대료', p => eok(p.rent)], ['연평균 운영수지', p => eok(p.avgNOI)], ['공사 관점 NPV', p => eok(p.npvEq)], ['공사 관점 IRR', p => pct(p.irrEq)], ['사업 전체 NPV', p => eok(p.npvProj)], ['투자금 회수', p => p.payback ? '운영 ' + p.payback + '년차' : '미회수'], ['최저 DSCR', p => p.dscr === null || p.dscr === undefined ? '-' : (+p.dscr).toFixed(2) + '배']];
  $('cmpTbl').innerHTML = `<thead><tr><th>지표</th>${cols.map(p => `<th class="n">${p.name}</th>`).join('')}</tr></thead><tbody>${rows.map(([l, f]) => `<tr><td>${l}</td>${cols.map(p => `<td class="n">${f(p)}</td>`).join('')}</tr>`).join('')}</tbody>`;
});

// 설정 (단위·소수점)
const uOpts = (sel, keys) => keys.map(k => `<option value="${k}"${k === sel ? ' selected' : ''}>${k}</option>`).join('');
const dOpts = sel => [0, 1, 2, 3].map(k => `<option value="${k}"${k === +sel ? ' selected' : ''}>${k}자리</option>`).join('');
function openSettings() {
  $('setBody').innerHTML = `
<div class="grid"><div class="f"><label for="u-kpi">요약 지표 단위</label><div><select id="u-kpi">${uOpts(U.kpi, ['조원', '억원', '천만원', '백만원', '만원'])}</select></div></div>
<div class="f"><label for="u-kpiDp">요약 지표 소수점</label><div><select id="u-kpiDp">${dOpts(U.kpiDp)}</select></div></div>
<div class="f"><label for="u-grid">표·입력칸 단위</label><div><select id="u-grid">${uOpts(U.grid, ['억원', '천만원', '백만원', '만원', '천원', '원'])}</select></div></div>
<div class="f"><label for="u-gridDp">표 소수점</label><div><select id="u-gridDp">${dOpts(U.gridDp)}</select></div></div>
<div class="f"><label for="u-hh">세대별 금액 단위 (보증금·월임대료)</label><div><select id="u-hh">${uOpts(U.hh, ['백만원', '만원', '천원', '원'])}</select></div></div>
<div class="f"><label for="u-hhDp">세대별 금액 소수점</label><div><select id="u-hhDp">${dOpts(U.hhDp)}</select></div></div></div>
<p class="note" id="uPrev"></p>`;
  const prev = () => { const t = { kpi: $('u-kpi').value, kpiDp: +$('u-kpiDp').value, grid: $('u-grid').value, gridDp: +$('u-gridDp').value, hh: $('u-hh').value, hhDp: +$('u-hhDp').value };
    const v = R ? R.C.TC : 43515500000, m = R ? R.Rn.rows[0].mon : 192563;
    $('uPrev').innerHTML = `미리보기 — 총사업비 <b>${fmtU(v, t.kpi, t.kpiDp)}${t.kpi}</b> · 표와 입력칸 <b>${fmtU(v, t.grid, t.gridDp)}</b> ${t.grid} · 월임대료 <b>${fmtU(m, t.hh, t.hhDp)}${t.hh}</b>`; return t; };
  $('setBody').oninput = prev; $('setBody').onchange = prev; prev();
  $('setDlg').classList.add('on'); $('u-kpi').focus();
}
$('btnSet').addEventListener('click', openSettings);
$('setCancel').addEventListener('click', () => $('setDlg').classList.remove('on'));
$('setReset').addEventListener('click', () => { U = Object.assign({}, UDEF); applyUnits(); });
$('setOk').addEventListener('click', () => {
  U = { kpi: $('u-kpi').value, kpiDp: +$('u-kpiDp').value, grid: $('u-grid').value, gridDp: +$('u-gridDp').value, hh: $('u-hh').value, hhDp: +$('u-hhDp').value };
  applyUnits();
});
function applyUnits() {
  try { localStorage.setItem('fs-units', JSON.stringify(U)); } catch (e) {}
  $('setDlg').classList.remove('on');
  buildFields(); fillFields(); update(); loadList();
  flash(`단위를 바꿨습니다 — 요약 ${U.kpi}, 표·입력 ${U.grid}, 세대별 ${U.hh}. 저장된 값은 그대로이고 보이는 단위만 바뀝니다.`);
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') document.querySelectorAll('.dialog.on').forEach(d => d.classList.remove('on')); });

// 접근코드
$('btnPass').addEventListener('click', () => { $('passIn').value = pass(); $('passDlg').classList.add('on'); $('passIn').focus(); });
$('passCancel').addEventListener('click', () => $('passDlg').classList.remove('on'));
$('passOk').addEventListener('click', () => { store.set('fs-pass', $('passIn').value); $('passDlg').classList.remove('on'); health(); loadList(); });

let hasServer = false;
async function health() {
  try {
    const r = await fetch('/api/health'); const j = await r.json();
    serverOK = j.store; hasServer = true;
    $('btnPass').hidden = !j.passcode;
    $('status').innerHTML = `<span>실거래가 API <b>${j.rentApi ? '연결됨' : '미설정'}</b></span><span>사업 저장소 <b>${j.store ? '연결됨' : '브라우저 저장'}</b></span>${j.passcode ? `<span>접근코드 <b>${pass() ? '입력됨' : '필요'}</b></span>` : ''}`;
  } catch (e) { serverOK = false; $('status').innerHTML = '서버 없음 — 계산은 되고, 저장은 이 브라우저에 합니다.'; }
}

// ---------- 탭 ----------
document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.tabs button').forEach(x => x.setAttribute('aria-selected', x === b));
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('on', v.id === 'v-' + b.dataset.v));
  enterView(b.dataset.v);
  if (b.dataset.v === 'ev') drawEv(); if (b.dataset.v === 'sv') drawSurvey(); if (b.dataset.v === 'cp') loadList();
  try { history.replaceState(null, '', '#' + b.dataset.v); } catch (e) {}
}));

// ---------- 법령 근거 ----------
$('lawBox').innerHTML = `<h2>분석 근거 (2026.11.20 현행, 법령 MCP·고시 원문 확인)</h2>
<article><h3>임대료</h3><p>공공주택 특별법 제49조(임대조건, 증액 5% 이내·1년 내 재증액 금지), 시행령 제44조(표준임대료 상한, 상호전환 시 최초 보증금 ≤ 건설원가 − 기금 융자금), 제45조(보증금 분할납부). 통합공공임대 고시(제2024-720호): 보증금 = 시세 × 소득구간 계수 × 35/100, 임대료 = 시세 × 계수 × 65/100 × 시장전환율, 계수 0.35~0.90. 행복주택 고시(제2025-152호): 보증금 = 시세 × 공급대상 계수 × 50/100, 임대료 = 보증금 × 시장전환율, 계수 0.60~0.80. 국민임대 고시(제2025-150호): 보증금 = 주택가격 × 20/100 × 규모계수 × 지역계수, 임대료 = 감가상각(50년·잔존 10%) + 수선(4/1000) + 보험·기금이자 + 자기자금이자 50%. 영구임대 고시(제2025-151호)와 2026년 수급자 고시(제2026-180호, ㎡당 단가). 매입임대 지침 제15조(50·80·90%), 시행규칙 제30조(장기전세 80%)·제31조.</p></article>
<article><h3>총사업비·건축비</h3><p>시행규칙 별표 7: 주택가격 = 건축비 + 택지비, 건축비는 표준건축비가 상한(동별 최고층 기준), 구조형식 5·10·16%, 지하층 63%, 새시 5% 이내, 도서지역 3% 등 가산. 공공건설임대주택 표준건축비 고시 제2023-64호 원문 단가.</p></article>
<article><h3>재원</h3><p>공공주택 특별법 제3조의2(세출예산 반영, 주택도시기금 우선 배정). 주택도시기금법 제9조(출자·융자 용도), 주택도시기금 운용 및 관리규정(담보비율 별표 1, 융자금 지급 제28조, 리츠 출자 제43조~제47조). 지방공기업법 제53조(지자체 현금·현물 출자), 제54조·시행령 제47조의2(다른 법인 출자 한도), 제65조의3·시행령 제58조의2(신규 투자사업 타당성 검토 500억/300억), 제68조·시행령 제62조(사채 한도 순자산 4배, 행정안전부장관 승인 기준), 제71조의2(보조금·장기대부). 지방재정법 제18조(출자·출연 제한), 제37조(투자심사), 제37조의2(500억 이상 타당성조사).</p></article>
<article><h3>운영·종료</h3><p>시행령 제54조(임대의무기간: 영구 50년, 국민·행복·통합 30년, 장기전세 20년, 분양전환형 10·6·5년), 법 제50조의2(매각제한). 시행령 제57조⑤(특별수선충당금: 영구·국민·행복·통합·장기전세는 표준건축비의 1만분의 4를 사용검사 1년 후부터 매달 적립). 시행규칙 별표 7(분양전환가격: 10년은 감정가 이하, 5년은 건설원가·감정가 산술평균이되 산정가격 − 감가상각비 상한). 법인세법 시행령 제26조·시행규칙 별표 5(정액법, 철근콘크리트 40년).</p></article>
<article><h3>시세 조사</h3><p>행복·통합 고시 제2조: 같거나 인접한 시·군·구, 규모·생활여건이 비슷한 대표 주택, 최근 1년 전세·월세 계약 사례, 시장전환율로 전액 보증금 환산. 데이터: 국토교통부 아파트·연립다세대·오피스텔 전월세 실거래가 API(공공데이터포털, LAWD_CD 5자리 + 계약년월).</p></article>
<article><h3>분석 방법의 단순화</h3><p>공사비는 공사기간에 균등 지출, 보증금은 준공 연도에 일시 수령 후 증액분만 추가 수령, 기금 융자는 거치 후 원금 균등상환, 사채는 차환하며 이자만 내다 종료 시 상환, 국고·지방비·기금 출자는 상환 의무 없는 외부 재원으로 봅니다. 법인세는 반영하지 않았습니다.</p></article>`;

// ---------- 시작 ----------
function boot() {
  S.corp.founder = 'sido';
  if (!GW.some(g => g[0] === S.meta.lawd)) S.meta.lawd = '51110';
  if (S.meta.umd === undefined) S.meta.umd = '';
  if (S.survey.sameUmd === undefined) S.survey.sameUmd = false;
  if (S.survey.sh === undefined) S.survey.sh = false;
  buildFields(); fillFields(); unitTable(); SV = null; drawSurvey();
  $('svList').innerHTML = '';
  update(); health().then(() => { loadList(); loadUmd(S.meta.lawd); });
  const h = (location.hash || '').slice(1); const b = document.querySelector(`.tabs button[data-v="${h}"]`); if (b) b.click();
}

// ---------- 법령 제한 경고창: 매각·분양전환 ----------
const eunNeun = w => { const c = w.charCodeAt(w.length - 1) - 0xAC00; return w + (c >= 0 && c < 11172 && c % 28 ? '은' : '는'); };
function lawIssues() {
  const t = S.meta.type, ex = S.eval.exit, duty = FE.DUTY[t] || 0, N = S.meta.period, nm = FE.TYPE_NAME[t], F = S.fin, L = [];
  const conv = ex === 'conv10' || ex === 'conv5', sale = conv || ex === 'sell';
  if (!sale && duty && N < duty)
    L.push({ k: 'period', t: `분석 기간 ${N}년이 임대의무기간 ${duty}년보다 짧습니다`, b: `${eunNeun(nm)} ${duty}년 동안 임대해야 하고 그 전에는 팔 수 없습니다. 지금 결과는 ${N}년 뒤 건물·토지를 장부가로 돌려받는다고 계산해서 실제보다 좋게 나옵니다. 남은 ${duty - N}년 동안의 운영 적자와 빚 상환이 빠져 있습니다.`, l: '공공주택 특별법 제50조의2①, 시행령 제54조①' });
  if (conv && ['tong', 'happy', 'kuk', 'young', 'jeonse'].includes(t))
    L.push({ k: 'law', t: `${eunNeun(nm)} 분양전환할 수 없습니다`, b: `분양전환은 처음부터 "분양전환공공임대주택"으로 계획한 경우에만 할 수 있습니다. ${eunNeun(nm)} 임대의무기간 ${duty}년 동안 팔 수 없습니다.`, l: '공공주택 특별법 제50조의2①, 시행령 제2조①제5호·제54조①' });
  else if (ex === 'sell' && duty && N < duty)
    L.push({ k: 'law', t: `임대의무기간 ${duty}년 안에는 팔 수 없습니다`, b: `분석 기간 ${N}년이 끝나는 시점은 아직 임대의무기간입니다. 예외는 LH·도·시 같은 다른 공공주택사업자에게 의무와 함께 넘기는 경우뿐입니다.`, l: '공공주택 특별법 제50조의2①·②제1호, 시행령 제54조①' });
  else if (conv && duty && N < duty)
    L.push({ k: 'law', t: `임대의무기간 ${duty}년 전에는 분양전환할 수 없습니다`, b: '임대의무기간의 절반이 지난 분양전환공공임대주택에서 임차인과 합의한 경우 등만 예외입니다.', l: '공공주택 특별법 제50조의2②제2호, 시행령 제54조②' });
  if (sale && L.length) {
    if (F.gov > 0) L.push({ k: 'money', t: '국비 보조금 반환 위험', b: '국비 보조로 지은 재산을 팔려면 국토교통부 승인을 받아야 합니다. 승인 없이 팔면 보조금 반환 명령 대상입니다.', l: '보조금 관리에 관한 법률 제35조' });
    if (F.loc > 0) L.push({ k: 'money', t: '지방비 보조금 반환 위험', b: '도·시 보조금으로 지은 재산도 지자체장 승인 없이 팔면 반환 명령 대상입니다. 출자라면 협약 조건을 따릅니다.', l: '지방자치단체 보조금 관리에 관한 법률 제21조' });
    if (F.inv > 0 || F.loan > 0) L.push({ k: 'money', t: '주택도시기금 출자·융자 조건 확인', b: '기금 지원은 임대 운영을 전제로 합니다. 분양·매각 시 융자 상환이나 출자금 회수 조건, 공모 지원 자격 유지 여부를 HUG·국토부에 먼저 확인해야 합니다.', l: '주택도시기금법 제9조, 그해 기금 업무편람·공모 지침' });
  }
  return L;
}
let lawSeen = '';
function lawFixPeriod() { const d = FE.DUTY[S.meta.type] || 0; if (!d || S.meta.period >= d) return 0; return [10, 30, 50].find(v => v >= d) || 50; }
function showLaw(force) {
  const L = lawIssues(), sig = L.map(x => x.t).join('|');
  if (!L.length) { lawSeen = ''; $('lawDlg').classList.remove('on'); return; }
  if (!force && sig === lawSeen) return;
  lawSeen = sig;
  const hasLaw = L.some(x => x.k === 'law'), fixN = lawFixPeriod();
  $('lawTitle').textContent = hasLaw ? '법령상 할 수 없는 계획입니다' : '분석 기간을 확인하세요';
  $('lawHold').textContent = hasLaw ? `법에 맞게 고치기 (계속 보유${fixN ? ` · ${fixN}년` : ''})` : `임대의무 ${FE.DUTY[S.meta.type]}년에 맞추기 (${fixN}년 분석)`;
  $('lawBody').innerHTML = L.map(x => `<div class="li ${x.k === 'law' ? '' : 'money'}"><b>${x.t}</b>${x.b}<small>근거: ${x.l}</small></div>`).join('');
  $('lawDlg').classList.add('on'); $('lawHold').focus();
}
$('lawHold').addEventListener('click', () => { S.eval.exit = 'hold'; const fn = lawFixPeriod(); if (fn) S.meta.period = fn; lawSeen = ''; $('lawDlg').classList.remove('on'); fillFields(); update(); });
$('lawKeep').addEventListener('click', () => $('lawDlg').classList.remove('on'));
$('lawDlg').addEventListener('keydown', e => { if (e.key === 'Escape') $('lawDlg').classList.remove('on'); });
document.addEventListener('click', e => { if (e.target.closest('#lawFlag,[data-lawopen]')) showLaw(true); });

// ---------- 강원 지역 비교: 같은 사업을 18개 시군에 놓아 보기 ----------
const RG_TTL = 7 * 864e5;
let RG = null, rgStop = false;
const rgKey = (code, types, areas) => ['rg', code, S.survey.months, types, areas, S.survey.band].join('|');
function rgCoef(s, code) {   // 시군에 따라 바뀌는 고시 계수
  s.rent.kukRegion = code === '51110' ? 1 : 0.85;                                       // 국민임대 지역계수: 도청소재지 2권역
  s.rent.youngGrade = ['51110', '51130'].includes(code) ? '101268,2015' : '96123,1911'; // 영구임대 수급자 급지: 춘천·원주 3급지
}
function rgMarket(rows, r) {
  const band = S.survey.band, trim = S.survey.trim / 100;
  return S.units.map(u => {
    let a = rows.filter(x => x.area > 0 && Math.abs(x.area - u.e) <= band).map(x => x.deposit + (r > 0 ? x.monthly * 12 / r : 0)).sort((p, q) => p - q);
    const cut = Math.floor(a.length * trim); if (a.length - 2 * cut >= 3) a = a.slice(cut, a.length - cut);
    return { cnt: a.length, conv: a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0 };
  });
}
function rgCalc(code, rows) {
  const s = clone(S); s.meta.lawd = code; s.meta.umd = ''; rgCoef(s, code);
  const mk = rgMarket(rows, s.rent.rate / 100), cnt = mk.reduce((a, m) => a + m.cnt, 0);
  if (mk.some(m => m.cnt < 3)) return { code, cnt, mk, thin: true };
  s.units.forEach((u, i) => { u.mkt = Math.round(mk[i].conv); });
  const R = FE.run(s), E = R.Ev;
  let need = 0;
  if (E.npvEq < 0) {        // 손익 0까지 필요한 추가 무상지원(억원 단위로 탐색)
    let lo = 0, hi = R.C.TC / M;
    const ok = x => { const t = clone(s); t.fin.gov += x; return FE.run(t).Ev.npvEq >= 0; };
    if (!ok(hi)) need = null; else { for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (ok(m)) hi = m; else lo = m; } need = hi * M; }
  }
  return { code, cnt, mk, s, npv: E.npvEq, irr: E.irrEq, pay: E.payback ? E.payback - E.Cy : null, rent: R.Rn.annual / 12 / Math.max(1, R.C.hh), dep: R.Rn.depTotal / Math.max(1, R.C.hh), need, law: false };
}
async function rgRun(fresh) {
  const types = ['apt', 'rh', 'offi', 'sh'].filter(t => S.survey[t]).join(',') || 'apt';
  const areas = S.units.map(u => u.e).join(',');
  rgStop = false; $('rgStop').hidden = false; $('rgRun').disabled = $('rgFresh').disabled = true;
  const out = [], fails = [];
  for (let i = 0; i < GW.length; i++) {
    if (rgStop) break;
    const [code, name] = GW[i], key = rgKey(code, types, areas);
    $('rgMsg').textContent = `${name} 시세 조회 중 (${i + 1}/${GW.length})`; $('rgBar').style.width = (i / GW.length * 100) + '%';
    let rows = null; const c = store.get(key, null);
    if (!fresh && c && Date.now() - c.at < RG_TTL) rows = c.rows;
    else {
      try { const j = await api(`/api/rent?lawd=${code}&months=${S.survey.months}&types=${types}&areas=${areas}&band=${S.survey.band}`); rows = j.rows; if (!j.errors.length) { try { store.set(key, { at: Date.now(), rows }); } catch (e) {} } }
      catch (e) { fails.push(name); if (!hasServer || !e.status) { $('rgMsg').textContent = '실거래 시세 조회는 정식 사이트(배포 후)에서만 됩니다.'; break; } continue; }
    }
    out.push({ name, ...rgCalc(code, rows) });
  }
  $('rgBar').style.width = '100%'; $('rgStop').hidden = true; $('rgRun').disabled = $('rgFresh').disabled = false;
  RG = { out, fails, types, at: new Date() };
  if (out.length) $('rgMsg').textContent = `${out.length}개 시군 계산 완료` + (fails.length ? ` · 조회 실패: ${fails.join(', ')}` : '') + (rgStop ? ' · 중지됨' : '');
  rgDraw();
}
function rgDraw() {
  if (!RG || !RG.out.length) { $('rgSum').innerHTML = '<p class="note" style="margin:0">"18개 시군 비교 실행"을 누르면 시군마다 실거래 시세를 받아 계산합니다. 처음에는 1~2분 걸리고, 같은 조건은 7일 동안 바로 다시 보여 줍니다.</p>'; $('rgTbl').innerHTML = ''; $('rgNote').textContent = ''; return; }
  const ok = RG.out.filter(x => !x.thin), rec = ok.filter(x => x.pay !== null), pos = ok.filter(x => x.npv >= 0);
  ok.sort((a, b) => b.npv - a.npv);
  const best = ok.find(x => x.cnt >= 10 * S.units.length) || ok[0], mx = Math.max(1, ...ok.map(x => Math.abs(x.npv)));
  $('rgSum').innerHTML = `<div class="rgsum"><div class="${rec.length ? 'pos' : 'neg'}"><small>투자금 회수 가능 (분석 기간 안)</small><br><b>${rec.length}곳</b></div><div class="${pos.length ? 'pos' : 'neg'}"><small>최종 손익 0 이상</small><br><b>${pos.length}곳</b></div>${best ? `<div><small>가장 나은 곳 (사례 충분한 시군 중)</small><br><b>${best.name}</b> <span class="note">${eok(best.npv)}</span></div>` : ''}</div>`
    + (rec.length ? '' : `<p class="warn" style="margin-top:0">지금 계획 조건으로는 강원 18개 시군 어디에서도 분석 기간 안에 투자금을 회수하지 못합니다. 오른쪽 "손익 0까지 필요한 추가 지원"이 가장 작은 곳이 협의 여지가 큰 곳입니다.</p>`);
  const head = `<thead><tr><th>시군</th><th class="n">사례</th>${S.units.map(u => `<th class="n">${u.t} 시세</th>`).join('')}<th class="n">세대당 월 임대료</th><th>최종 손익 (공사)</th><th class="n">연 수익률</th><th class="n">투자금 회수</th><th class="n">손익 0까지 필요한 추가 지원</th><th></th></tr></thead>`;
  const row = x => x.thin
    ? `<tr><td>${x.name}</td><td class="n">${x.cnt}</td><td colspan="${S.units.length + 6}" class="note">면적이 비슷한 거래가 3건 미만이라 판단을 보류합니다 (조회 기간을 24개월로 늘려 보세요)</td></tr>`
    : `<tr class="${x.pay !== null ? 'ok' : ''} ${x.code === S.meta.lawd ? 'cur' : ''}"><td><b>${x.name}</b>${x.code === S.meta.lawd ? ' <small class="note">현재</small>' : ''}</td><td class="n">${n0(x.cnt)}${x.cnt < 10 * S.units.length ? ' <small style="color:#b86e00" title="사례가 적어 시세가 크게 흔들릴 수 있습니다">⚠ 적음</small>' : ''}</td>${x.mk.map(m => `<td class="n">${n0(m.conv)}만</td>`).join('')}<td class="n">${won(x.rent)}</td>`
      + `<td><div style="display:flex;align-items:center;gap:8px"><div class="nbar"><i class="z"></i><i style="${x.npv >= 0 ? `left:50%;width:${x.npv / mx * 50}%;background:var(--ok)` : `right:50%;width:${-x.npv / mx * 50}%;background:var(--mag)`}"></i></div><span class="${x.npv < 0 ? 'neg' : ''}" style="color:${x.npv < 0 ? 'var(--mag)' : 'var(--ok)'}">${eok(x.npv)}</span></div></td>`
      + `<td class="n">${pct(x.irr)}</td><td class="n">${x.pay !== null ? `운영 ${x.pay}년차` : '<span style="color:var(--mag)">미회수</span>'}</td><td class="n">${x.need === 0 ? '—' : x.need === null ? '총사업비 이상' : eok(x.need)}</td><td><button class="btn" data-rg="${x.code}" style="min-height:34px">이 시군으로 적용</button></td></tr>`;
  $('rgTbl').innerHTML = head + '<tbody>' + ok.map(row).join('') + RG.out.filter(x => x.thin).map(row).join('') + '</tbody>';
  $('rgNote').textContent = `시세: 국토교통부 전월세 실거래(최근 ${S.survey.months}개월, ${RG.types.replace('apt', '아파트').replace('rh', '연립다세대').replace('offi', '오피스텔').replace('sh', '단독다가구')}), 타입 면적 ±${S.survey.band}㎡, 시장전환율 ${S.rent.rate}%. 국민임대 지역계수·영구임대 급지는 시군에 맞춰 바꿨습니다. ${RG.at.toLocaleString('ko-KR')} 기준.`;
}
$('rgRun').addEventListener('click', () => rgRun(false));
$('rgFresh').addEventListener('click', () => rgRun(true));
$('rgStop').addEventListener('click', () => { rgStop = true; });
document.addEventListener('click', e => {
  const b = e.target.closest('[data-rg]'); if (!b || !RG) return;
  const x = RG.out.find(o => o.code === b.dataset.rg); if (!x || x.thin) return;
  S.meta.lawd = x.code; S.meta.umd = ''; rgCoef(S, x.code); S.units.forEach((u, i) => { u.mkt = Math.round(x.mk[i].conv); u.cnt = x.mk[i].cnt; });
  SV = null; buildFields(); fillFields(); update(); toast(`${x.name} 시세로 바꿨습니다. 개요·수익성 탭에서 확인하세요.`); rgDraw();
});

// ---------- 숫자 입력칸: 세 자리마다 쉼표, 금액은 억원 환산을 작게 ----------
function eokHelpers() {
  document.querySelectorAll('.eok[data-eok]').forEach(el => {
    const v = getP(el.dataset.eok);
    el.textContent = U.grid === '억원' || v === '' || v === null || !isFinite(v) ? '' : '= ' + eokTxt(v * GRID_IN);
  });
}
document.addEventListener('input', e => {
  const t = e.target; if (!t.dataset || !t.dataset.num) return;
  const raw = t.value, pos = t.selectionStart ?? raw.length;
  const digitsBefore = raw.slice(0, pos).replace(/[^\d.-]/g, '').length;
  const clean = raw.replace(/[^\d.-]/g, '');
  if (clean === '' || clean === '-' || /\.\d*$/.test(clean) && clean.endsWith('.')) return;
  const [ip, dp] = clean.split('.');
  const neg = ip.startsWith('-'), ipd = ip.replace('-', '');
  const fmt = (neg ? '-' : '') + (ipd ? Number(ipd).toLocaleString('ko-KR') : '0') + (dp !== undefined ? '.' + dp : '');
  if (fmt === raw) return;
  t.value = fmt;
  let k = 0, c = 0; while (c < fmt.length && k < digitsBefore) { if (/[\d.-]/.test(fmt[c])) k++; c++; }
  try { t.setSelectionRange(c, c); } catch (er) {}
  const row = t.closest('td'); const s = row && row.querySelector('.eok:not([data-eok])'); if (s && t.dataset.c === 'mkt') s.textContent = "= " + eokTxt(numOf(t) * 1e4);
}, true);

// ---------- 수익성 개선 시뮬레이션: 기본 입력은 그대로, 조정값만 얹어 비교 ----------
const ADJ0 = { l2g: 0, grant: 0, land: false, cost: 0, mkt: 0, shop: null, rate: null, vac: null };
let ADJ = { ...ADJ0 };
const LEVERS = [
  { k: 'l2g', t: '기금 융자 → 무상 보조로 전환', u: '억원', min: 0, max: () => S.fin.loan / 100, step: 0.5, d: '빌린 돈(기금 융자)을 국비·도비 보조로 바꿉니다. 이자와 원금 상환이 줄어듭니다.' },
  { k: 'grant', t: '무상 보조 추가 (국비·도비·시비)', u: '억원', min: 0, max: () => Math.ceil(R.C.TC / 1e8), step: 0.5, d: '공사가 낼 자체자금을 보조금으로 대신합니다.' },
  { k: 'land', t: '토지를 지자체 현물출자로 처리', tg: true, d: () => `토지비 ${eok(S.cost.land * M)}를 공사 돈이 아니라 도·시가 현물로 넣는 것으로 봅니다.` },
  { k: 'cost', t: '공사비 절감', u: '%', min: 0, max: () => 30, step: 0.5, d: '직접공사비를 줄입니다(설계 최적화, 공법 변경 등).' },
  { k: 'mkt', t: '임대 시세 변화', u: '%', min: -20, max: () => 30, step: 1, d: '주변 시세가 오르거나 내리는 경우. 공공임대 임대료는 시세 대비 비율이 법으로 정해져 있어 임대료를 마음대로 올릴 수는 없습니다.' },
  { k: 'shop', t: '상가·부대시설 임대수입 (연)', u: '억원', min: 0, max: () => 5, step: 0.05, base: () => S.op.other / 100, d: '상가·어린이집 등에서 1년에 받는 임대료입니다.' },
  { k: 'rate', t: '기금 융자 금리', u: '%', min: 0, max: () => 5, step: 0.05, base: () => S.fin.loanRate, d: '제로에너지 인증 우대 등으로 금리가 낮아지는 경우.' },
  { k: 'vac', t: '공가율 (빈 집 비율)', u: '%', min: 0, max: () => 20, step: 0.5, base: () => S.op.vac, d: '입주 홍보·관리로 빈 집을 줄이는 경우.' }
];
const levVal = L => L.tg ? ADJ[L.k] : (ADJ[L.k] === null ? L.base() : ADJ[L.k]);
function adjState(adj, base) {
  const s = clone(base || S), a = adj;
  const mv = Math.min(a.l2g * 100, s.fin.loan); s.fin.loan -= mv; s.fin.gov += mv;
  s.fin.gov += a.grant * 100;
  if (a.land) s.fin.ink += s.cost.land;
  s.cost.direct *= 1 - a.cost / 100;
  if (a.mkt) s.units.forEach(u => { u.mkt *= 1 + a.mkt / 100; });
  if (a.shop !== null) s.op.other = a.shop * 100;
  if (a.rate !== null) s.fin.loanRate = a.rate;
  if (a.vac !== null) s.op.vac = a.vac;
  return s;
}
function levSolve(L) {   // 다른 조정은 그대로 두고 이 항목만으로 손익 0이 되는 값
  if (L.tg) return null;
  const at = v => FE.run(adjState({ ...ADJ, [L.k]: v })).Ev.npvEq;
  const better = L.k === 'rate' || L.k === 'vac' ? -1 : 1;   // 금리·공가율은 낮출수록 좋음
  let lo = L.min, hi = L.max();
  const goodEnd = better > 0 ? hi : lo, badEnd = better > 0 ? lo : hi;
  if (at(badEnd) >= 0) return { ok: true, v: badEnd, already: true };
  if (at(goodEnd) < 0) return { ok: false };
  let a = badEnd, b = goodEnd;
  for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (at(m) >= 0) b = m; else a = m; }
  const st = L.step, v = better > 0 ? Math.ceil(b / st) * st : Math.floor(b / st) * st;
  return { ok: true, v: +v.toFixed(4) };
}
const fmtLev = (L, v) => L.tg ? (v ? '적용' : '안 함') : `${L.k === 'mkt' && v > 0 ? '+' : ''}${(+v).toLocaleString('ko-KR', { maximumFractionDigits: 2 })}${L.u}`;
function impPieces() {
  const A = FE.run(S), B = FE.run(adjState(ADJ)), d = S.eval.disc / 100;
  const pb = E => E.payback ? `운영 ${E.payback - E.Cy}년차` : '미회수';
  const row = (lbl, a, b, fa, better) => { const diff = b - a; const cls = Math.abs(diff) < 1e-9 ? '' : (better(diff) ? 'up' : 'dn'); return `<tr><td>${lbl}</td><td class="n">${fa(a)}</td><td class="n"><b class="${cls}">${fa(b)}</b></td></tr>`; };
  const cmp = `<table class="cmp"><thead><tr><th></th><th class="n">지금</th><th class="n">조정 후</th></tr></thead><tbody>`
    + row('최종 손익 (공사, 지금 가치)', A.Ev.npvEq, B.Ev.npvEq, eok, x => x > 0)
    + row('연 수익률 (공사)', A.Ev.irrEq ?? -1, B.Ev.irrEq ?? -1, v => v === -1 ? '산출 불가' : pct(v), x => x > 0)
    + `<tr><td>투자금 회수</td><td class="n">${pb(A.Ev)}</td><td class="n"><b class="${B.Ev.payback && !A.Ev.payback ? 'up' : ''}">${pb(B.Ev)}</b></td></tr>`
    + row('1년 빚 갚을 여력 (최저)', A.Ev.minDSCR ?? 99, B.Ev.minDSCR ?? 99, v => v === 99 ? '빚 없음' : v.toFixed(2) + '배', x => x > 0)
    + row('공사 자체자금', A.Fd.own, B.Fd.own, eok, x => x < 0)
    + row('연평균 운영수지', A.Ev.avgNOI, B.Ev.avgNOI, eok, x => x > 0)
    + `</tbody></table>`;
  const ok = B.Ev.npvEq >= 0, changed = JSON.stringify(ADJ) !== JSON.stringify(ADJ0);
  const verdict = `<p class="${ok ? 'warn ok' : 'warn'}" style="margin:12px 0 0">${ok ? `조정 후 최종 손익 <b>${eok(B.Ev.npvEq)}</b>: 손익 0 이상입니다.` : `아직 <b>${eok(-B.Ev.npvEq)}</b> 손해입니다. 왼쪽 항목의 "손익 0이 되는 값"을 눌러 보세요.`}${B.Ev.minDSCR !== null && B.Ev.minDSCR < 1 ? ' 다만 1년 빚 갚을 여력이 1배 미만이라 매년 현금은 모자랍니다.' : ''}</p>`;
  const hints = {};
  LEVERS.forEach(L => { const sol = levSolve(L); hints[L.k] = L.tg ? '' : !sol ? '' : sol.already ? '<span class="no">이 항목 없이도 손익 0 이상</span>' : sol.ok ? `<button type="button" data-solve="${L.k}" data-v="${sol.v}">손익 0이 되는 값 ${fmtLev(L, sol.v)} 적용</button>` : '<span class="no">이 항목만으로는 손익 0 불가</span>'; });
  return { res: cmp + verdict, hints, changed };
}
function impRefresh() {
  if (!$('impResBody')) return renderImprove();
  const P = impPieces(); $('impResBody').innerHTML = P.res;
  LEVERS.forEach(L => { const el = $('hint-' + L.k); if (el) el.innerHTML = P.hints[L.k]; });
  $('impApply').disabled = $('impReset').disabled = !P.changed;
}
function renderImprove() {
  const box = $('evImprove'); if (!box || !R) return;
  const P = impPieces();
  const levers = LEVERS.map(L => {
    const v = levVal(L), hint = P.hints[L.k];
    const ctl = L.tg ? `<label class="tg"><input type="checkbox" data-lev="${L.k}" ${v ? 'checked' : ''} style="width:20px;min-height:20px"> ${L.t}</label>`
      : `<div class="lh"><b>${L.t}</b><span class="val" id="lv-${L.k}">${fmtLev(L, v)}</span></div><input type="range" data-lev="${L.k}" min="${L.min}" max="${L.max()}" step="${L.step}" value="${v}" aria-label="${L.t}">`;
    return `<div class="lever">${ctl}<div class="hint"><span>${typeof L.d === 'function' ? L.d() : L.d}</span><span id="hint-${L.k}">${hint}</span></div></div>`;
  }).join('');
  box.innerHTML = `<h2>수익성 개선 시뮬레이션</h2><p class="note" style="margin-top:0">입력한 사업은 그대로 두고 아래 항목만 바꿔 보며 결과를 비교합니다. 마음에 들면 "이 조정을 사업에 적용"을 누르세요.</p>
<div class="imp-grid"><div>${levers}</div><div class="imp-res"><h2 style="font-size:17px">결과 비교</h2><div id="impResBody">${P.res}</div>
<div class="row"><button class="btn pri" id="impApply" ${P.changed ? '' : 'disabled'}>이 조정을 사업에 적용</button><button class="btn" id="impReset" ${P.changed ? '' : 'disabled'}>조정 초기화</button></div>
<p class="note">공공임대 임대료 상한, 기금 지원 한도, 보조금 협의 가능 여부는 실제 협의 결과에 따라 달라집니다.</p></div></div>`;
}
document.addEventListener('input', e => {
  const t = e.target; if (!t.dataset || !t.dataset.lev) return;
  const L = LEVERS.find(x => x.k === t.dataset.lev);
  ADJ[L.k] = L.tg ? t.checked : parseFloat(t.value);
  if (!L.tg) { const sp = $('lv-' + L.k); if (sp) sp.textContent = fmtLev(L, ADJ[L.k]); }
  clearTimeout(impRefresh._t); impRefresh._t = setTimeout(impRefresh, 50);
}, true);
document.addEventListener('change', e => { if (e.target.dataset && e.target.dataset.lev && e.target.type === 'checkbox') impRefresh(); }, true);
document.addEventListener('click', e => {
  const s = e.target.closest('[data-solve]'); if (s) { ADJ[s.dataset.solve] = parseFloat(s.dataset.v); renderImprove(); const n = document.querySelector(`[data-lev="${s.dataset.solve}"]`); if (n) n.focus(); return; }
  if (e.target.id === 'impReset') { ADJ = { ...ADJ0 }; renderImprove(); }
  if (e.target.id === 'impApply') { S = adjState(ADJ); ADJ = { ...ADJ0 }; buildFields(); fillFields(); update(); renderImprove(); toast('조정한 값을 사업에 적용했습니다. 재원·총사업비·운영 가정 탭에 반영됐습니다.'); }
  const sb = e.target.closest('.subtabs [data-sub]'); if (sb) {
    document.querySelectorAll('.subtabs [data-sub]').forEach(b => b.setAttribute('aria-selected', b === sb));
    $('v-ev').classList.toggle('imp', sb.dataset.sub === 'imp');
    if (sb.dataset.sub === 'imp') renderImprove(); else drawEv();
  }
});

// ---------- 쉬운 사용: 요약 띠·판정, 단계 이동, 숫자 움직임 ----------
const REDUCE = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const STEPS = ['ov', 'sv', 'rn', 'tc', 'fd', 'ev'];
const STEP_NAME = { ov: '사업 개요', sv: '시세 조사', rn: '임대수입', tc: '총사업비', fd: '재원 조달', ev: '수익성' };
function goTab(v) { const b = document.querySelector(`.tabs button[data-v="${v}"]`); if (b) { b.click(); window.scrollTo({ top: 0, behavior: REDUCE ? 'auto' : 'smooth' }); } }
function renderStrip() {
  const { C, Fd, Ev } = R, d = S.eval.disc / 100;
  let v, cls, why;
  const LI = lawIssues();
  if (LI.some(x => x.k === 'law')) { v = '법령상 불가'; cls = 'neg'; why = '분석 종료 시 처리(매각·분양전환)가 임대의무기간 규정에 맞지 않습니다. 계속 보유로 바꾸거나 경고 내용을 확인하세요.'; }
  else if (LI.some(x => x.k === 'period')) { v = '기간 재검토'; cls = 'mid'; why = '분석 기간이 임대의무기간보다 짧아 손익이 실제보다 좋게 나옵니다.'; }
  else if (Fd.own < 0) { v = '재원 초과'; cls = 'mid'; why = '재원 합계가 총사업비보다 많습니다. 재원 조달 탭을 확인하세요.'; }
  else if (Ev.npvEq >= 0 && Ev.irrEq !== null && Ev.irrEq >= d) { v = '사업성 양호'; cls = ''; why = '공사 관점 NPV가 0 이상이고 IRR이 할인율을 넘습니다.'; }
  else if (Ev.npvProj >= 0) { v = '재원 보완 필요'; cls = 'mid'; why = '사업 전체로는 수익이 나지만 공사 부담분은 손실입니다. 재정·기금 지원을 늘리거나 조건을 조정해 보세요.'; }
  else { v = '사업성 부족'; cls = 'neg'; why = '사업 전체 NPV도 0 미만입니다. 임대료·사업비·지원 조건을 다시 보세요.'; }
  const it = (l, val, c) => `<div class="it ${c || ''}"><small>${l}</small><b data-k="s-${l}">${val}</b></div>`;
  $('strip').innerHTML = `<button type="button" class="verdict ${cls}" id="verdict" title="${why}" aria-label="판정: ${v}. ${why} 수익성 탭으로 이동">${v}</button>`
    + it('총사업비', eok(C.TC)) + it('공사 자체자금', eok(Fd.own), Fd.own < 0 ? 'neg' : '')
    + it('공사 NPV', eok(Ev.npvEq), Ev.npvEq >= 0 ? 'pos' : 'neg') + it('공사 IRR', pct(Ev.irrEq), Ev.irrEq !== null && Ev.irrEq >= d ? 'pos' : 'neg')
    + it('투자금 회수', Ev.payback ? `운영 ${Ev.payback - Ev.Cy}년차` : '미회수', Ev.payback ? '' : 'neg')
    + (LI.length ? `<button type="button" class="lawflag" id="lawFlag">${LI.some(x => x.k === 'law') ? '⚠ 법령상 불가 계획' : '⚠ 분석 기간 확인'}</button>` : '');
}
document.addEventListener('click', e => { if (e.target.closest('#verdict')) goTab('ev'); });
const prevNum = {};
function tweenNums() {
  const re = /-?\d[\d,]*(\.\d+)?/;
  document.querySelectorAll('[data-k]').forEach(el => {
    const k = el.dataset.k, txt = el.textContent, old = prevNum[k];
    prevNum[k] = txt;
    if (old === undefined || old === txt) return;
    el.classList.remove('chg'); void el.offsetWidth; el.classList.add('chg');
    const m = txt.match(re), om = old.match(re);
    if (REDUCE || !m || !om) return;
    const to = +m[0].replace(/,/g, ''), from = +om[0].replace(/,/g, ''), dec = m[1] ? m[1].length - 1 : 0, comma = m[0].includes(',') || Math.abs(to) >= 1000;
    if (!isFinite(to) || !isFinite(from) || from === to) return;
    const fmt = n => comma ? n.toLocaleString('ko-KR', { minimumFractionDigits: dec, maximumFractionDigits: dec }) : n.toFixed(dec);
    const t0 = performance.now(), D = 420;
    const step = t => { const p = Math.min(1, (t - t0) / D), e2 = 1 - Math.pow(1 - p, 3); if (!el.isConnected) return; el.textContent = txt.replace(m[0], fmt(from + (to - from) * e2)); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
}
function enterView(v) {
  const sec = $('v-' + v); if (!sec) return;
  sec.classList.remove('enter'); void sec.offsetWidth; sec.classList.add('enter');
  clearTimeout(sec._et); sec._et = setTimeout(() => sec.classList.remove('enter'), 1300);
  const i = STEPS.indexOf(v); $('progBar').style.width = (i < 0 ? 100 : (i + 1) / STEPS.length * 100) + '%';
}
STEPS.forEach((v, i) => {
  const sec = $('v-' + v); if (!sec) return;
  const nav = document.createElement('div'); nav.className = 'stepnav';
  nav.innerHTML = (i ? `<button type="button" class="btn" data-go="${STEPS[i - 1]}">이전 단계</button>` : '')
    + (i < STEPS.length - 1 ? `<button type="button" class="btn pri nx" data-go="${STEPS[i + 1]}">다음 단계: ${STEP_NAME[STEPS[i + 1]]}</button>` : `<button type="button" class="btn pri nx" id="btnSave2">사업 저장</button>`);
  sec.appendChild(nav);
});
document.addEventListener('click', e => { const g = e.target.closest('[data-go]'); if (g) goTab(g.dataset.go); if (e.target.id === 'btnSave2') saveProject(); });
// 안내 상자: 접어 두면 다음에도 접힌 채로
const guideState = store.get('fs-guide', {});
document.querySelectorAll('.view').forEach(sec => { const g = sec.querySelector('details.guide'); if (!g) return; if (guideState[sec.id] === 0) g.open = false; g.addEventListener('toggle', () => { guideState[sec.id] = g.open ? 1 : 0; store.set('fs-guide', guideState); }); });
let toastT;
function toast(t) { const el = $('toast'); el.innerHTML = t; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 2800); }
rgDraw();
boot();
enterView((document.querySelector('.tabs button[aria-selected=true]') || {}).dataset?.v || 'ov');
}
