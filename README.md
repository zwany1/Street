# Neon Horizon

现代化的赛博朋克 WebGL 体验项目，采用模块化架构构建。

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

## 📁 项目结构

```
neon-horizon/
├── index.html              # 主 HTML 入口
├── package.json
├── vite.config.js          # Vite 配置
├── src/
│   ├── main.js             # 应用入口
│   ├── config.js           # 全局配置
│   ├── scene/              # 场景模块
│   │   ├── Scene.js        # 场景管理器
│   │   ├── Camera.js       # 相机控制器
│   │   ├── Buildings.js    # 建筑生成器
│   │   ├── HoloBillboard.js # 全息广告牌
│   │   ├── NeonSigns.js    # 霓虹招牌
│   │   └── PointLights.js  # 点光源系统
│   ├── effects/            # 视觉效果
│   │   ├── Particles.js    # 粒子系统
│   │   ├── VolumetricLight.js # 体积光
│   │   └── PostFX.js       # 后处理链
│   ├── materials/          # 自定义材质（预留）
│   ├── utils/              # 工具模块
│   │   ├── AssetLoader.js  # 资源加载器
│   │   └── AudioManager.js # 音频管理器
│   └── shaders/            # 自定义着色器（预留）
├── assets/                 # 静态资源
│   ├── models/             # 3D 模型
│   ├── textures/           # 贴图
│   └── audio/              # 音频文件
└── public/                 # 公共资源
```

## ✨ 特性

- **模块化架构** - 清晰的代码组织，易于维护和扩展
- **现代构建工具** - 基于 Vite，热更新开发体验
- **后处理效果** - Bloom、色调分离、色差、胶片颗粒、晕影
- **交互系统** - 鼠标视差、滚动动画
- **性能优化** - 自适应像素比、阴影优化
- **资源管理** - 支持 GLTF 模型、纹理、音频加载

## 🎨 核心模块说明

### Scene 场景模块
- `Scene.js` - 场景初始化、灯光、地面
- `Camera.js` - 相机路径、鼠标视差控制
- `Buildings.js` - 程序化建筑生成
- `HoloBillboard.js` - 中心焦点全息广告牌
- `NeonSigns.js` - 霓虹招牌系统
- `PointLights.js` - 动态点光源

### Effects 效果模块
- `Particles.js` - GPU 优化粒子系统
- `VolumetricLight.js` - 体积光柱
- `PostFX.js` - 完整后处理管线

### Utils 工具模块
- `AssetLoader.js` - 异步资源加载
- `AudioManager.js` - 空间音频管理

## 🔧 配置

编辑 `src/config.js` 调整全局参数：

```javascript
export const CONFIG = {
  PALETTE: { purple, pink, cyan },  // 色板
  SCENE: { fogDensity, buildingSpacing, ... },
  CAMERA: { fov, near, far, ... },
  PARTICLES: { count, size, opacity },
  RENDERER: { pixelRatio, antialias, ... }
};
```

## 📦 扩展建议

### 添加 3D 模型
1. 将 `.glb` 文件放入 `assets/models/`
2. 在 `AssetLoader.js` 中集成 GLTFLoader
3. 在场景中实例化加载的模型

### 添加自定义着色器
1. 在 `src/shaders/` 创建 `.vert` / `.frag` 文件
2. 使用 `vite-plugin-glsl` 自动导入
3. 在 `materials/` 创建自定义材质类

### 添加音频
1. 将音频文件放入 `assets/audio/`
2. 使用 `AudioManager` 加载和播放
3. 支持空间音效和动态混音

## 🎯 下一步优化

- [ ] 添加真实 3D 模型资产
- [ ] 实现自定义全息着色器
- [ ] 集成环境音效
- [ ] 添加交互热点
- [ ] 性能分析和 LOD 优化
- [ ] 移动端适配

## 📝 技术栈

- **Three.js** ^0.160.0
- **Vite** ^5.0.0
- **vite-plugin-glsl** ^1.2.0

## 📄 许可

MIT
