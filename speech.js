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
// opts: { tol: 편집거리 허용 비율(0이면 끔), partial: 부분 포함 허용 }
function matchAnswer(transcript, answers, opts) {
  opts = opts || {};
  const tolRatio = opts.tol != null ? opts.tol : 0.25;
  const allowPartial = opts.partial !== false;
  const t = normalizeKo(transcript);
  if (!t) return false;
  const list = Array.isArray(answers) ? answers : [answers];
  for (const ans of list) {
    const a = normalizeKo(ans);
    if (!a) continue;
    if (t === a) return true;
    if (allowPartial && a.length >= 2 && (t.includes(a) || a.includes(t))) return true;
    if (tolRatio > 0) {
      const tol = Math.max(1, Math.floor(a.length * tolRatio));
      if (levenshtein(t, a) <= tol) return true;
    }
  }
  return false;
}

// 민감도 레벨 → matchAnswer 옵션
const SENS_OPTS = {
  strict: { tol: 0, partial: false },
  normal: { tol: 0.25, partial: true },
  loose: { tol: 0.5, partial: true },
};

// 지속 인식 컨트롤러 (자동 재시작)
function createVoiceController({ lang = "ko-KR", onTranscript, onStateChange } = {}) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  let rec = null, active = false, running = false;

  function build() {
    rec = new SR();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 3;
    rec.onstart = () => { running = true; if (onStateChange) onStateChange(true); };
    rec.onend = () => {
      running = false;
      if (active) { try { rec.start(); } catch (_) {} }
      else if (onStateChange) onStateChange(false);
    };
    rec.onerror = () => { /* no-speech/aborted 등은 onend에서 재시작 처리 */ };
    rec.onresult = (e) => {
      if (!onTranscript) return;
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        for (let k = 0; k < res.length; k++) {
          onTranscript(res[k].transcript, res.isFinal);
        }
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
