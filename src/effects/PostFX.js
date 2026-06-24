import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js';

export class PostProcessing {
  constructor(renderer, scene, camera) {
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));

    this.setupBloom();
    this.setupColorGrade();
    this.setupChromatic();
    this.setupFilm();
    this.setupVignette();
  }

  setupBloom() {
    // Bloom 分辨率减半，降低 GPU 后处理开销
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(
        Math.floor(window.innerWidth / 2),
        Math.floor(window.innerHeight / 2)
      ),
      0.9,   // strength
      0.55,  // radius
      0.82   // threshold
    );
    this.composer.addPass(bloom);
    this.bloom = bloom;
  }

  setupColorGrade() {
    const ColorGradeShader = {
      uniforms: {
        tDiffuse: { value: null },
        uShadowTint: { value: new THREE.Color(0x0a0f1a) },
        // 高光从紫偏移到冷白蓝，更贴合玻璃幕墙
        uHighlightTint: { value: new THREE.Color(0xeaf3ff) },
        uStrength: { value: 0.18 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform vec3 uShadowTint;
        uniform vec3 uHighlightTint;
        uniform float uStrength;
        varying vec2 vUv;

        void main() {
          vec4 col = texture2D(tDiffuse, vUv);
          float luma = dot(col.rgb, vec3(0.299, 0.587, 0.114));
          vec3 tint = mix(uShadowTint, uHighlightTint, smoothstep(0.0, 1.0, luma));
          col.rgb = mix(col.rgb, col.rgb * tint, uStrength);
          gl_FragColor = col;
        }
      `
    };
    this.composer.addPass(new ShaderPass(ColorGradeShader));
  }

  setupChromatic() {
    const ChromaticShader = {
      uniforms: {
        tDiffuse: { value: null },
        // 轻微色散即可，过强会显得“故障感”太重
        uAmount: { value: 0.0012 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float uAmount;
        varying vec2 vUv;
        void main() {
          vec2 dir = vUv - 0.5;
          float d = uAmount * dot(dir, dir) * 4.0;
          float r = texture2D(tDiffuse, vUv - dir * d).r;
          float g = texture2D(tDiffuse, vUv).g;
          float b = texture2D(tDiffuse, vUv + dir * d).b;
          gl_FragColor = vec4(r, g, b, 1.0);
        }
      `
    };
    this.composer.addPass(new ShaderPass(ChromaticShader));
  }

  setupFilm() {
    // Film 更轻：保留一点质感，不压暗玻璃
    this.composer.addPass(new FilmPass(0.22, false));
  }

  setupVignette() {
    const VignetteShader = {
      uniforms: {
        tDiffuse: { value: null },
        uDarkness: { value: 1.0 },
        uOffset: { value: 0.9 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float uDarkness;
        uniform float uOffset;
        varying vec2 vUv;

        void main() {
          vec4 col = texture2D(tDiffuse, vUv);
          vec2 uv = vUv - 0.5;
          float vignette = smoothstep(uOffset, uOffset - 0.6, length(uv));
          col.rgb = mix(col.rgb, col.rgb * vignette, uDarkness);
          gl_FragColor = col;
        }
      `
    };
    this.composer.addPass(new ShaderPass(VignetteShader));
  }

  render() {
    this.composer.render();
  }

  onResize(width, height) {
    this.composer.setSize(width, height);
    this.bloom.setSize(width, height);
  }
}
