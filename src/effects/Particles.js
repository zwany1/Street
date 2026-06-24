import * as THREE from 'three';
import { CONFIG } from '../config.js';

export class ParticleSystem {
  constructor() {
    const { count, size, opacity } = CONFIG.PARTICLES;
    const colors = [CONFIG.PALETTE.purple, CONFIG.PALETTE.pink, CONFIG.PALETTE.cyan];

    this.geometry = new THREE.BufferGeometry();
    this.count = count;

    // 位置和速度
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const particleColors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 80;
      positions[i * 3 + 1] = Math.random() * 60;
      positions[i * 3 + 2] = -Math.random() * 700;

      velocities[i * 3] = (Math.random() - 0.5) * 0.08;
      velocities[i * 3 + 1] = -1.2 - Math.random() * 1.5;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.08;

      const color = new THREE.Color(colors[i % colors.length]);
      particleColors[i * 3] = color.r;
      particleColors[i * 3 + 1] = color.g;
      particleColors[i * 3 + 2] = color.b;
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

    const material = new THREE.PointsMaterial({
      size,
      transparent: true,
      opacity,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.particles = new THREE.Points(this.geometry, material);
  }

  update(deltaTime) {
    const positions = this.geometry.attributes.position.array;
    const velocities = this.geometry.attributes.velocity.array;

    for (let i = 0; i < this.count; i++) {
      positions[i * 3] += velocities[i * 3] * deltaTime;
      positions[i * 3 + 1] += velocities[i * 3 + 1] * deltaTime;
      positions[i * 3 + 2] += velocities[i * 3 + 2] * deltaTime;

      // 重置超出边界的粒子
      if (positions[i * 3 + 1] < 0) {
        positions[i * 3 + 1] = 60;
        positions[i * 3 + 2] = -Math.random() * 700;
      }
    }

    this.geometry.attributes.position.needsUpdate = true;
  }

  getMesh() {
    return this.particles;
  }
}
