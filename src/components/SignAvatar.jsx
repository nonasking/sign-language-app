import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import {
  HAND_CONNECTIONS, CONNECTION_FINGER_MAP, FINGER_COLORS, POSES,
} from '../utils/handPoses'
import { getWorldHandPoints, HAND_SCALE } from '../utils/poseFormat'

// ─── 상수 ──────────────────────────────────────────────────────────────────
const HEAD_R    = 0.20
const ARM_R     = 0.054
const FOREARM_R = 0.043
const JOINT_R   = 0.016   // 손 관절 구체
const BONE_R    = 0.007   // 손 뼈대

// 색상 팔레트
const C_SKIN  = 0xFFCEB4  // 따뜻한 복숭아
const C_CLOTH = 0x4F46E5  // 인디고
const C_HAIR  = 0x2C1810  // 진한 갈색
const C_EYE   = 0x120A05
const C_MOUTH = 0xC45454

// ─── 헬퍼 ──────────────────────────────────────────────────────────────────
function makeSphere(r, mat, seg = 14) {
  return new THREE.Mesh(new THREE.SphereGeometry(r, seg, seg), mat)
}

function makeCylinder(r, mat, seg = 12) {
  return new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, seg), mat)
}

function updateLimb(mesh, a, b) {
  const va  = new THREE.Vector3(...a)
  const vb  = new THREE.Vector3(...b)
  const len = va.distanceTo(vb)
  mesh.position.copy(va.clone().add(vb).multiplyScalar(0.5))
  mesh.scale.set(1, Math.max(len, 0.001), 1)
  mesh.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    vb.clone().sub(va).normalize()
  )
}

function mid3(a, b) {
  return [(a[0]+b[0])/2, (a[1]+b[1])/2, (a[2]+b[2])/2]
}

// ─── 씬 초기화 ─────────────────────────────────────────────────────────────
function initScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  // ACES Filmic 톤매핑: 하이라이트 롤오프가 자연스럽고 색감이 풍부해짐
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05

  const scene = new THREE.Scene()

  // 환경맵 — 추가 파일 없이 실내 반사광 생성
  const pmrem  = new THREE.PMREMGenerator(renderer)
  const envMap = pmrem.fromScene(new RoomEnvironment()).texture
  scene.environment    = envMap
  scene.environmentIntensity = 0.6
  pmrem.dispose()

  const w = canvas.clientWidth  || 400
  const h = canvas.clientHeight || 300
  const camera = new THREE.PerspectiveCamera(48, w / h, 0.01, 100)
  camera.position.set(0, 0.65, 2.55)
  camera.lookAt(0, 0.62, 0)

  // ── 조명 ─────────────────────────────────────────────────────────────
  scene.add(new THREE.AmbientLight(0xffffff, 0.45))

  // 주광 (따뜻한 노란빛, 위-앞-오른쪽)
  const key = new THREE.DirectionalLight(0xFFF6E0, 1.1)
  key.position.set(1.8, 3.5, 2.2)
  key.castShadow = true
  key.shadow.mapSize.set(1024, 1024)
  key.shadow.camera.left   = -1.2
  key.shadow.camera.right  =  1.2
  key.shadow.camera.top    =  2.0
  key.shadow.camera.bottom = -0.5
  key.shadow.camera.near   = 0.1
  key.shadow.camera.far    = 10
  key.shadow.bias = -0.001
  scene.add(key)

  // 보조광 (차가운 파랑, 왼쪽에서 채움)
  const fill = new THREE.DirectionalLight(0xA8D0FF, 0.30)
  fill.position.set(-2.5, 0.5, 1.5)
  scene.add(fill)

  // 림 라이트 (뒤에서 실루엣 강조 — 이게 입체감을 크게 올림)
  const rim = new THREE.DirectionalLight(0xFFFFFF, 0.38)
  rim.position.set(0, 2, -3)
  scene.add(rim)

  // ── 재질 ─────────────────────────────────────────────────────────────
  // clearcoat: 피부의 약간의 광택(윤기) 표현
  const skinMat = new THREE.MeshPhysicalMaterial({
    color: C_SKIN,
    roughness: 0.62,
    metalness: 0.0,
    clearcoat: 0.28,
    clearcoatRoughness: 0.38,
  })
  const clothMat = new THREE.MeshStandardMaterial({
    color: C_CLOTH,
    roughness: 0.40,
    metalness: 0.05,
  })
  const hairMat  = new THREE.MeshStandardMaterial({ color: C_HAIR,  roughness: 0.85 })
  const eyeMat   = new THREE.MeshPhysicalMaterial({ color: C_EYE,   roughness: 0.15, metalness: 0.1, clearcoat: 0.8 })
  const mouthMat = new THREE.MeshStandardMaterial({ color: C_MOUTH, roughness: 0.55 })

  // ── 바닥 디스크 (그라운딩 + 그림자 받기) ───────────────────────────
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(0.75, 36),
    new THREE.MeshStandardMaterial({
      color: 0x1E293B, roughness: 0.95,
      transparent: true, opacity: 0.55,
    })
  )
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -0.02
  ground.receiveShadow = true
  scene.add(ground)

  // ── 머리 그룹 (표정 확장 포인트) ──────────────────────────────────
  const headGroup = new THREE.Group()
  scene.add(headGroup)

  const headMesh = makeSphere(HEAD_R, skinMat, 24)
  headMesh.castShadow = true
  headGroup.add(headMesh)

  // 머리카락 캡
  const hair = makeSphere(HEAD_R * 1.03, hairMat, 18)
  hair.scale.set(1.0, 0.52, 1.0)
  hair.position.y = HEAD_R * 0.50
  headGroup.add(hair)

  // 눈: 공막(흰자) + 홍채(검정)
  const scleraMat = new THREE.MeshPhysicalMaterial({ color: 0xF5F0EA, roughness: 0.3, clearcoat: 0.5 })
  for (const side of [-1, 1]) {
    const sclera = makeSphere(0.035, scleraMat, 10)
    sclera.position.set(side * 0.068, 0.045, HEAD_R * 0.88)
    headGroup.add(sclera)

    const iris = makeSphere(0.022, eyeMat, 10)
    iris.position.set(side * 0.068, 0.045, HEAD_R * 0.93)
    headGroup.add(iris)
  }

  // 입 (face: null일 때 정적 — 추후 fullPose.face로 제어 가능)
  const mouth = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.007, 0.062, 4, 8),
    mouthMat
  )
  mouth.rotation.z = Math.PI / 2
  mouth.position.set(0, -0.072, HEAD_R * 0.90)
  headGroup.add(mouth)

  // ── 몸통 ─────────────────────────────────────────────────────────────
  const torso = new THREE.Mesh(
    new THREE.CylinderGeometry(0.19, 0.155, 0.80, 14),
    clothMat
  )
  torso.position.set(0, 0.41, 0)
  torso.castShadow = true
  scene.add(torso)

  // ── 관절 구체
  // 어깨(cloth), 팔꿈치/손목(skin) — 반지름이 실린더보다 커야 끝이 가려짐
  const shoulderL = makeSphere(0.070, clothMat)
  const shoulderR = makeSphere(0.070, clothMat)
  const elbowL    = makeSphere(ARM_R    + 0.006, skinMat)  // 0.060 > ARM_R
  const elbowR    = makeSphere(ARM_R    + 0.006, skinMat)
  const wristL    = makeSphere(FOREARM_R + 0.006, skinMat) // 0.049 > FOREARM_R
  const wristR    = makeSphere(FOREARM_R + 0.006, skinMat)
  ;[shoulderL, shoulderR, elbowL, elbowR, wristL, wristR].forEach(m => {
    m.castShadow = true
    scene.add(m)
  })

  // ── 팔 실린더 ─────────────────────────────────────────────────────
  const neckMesh  = makeCylinder(0.060, skinMat)
  const clavicleL = makeCylinder(0.038, clothMat)
  const clavicleR = makeCylinder(0.038, clothMat)
  const upperArmL = makeCylinder(ARM_R,     skinMat)
  const upperArmR = makeCylinder(ARM_R,     skinMat)
  const forearmL  = makeCylinder(FOREARM_R, skinMat)
  const forearmR  = makeCylinder(FOREARM_R, skinMat)
  ;[neckMesh, clavicleL, clavicleR, upperArmL, upperArmR, forearmL, forearmR].forEach(m => {
    m.castShadow = true
    scene.add(m)
  })

  // ── 양손 (관절 구체 + 뼈대 실린더) ──────────────────────────────
  function buildHand() {
    const joints = []
    for (let i = 0; i < 21; i++) {
      const f   = getFingerForJoint(i)
      const mat = new THREE.MeshPhysicalMaterial({
        color: FINGER_COLORS[f],
        roughness: 0.38,
        metalness: 0.05,
        clearcoat: 0.15,
      })
      const m = makeSphere(JOINT_R, mat, 8)
      scene.add(m)
      joints.push(m)
    }
    const bones = HAND_CONNECTIONS.map((_, i) => {
      const f   = CONNECTION_FINGER_MAP[i]
      const mat = new THREE.MeshStandardMaterial({
        color: FINGER_COLORS[f],
        roughness: 0.50,
        transparent: true,
        opacity: 0.88,
      })
      const m = makeCylinder(BONE_R, mat, 6)
      scene.add(m)
      return m
    })
    return { joints, bones }
  }

  const rightHand = buildHand()
  const leftHand  = buildHand()

  // faceFeatures를 노출 — 추후 표정 확장 시 이 ref로 접근
  const faceFeatures = { mouth }

  return {
    renderer, scene, camera, envMap,
    meshes: {
      headGroup,
      shoulderL, shoulderR,
      elbowL, elbowR, wristL, wristR,
      neckMesh, clavicleL, clavicleR,
      upperArmL, upperArmR, forearmL, forearmR,
      rightHand, leftHand,
      faceFeatures,
    },
  }
}

// ─── 캐릭터 업데이트 ────────────────────────────────────────────────────────
function updateCharacter(meshes, fullPose) {
  const {
    head,
    leftShoulder, rightShoulder,
    leftElbow,    rightElbow,
    leftWrist,    rightWrist,
  } = fullPose.pose

  meshes.headGroup.position.set(...head)

  meshes.shoulderL.position.set(...leftShoulder)
  meshes.shoulderR.position.set(...rightShoulder)
  meshes.elbowL.position.set(...leftElbow)
  meshes.elbowR.position.set(...rightElbow)
  meshes.wristL.position.set(...leftWrist)
  meshes.wristR.position.set(...rightWrist)

  const neckBase = mid3(leftShoulder, rightShoulder)
  updateLimb(meshes.neckMesh,  neckBase,      head)
  updateLimb(meshes.clavicleL, neckBase,      leftShoulder)
  updateLimb(meshes.clavicleR, neckBase,      rightShoulder)
  updateLimb(meshes.upperArmL, leftShoulder,  leftElbow)
  updateLimb(meshes.forearmL,  leftElbow,     leftWrist)
  updateLimb(meshes.upperArmR, rightShoulder, rightElbow)
  updateLimb(meshes.forearmR,  rightElbow,    rightWrist)

  updateHandMeshes(meshes.rightHand, getWorldHandPoints(rightWrist, fullPose.rightHand))
  updateHandMeshes(meshes.leftHand,  getWorldHandPoints(leftWrist,  fullPose.leftHand))

  // 추후 표정: fullPose.face가 채워지면 여기서 faceFeatures 업데이트
}

function updateHandMeshes({ joints, bones }, pts) {
  if (!pts) return
  pts.forEach((p, i) => joints[i].position.set(...p))
  HAND_CONNECTIONS.forEach(([a, b], i) => updateLimb(bones[i], pts[a], pts[b]))
}

function getFingerForJoint(i) {
  if (i === 0)            return 'palm'
  if (i >= 1  && i <= 4)  return 'thumb'
  if (i >= 5  && i <= 8)  return 'index'
  if (i >= 9  && i <= 12) return 'middle'
  if (i >= 13 && i <= 16) return 'ring'
  return 'pinky'
}

// ─── 컴포넌트 ──────────────────────────────────────────────────────────────
export default function SignAvatar({ pose = POSES.open }) {
  const canvasRef = useRef(null)
  const stateRef  = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const state = initScene(canvas)
    stateRef.current = state
    const { renderer, scene, camera, meshes } = state

    const resize = () => {
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    updateCharacter(meshes, pose)
    renderer.render(scene, camera)

    return () => {
      ro.disconnect()
      state.envMap.dispose()
      renderer.dispose()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!stateRef.current) return
    const { renderer, scene, camera, meshes } = stateRef.current
    updateCharacter(meshes, pose)
    renderer.render(scene, camera)
  }, [pose])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full rounded-2xl"
      style={{ display: 'block' }}
    />
  )
}
