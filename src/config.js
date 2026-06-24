// 全局配置
export const CONFIG = {
  // 颜色主题（现代玻璃城市：冷蓝/冷白为主，少量暖色点缀）
  PALETTE: {
    ice: 0x9fdcff,
    moon: 0xeaf3ff,
    steel: 0x4b6a9a,
    accent: 0xff2d9b
  },

  // 场景参数
  SCENE: {
    // 雾色抬亮一点，避免“漆黑一片”
    fogColor: 0x070b12,
    fogDensity: 0.012,
    buildingSpacing: 20,
    buildingDensity: 0.7, // 70%生成概率
    signDensity: 0.5,     // 50%生成概率

    // 天际线：非线性高度分布（更多高楼）
    heightBase: 18,
    heightRange: 140,
    heightPow: 0.55
  },

  // 相机参数
  CAMERA: {
    fov: 70,
    near: 0.1,
    far: 600,
    initialPosition: { x: 0, y: 4, z: 15 }
  },

  // 粒子参数
  PARTICLES: {
    count: 800,    // 从 1500 降到 800
    size: 0.15,
    opacity: 0.6
  },

  // 性能
  RENDERER: {
    pixelRatio: Math.min(window.devicePixelRatio, 1.5), // 从 2 降到 1.5
    antialias: true,
    shadowMapSize: 1024  // 从 2048 降到 1024
  }
};
