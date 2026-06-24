import * as THREE from 'three';
import { CONFIG } from '../config.js';

export class NeonSigns {
  constructor() {
    this.signs = [];
    this.group = new THREE.Group();
    this.colors = [CONFIG.PALETTE.purple, CONFIG.PALETTE.pink, CONFIG.PALETTE.cyan];
    this.generate();
  }

  createSign(x, y, z, color, w = 2, h = 0.8) {
    const material = new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 1
    });

    const sign = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
    sign.position.set(x, y, z);
    sign.rotation.y = x > 0 ? -Math.PI / 2 : Math.PI / 2;

    this.group.add(sign);
    this.signs.push({
      mesh: sign,
      baseOpacity: 1,
      phase: Math.random() * Math.PI * 2
    });
  }

  generate() {
    const { signDensity } = CONFIG.SCENE;

    for (let z = 10; z > -680; z -= 12) {
      if (Math.random() < signDensity) {
        const side = Math.random() > 0.5 ? 1 : -1;
        const x = side * (12 + Math.random() * 2);
        const y = 5 + Math.random() * 12;
        const color = this.colors[Math.floor(Math.random() * this.colors.length)];
        const w = 1.5 + Math.random();
        this.createSign(x, y, z, color, w, 0.6);
      }
    }
  }

  update(time) {
    // 每 2 帧更新一次，减少 uniform 写入频率
    if (Math.floor(time * 60) % 2 !== 0) return;
    this.signs.forEach((sign) => {
      sign.mesh.material.opacity = sign.baseOpacity * (0.85 + Math.sin(time * 3 + sign.phase) * 0.15);
    });
  }

  getGroup() {
    return this.group;
  }
}
