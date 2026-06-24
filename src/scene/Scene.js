import * as THREE from 'three';
import { CONFIG } from '../config.js';

export class SceneManager {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(
      CONFIG.SCENE.fogColor,
      CONFIG.SCENE.fogDensity
    );

    // 背景色跟随雾色（避免纯黑背景导致玻璃“漂浮/发黑”）
    this.scene.background = new THREE.Color(CONFIG.SCENE.fogColor);

    this.setupLights();
    this.setupGround();
  }

  setupLights() {
    // 环境光：冷蓝月光/城市夜光
    const ambient = new THREE.AmbientLight(0x8fb2ff, 0.22);
    this.scene.add(ambient);

    // 主方向光：更冷的白蓝调，用于整体反射与阴影
    const mainLight = new THREE.DirectionalLight(0xd6e6ff, 0.35);
    mainLight.position.set(30, 60, 40);
    mainLight.castShadow = true;
    mainLight.shadow.camera.left = -60;
    mainLight.shadow.camera.right = 60;
    mainLight.shadow.camera.top = 60;
    mainLight.shadow.camera.bottom = -60;
    mainLight.shadow.mapSize.width = CONFIG.RENDERER.shadowMapSize;
    mainLight.shadow.mapSize.height = CONFIG.RENDERER.shadowMapSize;
    this.scene.add(mainLight);

    // 立面洗墙光（SpotLight）：冷蓝/冷白，匹配玻璃幕墙反射
    // 数量控制：2 盏，避免性能/阴影过重（不投影，只照亮）
    const wall1 = new THREE.SpotLight(0x9fdcff, 0.9, 220, Math.PI * 0.18, 0.6, 1.0);
    wall1.position.set(-28, 16, -120);
    wall1.target.position.set(-10, 14, -220);
    wall1.castShadow = false;
    this.scene.add(wall1);
    this.scene.add(wall1.target);

    const wall2 = new THREE.SpotLight(0xeaf3ff, 0.75, 220, Math.PI * 0.18, 0.6, 1.0);
    wall2.position.set(28, 16, -160);
    wall2.target.position.set(10, 14, -260);
    wall2.castShadow = false;
    this.scene.add(wall2);
    this.scene.add(wall2.target);
  }

  setupGround() {
    const groundGeo = new THREE.PlaneGeometry(110, 860);

    // 雨后地面：更低粗糙度 + 更强反射倾向（不做 Reflector，先用材质把氛围做出来）
    const groundMat = new THREE.MeshPhysicalMaterial({
      color: 0x05060a,
      metalness: 0.85,
      roughness: 0.18,
      clearcoat: 0.7,
      clearcoatRoughness: 0.22,
      envMapIntensity: 1.7
    });

    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.z = -360;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // 道路两侧冷蓝导视灯带（细线条）
    const roadZ0 = 40;
    const roadZ1 = -780;
    const roadHalfW = 14.5;

    const lineMat = new THREE.LineBasicMaterial({
      color: 0x9fdcff,
      transparent: true,
      opacity: 0.55
    });

    const makeLine = (x) => {
      const pts = [
        new THREE.Vector3(x, 0.02, roadZ0),
        new THREE.Vector3(x, 0.02, roadZ1)
      ];
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(geo, lineMat);
      this.scene.add(line);
    };

    makeLine(-roadHalfW);
    makeLine(roadHalfW);

    // 十字路口（放在相机中段 z≈-200）：横向道路 + 横向灯带 + 轻量补光
    const crossZ = -205;
    const crossHalfW = 52;

    const crossMakeLine = (z) => {
      const pts = [
        new THREE.Vector3(-crossHalfW, 0.022, z),
        new THREE.Vector3(crossHalfW, 0.022, z)
      ];
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(geo, lineMat);
      this.scene.add(line);
    };

    // 横向两条边界线（与纵向一致的“细线条”语言）
    crossMakeLine(crossZ - 9.5);
    crossMakeLine(crossZ + 9.5);

    // 路口地面微亮片区（让十字路口“出现”）
    const crossPad = new THREE.Mesh(
      new THREE.PlaneGeometry(crossHalfW * 2, 26),
      new THREE.MeshPhysicalMaterial({
        color: 0x070a12,
        metalness: 0.8,
        roughness: 0.2,
        clearcoat: 0.65,
        clearcoatRoughness: 0.22,
        envMapIntensity: 1.6
      })
    );
    crossPad.rotation.x = -Math.PI / 2;
    crossPad.position.set(0, 0.01, crossZ);
    crossPad.receiveShadow = true;
    this.scene.add(crossPad);

    // 冷白补光：让路口附近立面更“读得出”（不投影）
    const crossLight = new THREE.SpotLight(0xeaf3ff, 0.55, 180, Math.PI * 0.22, 0.7, 1.0);
    crossLight.position.set(0, 22, crossZ + 22);
    crossLight.target.position.set(0, 6, crossZ);
    crossLight.castShadow = false;
    this.scene.add(crossLight);
    this.scene.add(crossLight.target);
  }

  add(object) {
    this.scene.add(object);
  }

  getScene() {
    return this.scene;
  }
}
