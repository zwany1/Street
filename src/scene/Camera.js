import * as THREE from 'three';
import { CONFIG } from '../config.js';

export class CameraController {
  constructor(aspect) {
    const { fov, near, far, initialPosition } = CONFIG.CAMERA;

    this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this.camera.position.set(
      initialPosition.x,
      initialPosition.y,
      initialPosition.z
    );

    // 相机路径（起点前移到 z=50，确保能看到 bldg-*-00 建筑）
    this.path = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 4, 50),
      new THREE.Vector3(-2, 4, 10),
      new THREE.Vector3(2, 4, -30),
      new THREE.Vector3(-1.5, 4.2, -120),
      new THREE.Vector3(3, 4.5, -220),
      new THREE.Vector3(-1, 5, -350),
      new THREE.Vector3(0, 6, -500),
      new THREE.Vector3(0, 7, -650),
    ]);

    // 交互状态
    this.mouseX = 0;
    this.mouseY = 0;
    this.targetMouseX = 0;
    this.targetMouseY = 0;
    this.progress = 0;
    this.targetProgress = 0;

    this.setupMouseInteraction();
  }

  setupMouseInteraction() {
    window.addEventListener('mousemove', (e) => {
      this.targetMouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      this.targetMouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    });
  }

  setProgress(progress) {
    this.targetProgress = THREE.MathUtils.clamp(progress, 0, 0.999);
  }

  update(time) {
    // 平滑相机移动
    this.progress += (this.targetProgress - this.progress) * 0.04;

    const pos = this.path.getPoint(this.progress);
    const look = this.path.getPoint(Math.min(this.progress + 0.03, 1));

    // 鼠标视差
    this.mouseX += (this.targetMouseX - this.mouseX) * 0.05;
    this.mouseY += (this.targetMouseY - this.mouseY) * 0.05;

    this.camera.position.copy(pos);
    this.camera.position.x += this.mouseX * 2 + Math.sin(time * 0.2) * 0.15;
    this.camera.position.y += -this.mouseY * 1.5 + Math.sin(time * 0.4) * 0.08;
    this.camera.lookAt(look);
  }

  getCamera() {
    return this.camera;
  }

  onResize(aspect) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}
