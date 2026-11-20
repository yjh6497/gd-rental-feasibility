// 공통: 접근코드 확인, JSON 응답
export function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}
export function checkPass(req, res) {
  const need = process.env.APP_PASSCODE;
  // 접근코드를 정하지 않으면 누구나 사용 (전부 공개)
  if (!need) return true;
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
