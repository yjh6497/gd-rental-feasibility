// 사업 저장·목록·삭제 (Upstash Redis REST — Vercel Marketplace 연동)
// GET /api/projects            → 목록(요약)
// GET /api/projects?id=xxx     → 한 건 전체
// POST /api/projects {id?, data, summary} → 저장
// DELETE /api/projects?id=xxx  → 삭제
import { send, checkPass, readBody } from './_lib.js';

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(cmd) {
  const r = await fetch(URL_, { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(cmd) });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}

export default async function handler(req, res) {
  if (!checkPass(req, res)) return;
  if (!URL_ || !TOKEN) return send(res, 501, { error: '저장소(Upstash Redis)가 연결되지 않았습니다. Vercel > Storage에서 Upstash Redis를 연결하세요.' });
  const q = new URL(req.url, 'http://x').searchParams;
  try {
    if (req.method === 'GET') {
      const id = q.get('id');
      if (id) {
        const v = await redis(['HGET', 'proj:data', id]);
        return v ? send(res, 200, JSON.parse(v)) : send(res, 404, { error: '없는 사업입니다.' });
      }
      const all = await redis(['HGETALL', 'proj:sum']) || [];
      const list = [];
      for (let i = 0; i < all.length; i += 2) list.push(JSON.parse(all[i + 1]));
      list.sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)));
      return send(res, 200, { list });
    }
    if (req.method === 'POST') {
      const b = await readBody(req);
      if (!b || !b.data) return send(res, 400, { error: '저장할 데이터가 없습니다.' });
      const id = b.id && /^[\w-]{6,40}$/.test(b.id) ? b.id : 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const savedAt = new Date().toISOString();
      const summary = { ...(b.summary || {}), id, savedAt };
      await redis(['HSET', 'proj:data', id, JSON.stringify({ id, savedAt, data: b.data })]);
      await redis(['HSET', 'proj:sum', id, JSON.stringify(summary)]);
      return send(res, 200, { id, savedAt });
    }
    if (req.method === 'DELETE') {
      const id = q.get('id');
      if (!id) return send(res, 400, { error: 'id가 필요합니다.' });
      await redis(['HDEL', 'proj:data', id]);
      await redis(['HDEL', 'proj:sum', id]);
      return send(res, 200, { ok: true });
    }
    send(res, 405, { error: '지원하지 않는 요청입니다.' });
  } catch (e) {
    send(res, 500, { error: e.message });
  }
}
