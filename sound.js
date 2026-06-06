// 공통 사운드 — Web Audio로 합성 (외부 음원 파일 없음)
let audioCtx = null;

function initAudio() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
  } catch (e) { audioCtx = null; }
}

function _blip(freq, start, dur, type, vol) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(vol, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(start);
  osc.stop(start + dur + 0.05);
}

// 초침 "똑딱" 클릭음
function playTick() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(1300, t);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.22, t + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(t);
  osc.stop(t + 0.06);
}

// 정답 공개 "빠밤~" 팡파레
function playFanfare() {
  if (!audioCtx) return;
  const t0 = audioCtx.currentTime;
  _blip(392.00, t0, 0.13, "triangle", 0.30);   // "빠" (G4)
  const t1 = t0 + 0.15;                          // "밤~" 화음
  _blip(523.25, t1, 0.55, "triangle", 0.26);   // C5
  _blip(659.25, t1, 0.55, "triangle", 0.20);   // E5
  _blip(783.99, t1, 0.55, "triangle", 0.18);   // G5
}
