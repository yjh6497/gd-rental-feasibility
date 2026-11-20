// 시군구의 법정동(읍면동) 목록: 최근 실거래 자료에 나온 법정동 이름을 모아 돌려줌
// GET /api/umd?lawd=51110
import { send, checkPass } from './_lib.js';
import { fetchMonth, ymList, pool } from './rent.js';

export default async function handler(req, res) {
  if (!checkPass(req, res)) return;
  const key = process.env.DATA_GO_KR_KEY;
  if (!key) return send(res, 501, { error: 'DATA_GO_KR_KEY가 없습니다.' });
  const lawd = (new URL(req.url, 'http://x').searchParams.get('lawd') || '').trim();
  if (!/^\d{5}$/.test(lawd)) return send(res, 400, { error: '시군구 코드는 숫자 5자리입니다.' });
  const jobs = [];
  for (const t of ['apt', 'rh']) for (const ym of ymList(6)) jobs.push(() => fetchMonth(key, t, lawd, ym).catch(() => []));
  const rows = (await pool(jobs, 3)).flat();
  const umd = [...new Set(rows.map(x => x.dong).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ko'));
  res.setHeader('Cache-Control', 's-maxage=86400');
  send(res, 200, { lawd, umd });
}
