// FullBodyPose 형식:
// {
//   pose: { head, leftShoulder, rightShoulder, leftElbow, rightElbow, leftWrist, rightWrist }
//   rightHand: [[x,y,z] × 21]  ← 손목 기준 로컬 좌표
//   leftHand:  [[x,y,z] × 21]
//   face: null  ← 추후 표정 확장 포인트
// }

// 손 로컬 좌표 → 월드 좌표 변환 스케일
export const HAND_SCALE = 0.28

export function getWorldHandPoints(wristWorldPos, handLocalPoints) {
  if (!handLocalPoints) return null
  return handLocalPoints.map(([x, y, z]) => [
    wristWorldPos[0] + x * HAND_SCALE,
    wristWorldPos[1] + y * HAND_SCALE,
    wristWorldPos[2] + z * HAND_SCALE,
  ])
}

const lerpV3 = (a, b, t) => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
]

export function lerpFullBodyPose(a, b, t) {
  const lerpJoints = (ja, jb) => {
    const out = {}
    for (const k in ja) out[k] = lerpV3(ja[k], jb[k], t)
    return out
  }

  const lerpArr21 = (ha, hb) => {
    if (!ha || !hb) return ha ?? hb
    return ha.map((p, i) => lerpV3(p, hb[i], t))
  }

  return {
    pose:      lerpJoints(a.pose, b.pose),
    rightHand: lerpArr21(a.rightHand, b.rightHand),
    leftHand:  lerpArr21(a.leftHand, b.leftHand),
    face: null,
  }
}
