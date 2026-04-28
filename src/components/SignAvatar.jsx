import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import {
  HAND_CONNECTIONS, CONNECTION_FINGER_MAP, FINGER_COLORS, POSES,
} from '../utils/handPoses'
import { getWorldHandPoints, HAND_SCALE } from '../utils/poseFormat'

// ─── 상수 ──────────────────────────────────────────────────────────────────
const JOINT_R  = 0.016 * HAND_SCALE / 0.28   // 손 관절 구체 반지름
const BONE_R   = 0.007 * HAND_SCALE / 0.28   // 손 뼈대 실린더 반지름
const ARM_R    = 0.055                        // 위팔 반지름
const FOREARM_R = 0.044                       // 아래팔 반지름
const HEAD_R   = 0.18

const SKIN = 0xFDB8A0
const CLOTH = 0x2563EB
const EYE  = 0x0F172A

// ─── 헬퍼 ──────────────────────────────────────────────────────────────────
function makeMat(color, roughness = 0.55, metalness = 0.05) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness })
}

function makeSphere(r, mat, segments = 12) {
  return new THREE.Mesh(new THREE.SphereGeometry(r, segments, segments), mat)
}

function makeCylinder(r, mat) {
  const geo = new THREE.CylinderGeometry(r, r, 1, 10)
  return new THREE.Mesh(geo, mat)
}

function updateLimb(mesh, a, b) {
  const va = new THREE.Vector3(...a)
  const vb = new THREE.Vector3(...b)
  const mid = va.clone().add(vb).multiplyScalar(0.5)
  const len = va.distanceTo(vb)
  const dir = vb.clone().sub(va).normalize()
  mesh.position.copy(mid)
  mesh.scale.set(1, Math.max(len, 0.001), 1)
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
}

function midpoint(a, b) {
  return [(a[0]+b[0])/2, (a[1]+b[1])/2, (a[2]+b[2])/2]
}

// ─── 씬 초기화 ─────────────────────────────────────────────────────────────
function initScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  const scene = new THREE.Scene()

  const w = canvas.clientWidth || 400
  const h = canvas.clientHeight || 300
  const camera = new THREE.PerspectiveCamera(50, w / h, 0.01, 100)
  camera.position.set(0, 0.6, 2.6)
  camera.lookAt(0, 0.6, 0)

  // 조명
  scene.add(new THREE.AmbientLight(0xffffff, 0.55))
  const sun = new THREE.DirectionalLight(0xffffff, 1.0)
  sun.position.set(1.5, 3, 2)
  sun.castShadow = true
  scene.add(sun)
  const fill = new THREE.DirectionalLight(0x8ab4f8, 0.35)
  fill.position.set(-2, 0, 1)
  scene.add(fill)
  const back = new THREE.DirectionalLight(0xffffff, 0.2)
  back.position.set(0, 1, -2)
  scene.add(back)

  const skinMat   = makeMat(SKIN,  0.7)
  const clothMat  = makeMat(CLOTH, 0.5)
  const eyeMat    = makeMat(EYE,   0.3)
  const mouthMat  = makeMat(0xB91C1C, 0.5)

  // ── 머리 그룹 (표정 확장 포인트) ──────────────────────────────────────
  const headGroup = new THREE.Group()
  scene.add(headGroup)

  const headMesh = makeSphere(HEAD_R, skinMat, 16)
  headGroup.add(headMesh)

  const eyeL = makeSphere(0.026, eyeMat, 8)
  eyeL.position.set(-0.072, 0.042, 0.162)
  headGroup.add(eyeL)

  const eyeR = makeSphere(0.026, eyeMat, 8)
  eyeR.position.set( 0.072, 0.042, 0.162)
  headGroup.add(eyeR)

  // 입 — 추후 표정 애니메이션 포인트
  const mouth = new THREE.Mesh(
    new THREE.BoxGeometry(0.09, 0.018, 0.012),
    mouthMat
  )
  mouth.position.set(0, -0.065, 0.168)
  headGroup.add(mouth)

  // 머리카락 캡 (머리 위쪽 절반을 덮는 구체)
  const hairMat = makeMat(0x2D1B0E, 0.8)
  const hair = makeSphere(HEAD_R * 1.02, hairMat, 14)
  hair.scale.set(1, 0.55, 1)
  hair.position.y = HEAD_R * 0.48
  headGroup.add(hair)

  // ── 몸통 (정적) ───────────────────────────────────────────────────────
  const torso = new THREE.Mesh(
    new THREE.CylinderGeometry(0.20, 0.16, 0.82, 12),
    clothMat
  )
  torso.position.set(0, 0.42, 0)
  torso.castShadow = true
  scene.add(torso)

  // ── 관절 구체 ─────────────────────────────────────────────────────────
  const shoulderL = makeSphere(0.068, clothMat)
  const shoulderR = makeSphere(0.068, clothMat)
  const elbowL    = makeSphere(0.052, skinMat)
  const elbowR    = makeSphere(0.052, skinMat)
  const wristL    = makeSphere(0.038, skinMat)
  const wristR    = makeSphere(0.038, skinMat)
  ;[shoulderL, shoulderR, elbowL, elbowR, wristL, wristR].forEach(m => scene.add(m))

  // ── 팔 실린더 ─────────────────────────────────────────────────────────
  const neckMesh    = makeCylinder(0.062, skinMat)
  const clavicleL   = makeCylinder(0.040, clothMat)
  const clavicleR   = makeCylinder(0.040, clothMat)
  const upperArmL   = makeCylinder(ARM_R, skinMat)
  const upperArmR   = makeCylinder(ARM_R, skinMat)
  const forearmL    = makeCylinder(FOREARM_R, skinMat)
  const forearmR    = makeCylinder(FOREARM_R, skinMat)
  ;[neckMesh, clavicleL, clavicleR, upperArmL, upperArmR, forearmL, forearmR]
    .forEach(m => { m.castShadow = true; scene.add(m) })

  // ── 손 관절 + 뼈대 (양손) ─────────────────────────────────────────────
  function buildHand(isLeft) {
    const joints = []
    for (let i = 0; i < 21; i++) {
      const finger = getFingerForJoint(i)
      const mat = makeMat(FINGER_COLORS[finger], 0.35, 0.1)
      const m = makeSphere(JOINT_R, mat, 8)
      scene.add(m)
      joints.push(m)
    }
    const bones = HAND_CONNECTIONS.map((_, i) => {
      const finger = CONNECTION_FINGER_MAP[i]
      const mat = makeMat(FINGER_COLORS[finger], 0.5, 0.05)
      mat.transparent = true
      mat.opacity = 0.85
      const m = makeCylinder(BONE_R, mat)
      scene.add(m)
      return m
    })
    return { joints, bones }
  }

  const rightHand = buildHand(false)
  const leftHand  = buildHand(true)

  return {
    renderer, scene, camera,
    meshes: {
      headGroup, shoulderL, shoulderR,
      elbowL, elbowR, wristL, wristR,
      neckMesh, clavicleL, clavicleR,
      upperArmL, upperArmR, forearmL, forearmR,
      rightHand, leftHand,
    },
  }
}

// ─── 메시 업데이트 ──────────────────────────────────────────────────────────
function updateCharacter(meshes, fullPose) {
  const {
    head,
    leftShoulder, rightShoulder,
    leftElbow,    rightElbow,
    leftWrist,    rightWrist,
  } = fullPose.pose

  // 머리
  meshes.headGroup.position.set(...head)

  // 관절 구체 위치
  meshes.shoulderL.position.set(...leftShoulder)
  meshes.shoulderR.position.set(...rightShoulder)
  meshes.elbowL.position.set(...leftElbow)
  meshes.elbowR.position.set(...rightElbow)
  meshes.wristL.position.set(...leftWrist)
  meshes.wristR.position.set(...rightWrist)

  // 목 + 쇄골
  const neckBase = midpoint(leftShoulder, rightShoulder)
  updateLimb(meshes.neckMesh,  neckBase,      head)
  updateLimb(meshes.clavicleL, neckBase,      leftShoulder)
  updateLimb(meshes.clavicleR, neckBase,      rightShoulder)

  // 팔
  updateLimb(meshes.upperArmL, leftShoulder,  leftElbow)
  updateLimb(meshes.forearmL,  leftElbow,     leftWrist)
  updateLimb(meshes.upperArmR, rightShoulder, rightElbow)
  updateLimb(meshes.forearmR,  rightElbow,    rightWrist)

  // 손
  updateHandMeshes(meshes.rightHand, getWorldHandPoints(rightWrist, fullPose.rightHand))
  updateHandMeshes(meshes.leftHand,  getWorldHandPoints(leftWrist,  fullPose.leftHand))
}

function updateHandMeshes({ joints, bones }, worldPts) {
  if (!worldPts) return
  worldPts.forEach((pt, i) => joints[i].position.set(...pt))
  HAND_CONNECTIONS.forEach(([a, b], i) => updateLimb(bones[i], worldPts[a], worldPts[b]))
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
