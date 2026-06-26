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

    // 平滑飞行动画状态
    this._flyActive = false;
    this._flyTarget = 0;
    this._flySpeed = 0;

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

  /** 平滑飞行到指定 progress，途中禁用滚动干扰 */
  smoothScrollTo(targetProgress) {
    this._flyTarget = THREE.MathUtils.clamp(targetProgress, 0, 0.999);
    this._flyActive = true;
    this._flySpeed = 0;
  }

  /** 外部查询：是否正在执行平滑飞行 */
  isFlying() {
    return this._flyActive;
  }

  /** 取消正在进行中的平滑飞行 */
  cancelFly() {
    this._flyActive = false;
  }

  update(time) {
    // --- 平滑飞行模式：ease-out 缓动覆盖 progress ---
    if (this._flyActive) {
      this._flySpeed += (this._flyTarget - this.progress) * 0.035;
      this._flySpeed *= 0.82; // 阻尼减速
      this.progress += this._flySpeed;
      this.targetProgress = this.progress;

      // 收敛判定（足够接近且速度足够小）
      if (Math.abs(this.progress - this._flyTarget) < 0.0004 && Math.abs(this._flySpeed) < 0.00004) {
        this.progress = this._flyTarget;
        this.targetProgress = this._flyTarget;
        this._flyActive = false;
      }
    } else {
      // 正常模式：scroll 驱动的 lerp
      this.progress += (this.targetProgress - this.progress) * 0.04;
    }

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
