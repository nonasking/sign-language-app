import * as THREE from 'three'

// fullPose 좌표계: +X = 화면 우측(viewer 시점), +Y = 위, +Z = 뷰어.
// VRM 1.0 정면(+Z) 그대로 카메라를 바라봄. 좌표 부호는 일치하나
// fullPose의 left/right 명명은 viewer 시점, VRM 본의 left/right 는 캐릭터 본인 시점이라 정반대.
// 따라서 입력의 left* 좌표는 VRM의 right* 본에, right* 는 VRM의 left* 본에 매핑한다.

const TMP_PARENT_QUAT = new THREE.Quaternion()
const TMP_PARENT_INV  = new THREE.Quaternion()
const TMP_DIR_FROM    = new THREE.Vector3()
const TMP_DIR_TO      = new THREE.Vector3()
const TMP_LOCAL_QUAT  = new THREE.Quaternion()

// 부모 본의 월드 회전 좌표계 안에서 from→to 방향으로의 회전을 본 노드에 적용
function applyDirectionToBone(boneNode, fromDir, toWorldDir) {
  if (!boneNode) return
  if (boneNode.parent) {
    boneNode.parent.getWorldQuaternion(TMP_PARENT_QUAT)
    TMP_PARENT_INV.copy(TMP_PARENT_QUAT).invert()
  } else {
    TMP_PARENT_INV.identity()
  }
  TMP_DIR_TO.copy(toWorldDir).applyQuaternion(TMP_PARENT_INV).normalize()
  TMP_DIR_FROM.copy(fromDir).normalize()
  TMP_LOCAL_QUAT.setFromUnitVectors(TMP_DIR_FROM, TMP_DIR_TO)
  boneNode.quaternion.copy(TMP_LOCAL_QUAT)
  boneNode.updateMatrixWorld(true)
}

const v = (arr) => new THREE.Vector3(arr[0], arr[1], arr[2])

// rest 방향 = 자식 본의 로컬 위치 정규화 벡터.
// 휴머노이드 정규화 본의 rest 자세에서 자식이 부모 로컬 어느 방향에 놓여 있는지를 표현.
function getRestChildDir(parentBone, childBone) {
  if (!parentBone || !childBone) return null
  const d = new THREE.Vector3().copy(childBone.position)
  if (d.lengthSq() < 1e-8) return null
  return d.normalize()
}

export function applyPoseToVRM(vrm, posePart) {
  if (!vrm?.humanoid || !posePart) return
  const get = (n) => vrm.humanoid.getNormalizedBoneNode(n)

  const head           = v(posePart.head)
  const leftShoulder   = v(posePart.leftShoulder)
  const rightShoulder  = v(posePart.rightShoulder)
  const leftElbow      = v(posePart.leftElbow)
  const rightElbow     = v(posePart.rightElbow)
  const leftWrist      = v(posePart.leftWrist)
  const rightWrist     = v(posePart.rightWrist)

  // VRM scene과 hips를 idle 회전 유지하고, 부모 트리 행렬은 한 번 업데이트
  vrm.scene.updateMatrixWorld(true)

  // ── UpperArm: 어깨 → 팔꿈치 (좌우 매핑 스왑) ────────────────────────
  // 입력 left* (화면 좌측) → VRM rightUpperArm (캐릭터 본인 right)
  {
    const upper = get('rightUpperArm')
    const lower = get('rightLowerArm')
    if (upper && lower) {
      const restDir = getRestChildDir(upper, lower)
      const target  = new THREE.Vector3().subVectors(leftElbow, leftShoulder)
      applyDirectionToBone(upper, restDir, target)
    }
  }
  // 입력 right* (화면 우측) → VRM leftUpperArm (캐릭터 본인 left)
  {
    const upper = get('leftUpperArm')
    const lower = get('leftLowerArm')
    if (upper && lower) {
      const restDir = getRestChildDir(upper, lower)
      const target  = new THREE.Vector3().subVectors(rightElbow, rightShoulder)
      applyDirectionToBone(upper, restDir, target)
    }
  }

  // ── LowerArm: 팔꿈치 → 손목 ────────────────────────────────────────
  {
    const lower = get('rightLowerArm')
    const hand  = get('rightHand')
    if (lower && hand) {
      const restDir = getRestChildDir(lower, hand)
      const target  = new THREE.Vector3().subVectors(leftWrist, leftElbow)
      applyDirectionToBone(lower, restDir, target)
    }
  }
  {
    const lower = get('leftLowerArm')
    const hand  = get('leftHand')
    if (lower && hand) {
      const restDir = getRestChildDir(lower, hand)
      const target  = new THREE.Vector3().subVectors(rightWrist, rightElbow)
      applyDirectionToBone(lower, restDir, target)
    }
  }

  // ── 목/머리 ───────────────────────────────────────────────────────
  {
    const neck = get('neck')
    const headBone = get('head')
    if (neck && headBone) {
      // 어깨 중점 → 머리 위치 방향
      const neckBase = new THREE.Vector3()
        .addVectors(leftShoulder, rightShoulder).multiplyScalar(0.5)
      const restDir = getRestChildDir(neck, headBone)
      const target  = new THREE.Vector3().subVectors(head, neckBase)
      applyDirectionToBone(neck, restDir, target)
    }
  }
}
