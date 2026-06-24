# Neon Horizon - 记忆走廊

现代玻璃城市风格的 3D 作品展示项目，采用 Three.js + WebGL 构建，支持桌面端和移动端。

## ✨ 核心特性

### 🎨 交互展示
- **智能预览系统** - 悬停建筑查看作品，点击固定预览，放大按钮全屏查看
- **19 个作品位** - 支持图片和视频，自动映射到左右两侧建筑
- **流畅过渡** - 预览框跟随鼠标，固定后保持位置不变
- **视频控制** - 内置播放/暂停按钮，全屏模式支持原生控制条

### 🏙️ 场景渲染
- **程序化建筑生成** - 现代玻璃幕墙建筑，共享材质减少 draw call
- **相机路径动画** - 滚动驱动，8 个关键点 CatmullRom 曲线插值
- **优化渲染管线** - 取消 transmission，关闭点光源阴影，降低粒子数量
- **Raycast 优化** - Hitbox mesh + 节流（每 3 帧），避免递归遍历

### 📱 移动端适配
- **自动降级** - 检测移动设备，关闭抗锯齿/阴影，像素比限制为 1
- **触摸支持** - 触摸建筑直接固定预览，无需 hover
- **响应式 UI** - 预览框、按钮、字号自适应屏幕尺寸
- **性能优化** - Raycast 频率降低到每 5 帧，检测距离从 300 降到 200

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
├── index.html              # 主入口 + 内联样式
├── src/
│   ├── main.js             # 应用入口，交互逻辑
│   ├── config.js           # 场景配置参数
│   ├── scene/
│   │   ├── Scene.js        # 场景、灯光、地面
│   │   ├── Camera.js       # 相机路径控制器
│   │   ├── Buildings.js    # 程序化建筑生成
│   │   ├── HoloBillboard.js # 全息广告牌
│   │   ├── NeonSigns.js    # 霓虹招牌
│   │   └── PointLights.js  # 点光源系统
│   ├── effects/
│   │   ├── Particles.js    # GPU 粒子系统
│   │   ├── VolumetricLight.js # 体积光柱
│   │   └── PostFX.js       # 后处理管线（Bloom、色差、晕影）
│   ├── utils/
│   │   ├── AssetLoader.js  # 资源加载器
│   │   └── AudioManager.js # 音频管理器
│   └── data/
│       └── works.json      # 作品数据配置
├── public/                 # 媒体资源
│   ├── 1.jpg ~ 19.jpg/mp4  # 作品图片/视频
└── dist/                   # 构建输出
```

## 🎯 使用说明

### 桌面端
1. **悬停建筑** - 鼠标移到建筑上，预览框跟随鼠标显示作品
2. **点击固定** - 点击建筑，预览框在当前位置固定
3. **放大查看** - 固定后点击右上角放大按钮，全屏查看
4. **点击空白** - 取消固定，恢复 hover 跟随

### 移动端
1. **触摸建筑** - 触摸建筑直接显示并固定预览
2. **放大查看** - 触摸右上角放大按钮，全屏查看
3. **触摸空白** - 取消固定

## 📊 作品配置

编辑 `src/data/works.json` 添加/修改作品：

```json
{
  "works": [
    {
      "id": "work-1",
      "slug": "work-1",
      "title": "Project 01",
      "buildingId": "bldg-left-00",
      "media": { "type": "image", "src": "/1.jpg" }
    },
    {
      "id": "work-2",
      "slug": "work-2",
      "title": "Project 02",
      "buildingId": "bldg-right-00",
      "media": { "type": "video", "src": "/2.mp4" }
    }
  ]
}
```

**建筑 ID 规则：**
- `bldg-left-00` ~ `bldg-left-09`：左侧建筑（10 栋）
- `bldg-right-00` ~ `bldg-right-09`：右侧建筑（10 栋）

## ⚙️ 性能配置

编辑 `src/config.js` 调整渲染参数：

```javascript
export const CONFIG = {
  RENDERER: {
    pixelRatio: Math.min(window.devicePixelRatio, 2),  // 最大像素比
    antialias: true,  // 抗锯齿（移动端自动关闭）
  },
  SCENE: {
    buildingSpacing: 42,     // 建筑间距
    buildingDensity: 0.68,   // 建筑密度
    heightBase: 18,          // 基础高度
    heightRange: 28,         // 高度浮动范围
  },
  PARTICLES: {
    count: 420,              // 粒子数量（移动端建议减半）
  },
};
```

## 🔧 性能优化细节

### 渲染优化
- **材质共享** - 所有建筑共享 4 个材质实例
- **几何体复用** - 幕墙、横梁、边缘灯带共享几何体
- **取消 transmission** - 玻璃材质改用 MeshStandardMaterial + emissive
- **外壳简化** - MeshBasicMaterial，零光照成本
- **阴影控制** - 只有主塔和退台投影，细节件跳过

### 交互优化
- **Hitbox mesh** - 每栋建筑一个不可见碰撞盒，替代递归遍历
- **Raycast 节流** - 每 3 帧执行一次（移动端 5 帧）
- **检测距离限制** - 300 单位（移动端 200）
- **光标优化** - 用 transform 定位，避免布局重排

### 移动端降级
- 像素比限制为 1
- 关闭抗锯齿和阴影
- Raycast 频率降低 40%
- 粒子数量建议减半

## 📝 技术栈

- **Three.js** ^0.160.0 - WebGL 渲染引擎
- **Vite** ^5.0.0 - 构建工具
- **原生 JavaScript** - 无框架依赖

## 🎨 视觉风格

- **色调** - 冷灰蓝 + 冰蓝 + 钢蓝
- **材质** - 玻璃幕墙 + 金属结构
- **氛围** - 现代玻璃城市夜景，宁静、克制、精致

## 📄 许可

MIT License

---

**提示：** 首次加载时建筑按随机概率生成，每次刷新布局略有不同。建议用 `buildingDensity: 1` 保证所有作品位都有对应建筑。
