// 국토교통부 전월세 실거래가 API 중계 (공공데이터포털)
// GET /api/rent?lawd=51110&months=12&types=apt,rh,offi
import { send, checkPass } from './_lib.js';

const EP = {
  apt:  ['RTMSDataSvcAptRent',  'getRTMSDataSvcAptRent',  '아파트'],
  rh:   ['RTMSDataSvcRHRent',   'getRTMSDataSvcRHRent',   '연립다세대'],
  offi: ['RTMSDataSvcOffiRent', 'getRTMSDataSvcOffiRent', '오피스텔'],
  sh:   ['RTMSDataSvcSHRent',   'getRTMSDataSvcSHRent',   '단독다가구']
};
export const tag = (xml, names) => {
  for (const n of names) {
    const m = xml.match(new RegExp('<' + n + '>([\\s\\S]*?)</' + n + '>'));
    if (m && m[1].trim() !== '') return m[1].trim();
  }
  return '';
};
export const num = s => { const v = parseFloat(String(s).replace(/,/g, '')); return isFinite(v) ? v : 0; };

export function ymList(months, now = new Date()) {
  const out = [];
  // 실거래 신고 지연을 고려해 이번 달부터 거꾸로 조회
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(String(d.getFullYear()) + String(d.getMonth() + 1).padStart(2, '0'));
  }
  return out;
}

const sleep = ms => new Promise(s => setTimeout(s, ms));
// 동시에 n개씩만 실행
export async function pool(tasks, n = 3) { const out = []; let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < tasks.length) { const k = i++; out[k] = await tasks[k](); } })); return out; }

export async function fetchMonth(key, type, lawd, ym) {
  const [svc, op] = EP[type];
  const items = [];
  for (let page = 1; page <= 10; page++) {
    const url = `https://apis.data.go.kr/1613000/${svc}/${op}?serviceKey=${encodeURIComponent(key)}&LAWD_CD=${lawd}&DEAL_YMD=${ym}&pageNo=${page}&numOfRows=1000`;
    let r, xml, code, msg;
    for (let tryN = 0; tryN < 4; tryN++) {           // 초당 요청 제한에 걸리면 잠깐 쉬고 다시
      r = await fetch(url); xml = await r.text();
      code = tag(xml, ['resultCode']); msg = tag(xml, ['resultMsg', 'returnAuthMsg']) || '';
      if (!/요청제한|LIMITED|429/i.test(msg + r.status)) break;
      await sleep(400 * (tryN + 1) + Math.random() * 300);
    }
    if (!r.ok || (code && !/^0+$/.test(code))) {
      throw new Error(`${EP[type][2]} ${ym}: ${/등록되지 않은|SERVICE_KEY_IS_NOT_REGISTERED/i.test(msg) ? '이 자료는 아직 활용신청(승인)되지 않았습니다' : msg || r.status}`);
    }
    const blocks = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
    for (const b of blocks) {
      items.push({
        type: EP[type][2],
        name: tag(b, ['aptNm', 'mhouseNm', 'offiNm', '아파트', '연립다세대', '단지']),
        dong: tag(b, ['umdNm', '법정동']),
        area: num(tag(b, ['excluUseAr', 'totalFloorAr', '전용면적', '계약면적'])),
        deposit: num(tag(b, ['deposit', '보증금액'])),       // 만원
        monthly: num(tag(b, ['monthlyRent', '월세금액'])),   // 만원
        y: tag(b, ['dealYear', '년']), m: tag(b, ['dealMonth', '월']), d: tag(b, ['dealDay', '일']),
        floor: tag(b, ['floor', '층']),
        built: tag(b, ['buildYear', '건축년도']),
        contract: tag(b, ['contractType', '계약구분'])
      });
    }
    const total = num(tag(xml, ['totalCount']));
    if (items.length >= total || blocks.length < 1000) break;
  }
  return items;
}

export default async function handler(req, res) {
  if (!checkPass(req, res)) return;
  const key = process.env.DATA_GO_KR_KEY;
  if (!key) return send(res, 500, { error: 'Vercel 환경변수 DATA_GO_KR_KEY(공공데이터포털 일반 인증키, Decoding)가 없습니다.' });
  const q = new URL(req.url, 'http://x').searchParams;
  const lawd = (q.get('lawd') || '').trim();
  if (!/^\d{5}$/.test(lawd)) return send(res, 400, { error: '시군구 코드(LAWD_CD)는 숫자 5자리입니다.' });
  const months = Math.min(24, Math.max(1, parseInt(q.get('months') || '12', 10)));
  const types = (q.get('types') || 'apt,rh,offi').split(',').filter(t => EP[t]);
  const yms = ymList(months);
  const errors = [];
  const jobs = [];
  for (const t of types) for (const ym of yms) jobs.push(() => fetchMonth(key, t, lawd, ym).catch(e => { errors.push(e.message); return []; }));
  let rows = (await pool(jobs, 3)).flat();
  const total = rows.length;
  // 지역 비교용: 필요한 면적대만 가볍게 돌려줌 (areas=31,46&band=5)
  const areas = (q.get('areas') || '').split(',').map(Number).filter(v => v > 0);
  if (areas.length) {
    const band = Math.min(30, Math.max(1, parseFloat(q.get('band') || '5')));
    rows = rows.filter(x => x.area > 0 && areas.some(a => Math.abs(x.area - a) <= band))
      .map(x => ({ type: x.type, name: x.name, dong: x.dong, area: x.area, deposit: x.deposit, monthly: x.monthly }));
  }
  // 같은 조회는 Vercel CDN에 12시간 보관 (접근코드를 쓰지 않을 때만)
  if (!process.env.APP_PASSCODE && !errors.length) res.setHeader('Cache-Control', 'public, s-maxage=43200, stale-while-revalidate=86400');
  send(res, 200, { lawd, months: yms, types, count: total, errors, rows });
}
