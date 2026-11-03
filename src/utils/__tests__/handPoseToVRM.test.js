import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { applyHandPoseToVRM } from '../handPoseToVRM'
import { POSES } from '../handPoses'

// three 의 수학/씬그래프는 DOM 없이 동작하므로 렌더러 없이 본 트리만 만들어 검증한다.
// VRM 대신 getNormalizedBoneNode 만 제공하는 최소 목(mock) 휴머노이드를 쓴다.
function makeMockVRM(side = 'right', handQuat = new THREE.Quaternion()) {
  const bones = {}
  const root = new THREE.Object3D()

  const hand = new THREE.Object3D()
  hand.quaternion.copy(handQuat)
  root.add(hand)
  bones[`${side}Hand`] = hand

  // 검지 체인만 구성: rest 자세에서 각 자식이 부모 로컬 +Y 방향에 놓인다.
  let parent = hand
  for (const suffix of ['Proximal', 'Intermediate', 'Distal']) {
    const bone = new THREE.Object3D()
    bone.position.set(0, 0.05, 0)
    parent.add(bone)
    bones[`${side}Index${suffix}`] = bone
    parent = bone
  }
  const tip = new THREE.Object3D() // Distal 의 rest 방향 산출용 더미
  tip.position.set(0, 0.04, 0)
  parent.add(tip)

  root.updateMatrixWorld(true)

  return {
    scene: root,
    humanoid: { getNormalizedBoneNode: (name) => bones[name] ?? null },
    bones,
    tip,
  }
}

// 본 → 자식 본의 월드 방향
const worldDirTo = (bone, child) => {
  const a = new THREE.Vector3().setFromMatrixPosition(bone.matrixWorld)
  const b = new THREE.Vector3().setFromMatrixPosition(child.matrixWorld)
  return b.sub(a).normalize()
}

// 랜드마크 델타 → 기대 월드 방향 (핸드본 회전 적용, Z 부호 반전)
const expectedDir = (landmarks, from, to, handQuat = new THREE.Quaternion()) =>
  new THREE.Vector3(
    landmarks[to][0] - landmarks[from][0],
    landmarks[to][1] - landmarks[from][1],
    -(landmarks[to][2] - landmarks[from][2]),
  ).applyQuaternion(handQuat).normalize()

const OPEN_HAND = POSES.open.rightHand

describe('applyHandPoseToVRM — 방향 매핑', () => {
  it('Proximal 본이 랜드마크 5→6 방향을 향하도록 회전한다', () => {
    const vrm = makeMockVRM('right')
    applyHandPoseToVRM(vrm, 'right', OPEN_HAND)

    const got = worldDirTo(vrm.bones.rightIndexProximal, vrm.bones.rightIndexIntermediate)
    const want = expectedDir(OPEN_HAND, 5, 6)
    expect(got.dot(want)).toBeCloseTo(1, 5)
  })

  it('Intermediate / Distal 본도 각각 6→7, 7→8 방향을 향한다', () => {
    const vrm = makeMockVRM('right')
    applyHandPoseToVRM(vrm, 'right', OPEN_HAND)

    const inter = worldDirTo(vrm.bones.rightIndexIntermediate, vrm.bones.rightIndexDistal)
    expect(inter.dot(expectedDir(OPEN_HAND, 6, 7))).toBeCloseTo(1, 5)

    const distal = worldDirTo(vrm.bones.rightIndexDistal, vrm.tip)
    expect(distal.dot(expectedDir(OPEN_HAND, 7, 8))).toBeCloseTo(1, 5)
  })

  it('손목 본이 회전해 있으면 손가락 방향도 함께 회전한다 (손목 로컬 기준 유지)', () => {
    const handQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2)
    const vrm = makeMockVRM('right', handQuat)
    applyHandPoseToVRM(vrm, 'right', OPEN_HAND)

    const got = worldDirTo(vrm.bones.rightIndexProximal, vrm.bones.rightIndexIntermediate)
    const want = expectedDir(OPEN_HAND, 5, 6, handQuat)
    expect(got.dot(want)).toBeCloseTo(1, 5)
  })

  it('회전 쿼터니언은 단위 길이를 유지한다', () => {
    const vrm = makeMockVRM('right')
    applyHandPoseToVRM(vrm, 'right', OPEN_HAND)
    for (const name of ['rightIndexProximal', 'rightIndexIntermediate', 'rightIndexDistal']) {
      expect(vrm.bones[name].quaternion.length()).toBeCloseTo(1, 6)
    }
  })

  it('주먹 포즈는 편 손보다 손가락을 더 굽힌다 (+Z 굽힘 방향)', () => {
    const openVRM = makeMockVRM('right')
    applyHandPoseToVRM(openVRM, 'right', POSES.open.rightHand)
    const openDir = worldDirTo(openVRM.bones.rightIndexIntermediate, openVRM.bones.rightIndexDistal)

    const fistVRM = makeMockVRM('right')
    applyHandPoseToVRM(fistVRM, 'right', POSES.fist.rightHand)
    const fistDir = worldDirTo(fistVRM.bones.rightIndexIntermediate, fistVRM.bones.rightIndexDistal)

    // 굽힘은 랜드마크 +Z → 월드 -Z 로 변환된다. 주먹이 더 -Z 쪽을 향해야 한다.
    expect(fistDir.z).toBeLessThan(openDir.z)
    expect(fistDir.y).toBeLessThan(openDir.y)
  })
})

describe('applyHandPoseToVRM — 방어 로직', () => {
  it('vrm / 랜드마크가 없거나 21개 미만이면 조용히 무시한다', () => {
    const vrm = makeMockVRM('right')
    expect(() => applyHandPoseToVRM(null, 'right', OPEN_HAND)).not.toThrow()
    expect(() => applyHandPoseToVRM({}, 'right', OPEN_HAND)).not.toThrow()
    expect(() => applyHandPoseToVRM(vrm, 'right', null)).not.toThrow()
    expect(() => applyHandPoseToVRM(vrm, 'right', OPEN_HAND.slice(0, 10))).not.toThrow()
    expect(vrm.bones.rightIndexProximal.quaternion.equals(new THREE.Quaternion())).toBe(true)
  })

  it('없는 본은 건너뛴다 (검지 외 손가락 본이 없어도 예외 없음)', () => {
    const vrm = makeMockVRM('right')
    expect(() => applyHandPoseToVRM(vrm, 'right', OPEN_HAND)).not.toThrow()
    expect(vrm.humanoid.getNormalizedBoneNode('rightThumbProximal')).toBeNull()
  })
})
