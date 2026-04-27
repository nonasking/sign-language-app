---
name: sign-data
description: "KSL 수어 사전(ksl_dictionary.json)과 손 포즈 데이터(handPoses.js)를 관리한다. 새 수어 단어 추가, 포즈 수정/보완, 지문자 추가, 수어 시퀀스 설계, 사전 구조 개선 등 수어 데이터 관련 모든 작업에 이 스킬을 사용하라. '단어 추가', '포즈 수정', '수어 추가', '사전 업데이트', '지문자 수정' 요청 시 반드시 트리거할 것. 컴포넌트나 애니메이션 로직 변경이 함께 필요하면 ksl-develop 스킬을 사용하라."
---

# KSL 데이터 관리

`ksl_dictionary.json`과 `handPoses.js`를 수정하여 수어 사전과 포즈 데이터를 관리한다.

---

## 파일 구조

```
src/
├── data/ksl_dictionary.json  ← 단어 → 포즈 시퀀스 매핑
└── utils/handPoses.js        ← 21 landmark 포즈 정의 + POSES 레지스트리
```

---

## 좌표계 (반드시 준수)

```
Origin: 손목(wrist) = [0, 0, 0]
+Y: 손가락 방향 (위)
+X: 새끼손가락 방향 (오른쪽)  
+Z: 뷰어 방향 (앞)

참고 범위:
- 완전히 편 중지 끝: y ≈ 0.70
- 손바닥 너비: x ≈ -0.09 (검지) ~ 0.15 (소지)
- 손가락이 접힐 때: z ≈ 0.20~0.27 증가
```

---

## ksl_dictionary.json 형식

```json
{
  "단어": {
    "description": "설명 (한국어)",
    "sequence": [
      { "pose": "POSES_키_이름", "duration": 400 },
      { "pose": "open", "duration": 200 }
    ]
  }
}
```

- `pose`: `handPoses.js`의 `POSES` 객체 키와 정확히 일치해야 함
- `duration`: 밀리초 단위 양수 정수. 보통 200~600ms
- 시퀀스 마지막 프레임은 `open` (중립 포즈)으로 끝내는 것을 권장

---

## handPoses.js 포즈 추가 방법

### 1. 21개 landmark 배열 작성

```javascript
// 인덱스 순서: 0=손목, 1-4=엄지, 5-8=검지, 9-12=중지, 13-16=약지, 17-20=소지
export const MY_POSE = [
  [ 0.00,  0.00,  0.00], // 0  WRIST
  [-0.14,  0.09,  0.02], // 1  THUMB_CMC
  // ... 21개 모두 작성
]
```

### 2. POSES 레지스트리에 등록

```javascript
export const POSES = {
  // 기존 포즈들 ...
  my_pose_name: MY_POSE,  // 키 이름이 dictionary에서 사용될 poseName
}
```

### 3. 포즈 작성 팁

기존 포즈를 기반으로 수정하면 실수를 줄일 수 있다:

```javascript
// FIST 기반에서 검지만 펴기 → 기존 POINT 패턴 참조
// OPEN 기반에서 손가락 접기 → z값을 0.15~0.27로 증가시키고 y값 감소
```

자주 쓰는 기본 포즈 참조:
| 포즈 | 설명 | 키 |
|------|------|-----|
| `OPEN` | 모든 손가락 펼침 | `open` |
| `FIST` | 주먹 | `fist` |
| `POINT` | 검지만 위로 | `point` |
| `PEACE` | 검지+중지 V | `peace` |
| `THUMBS_UP` | 엄지 위 | `thumbs_up` |

---

## 단어 추가 워크플로우

1. **단어 분석**: 해당 단어의 KSL 수어 동작을 파악
2. **포즈 선택**: 기존 POSES 중 적합한 것 선택, 없으면 신규 작성
3. **시퀀스 설계**: 동작을 2~4개 프레임으로 분해
4. **dictionary 추가**: `ksl_dictionary.json`에 엔트리 추가
5. **정합성 확인**: 모든 poseName이 POSES에 존재하는지 확인

---

## 검증 체크리스트

추가/수정 후 반드시 확인:

- [ ] 새 포즈의 landmark 수 = 정확히 21개
- [ ] dictionary의 모든 poseName이 `POSES` 키로 존재
- [ ] `duration` 값이 양수 정수
- [ ] `npm run build` 성공 (JSON 문법 오류 없음)
- [ ] 시퀀스가 1개 이상의 프레임을 가짐

---

## 지문자 폴백 참조

`koreanDecompose.js`가 자동으로 자모 분해 → `POSES['ㄱ']`, `POSES['ㅏ']` 등 조회.
지문자 포즈 키는 자모 그대로 (`'ㄱ'`, `'ㅏ'` 등). 수정 시 이 키들 유지.
