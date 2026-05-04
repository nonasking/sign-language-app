# Korean Sign Language Translator

A web app that turns Korean text into a 3D Korean Sign Language (KSL) animation.
No backend — it ships as static assets and can be dropped onto Vercel or any static host.

> Personal/study project. The sign poses are MVP-grade approximations; using this for real KSL education would need review by a qualified expert.

## Getting started

```bash
npm install
npm run dev
```

Vite serves on its default port (usually 5173). Use `npm run build` for a production build and `npm run preview` to preview it locally.

## How it works

1. Type Korean text and press **번역** ("Translate").
2. Words that exist in the dictionary (`src/data/ksl_dictionary.json`) are played as their registered sign sequence.
3. Words that aren't in the dictionary fall back to **fingerspelling** — they're decomposed into Hangul jamo and signed letter by letter.
4. Playback speed, pause/resume, and a progress bar are all wired up.

Example inputs: `안녕하세요`, `감사합니다`, `사랑해`, `좋아요`.

## Tech stack

- React 18 + Vite 5
- Three.js (3D upper-body avatar)
- Tailwind CSS

## Project layout

```
src/
├─ App.jsx                    Header + avatar/player/input layout
├─ components/
│  ├─ SignAvatar.jsx          Three.js scene, upper body + hand joints
│  ├─ AnimationPlayer.jsx     Playback controls
│  └─ TextInput.jsx           Input form with example chips
├─ hooks/
│  └─ useSignAnimation.js     RAF-driven sequence player, frame interpolation
├─ utils/
│  ├─ handPoses.js            Hand/arm pose constants (21 landmarks)
│  ├─ poseFormat.js           World-space conversion + interpolation helpers
│  └─ koreanDecompose.js      Hangul jamo decomposition (Unicode arithmetic)
└─ data/
   └─ ksl_dictionary.json     Sign dictionary (word → pose sequence)
```

### Coordinate system

Hand pose data is anchored at the wrist with this convention:

- `+Y` — direction the fingers point
- `+X` — direction of the pinky
- `+Z` — toward the viewer

Landmark indices follow the MediaPipe hand model (0 = wrist, 1–4 = thumb, 5–8 = index, …).

## Adding new signs

To add a word, append an entry to `src/data/ksl_dictionary.json`:

```json
"사랑해": {
  "description": "I love you",
  "sequence": [
    { "pose": "open",  "duration": 250 },
    { "pose": "heart", "duration": 500 },
    { "pose": "open",  "duration": 250 }
  ]
}
```

Each `pose` value must match a key in the `POSES` object in `src/utils/handPoses.js`.
If you need a new hand shape, add a 21-landmark coordinate array to the same file.

## Limitations

- Single hand only — the avatar currently renders one (right) hand.
- Non-manual signals such as facial expression, mouth shape, and body posture aren't represented.
- The dictionary is small, so most inputs fall through to fingerspelling.
- Pose coordinates are hand-tuned approximations and will diverge from real KSL.
