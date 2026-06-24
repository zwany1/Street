import * as THREE from 'three';
import { CONFIG } from './config.js';
import { SceneManager } from './scene/Scene.js';
import { CameraController } from './scene/Camera.js';
import { Buildings } from './scene/Buildings.js';
import { HoloBillboard } from './scene/HoloBillboard.js';
import { NeonSigns } from './scene/NeonSigns.js';
import { PointLights } from './scene/PointLights.js';
import { ParticleSystem } from './effects/Particles.js';
import { VolumetricLight } from './effects/VolumetricLight.js';
import { PostProcessing } from './effects/PostFX.js';
import { AssetLoader } from './utils/AssetLoader.js';
import { AudioManager } from './utils/AudioManager.js';
import worksData from './data/works.json';

class App {
  constructor() {
    this.clock = new THREE.Clock();
    this.loaderShown = true;
    this.scrollProgress = 0;

    // data
    this.works = worksData.works || [];
    this.sections = worksData.sections || [];
    this.workByBuildingId = new Map();
    this.workBySlug = new Map();

    // interaction
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 300;               // 限制检测距离，远建筑不参与
    this.mouseNDC = new THREE.Vector2(999, 999);
    this.hoveredBuildingId = null;
    this.pinnedBuildingId = null;
    this.activeWorkId = null;
    this._hoverFrame = 0;                   // raycast 帧计数器
    this._hoverInterval = 3;                // 每 3 帧做一次 raycast

    // screen-space pointer (for preview placement)
    this.lastPointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    this.init();
  }

  init() {
    this.setupRenderer();
    this.setupManagers();
    this.setupScene();
    this.setupUI();
    this.setupEvents();
    this.startLoading();
  }

  setupRenderer() {
    const canvas = document.createElement('canvas');
    document.getElementById('app').appendChild(canvas);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: CONFIG.RENDERER.antialias,
      powerPreference: 'high-performance'
    });

    this.renderer.setPixelRatio(CONFIG.RENDERER.pixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.4;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  setupManagers() {
    this.assetLoader = new AssetLoader();
    this.audioManager = new AudioManager();
  }

  setupScene() {
    // 场景
    this.sceneManager = new SceneManager();
    this.scene = this.sceneManager.getScene();

    // 相机
    this.cameraController = new CameraController(window.innerWidth / window.innerHeight);
    this.camera = this.cameraController.getCamera();

    // 建筑（用于 raycast）
    this.buildings = new Buildings();
    this.buildingsGroup = this.buildings.getGroup();
    this.hitboxMeshes = this.buildings.getHitboxMeshes();
    this.scene.add(this.buildingsGroup);

    // 全息广告牌
    this.holoBillboard = new HoloBillboard();
    this.scene.add(this.holoBillboard.getGroup());

    // 霓虹招牌
    this.neonSigns = new NeonSigns();
    this.scene.add(this.neonSigns.getGroup());

    // 点光源
    this.pointLights = new PointLights();
    this.scene.add(this.pointLights.getGroup());

    // 粒子系统
    this.particles = new ParticleSystem();
    this.scene.add(this.particles.getMesh());

    // 体积光
    this.volumetricLight = new VolumetricLight();
    this.scene.add(this.volumetricLight.getGroup());

    // 后处理
    this.postProcessing = new PostProcessing(this.renderer, this.scene, this.camera);
  }

  setupUI() {
    // 建索引
    for (const w of this.works) {
      if (w?.buildingId) this.workByBuildingId.set(w.buildingId, w);
      if (w?.slug) this.workBySlug.set(w.slug, w);
    }

    // 自定义光标：用 transform 而非 left/top，避免每次 mousemove 触发 layout 重排
    const cursor = document.getElementById('custom-cursor');
    window.addEventListener('mousemove', (e) => {
      cursor.style.transform = `translate(${e.clientX - 4}px, ${e.clientY - 4}px)`;
    }, { passive: true });

    // Work preview (image / video)
    this.workPreviewEl    = document.getElementById('work-preview');
    this.workPreviewImgEl = document.getElementById('work-preview-img');
    this.workPreviewVidEl = document.getElementById('work-preview-video');
    this._currentMediaSrc = null;

    // 播放 / 暂停按钮
    const playBtn   = document.getElementById('play-btn');
    const playIcon  = document.getElementById('play-icon');
    const pauseIcon = document.getElementById('pause-icon');
    if (playBtn && this.workPreviewVidEl) {
      playBtn.addEventListener('click', () => {
        const vid = this.workPreviewVidEl;
        if (vid.paused) {
          vid.play().catch(() => {});
          playIcon.style.display  = 'none';
          pauseIcon.style.display = '';
        } else {
          vid.pause();
          playIcon.style.display  = '';
          pauseIcon.style.display = 'none';
        }
      });
      // 视频结束循环时保持 pause 图标
      this.workPreviewVidEl.addEventListener('play',  () => {
        playIcon.style.display  = 'none';
        pauseIcon.style.display = '';
      });
      this.workPreviewVidEl.addEventListener('pause', () => {
        playIcon.style.display  = '';
        pauseIcon.style.display = 'none';
      });
    }

  } // setupUI end

  setupEvents() {
    // 鼠标 → NDC（raycast） + 记录屏幕坐标（用于卡片跟随建筑投影点）
    window.addEventListener('mousemove', (e) => {
      this.mouseNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
      this.lastPointer = { x: e.clientX, y: e.clientY };
    }, { passive: true });

    // 滚动（段落时间轴）
    window.addEventListener('scroll', () => {
      const maxScroll = document.body.scrollHeight - window.innerHeight;
      this.scrollProgress = maxScroll > 0 ? (window.scrollY / maxScroll) : 0;
      this.scrollProgress = THREE.MathUtils.clamp(this.scrollProgress, 0, 1);

      // 仍然驱动相机（保持你已有的 path 逻辑）
      this.cameraController.setProgress(this.scrollProgress);

      // NOTE: 段落时间轴不再驱动卡片展示（只保留相机/进度等）

      // 标题淡出
      const titleEl = document.getElementById('title');
      if (titleEl) {
        titleEl.style.opacity = Math.max(0, 1 - this.scrollProgress * 3);
      }

      // 进度条
      const progressEl = document.getElementById('progress');
      if (progressEl) {
        progressEl.style.width = (this.scrollProgress * 100) + '%';
      }
    }, { passive: true });

    // 点击建筑：锁定/解锁预览（用 raycast 命中结果）
    window.addEventListener('pointerdown', (e) => {
      this.lastPointer = { x: e.clientX, y: e.clientY };

      this.raycaster.setFromCamera(this.mouseNDC, this.camera);
      const intersects = this.raycaster.intersectObjects(this.hitboxMeshes, false);
      const buildingId = intersects[0]?.object?.userData?.buildingId || null;

      if (!buildingId) {
        this.pinnedBuildingId = null;
        this.hideWorkPreview();
        return;
      }

      if (this.pinnedBuildingId === buildingId) {
        this.pinnedBuildingId = null;
        if (!this.hoveredBuildingId) this.hideWorkPreview();
        return;
      }

      this.pinnedBuildingId = buildingId;
      const work = this.workByBuildingId.get(buildingId);
      if (work) {
        this.setActiveWork(work);
        this.showWorkPreviewAt(this.lastPointer.x, this.lastPointer.y);
      }
    });

    // 响应式
    window.addEventListener('resize', () => {
      const aspect = window.innerWidth / window.innerHeight;
      this.cameraController.onResize(aspect);
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.postProcessing.onResize(window.innerWidth, window.innerHeight);
    });

    // 音频初始化（用户交互后）
    const initAudio = () => {
      this.audioManager.init();
      window.removeEventListener('click', initAudio);
      window.removeEventListener('touchstart', initAudio);
    };
    window.addEventListener('click', initAudio);
    window.addEventListener('touchstart', initAudio);
  }

  startLoading() {
    // 模拟加载
    let loadProgress = 0;
    const loaderFill = document.getElementById('loader-fill');

    const loadInterval = setInterval(() => {
      loadProgress += Math.random() * 12 + 5;

      if (loadProgress > 100) {
        loadProgress = 100;
        clearInterval(loadInterval);
        this.onLoadComplete();
      }

      if (loaderFill) {
        loaderFill.style.width = loadProgress + '%';
      }
    }, 100);
  }

  onLoadComplete() {
    console.log('[App] Loading complete, starting animation');
    this.animate();

    // 隐藏加载器
    setTimeout(() => {
      const loader = document.getElementById('loader');
      if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.remove(), 1200);
      }
      this.loaderShown = false;
    }, 800);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const time = this.clock.getElapsedTime();
    const delta = this.clock.getDelta();

    // hover raycast（每帧）
    this.updateHover();

    // 更新场景对象
    this.cameraController.update(time);
    this.holoBillboard.update(time);
    this.neonSigns.update(time);
    this.pointLights.update(time);
    this.particles.update(delta);
    this.volumetricLight.update(time);

    // 渲染
    this.postProcessing.render();
  }


  // --- helpers ---
  getSectionByProgress(p) {
    const sections = this.sections;
    if (!sections?.length) return null;
    for (const s of sections) {
      if (p >= s.start && p < s.end) return s;
    }
    return sections[sections.length - 1] || null;
  }

  getActiveWork() {
    if (!this.activeWorkId) return null;
    return this.works.find(w => w.id === this.activeWorkId) || null;
  }

  setActiveWork(work) {
    if (!work?.id) return;
    this.activeWorkId = work.id;
    const media = work.media;
    if (!media?.src || media.src === this._currentMediaSrc) return;
    this._currentMediaSrc = media.src;
    this.setWorkPreviewMedia(media);
  }

  // --- Work preview (image / video) ---
  setWorkPreviewMedia({ type, src }) {
    const img = this.workPreviewImgEl;
    const vid = this.workPreviewVidEl;
    if (!img || !vid) return;

    if (type === 'video') {
      img.style.display = 'none';
      vid.style.display = 'block';
      this.workPreviewEl.classList.add('has-video');
      const fullSrc = location.origin + src;
      if (vid.getAttribute('data-src') !== fullSrc) {
        vid.setAttribute('data-src', fullSrc);
        vid.pause();
        vid.src = src;
        vid.oncanplay = () => {
          vid.play().catch(() => {});
          vid.oncanplay = null;
        };
        vid.load();
      } else {
        vid.play().catch(() => {});
      }
    } else {
      vid.pause();
      vid.style.display = 'none';
      this.workPreviewEl.classList.remove('has-video');
      img.style.display = 'block';
      img.src = src;
    }
  }

  // --- Work preview (image) ---（保留兼容旧调用）
  setWorkPreviewImage(src) {
    this.setWorkPreviewMedia({ type: 'image', src });
  }

  showWorkPreviewAt(screenX, screenY) {
    if (!this.workPreviewEl) return;

    const margin = 16;
    const rect = this.workPreviewEl.getBoundingClientRect();
    const w = rect.width || 380;
    const h = rect.height || (w * 10) / 16;

    let x = screenX + 18;
    let y = screenY - h * 0.5;

    if (x + w + margin > window.innerWidth) x = screenX - w - 18;
    if (y + h + margin > window.innerHeight) y = window.innerHeight - h - margin;
    if (y < margin) y = margin;
    if (x < margin) x = margin;

    this.workPreviewEl.style.left = `${Math.round(x)}px`;
    this.workPreviewEl.style.top = `${Math.round(y)}px`;
    this.workPreviewEl.classList.add('visible');
    this.workPreviewEl.setAttribute('aria-hidden', 'false');
  }

  hideWorkPreview() {
    if (!this.workPreviewEl) return;
    this.workPreviewEl.classList.remove('visible');
    this.workPreviewEl.setAttribute('aria-hidden', 'true');
    // 隐藏时暂停视频，节省资源
    if (this.workPreviewVidEl) this.workPreviewVidEl.pause();
  }

  // --- hover / raycast ---
  updateHover() {
    if (!this.camera || !this.hitboxMeshes?.length) return;
    if (Math.abs(this.mouseNDC.x) > 2 || Math.abs(this.mouseNDC.y) > 2) return;

    // 节流：每 3 帧执行一次 raycast
    this._hoverFrame++;
    if (this._hoverFrame % this._hoverInterval !== 0) return;

    this.raycaster.setFromCamera(this.mouseNDC, this.camera);
    // 直接对 hitbox 扁平数组做检测，避免递归遍历数千子 mesh
    const intersects = this.raycaster.intersectObjects(this.hitboxMeshes, false);
    const buildingId = intersects[0]?.object?.userData?.buildingId || null;

    if (!buildingId) {
      this.hoveredBuildingId = null;
      if (!this.pinnedBuildingId) this.hideWorkPreview();
      return;
    }

    if (this.hoveredBuildingId !== buildingId) {
      this.hoveredBuildingId = buildingId;

      // hover 显示：仅在未锁定时跟随 hover；已锁定则保持 pinned
      if (!this.pinnedBuildingId) {
        const work = this.workByBuildingId.get(buildingId);
        if (work) {
          this.setActiveWork(work);
          this.showWorkPreviewAt(this.lastPointer?.x || 0, this.lastPointer?.y || 0);
        }
      }
    }

    // 已锁定：确保锁定的作品保持显示（即便 hover 到其他建筑）
    if (this.pinnedBuildingId) {
      const pinnedWork = this.workByBuildingId.get(this.pinnedBuildingId);
      if (pinnedWork) {
        this.setActiveWork(pinnedWork);
        this.showWorkPreviewAt(this.lastPointer?.x || 0, this.lastPointer?.y || 0);
      }
    }
  }
}

// 启动应用
new App();
