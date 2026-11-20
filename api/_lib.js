// 공통: 접근코드 확인, JSON 응답
export function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}
export function checkPass(req, res) {
  const need = process.env.APP_PASSCODE;
  // 강원개발공사 전용: 접근코드가 설정되지 않으면 서버 기능을 열지 않음
  if (!need) { send(res, 503, { error: '관리자가 APP_PASSCODE를 설정해야 사용할 수 있습니다.' }); return false; }
  const got = req.headers['x-passcode'] || '';
  if (got === need) return true;
  send(res, 401, { error: '접근코드가 맞지 않습니다.' });
  return false;
}
export async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const t = Buffer.concat(chunks).toString('utf8');
  return t ? JSON.parse(t) : {};
}
