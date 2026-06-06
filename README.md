# 4글자 이어말하기 ⏱️

4글자 사자성어에서 **앞 2글자**만 보고, **3초 안에** 남은 2글자를 맞히는 웹 게임입니다.

## 플레이
`index.html`을 브라우저로 열면 바로 플레이할 수 있어요. (설치/빌드 불필요)
GitHub Pages: Settings → Pages → Branch `main` / root → `https://raducioi.github.io/Word-Game/`

## 규칙
- 앞 2글자만 표시, 나머지 2글자는 `?`로 가림
- 3초 안에 남은 2글자 입력 (Enter 또는 확인 버튼)
- 정답 +10점, 연속 정답 시 콤보 보너스
- 오답/시간초과 시 목숨 감소 (총 3개)

## 커스터마이징
- 제한 시간: `index.html`의 `TIME_LIMIT` 값 변경
- 단어 추가: `WORDS` 배열에 `{ w: "단어", h: "뜻" }` 추가
