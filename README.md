# 심해 픽셀 탐험대 (Deep Pixel Sea)

픽셀 도트 스타일의 2D 심해 탐험 게임 MVP입니다. 밝은 수면에서 시작해 점점
어두운 심해로 내려가며, 산소·체력을 관리하고 적대 생물을 피하거나 공격하고
우호 생물과 교감하며 더 깊이 탐험합니다.

엔진은 **Phaser 3**(CDN)이며 빌드 단계가 없습니다. 모든 그래픽은 코드로 생성한
임시 픽셀 도형이라 외부 이미지 없이 실행되며, 나중에 PNG 스프라이트로 교체하기
쉽도록 구조가 분리되어 있습니다.

## 실행

```bash
node server.mjs
```

그 다음 브라우저에서 `http://127.0.0.1:4180` 을 엽니다. (별도 빌드/설치 불필요,
브라우저가 Phaser CDN에 접근할 수 있으면 됩니다.)

## 조작

PC 기준:

- 이동: `WASD` 또는 방향키
- 기본 공격: `Space`
- 대시: `Q`
- 빛 폭발: `E`
- 상호작용: `F`
- 생물 도감: `Tab`
- 일시정지: `Esc`

모바일은 화면 좌하단 방향 패드와 우하단 액션 버튼으로 조작합니다.

## 게임 흐름

깊이에 따라 햇빛 바다 → 중층 바다 → 심해 → 초심해로 분위기가 변하고, 심해부터는
잠수정 주변만 밝게 보입니다. 산소가 시간이 지나며 줄고(깊을수록 빨라짐) 0이 되면
체력이 깎입니다. 약 1780m 부근에서 거대 생물과 조우하며, 체력이 0이 되거나 최대
깊이에 도달하면 결과 화면이 표시됩니다.

## 코드 구조

```
pixel-explorer/
  index.html          # 진입점 (Phaser CDN + game/main.js)
  styles.css          # 캔버스 픽셀 렌더링/레이아웃
  server.mjs          # 로컬 정적 서버
  game/
    main.js           # Phaser 설정 + 씬 등록
    config.js         # 공통 상수(깊이 ↔ 픽셀 변환 등)
    scenes/           # Boot(텍스처 생성) · Menu · Game · Result
    entities/         # Player · Enemy · FriendlyCreature · Projectile · Item
    systems/          # Depth · Oxygen · Combat · Spawn · Lighting
    ui/               # Hud (체력/산소/에너지 바, 깊이, 스킬 버튼, 도감, 일시정지)
    data/             # zones · creatures · items (난이도·콘텐츠는 여기서 조정)
```

콘텐츠와 난이도는 `game/data/`의 데이터 파일에서 조정합니다. 그래픽 리소스를
교체할 때는 `game/scenes/BootScene.js`의 텍스처 생성 부분만 PNG 로드로 바꾸면
됩니다(텍스처 키는 그대로 유지).
