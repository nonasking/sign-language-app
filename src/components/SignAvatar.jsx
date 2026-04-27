import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { HAND_CONNECTIONS, CONNECTION_FINGER_MAP, FINGER_COLORS, OPEN } from '../utils/handPoses'

const JOINT_RADIUS   = 0.022
const BONE_RADIUS    = 0.010
const SCALE          = 1.4

function hexToColor(hex) {
  return new THREE.Color(hex)
}

function buildScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  const scene = new THREE.Scene()

  const w = canvas.clientWidth
  const h = canvas.clientHeight
  const camera = new THREE.PerspectiveCamera(42, w / h, 0.01, 100)
  camera.position.set(0, 0.15, 2.2)
  camera.lookAt(0, 0.15, 0)

  // Lighting
  const ambient = new THREE.AmbientLight(0xffffff, 0.6)
  scene.add(ambient)

  const dir = new THREE.DirectionalLight(0xffffff, 1.0)
  dir.position.set(1, 2, 2)
  dir.castShadow = true
  scene.add(dir)

  const fill = new THREE.DirectionalLight(0x8ab4f8, 0.4)
  fill.position.set(-1, 0, 1)
  scene.add(fill)

  // Joint spheres (21)
  const jointMeshes = []
  for (let i = 0; i < 21; i++) {
    const geo = new THREE.SphereGeometry(JOINT_RADIUS, 12, 12)
    const finger = getFingerForJoint(i)
    const mat = new THREE.MeshStandardMaterial({
      color: hexToColor(FINGER_COLORS[finger]),
      roughness: 0.35,
      metalness: 0.1,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.castShadow = true
    scene.add(mesh)
    jointMeshes.push(mesh)
  }

  // Bone cylinders (one per connection)
  const boneMeshes = []
  for (let i = 0; i < HAND_CONNECTIONS.length; i++) {
    const finger = CONNECTION_FINGER_MAP[i]
    const geo = new THREE.CylinderGeometry(BONE_RADIUS, BONE_RADIUS, 1, 8)
    const mat = new THREE.MeshStandardMaterial({
      color: hexToColor(FINGER_COLORS[finger]),
      roughness: 0.5,
      metalness: 0.05,
      transparent: true,
      opacity: 0.85,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.castShadow = true
    scene.add(mesh)
    boneMeshes.push(mesh)
  }

  return { renderer, scene, camera, jointMeshes, boneMeshes }
}

function getFingerForJoint(i) {
  if (i === 0)                return 'palm'
  if (i >= 1  && i <= 4)  return 'thumb'
  if (i >= 5  && i <= 8)  return 'index'
  if (i >= 9  && i <= 12) return 'middle'
  if (i >= 13 && i <= 16) return 'ring'
  return 'pinky'
}

function updateMeshes(landmarks, jointMeshes, boneMeshes) {
  if (!landmarks) return

  const pts = landmarks.map(([x, y, z]) =>
    new THREE.Vector3(x * SCALE, y * SCALE, z * SCALE)
  )

  // Update joints
  pts.forEach((pt, i) => {
    jointMeshes[i].position.copy(pt)
  })

  // Update bones
  HAND_CONNECTIONS.forEach(([a, b], i) => {
    const start = pts[a]
    const end   = pts[b]

    const mid    = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)
    const length = start.distanceTo(end)
    const dir    = new THREE.Vector3().subVectors(end, start).normalize()

    boneMeshes[i].position.copy(mid)
    boneMeshes[i].scale.set(1, length, 1)

    // Orient cylinder (default axis is Y)
    boneMeshes[i].quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
  })
}

export default function SignAvatar({ landmarks = OPEN }) {
  const canvasRef = useRef(null)
  const sceneRef  = useRef(null)
  const rafRef    = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = buildScene(canvas)
    sceneRef.current = ctx

    const { renderer, scene, camera } = ctx

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

    // Initial render
    updateMeshes(landmarks, ctx.jointMeshes, ctx.boneMeshes)
    renderer.render(scene, camera)

    return () => {
      ro.disconnect()
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      renderer.dispose()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Update landmarks on every change
  useEffect(() => {
    if (!sceneRef.current) return
    const { renderer, scene, camera, jointMeshes, boneMeshes } = sceneRef.current
    updateMeshes(landmarks, jointMeshes, boneMeshes)
    renderer.render(scene, camera)
  }, [landmarks])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full rounded-2xl"
      style={{ display: 'block' }}
    />
  )
}
