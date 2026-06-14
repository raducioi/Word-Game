// 음성 인식 공통 모듈 (Web Speech API)
// - 지원 브라우저: Chrome/Edge/삼성인터넷, iOS Safari 일부. Firefox 미지원.
// - HTTPS + 마이크 권한 필요. 인식은 브라우저(클라우드)에서 처리됨.

function speechSupported() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

// 공백·문장부호 제거, 한글/영문/숫자만 남기고 소문자화
function normalizeKo(s) {
  return (s || "")
    .toLowerCase()
    .replace(/[\s]+/g, "")
    .replace(/[^0-9a-z가-힣ㄱ-ㅎ]/g, "");
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    prev = cur;
  }
  return prev[n];
}

// 들린 말(transcript)이 정답 후보(answers) 중 하나와 충분히 일치하는지
// opts: { edits: (정답길이)=>허용 편집거리, partial: 부분 포함 허용 }
function matchAnswer(transcript, answers, opts) {
  opts = opts || {};
  const editsFn = typeof opts.edits === "function" ? opts.edits : () => 1;
  const allowPartial = opts.partial !== false;
  const t = normalizeKo(transcript);
  if (!t) return false;
  const list = Array.isArray(answers) ? answers : [answers];
  for (const ans of list) {
    const a = normalizeKo(ans);
    if (!a) continue;
    if (t === a) return true;
    // 부분 일치: "정답 전체"가 발화 안에 들어있을 때만 (3글자 이상)
    if (allowPartial && a.length >= 3 && t.includes(a)) return true;
    const cap = editsFn(a.length);
    if (cap > 0 && levenshtein(t, a) <= cap) return true;
  }
  return false;
}

// 민감도 레벨 → matchAnswer 옵션 (편집거리 허용을 보수적으로)
const SENS_OPTS = {
  strict: { partial: false, edits: () => 0 },                       // 정확히 일치만
  normal: { partial: true,  edits: (n) => (n >= 3 ? 1 : 0) },       // 1글자 오차까지
  loose:  { partial: true,  edits: (n) => (n >= 7 ? 2 : (n >= 3 ? 1 : 0)) }, // 긴 문장만 2글자
};

// 지속 인식 컨트롤러 (자동 재시작)
function createVoiceController({ lang = "ko-KR", onTranscript, onStateChange } = {}) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  let rec = null, active = false, running = false;

  function build() {
    rec = new SR();
    rec.lang = lang;
    // 3초 창 동안 계속 듣고, 게임 쪽에서 창이 끝날 때 모아서 한 번만 판정한다.
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 3;
    rec.onstart = () => { running = true; if (onStateChange) onStateChange(true); };
    rec.onend = () => {
      running = false;
      if (active) { setTimeout(() => { if (active && !running) { try { rec.start(); } catch (_) {} } }, 250); }
      else if (onStateChange) onStateChange(false);
    };
    rec.onerror = () => { /* no-speech/aborted 등은 onend에서 재시작 처리 */ };
    rec.onresult = (e) => {
      if (!onTranscript) return;
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        // 한 결과의 여러 대안(alternatives)을 모아 "한 번만" 콜백
        const alts = [];
        for (let k = 0; k < res.length; k++) alts.push(res[k].transcript);
        onTranscript(alts[0] || "", res.isFinal, alts);
      }
    };
  }

  return {
    start() {
      if (!rec) build();
      active = true;
      if (!running) { try { rec.start(); } catch (_) {} }
    },
    stop() {
      active = false;
      if (rec && running) { try { rec.stop(); } catch (_) {} }
    },
    get listening() { return running; },
  };
}
