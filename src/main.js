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

    // 移动端检测
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      || window.innerWidth < 768;

    // data
    this.works = worksData.works || [];
    this.sections = worksData.sections || [];
    this.workByBuildingId = new Map();
    this.workBySlug = new Map();
    this.workById = new Map();

    // interaction
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = this.isMobile ? 200 : 300;  // 移动端减少检测距离
    this.mouseNDC = new THREE.Vector2(999, 999);
    this.hoveredBuildingId = null;
    this.pinnedBuildingId = null;
    this.activeWorkId = null;
    this._hoverFrame = 0;
    this._hoverInterval = this.isMobile ? 5 : 3;     // 移动端降低 raycast 频率

    // 路由飞行控制
    this.scrollHijacked = false;

    // screen-space pointer
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
      antialias: this.isMobile ? false : CONFIG.RENDERER.antialias,  // 移动端关闭抗锯齿
      powerPreference: 'high-performance'
    });

    // 移动端限制像素比为 1，避免高 DPI 屏幕性能问题
    const pixelRatio = this.isMobile ? 1 : Math.min(window.devicePixelRatio, CONFIG.RENDERER.pixelRatio);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.4;
    this.renderer.shadowMap.enabled = !this.isMobile;  // 移动端关闭阴影
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
      if (w?.id) this.workById.set(w.id, w);
    }

    // URL 路由：监听 hash 变化
    window.addEventListener('hashchange', () => this.onHashChange());
    // 初始加载时检查 hash
    this.onHashChange();

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
    // 移动端：隐藏自定义光标
    if (this.isMobile) {
      document.body.style.cursor = 'auto';
      const cursor = document.getElementById('custom-cursor');
      if (cursor) cursor.style.display = 'none';
    }

    // 触摸事件（移动端）
    if (this.isMobile) {
      window.addEventListener('touchstart', (e) => {
        if (e.touches.length > 0) {
          const touch = e.touches[0];
          this.mouseNDC.x = (touch.clientX / window.innerWidth) * 2 - 1;
          this.mouseNDC.y = -(touch.clientY / window.innerHeight) * 2 + 1;
          this.lastPointer = { x: touch.clientX, y: touch.clientY };
        }
      }, { passive: true });

      window.addEventListener('touchmove', (e) => {
        if (e.touches.length > 0) {
          const touch = e.touches[0];
          this.mouseNDC.x = (touch.clientX / window.innerWidth) * 2 - 1;
          this.mouseNDC.y = -(touch.clientY / window.innerHeight) * 2 + 1;
          this.lastPointer = { x: touch.clientX, y: touch.clientY };
        }
      }, { passive: true });
    }

    // 鼠标 → NDC（raycast） + 记录屏幕坐标（用于卡片跟随建筑投影点）
    window.addEventListener('mousemove', (e) => {
      this.mouseNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
      this.lastPointer = { x: e.clientX, y: e.clientY };
    }, { passive: true });

    // 滚动（段落时间轴）
    window.addEventListener('scroll', () => {
      // 路由飞行期间：跳过 scroll 对 progress 的干扰
      if (this.scrollHijacked && this.cameraController.isFlying()) {
        return;
      }
      this.scrollHijacked = false;

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

    // 点击建筑：固定当前预览位置（移动端触摸时直接触发）
    const handlePointerDown = (e) => {
      // 点击的是按钮则不处理建筑点击
      if (e.target.closest('#play-btn') || e.target.closest('#expand-btn') || e.target.closest('#share-btn')) return;

      // 获取坐标（兼容触摸和鼠标）
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      this.raycaster.setFromCamera(this.mouseNDC, this.camera);
      const intersects = this.raycaster.intersectObjects(this.hitboxMeshes, false);
      const buildingId = intersects[0]?.object?.userData?.buildingId || null;

      if (!buildingId) {
        // 点击空白区域：取消固定
        this.pinnedBuildingId = null;
        this.hideWorkPreview();
        return;
      }

      // 移动端：触摸建筑直接显示并固定
      if (this.isMobile) {
        this.pinnedBuildingId = buildingId;
        const work = this.workByBuildingId.get(buildingId);
        if (work) {
          this.setActiveWork(work);
          this.showWorkPreviewAt(clientX, clientY, true);
        }
        return;
      }

      // 桌面端：点击建筑固定当前预览（不改变位置，只加 pinned 标记）
      if (this.hoveredBuildingId === buildingId) {
        // 当前 hover 的建筑，点击后原地固定
        this.pinnedBuildingId = buildingId;
        if (this.workPreviewEl) {
          this.workPreviewEl.classList.add('pinned');
        }
      } else {
        // 点击的不是当前 hover 建筑，先显示再固定
        this.pinnedBuildingId = buildingId;
        const work = this.workByBuildingId.get(buildingId);
        if (work) {
          this.setActiveWork(work);
          this.showWorkPreviewAt(clientX, clientY, true);
        }
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    if (this.isMobile) {
      window.addEventListener('touchstart', handlePointerDown);
    }

    // 放大按钮：打开全屏查看
    const expandBtn = document.getElementById('expand-btn');
    if (expandBtn) {
      expandBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openFullscreen();
      });
    }

    // 分享按钮：复制当前作品的完整链接到剪贴板
    const shareBtn = document.getElementById('share-btn');
    if (shareBtn) {
      shareBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.shareCurrentWork();
      });
    }

    // 全屏查看器关闭按钮
    const closeFullscreen = document.getElementById('close-fullscreen');
    if (closeFullscreen) {
      closeFullscreen.addEventListener('click', () => {
        this.closeFullscreen();
      });
    }

    // 全屏查看器：点击背景关闭
    const fullscreenViewer = document.getElementById('fullscreen-viewer');
    if (fullscreenViewer) {
      fullscreenViewer.addEventListener('click', (e) => {
        if (e.target === fullscreenViewer) this.closeFullscreen();
      });
    }

    // 响应式
    window.addEventListener('resize', () => {
      const aspect = window.innerWidth / window.innerHeight;
      this.cameraController.onResize(aspect);
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.postProcessing.onResize(window.innerWidth, window.innerHeight);
    });

    // 键盘导航（桌面端）
    window.addEventListener('keydown', (e) => {
      if (this.isMobile) return;

      // 全屏打开时只处理 ESC
      const viewer = document.getElementById('fullscreen-viewer');
      if (viewer?.classList.contains('active')) {
        if (e.key === 'Escape') {
          e.preventDefault();
          this.closeFullscreen();
        }
        return;
      }

      // 输入框内不抢键
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      const works = this.works || [];
      if (!works.length) return;

      const currentIndex = Math.max(0, works.findIndex(w => w.id === this.activeWorkId));

      const showIndex = (idx) => {
        const w = works[(idx + works.length) % works.length];
        if (!w) return;
        this.pinnedBuildingId = w.buildingId || null;
        this.setActiveWork(w);
        this.showWorkPreviewAt(this.lastPointer?.x || window.innerWidth / 2, this.lastPointer?.y || window.innerHeight / 2, true);
      };

      if (e.key === 'Escape') {
        e.preventDefault();
        this.pinnedBuildingId = null;
        this.hideWorkPreview();
        return;
      }

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        showIndex(currentIndex + 1);
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        showIndex(currentIndex - 1);
        return;
      }

      if (e.key === 'Enter') {
        if (this.pinnedBuildingId) {
          e.preventDefault();
          this.openFullscreen();
        }
        return;
      }

      if (e.key === ' ' || e.key === 'Spacebar') {
        // 空格播放/暂停视频
        if (this.workPreviewEl?.classList.contains('has-video') && this.workPreviewVidEl) {
          e.preventDefault();
          const vid = this.workPreviewVidEl;
          if (vid.paused) vid.play().catch(() => {});
          else vid.pause();
        }
      }
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
    const loaderFill = document.getElementById('loader-fill');
    const loaderPercent = document.getElementById('loader-percent');
    const loaderError = document.getElementById('loader-error');

    let loadProgress = 0;

    const updateProgress = (p) => {
      loadProgress = Math.min(100, Math.round(p));
      if (loaderFill) loaderFill.style.width = loadProgress + '%';
      if (loaderPercent) loaderPercent.textContent = loadProgress + '%';
    };

    // 阶段 1：初始化 3D 场景（0-40%）
    updateProgress(10);

    try {
      this.sceneManager = new SceneManager();
      this.scene = this.sceneManager.getScene();
      updateProgress(20);

      this.cameraController = new CameraController(window.innerWidth / window.innerHeight);
      this.camera = this.cameraController.getCamera();
      updateProgress(30);

      this.renderer.setSize(window.innerWidth, window.innerHeight);
      updateProgress(40);
    } catch (e) {
      console.error('[App] Scene init failed:', e);
      if (loaderError) {
        loaderError.textContent = '3D scene failed to initialize. Please refresh or try a different browser.';
        loaderError.style.display = 'block';
      }
      return;
    }

    // 阶段 2：生成建筑和效果（40-70%）
    try {
      this.buildings = new Buildings();
      this.buildingsGroup = this.buildings.getGroup();
      this.hitboxMeshes = this.buildings.getHitboxMeshes();
      this.scene.add(this.buildingsGroup);
      updateProgress(50);

      this.holoBillboard = new HoloBillboard();
      this.scene.add(this.holoBillboard.getGroup());
      this.neonSigns = new NeonSigns();
      this.scene.add(this.neonSigns.getGroup());
      this.pointLights = new PointLights();
      this.scene.add(this.pointLights.getGroup());
      updateProgress(60);

      this.particles = new ParticleSystem();
      this.scene.add(this.particles.getMesh());
      this.volumetricLight = new VolumetricLight();
      this.scene.add(this.volumetricLight.getGroup());
      updateProgress(70);
    } catch (e) {
      console.error('[App] Effects init failed:', e);
      if (loaderError) {
        loaderError.textContent = 'Scene effects failed. The experience may be limited.';
        loaderError.style.display = 'block';
      }
    }

    // 阶段 3：后处理（70-90%）
    try {
      this.postProcessing = new PostProcessing(this.renderer, this.scene, this.camera);
      updateProgress(90);
    } catch (e) {
      console.error('[App] PostFX init failed:', e);
      // 后处理失败不阻断，继续运行
    }

    // 阶段 4：完成（90-100%）
    updateProgress(100);
    this.onLoadComplete();
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

    // 同一个 work 不重复处理
    if (this.activeWorkId === work.id) return;

    this.activeWorkId = work.id;

    // 同步 URL hash（避免 hashchange 循环：先比对再 set）
    const route = `/work/${encodeURIComponent(work.slug || work.id)}`;
    const nextHash = `#${route}`;
    if (location.hash !== nextHash) {
      history.replaceState(null, '', nextHash);
    }

    const media = work.media;
    if (!media?.src) return;

    // 懒加载：同一个媒体不重复切换
    if (media.src === this._currentMediaSrc) return;
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
        vid.preload = 'metadata'; // 只预加载首帧，播放时才加载完整视频
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
      // 图片懒加载：先清空 src，再设置新 src
      if (img.src !== location.origin + src) {
        img.src = src;
        img.onload = () => { img.style.opacity = '1'; };
        img.onerror = () => { img.style.opacity = '0'; };
      }
    }
  }

  // --- Work preview (image) ---（保留兼容旧调用）
  setWorkPreviewImage(src) {
    this.setWorkPreviewMedia({ type: 'image', src });
  }

  showWorkPreviewAt(screenX, screenY, pinned = false) {
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

    // 固定时加上 pinned class，显示放大按钮
    if (pinned) {
      this.workPreviewEl.classList.add('pinned');
    } else {
      this.workPreviewEl.classList.remove('pinned');
    }
  }

  hideWorkPreview() {
    if (!this.workPreviewEl) return;
    this.workPreviewEl.classList.remove('visible', 'pinned');
    this.workPreviewEl.setAttribute('aria-hidden', 'true');
    if (this.workPreviewVidEl) this.workPreviewVidEl.pause();

    // 清理 hash（不触发跳转）
    if (location.hash.startsWith('#/work/')) {
      history.replaceState(null, '', '#');
    }
  }

  // --- 分享当前作品 ---
  shareCurrentWork() {
    const work = this.getActiveWork();
    if (!work?.slug) return;

    const url = location.origin + location.pathname + '#/work/' + encodeURIComponent(work.slug);
    navigator.clipboard.writeText(url).then(() => {
      // 按钮反馈
      const btn = document.getElementById('share-btn');
      if (btn) {
        btn.style.borderColor = 'rgba(159, 220, 255, 0.9)';
        btn.style.background = 'rgba(7, 11, 18, 0.85)';
        setTimeout(() => {
          btn.style.borderColor = '';
          btn.style.background = '';
        }, 1000);
      }
      // Toast 提示
      const toast = document.getElementById('share-toast');
      if (toast) {
        toast.classList.add('visible');
        setTimeout(() => toast.classList.remove('visible'), 2000);
      }
    }).catch(() => {
      // 降级：尝试用 share API
      if (navigator.share) {
        navigator.share({
          title: `${work.title} — Neon Horizon`,
          url: url,
        }).catch(() => {});
      }
    });
  }

  // --- 全屏查看器 ---
  openFullscreen() {
    const viewer = document.getElementById('fullscreen-viewer');
    const fsImg = document.getElementById('fullscreen-img');
    const fsVid = document.getElementById('fullscreen-video');
    if (!viewer || !fsImg || !fsVid) return;

    const work = this.getActiveWork();
    if (!work?.media) return;

    const { type, src } = work.media;

    if (type === 'video') {
      fsImg.style.display = 'none';
      fsVid.style.display = 'block';
      fsVid.src = src;
      fsVid.load();
      fsVid.play().catch(() => {});
    } else {
      fsVid.pause();
      fsVid.style.display = 'none';
      fsImg.style.display = 'block';
      fsImg.src = src;
    }

    viewer.classList.add('active');
  }

  closeFullscreen() {
    const viewer = document.getElementById('fullscreen-viewer');
    const fsVid = document.getElementById('fullscreen-video');
    if (!viewer) return;

    viewer.classList.remove('active');
    if (fsVid) {
      fsVid.pause();
      fsVid.src = '';
    }

    // 关闭全屏后保持当前 work 的 hash，不清理
  }

  // --- URL Hash Routing ---
  onHashChange() {
    const hash = location.hash || '';
    const prefix = '#/work/';
    if (!hash.startsWith(prefix)) return;

    const key = decodeURIComponent(hash.slice(prefix.length));
    const work = this.workBySlug.get(key) || this.workById.get(key);
    if (!work) return;

    // 找到对应的 section，获取 target progress
    const section = this.sections.find(s => s.workId === work.id);
    const targetProgress = section ? section.start : 0;

    // 相机平滑飞行到目标位置
    this.cameraController.smoothScrollTo(targetProgress);
    this.scrollHijacked = true;

    // 固定并显示预览
    this.pinnedBuildingId = work.buildingId || null;
    this.setActiveWork(work);
    this.showWorkPreviewAt(window.innerWidth / 2, window.innerHeight / 2, true);
  }

  // --- hover / raycast ---
  updateHover() {
    // 飞行期间暂停 raycast，避免预览框被飞行动态覆盖
    if (this.scrollHijacked && this.cameraController.isFlying()) return;

    if (!this.camera || !this.hitboxMeshes?.length) return;
    if (Math.abs(this.mouseNDC.x) > 2 || Math.abs(this.mouseNDC.y) > 2) return;

    // 已固定时不响应 hover（预览框位置不变）
    if (this.pinnedBuildingId) return;

    // 节流：每 3 帧执行一次 raycast
    this._hoverFrame++;
    if (this._hoverFrame % this._hoverInterval !== 0) return;

    this.raycaster.setFromCamera(this.mouseNDC, this.camera);
    const intersects = this.raycaster.intersectObjects(this.hitboxMeshes, false);
    const buildingId = intersects[0]?.object?.userData?.buildingId || null;

    if (!buildingId) {
      this.hoveredBuildingId = null;
      this.hideWorkPreview();
      return;
    }

    if (this.hoveredBuildingId !== buildingId) {
      this.hoveredBuildingId = buildingId;
      const work = this.workByBuildingId.get(buildingId);
      if (work) {
        this.setActiveWork(work);
        this.showWorkPreviewAt(this.lastPointer?.x || 0, this.lastPointer?.y || 0, false);
      }
    }
  }
}

// 启动应用
new App();
