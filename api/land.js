// 국토교통부 토지 매매 실거래가로 시군 ㎡당 토지 단가 추정
// GET /api/land?lawd=51110&months=12
import { send, checkPass } from './_lib.js';
import { ymList, pool, tag, num } from './rent.js';

const SVC = 'RTMSDataSvcLandTrade', OP = 'getRTMSDataSvcLandTrade';
const sleep = ms => new Promise(s => setTimeout(s, ms));

async function fetchLand(key, lawd, ym) {
  const items = [];
  for (let page = 1; page <= 10; page++) {
    const url = `https://apis.data.go.kr/1613000/${SVC}/${OP}?serviceKey=${encodeURIComponent(key)}&LAWD_CD=${lawd}&DEAL_YMD=${ym}&pageNo=${page}&numOfRows=1000`;
    let r, xml, code, msg;
    for (let t = 0; t < 4; t++) {
      r = await fetch(url); xml = await r.text();
      code = tag(xml, ['resultCode']); msg = tag(xml, ['resultMsg', 'returnAuthMsg']) || '';
      if (!/요청제한|LIMITED|429/i.test(msg + r.status)) break;
      await sleep(400 * (t + 1) + Math.random() * 300);
    }
    if (!r.ok || (code && !/^0+$/.test(code))) throw new Error(/등록되지 않은|SERVICE_KEY_IS_NOT_REGISTERED/i.test(msg) ? '토지 매매 실거래가 자료가 아직 활용신청(승인)되지 않았습니다' : `${ym}: ${msg || r.status}`);
    const blocks = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
    for (const b of blocks) items.push({
      amount: num(tag(b, ['dealAmount', '거래금액'])) * 1e4,         // 원
      area: num(tag(b, ['dealArea', '거래면적', '계약면적'])),       // ㎡
      use: tag(b, ['landUse', '용도지역']), jimok: tag(b, ['jimok', '지목']),
      dong: tag(b, ['umdNm', '법정동']),
      cancel: tag(b, ['cdealType', '해제여부']),
      share: tag(b, ['shareDealingType', '지분거래구분', '구분'])
    });
    const total = num(tag(xml, ['totalCount']));
    if (items.length >= total || blocks.length < 1000) break;
  }
  return items;
}
const stats = a => {
  const v = a.map(x => x.amount / x.area).filter(p => p > 0).sort((p, q) => p - q);
  if (!v.length) return null;
  const q = f => v[Math.min(v.length - 1, Math.floor((v.length - 1) * f))];
  return { cnt: v.length, med: Math.round(q(0.5)), p25: Math.round(q(0.25)), p75: Math.round(q(0.75)) };
};

export default async function handler(req, res) {
  if (!checkPass(req, res)) return;
  const key = process.env.DATA_GO_KR_KEY;
  if (!key) return send(res, 501, { error: 'DATA_GO_KR_KEY가 없습니다.' });
  const q = new URL(req.url, 'http://x').searchParams;
  const lawd = (q.get('lawd') || '').trim();
  if (!/^\d{5}$/.test(lawd)) return send(res, 400, { error: '시군구 코드는 숫자 5자리입니다.' });
  const months = Math.min(24, Math.max(1, parseInt(q.get('months') || '12', 10)));
  const yms = ymList(months), errors = [];
  const rows = (await pool(yms.map(ym => () => fetchLand(key, lawd, ym).catch(e => { errors.push(e.message); return []; })), 3)).flat();
  if (!rows.length && errors.length) return send(res, 502, { error: errors[0] });
  // 계약 해제·지분 거래·너무 작은 필지는 뺌
  const ok = rows.filter(x => x.amount > 0 && x.area >= 100 && !/O|해제/.test(x.cancel) && !/지분/.test(x.share));
  const res_ = ok.filter(x => /주거/.test(x.use));
  const out = {
    lawd, months: yms, count: rows.length, used: ok.length, errors: [...new Set(errors)],
    resDae: stats(res_.filter(x => /^대/.test(x.jimok))),       // 주거지역 · 지목 대 (공동주택 부지에 가장 가까움)
    res: stats(res_),
    all: stats(ok)
  };
  if (!errors.length) res.setHeader('Cache-Control', 'public, s-maxage=43200, stale-while-revalidate=86400');
  send(res, 200, out);
}
