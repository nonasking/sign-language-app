import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm'

export const DEFAULT_VRM_URL = '/avatars/default.vrm'

// VRM 1.0 / 0.x 모두 동일 진입점으로 로드
export async function loadVRM(url = DEFAULT_VRM_URL) {
  const loader = new GLTFLoader()
  loader.register((parser) => new VRMLoaderPlugin(parser))

  const gltf = await loader.loadAsync(url)
  const vrm = gltf.userData.vrm
  if (!vrm) throw new Error('VRM payload not found in GLTF userData')

  // 불필요 정점/스켈레톤 정리 — 첫 프레임 이전에 1회 수행
  VRMUtils.removeUnnecessaryVertices(gltf.scene)
  VRMUtils.combineSkeletons(gltf.scene)

  // VRM 1.0: +Z 가 정면. Three.js 카메라(+Z 위치, -Z 시선)에서 정면이 카메라를 향함 — 회전 보정 불필요.
  // VRM 0.x 모델을 사용하면 정면이 -Z 가 되어 뒤를 보일 수 있음. 그 경우 vrm.meta.metaVersion 으로 분기 추가.

  return vrm
}
