// 사업 저장·목록·삭제
// 저장소: Vercel Blob(비공개) 우선, 없으면 Upstash Redis
// GET /api/projects            → 목록(요약)
// GET /api/projects?id=xxx     → 한 건 전체
// POST /api/projects {id?, data, summary} → 저장
// DELETE /api/projects?id=xxx  → 삭제
import { put, get, list, del } from '@vercel/blob';
import { send, checkPass, readBody } from './_lib.js';

const HAS_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN;
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const P = id => `projects/${id}.json`;

// ---- Vercel Blob ----
const blob = {
  async read(id) {
    const r = await get(P(id), { access: 'private', useCache: false });
    if (!r || r.statusCode !== 200) return null;
    return JSON.parse(await new Response(r.stream).text());
  },
  async list() {
    const out = []; let cursor;
    do {
      const r = await list({ prefix: 'projects/', cursor, limit: 1000 });
      out.push(...r.blobs); cursor = r.hasMore ? r.cursor : undefined;
    } while (cursor);
    const docs = await Promise.all(out.map(b => blob.read(b.pathname.slice(9, -5)).catch(() => null)));
    return docs.filter(Boolean).map(d => d.summary || { id: d.id, savedAt: d.savedAt });
  },
  async write(doc) { await put(P(doc.id), JSON.stringify(doc), { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json' }); },
  async remove(id) { await del(P(id)); }
};

// ---- Upstash Redis ----
async function redis(cmd) {
  const r = await fetch(URL_, { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(cmd) });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}
const kv = {
  async read(id) { const v = await redis(['HGET', 'proj:data', id]); return v ? JSON.parse(v) : null; },
  async list() { const all = await redis(['HGETALL', 'proj:sum']) || []; const l = []; for (let i = 0; i < all.length; i += 2) l.push(JSON.parse(all[i + 1])); return l; },
  async write(doc) { await redis(['HSET', 'proj:data', doc.id, JSON.stringify(doc)]); await redis(['HSET', 'proj:sum', doc.id, JSON.stringify(doc.summary)]); },
  async remove(id) { await redis(['HDEL', 'proj:data', id]); await redis(['HDEL', 'proj:sum', id]); }
};

export default async function handler(req, res) {
  if (!checkPass(req, res)) return;
  const S = HAS_BLOB ? blob : (URL_ && TOKEN ? kv : null);
  if (!S) return send(res, 501, { error: '사업 저장소가 연결되지 않았습니다. Vercel > Storage에서 Blob 저장소를 만들어 이 프로젝트에 연결하세요.' });
  const q = new URL(req.url, 'http://x').searchParams;
  try {
    if (req.method === 'GET') {
      const id = q.get('id');
      if (id) {
        if (!/^[\w-]{2,40}$/.test(id)) return send(res, 400, { error: '잘못된 id입니다.' });
        const d = await S.read(id);
        return d ? send(res, 200, d) : send(res, 404, { error: '없는 사업입니다.' });
      }
      const l = await S.list();
      l.sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)));
      return send(res, 200, { list: l });
    }
    if (req.method === 'POST') {
      const b = await readBody(req);
      if (!b || !b.data) return send(res, 400, { error: '저장할 데이터가 없습니다.' });
      const id = b.id && /^[\w-]{6,40}$/.test(b.id) ? b.id : 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const savedAt = new Date().toISOString();
      const summary = { ...(b.summary || {}), id, savedAt };
      await S.write({ id, savedAt, data: b.data, summary });
      return send(res, 200, { id, savedAt });
    }
    if (req.method === 'DELETE') {
      const id = q.get('id');
      if (!id || !/^[\w-]{2,40}$/.test(id)) return send(res, 400, { error: 'id가 필요합니다.' });
      await S.remove(id);
      return send(res, 200, { ok: true });
    }
    send(res, 405, { error: '지원하지 않는 요청입니다.' });
  } catch (e) {
    send(res, 500, { error: e.message });
  }
}
