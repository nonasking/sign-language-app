import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { VRMUtils } from '@pixiv/three-vrm'
import { POSES } from '../utils/handPoses'
import { loadVRM, DEFAULT_VRM_URL } from '../utils/vrmLoader'
import { applyPoseToVRM } from '../utils/poseToVRM'
import { applyHandPoseToVRM } from '../utils/handPoseToVRM'

function initScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.outputColorSpace = THREE.SRGBColorSpace

  const scene = new THREE.Scene()

  const pmrem = new THREE.PMREMGenerator(renderer)
  const envMap = pmrem.fromScene(new RoomEnvironment()).texture
  scene.environment = envMap
  scene.environmentIntensity = 0.55
  pmrem.dispose()

  const w = canvas.clientWidth || 400
  const h = canvas.clientHeight || 300
  const camera = new THREE.PerspectiveCamera(30, w / h, 0.01, 100)
  // 임시 위치 — VRM 로드 후 fitCameraToUpperBody 로 신장에 맞춰 재배치
  camera.position.set(0, 1.4, 1.5)
  camera.lookAt(0, 1.3, 0)

  // 조명
  scene.add(new THREE.AmbientLight(0xffffff, 0.5))

  const key = new THREE.DirectionalLight(0xfff3df, 1.0)
  key.position.set(1.6, 3.2, 2.0)
  key.castShadow = true
  key.shadow.mapSize.set(1024, 1024)
  key.shadow.camera.left   = -1.5
  key.shadow.camera.right  =  1.5
  key.shadow.camera.top    =  2.5
  key.shadow.camera.bottom = -0.5
  key.shadow.camera.near   = 0.1
  key.shadow.camera.far    = 10
  key.shadow.bias = -0.001
  scene.add(key)

  const fill = new THREE.DirectionalLight(0xa8d0ff, 0.32)
  fill.position.set(-2.2, 0.8, 1.2)
  scene.add(fill)

  const rim = new THREE.DirectionalLight(0xffffff, 0.40)
  rim.position.set(0, 2.2, -2.6)
  scene.add(rim)

  return { renderer, scene, camera, envMap }
}

// VRM 본 위치 + 팔 길이로 카메라 자동 배치.
// 손이 위/아래/양옆으로 도달 가능한 영역 전체가 frustum 안에 들어오도록 fit.
// 시점은 살짝 아래에서 위를 보도록 기울여 가슴 앞 손바닥 각도가 잘 보이게 한다.
function fitCameraToUpperBody(camera, controls, vrm) {
  const head = vrm.humanoid?.getNormalizedBoneNode('head')
  const hips = vrm.humanoid?.getNormalizedBoneNode('hips')
  const shoulder = vrm.humanoid?.getNormalizedBoneNode('rightUpperArm')
  const hand = vrm.humanoid?.getNormalizedBoneNode('rightHand')
  if (!head || !hips || !shoulder || !hand) return

  vrm.scene.updateMatrixWorld(true)
  const headPos     = new THREE.Vector3().setFromMatrixPosition(head.matrixWorld)
  const hipsPos     = new THREE.Vector3().setFromMatrixPosition(hips.matrixWorld)
  const shoulderPos = new THREE.Vector3().setFromMatrixPosition(shoulder.matrixWorld)
  const handPos     = new THREE.Vector3().setFromMatrixPosition(hand.matrixWorld)
  const armLen = shoulderPos.distanceTo(handPos)

  // 손 도달 가능 범위: 위로 머리+팔, 아래로 골반-팔, 옆으로 어깨+팔
  const topY    = headPos.y + armLen * 0.5
  const bottomY = hipsPos.y - armLen * 0.4
  const halfW   = Math.abs(shoulderPos.x) + armLen * 0.9

  const framedH = topY - bottomY
  const focusY  = (topY + bottomY) / 2

  const fovRad = camera.fov * Math.PI / 180
  const distV = (framedH / 2) / Math.tan(fovRad / 2)
  const distH = halfW / Math.tan(fovRad / 2 * camera.aspect)
  const dist  = Math.max(distV, distH) * 1.05

  // look-up: 카메라를 focus 보다 살짝 아래에 두고 target 은 focus 그대로
  const camY = focusY - framedH * 0.08
  camera.position.set(0, camY, dist)

  if (controls) {
    controls.target.set(0, focusY, 0)
    controls.minDistance = dist * 0.5
    controls.maxDistance = dist * 2.5
    controls.update()
  } else {
    camera.lookAt(0, focusY, 0)
  }
  camera.updateProjectionMatrix()
}

export default function SignAvatar({ pose = POSES.open }) {
  const canvasRef = useRef(null)
  const stateRef  = useRef(null)
  const vrmRef    = useRef(null)
  const poseRef   = useRef(pose)
  const [status, setStatus] = useState('loading') // 'loading' | 'ready' | 'error'

  // 항상 최신 pose를 RAF에서 읽도록 ref 동기화
  poseRef.current = pose

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const state = initScene(canvas)
    stateRef.current = state
    const { renderer, scene, camera } = state

    const controls = new OrbitControls(camera, canvas)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.enablePan = false
    controls.minPolarAngle = Math.PI * 0.20
    controls.maxPolarAngle = Math.PI * 0.80
    controls.target.set(0, 1.3, 0)

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

    let raf = 0
    let cancelled = false
    const clock = new THREE.Clock()

    const tick = () => {
      if (cancelled) return
      const delta = clock.getDelta()
      const vrm = vrmRef.current
      const p = poseRef.current
      if (vrm && p) {
        applyPoseToVRM(vrm, p.pose)
        // fullPose 의 left/right 는 화면(viewer) 시점이고, VRM 본의 left/right 는 캐릭터 본인 시점이라 정반대.
        if (p.rightHand) applyHandPoseToVRM(vrm, 'left',  p.rightHand)
        if (p.leftHand)  applyHandPoseToVRM(vrm, 'right', p.leftHand)
        vrm.update(delta)
      }
      controls.update()
      renderer.render(scene, camera)
      raf = requestAnimationFrame(tick)
    }

    loadVRM(DEFAULT_VRM_URL)
      .then((vrm) => {
        if (cancelled) return
        vrmRef.current = vrm
        scene.add(vrm.scene)
        // 그림자 설정
        vrm.scene.traverse((obj) => {
          if (obj.isMesh) {
            obj.castShadow = true
            obj.receiveShadow = true
          }
        })
        fitCameraToUpperBody(camera, controls, vrm)
        setStatus('ready')
        raf = requestAnimationFrame(tick)
      })
      .catch((err) => {
        console.error('[SignAvatar] VRM 로드 실패:', err)
        setStatus('error')
      })

    return () => {
      cancelled = true
      if (raf) cancelAnimationFrame(raf)
      ro.disconnect()
      controls.dispose()
      const vrm = vrmRef.current
      if (vrm) {
        scene.remove(vrm.scene)
        VRMUtils.deepDispose(vrm.scene)
      }
      vrmRef.current = null
      state.envMap.dispose()
      renderer.dispose()
    }
  }, [])

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full rounded-2xl"
        style={{ display: 'block' }}
      />
      {status !== 'ready' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="px-4 py-2 rounded-lg bg-slate-800/70 backdrop-blur text-slate-300 text-sm">
            {status === 'loading' ? '아바타 준비 중…' : '아바타 로드 실패'}
          </div>
        </div>
      )}
    </div>
  )
}
