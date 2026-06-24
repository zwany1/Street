import * as THREE from 'three';
import { CONFIG } from '../config.js';

export class HoloBillboard {
  constructor() {
    this.group = new THREE.Group();
    this.create();
    this.group.position.set(0, 8, -80);
  }

  create() {
    const { purple, pink, cyan } = CONFIG.PALETTE;

    // 外框
    const frameGeo = new THREE.TorusGeometry(3.5, 0.08, 16, 64);
    const frameMat = new THREE.MeshBasicMaterial({
      color: cyan,
      transparent: true,
      opacity: 0.9
    });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.rotation.x = Math.PI / 2;
    this.group.add(frame);

    // 内部发光面板
    const panelGeo = new THREE.CircleGeometry(3.2, 64);
    const panelMat = new THREE.MeshBasicMaterial({
      color: purple,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide
    });
    const panel = new THREE.Mesh(panelGeo, panelMat);
    panel.rotation.x = Math.PI / 2;
    this.group.add(panel);

    // 中心光环
    const ringGeo = new THREE.TorusGeometry(1.5, 0.05, 16, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: pink });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    this.group.add(ring);

    // 添加聚光灯
    const spotLight = new THREE.SpotLight(cyan, 20, 50, Math.PI / 6, 0.5, 2);
    spotLight.position.set(0, 10, 0);

    // 创建独立的 target 对象
    const target = new THREE.Object3D();
    target.position.set(0, 0, 0);
    spotLight.target = target;

    this.group.add(spotLight);
    this.group.add(target);

    this.spotLight = spotLight;
  }

  update(time) {
    this.group.rotation.y = time * 0.3;
    this.group.position.y = 8 + Math.sin(time * 0.5) * 0.5;
  }

  getGroup() {
    return this.group;
  }
}
