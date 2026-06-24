import * as THREE from 'three';
import { CONFIG } from '../config.js';

export class PointLights {
  constructor() {
    this.lights = [];
    this.group = new THREE.Group();
    this.colors = [CONFIG.PALETTE.purple, CONFIG.PALETTE.pink, CONFIG.PALETTE.cyan];
    this.generate();
  }

  generate() {
    for (let i = 0; i < 18; i++) {
      const color = this.colors[i % this.colors.length];
      const light = new THREE.PointLight(color, 12, 35, 2);

      light.position.set(
        (i % 2 ? 1 : -1) * (6 + Math.random() * 4),
        3 + Math.random() * 5,
        10 - i * 38
      );

      // 所有 PointLight 关闭阴影，阴影由 DirectionalLight 统一负责
      light.castShadow = false;

      this.group.add(light);
      this.lights.push({
        light,
        baseIntensity: 12,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  update(time) {
    // 每 3 帧更新一次，光源闪烁人眼不易察觉高频变化
    if (Math.floor(time * 60) % 3 !== 0) return;
    this.lights.forEach((l) => {
      l.light.intensity = l.baseIntensity + Math.sin(time * 2 + l.phase) * 4;
    });
  }

  getGroup() {
    return this.group;
  }
}
