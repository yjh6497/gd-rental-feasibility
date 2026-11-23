// 문서(PDF·엑셀·한글 등)에서 사업성 분석 입력값을 뽑아 줌 — Google Gemini API
// POST /api/extract { name, mime, text?, data? (PDF base64) }
import { send, checkPass, readBody } from './_lib.js';

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const FALLBACK = (process.env.GEMINI_FALLBACK || 'gemini-3.5-flash,gemini-3.5-flash-lite').split(',').map(s => s.trim()).filter(Boolean);
const sleep = ms => new Promise(s => setTimeout(s, ms));

const PROMPT = `당신은 한국 지방공사의 공공임대주택 사업성 검토 담당자를 돕습니다.
첨부 문서(사업계획서·검토보고서·내역서 등)에서 아래 항목을 찾아 JSON으로만 답하세요.

규칙
- 문서에 실제로 적힌 값만 넣습니다. 추측하거나 계산해서 만들지 마세요. 없으면 그 항목을 빼세요.
- 금액은 모두 "원" 단위 숫자로 바꿉니다 (예: 164억 원 → 16400000000, 42.6억 → 4260000000, 11,167천원 → 11167000).
- 각 항목에 근거(quote): 문서 속 원문 문장이나 표 내용을 60자 이내로 그대로 옮깁니다.
- 같은 돈을 두 항목에 중복해서 넣지 마세요.

fields의 key 목록 (value는 문자열로)
- name: 사업명
- sgg: 강원특별자치도의 시·군 이름 (예: 춘천시)
- umd: 읍·면·동 이름 (예: 우두동)
- addr: 지번·도로명 주소
- type: 공급 유형. tong(통합공공임대), happy(행복주택·청년주택·청년특화주택), kuk(국민임대), young(영구임대), buy(매입임대), jeonse(장기전세) 중 하나
- constr: 공사기간(년). 개월이면 년으로 (24개월 → 2)
- floor: 최고 층수
- hh: 총 세대수(주택만, 상가 제외)
- site_area: 대지면적(㎡)
- direct_won: 직접공사비(공사비)
- design_won: 설계비(설계비 등)
- supervision_won: 감리비
- other_won: 그 밖의 부대비(인건비·관리비·인입비·부담금 등)
- contingency_won: 예비비
- land_won: 토지비(토지비 및 조성비)
- fincost_won: 건설 중 금융비용
- gov_won: 국비 보조·지원금 (상환 의무 없는 국고 보조)
- loc_won: 도비·시비 보조 또는 지자체 현금 출자
- inv_won: 주택도시기금·국비 출자
- loan_won: 주택도시기금·국비 융자 합계
- ink_won: 지자체 현물출자(토지 등)
- bond_won: 공사채 발행
- loan_rate_pct: 기금 융자 금리(%)
- other_annual_won: 상가·부대시설 연 임대수입

units: 세대 타입별 [{t: 타입명(예: 31형), e: 주거전용면적㎡, s: 주택공급면적㎡(전용+주거공용), n: 그 타입 세대수, b: 세대당 지하층면적㎡}] — 같은 타입은 한 번만, n은 꼭 채움
notes: 입력에 참고할 만한 짧은 메모 (최대 3개, 예: 융자 중복 가능성, 단위가 불분명한 항목)`;

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    fields: { type: 'ARRAY', items: { type: 'OBJECT', properties: { key: { type: 'STRING' }, value: { type: 'STRING' }, quote: { type: 'STRING' } }, required: ['key', 'value'] } },
    units: { type: 'ARRAY', items: { type: 'OBJECT', properties: { t: { type: 'STRING' }, e: { type: 'NUMBER' }, s: { type: 'NUMBER' }, n: { type: 'NUMBER' }, b: { type: 'NUMBER' } } } },
    notes: { type: 'ARRAY', items: { type: 'STRING' } }
  },
  required: ['fields']
};

async function callGemini(key, parts, withSchema, model) {
  const body = { contents: [{ role: 'user', parts }], generationConfig: { responseMimeType: 'application/json', ...(withSchema ? { responseSchema: SCHEMA } : {}) } };
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify(body)
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error((j.error && j.error.message) || ('Gemini 오류 ' + r.status)); e.status = r.status; throw e; }
  const txt = (j.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
  const m = txt.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('문서에서 값을 읽지 못했습니다.');
  return JSON.parse(m[0]);
}

export default async function handler(req, res) {
  if (!checkPass(req, res)) return;
  if (req.method !== 'POST') return send(res, 405, { error: 'POST만 지원합니다.' });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return send(res, 501, { error: 'Vercel 환경변수 GEMINI_API_KEY가 없습니다.' });
  let b;
  try { b = await readBody(req); } catch (e) { return send(res, 413, { error: '파일이 너무 큽니다. 4MB 이하로 줄여 주세요.' }); }
  const parts = [{ text: PROMPT }];
  if (b.data && b.mime === 'application/pdf') parts.push({ inlineData: { mimeType: 'application/pdf', data: b.data } });
  else if (b.text) parts.push({ text: `파일명: ${b.name || ''}\n---\n${String(b.text).slice(0, 400000)}` });
  else return send(res, 400, { error: '읽을 내용이 없습니다.' });
  try {
    // 혼잡(429·503)이면 잠깐 쉬고 다시, 그래도 안 되면 다음 모델로
    let out = null, used = '', last;
    for (const model of [MODEL, ...FALLBACK.filter(m => m !== MODEL)]) {
      for (let t = 0; t < 2 && !out; t++) {
        try {
          try { out = await callGemini(key, parts, true, model); }
          catch (e) { if (e.status === 400) out = await callGemini(key, parts, false, model); else throw e; }
          used = model;
        } catch (e) { last = e; if (![429, 500, 503].includes(e.status) && e.status !== 404) throw e; if (e.status === 404) break; await sleep(1500 * (t + 1)); }
      }
      if (out) break;
    }
    if (!out) throw new Error('Gemini가 지금 붐벼서 읽지 못했습니다. 1~2분 뒤 다시 시도해 주세요.' + (last ? ` (${last.message})` : ''));
    send(res, 200, { model: used, fields: out.fields || [], units: out.units || [], notes: out.notes || [] });
  } catch (e) {
    send(res, 502, { error: e.message });
  }
}
