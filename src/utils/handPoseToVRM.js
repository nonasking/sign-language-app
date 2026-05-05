import * as THREE from 'three'

// 21pt landmark → VRM 손가락 본 회전 변환.
//
// landmark 인덱스 (MediaPipe 호환):
//   0: wrist
//   1-4: thumb (CMC, MCP, IP, TIP)
//   5-8: index (MCP, PIP, DIP, TIP)
//   9-12: middle, 13-16: ring, 17-20: pinky
//
// VRM 본 (각 손당 15개): {side}{Thumb|Index|Middle|Ring|Little}{Proximal|Intermediate|Distal}
//
// 주의: VRM 표준에서 thumb는 Proximal/Intermediate/Distal로 매핑되지만 landmark 1-4는
// CMC/MCP/IP/TIP — 일반적으로 CMC는 carpometacarpal로 손바닥 내부 본이라 thumb의 첫 회전은
// landmark 1→2 방향으로 사용. (사실상 VRM Thumb Proximal가 landmark 1 위치에서 2 방향을 향함.)

// 각 손가락의 segments: [from_idx, to_idx] 3쌍.
//   index Proximal: 5→6, Intermediate: 6→7, Distal: 7→8 …
const FINGER_SEGMENTS = {
  thumb:  [[1,2],[2,3],[3,4]],
  index:  [[5,6],[6,7],[7,8]],
  middle: [[9,10],[10,11],[11,12]],
  ring:   [[13,14],[14,15],[15,16]],
  little: [[17,18],[18,19],[19,20]],
}

const BONE_SUFFIXES = ['Proximal', 'Intermediate', 'Distal']

const TMP_PARENT_INV = new THREE.Quaternion()
const TMP_PARENT_Q   = new THREE.Quaternion()
const TMP_REST_DIR   = new THREE.Vector3()
const TMP_TARGET_DIR = new THREE.Vector3()
const TMP_LOCAL_Q    = new THREE.Quaternion()

// 본 회전을 "부모 로컬에서 rest 방향 → 현재 방향"으로 설정.
// rest 방향 = 자식 본의 로컬 위치 정규화 벡터.
// 입력 targetWorldDir 은 월드 좌표계 기준 방향.
function applyBoneRotation(bone, restDir, targetWorldDir) {
  if (!bone || !bone.parent) return
  bone.parent.getWorldQuaternion(TMP_PARENT_Q)
  TMP_PARENT_INV.copy(TMP_PARENT_Q).invert()
  TMP_TARGET_DIR.copy(targetWorldDir).applyQuaternion(TMP_PARENT_INV).normalize()
  TMP_REST_DIR.copy(restDir).normalize()
  TMP_LOCAL_Q.setFromUnitVectors(TMP_REST_DIR, TMP_TARGET_DIR)
  bone.quaternion.copy(TMP_LOCAL_Q)
  bone.updateMatrixWorld(true)
}

// 손목 본의 월드 회전을 사용하여 landmark 좌표(손목 로컬)를 월드 방향 벡터로 변환.
// landmark 좌표계: +Y=손가락 방향, +X=새끼손가락 방향, +Z=손바닥 안쪽(굽힘 방향).
// VRM 손목 본의 로컬 손바닥 normal 은 통상 -Z(손등이 +Z) 이므로 Z 부호를 반전해 굽힘 방향을 일치시킨다.
function landmarkDirToWorld(handBone, fromArr, toArr) {
  const local = new THREE.Vector3(
    toArr[0] - fromArr[0],
    toArr[1] - fromArr[1],
    -(toArr[2] - fromArr[2]),
  )
  if (local.lengthSq() < 1e-8) return null
  const q = new THREE.Quaternion()
  handBone.getWorldQuaternion(q)
  local.applyQuaternion(q).normalize()
  return local
}

function getRestChildDir(parentBone, childBone) {
  if (!parentBone || !childBone) return new THREE.Vector3(0, 1, 0)
  const d = new THREE.Vector3().copy(childBone.position)
  if (d.lengthSq() < 1e-8) return new THREE.Vector3(0, 1, 0)
  return d.normalize()
}

function processFinger(vrm, side, fingerKey, vrmFingerName, landmarks) {
  const segs = FINGER_SEGMENTS[fingerKey]
  const handBone = vrm.humanoid.getNormalizedBoneNode(`${side}Hand`)
  if (!handBone) return
  handBone.updateMatrixWorld(true)

  for (let i = 0; i < 3; i++) {
    const boneName = `${side}${vrmFingerName}${BONE_SUFFIXES[i]}`
    const bone = vrm.humanoid.getNormalizedBoneNode(boneName)
    if (!bone) continue
    // 다음 본 (자식) 찾기 — Distal의 경우 landmark TIP 방향 사용
    let childBone = null
    if (i < 2) {
      const nextName = `${side}${vrmFingerName}${BONE_SUFFIXES[i + 1]}`
      childBone = vrm.humanoid.getNormalizedBoneNode(nextName)
    } else {
      // Distal: 자식이 없으니 직계 children 첫 번째 본을 사용 (TIP 더미가 있을 수 있음)
      childBone = bone.children?.[0] ?? null
    }
    const restDir = getRestChildDir(bone, childBone)
    const [fromIdx, toIdx] = segs[i]
    const targetDir = landmarkDirToWorld(handBone, landmarks[fromIdx], landmarks[toIdx])
    if (!targetDir) continue
    applyBoneRotation(bone, restDir, targetDir)
  }
}

const FINGER_TO_VRM = {
  thumb:  'Thumb',
  index:  'Index',
  middle: 'Middle',
  ring:   'Ring',
  little: 'Little',
}

export function applyHandPoseToVRM(vrm, side, landmarks21) {
  if (!vrm?.humanoid || !landmarks21 || landmarks21.length < 21) return
  for (const key of Object.keys(FINGER_TO_VRM)) {
    processFinger(vrm, side, key, FINGER_TO_VRM[key], landmarks21)
  }
}

