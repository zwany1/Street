import * as THREE from 'three';
import { CONFIG } from '../config.js';

export class VolumetricLight {
  constructor() {
    this.pillars = [];
    this.group = new THREE.Group();
    this.colors = [CONFIG.PALETTE.purple, CONFIG.PALETTE.pink, CONFIG.PALETTE.cyan];
    this.generate();
  }

  generate() {
    for (let i = 0; i < 8; i++) {
      const pillarGeo = new THREE.CylinderGeometry(0.4, 1.5, 20, 16, 1, true);
      const color = this.colors[i % this.colors.length];
      const pillarMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.06,
        side: THREE.DoubleSide,
        depthWrite: false
      });

      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(
        (i % 2 ? 1 : -1) * (5 + Math.random() * 3),
        10,
        -20 - i * 80
      );
      pillar.rotation.x = Math.PI;

      this.group.add(pillar);
      this.pillars.push({
        mesh: pillar,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  update(time) {
    // 每 2 帧更新 opacity/rotation，减少 per-frame material 写入
    if (Math.floor(time * 60) % 2 !== 0) return;
    this.pillars.forEach((p) => {
      p.mesh.material.opacity = 0.05 + Math.sin(time * 0.6 + p.phase) * 0.03;
      p.mesh.rotation.y = time * 0.08 + p.phase;
    });
  }

  getGroup() {
    return this.group;
  }
}
