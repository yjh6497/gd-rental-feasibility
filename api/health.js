// 연결 상태 확인: 인증키·저장소·접근코드 설정 여부만 알려줌 (값은 노출하지 않음)
import { send } from './_lib.js';
export default function handler(req, res) {
  send(res, 200, {
    rentApi: !!process.env.DATA_GO_KR_KEY,
    store: !!process.env.BLOB_READ_WRITE_TOKEN || !!((process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL) && (process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN)),
    passcode: !!process.env.APP_PASSCODE
  });
}
