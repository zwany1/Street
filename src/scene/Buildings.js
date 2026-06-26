import * as THREE from 'three';
import { CONFIG } from '../config.js';
import worksData from '../data/works.json';

// 全场景共享材质实例，避免每栋楼 new 新材质
const _sharedMats = {
  glass: null,
  shell: null,
  metal: null,
  hitbox: null,
};

function getSharedMats() {
  if (_sharedMats.glass) return _sharedMats;

  // 幕墙玻璃：去掉 transmission（最大性能杀手），改用 MeshStandardMaterial + emissive 模拟
  _sharedMats.glass = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#0b1628'),
    metalness: 0.92,
    roughness: 0.1,
    emissive: new THREE.Color('#9fdcff'),
    emissiveIntensity: 0.3,
    transparent: true,
    opacity: 0.85,
    envMapIntensity: 1.4,
  });

  // 玻璃外壳：轻量半透明，MeshBasicMaterial 直接省掉光照计算
  _sharedMats.shell = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#1a3050'),
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
  });

  // 金属结构
  _sharedMats.metal = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#0b0f18'),
    metalness: 0.88,
    roughness: 0.25,
  });

  // 碰撞盒（不可见）
  _sharedMats.hitbox = new THREE.MeshBasicMaterial({ visible: false });

  return _sharedMats;
}

export class Buildings {
  constructor() {
    this.buildings = new THREE.Group();
    // 暴露 hitboxMeshes 供外部 raycast 直接检测，避免递归遍历
    this.hitboxMeshes = [];
    this.generate();
  }

  createNeonSignMaterial() {
    // 霓虹附着件：颜色偏冷蓝/白调，MeshBasicMaterial 零光照开销
    const c = Math.random() < 0.65 ? '#9fe9ff' : '#b8c7ff';
    return new THREE.MeshBasicMaterial({ color: new THREE.Color(c) });
  }

  createModernBuilding(w, h, d, x, z) {
    const group = new THREE.Group();
    const { glass: glassMat, shell: shellMat, metal: metalMat } = getSharedMats();

    // --- 1) 主塔（结构体）---
    const towerW = w * (0.85 + Math.random() * 0.15);
    const towerD = d * (0.85 + Math.random() * 0.15);
    const towerH = h * (0.78 + Math.random() * 0.12);

    const tower = new THREE.Mesh(
      new THREE.BoxGeometry(towerW, towerH, towerD),
      glassMat
    );
    tower.position.y = towerH / 2;
    group.add(tower);

    // 1b) 玻璃外壳（套一层，共享 MeshBasicMaterial，无光照计算）
    const shell = new THREE.Mesh(
      new THREE.BoxGeometry(towerW * 1.03, towerH * 1.01, towerD * 1.03),
      shellMat
    );
    shell.position.copy(tower.position);
    group.add(shell);

    // --- 2) 阶梯退台 ---
    const steps = 2 + Math.floor(Math.random() * 2);
    const stepH = Math.max(1.4, (h - towerH) / (steps + 1));
    for (let i = 0; i < steps; i++) {
      const t = (i + 1) / (steps + 1);
      const pw = w * (1.15 - t * 0.35);
      const pd = d * (1.10 - t * 0.25);
      const ph = stepH * (0.9 + Math.random() * 0.2);
      const podium = new THREE.Mesh(
        new THREE.BoxGeometry(pw, ph, pd),
        i === 0 ? metalMat : glassMat
      );
      podium.position.y = ph / 2 + i * (ph * 0.95);
      podium.position.x = (Math.random() - 0.5) * w * 0.08;
      podium.position.z = (Math.random() - 0.5) * d * 0.08;
      group.add(podium);
    }

    // --- 3) 底层柱廊 ---
    if (Math.random() < 0.85) {
      const colH = Math.max(2.2, h * 0.14);
      const slabH = 0.6;
      const slab = new THREE.Mesh(
        new THREE.BoxGeometry(w * 1.05, slabH, d * 1.05),
        metalMat
      );
      slab.position.y = colH + slabH / 2;
      group.add(slab);

      // 共享圆柱几何体
      const colsX = 3;
      const colsZ = 2;
      const r = 0.18;
      const colGeo = new THREE.CylinderGeometry(r, r, colH, 6); // 从 10 降到 6 段
      for (let ix = 0; ix < colsX; ix++) {
        for (let iz = 0; iz < colsZ; iz++) {
          const c = new THREE.Mesh(colGeo, metalMat); // 几何体共享
          const fx = (ix / (colsX - 1) - 0.5) * w * 0.9;
          const fz = (iz / (colsZ - 1) - 0.5) * d * 0.7;
          c.position.set(fx, colH / 2, fz);
          group.add(c);
        }
      }

      tower.position.y += colH * 0.55;
      shell.position.y += colH * 0.55;
    }

    // --- 4) 横向遮阳板（减少数量）---
    if (Math.random() < 0.9) {
      const fins = 2 + Math.floor(Math.random() * 3); // 从 3~6 降到 2~4
      const finGeo = new THREE.BoxGeometry(towerW * 1.03, 0.08, 0.12);
      for (let i = 0; i < fins; i++) {
        const y = tower.position.y - towerH / 2 + (i + 1) * (towerH / (fins + 1));
        const fin = new THREE.Mesh(finGeo, metalMat);
        fin.position.set(tower.position.x, y, tower.position.z + towerD / 2 + 0.08);
        group.add(fin);
      }
    }

    // --- 5) 幕墙竖梃/横梁 + 亮窗（共享几何体）---
    {
      const mullions = 5 + Math.floor(Math.random() * 3); // 从 6~9 降到 5~7
      const mullionGeo = new THREE.BoxGeometry(0.06, towerH * 0.98, 0.04);
      for (let i = 0; i < mullions; i++) {
        const t = (i / (mullions - 1) - 0.5);
        const m = new THREE.Mesh(mullionGeo, metalMat);
        m.position.x = tower.position.x + t * towerW * 0.92;
        m.position.y = tower.position.y;
        m.position.z = tower.position.z + towerD / 2 + 0.105;
        group.add(m);
      }

      const transoms = 8 + Math.floor(Math.random() * 4); // 从 10~14 降到 8~11
      const transomGeo = new THREE.BoxGeometry(towerW * 0.94, 0.04, 0.04);
      for (let j = 0; j < transoms; j++) {
        const tt = (j / (transoms - 1) - 0.5);
        const tr = new THREE.Mesh(transomGeo, metalMat);
        tr.position.x = tower.position.x;
        tr.position.y = tower.position.y + tt * towerH * 0.92;
        tr.position.z = tower.position.z + towerD / 2 + 0.105;
        group.add(tr);
      }

      // 亮窗（MeshBasicMaterial，零光照成本）
      const litMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(Math.random() < 0.5 ? '#eaf3ff' : '#9fdcff'),
        transparent: true,
        opacity: 0.35,
      });
      const wx = mullions - 1;
      const wy = Math.max(5, transoms - 1);
      for (let iy = 0; iy < wy; iy++) {
        for (let ix = 0; ix < wx; ix++) {
          if (Math.random() < 0.08) {
            const ww = (towerW * 0.92) / wx * 0.72;
            const wh = (towerH * 0.92) / wy * 0.62;
            const win = new THREE.Mesh(new THREE.PlaneGeometry(ww, wh), litMat);
            const px = (ix / (wx - 1) - 0.5) * towerW * 0.92;
            const py = (iy / (wy - 1) - 0.5) * towerH * 0.92;
            win.position.set(
              tower.position.x + px,
              tower.position.y + py,
              tower.position.z + towerD / 2 + 0.115
            );
            group.add(win);
          }
        }
      }
    }

    // --- 6) 边缘灯带（共享材质）---
    {
      const edgeMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color('#9fdcff'),
        transparent: true,
        opacity: 0.22,
      });
      const edgeGeo = new THREE.BoxGeometry(0.05, towerH * 0.98, 0.05);
      const ex = towerW * 0.515;
      const ez = towerD * 0.515;
      const ys = tower.position.y;
      const corners = [
        [tower.position.x - ex, ys, tower.position.z - ez],
        [tower.position.x + ex, ys, tower.position.z - ez],
        [tower.position.x - ex, ys, tower.position.z + ez],
        [tower.position.x + ex, ys, tower.position.z + ez],
      ];
      for (const [cx, cy, cz] of corners) {
        const e = new THREE.Mesh(edgeGeo, edgeMat);
        e.position.set(cx, cy, cz);
        group.add(e);
      }
    }

    // --- 7) 顶部设备层 ---
    if (Math.random() < 0.85) {
      const roofY = tower.position.y + towerH / 2;
      const units = 1 + Math.floor(Math.random() * 2); // 从 2~4 降到 1~2
      for (let i = 0; i < units; i++) {
        const uw = towerW * (0.10 + Math.random() * 0.10);
        const uh = 0.6 + Math.random() * 0.6;
        const ud = towerD * (0.10 + Math.random() * 0.10);
        const u = new THREE.Mesh(new THREE.BoxGeometry(uw, uh, ud), metalMat);
        u.position.x = tower.position.x + (Math.random() - 0.5) * towerW * 0.35;
        u.position.y = roofY + uh / 2 + 0.05;
        u.position.z = tower.position.z + (Math.random() - 0.5) * towerD * 0.35;
        group.add(u);
      }

      if (Math.random() < 0.55) {
        const mast = new THREE.Mesh(
          new THREE.CylinderGeometry(0.05, 0.06, 2.2 + Math.random() * 2.0, 6), // 从 10 降到 6 段
          metalMat
        );
        mast.position.set(tower.position.x, roofY + 1.6, tower.position.z);
        group.add(mast);
      }
    }

    // --- 8) 幕墙霓虹招牌 ---
    if (Math.random() < 0.75) {
      const signMat = this.createNeonSignMaterial();
      const signW = towerW * (0.12 + Math.random() * 0.18);
      const signH = towerH * (0.14 + Math.random() * 0.22);
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(signW, signH), signMat);
      sign.position.x = (Math.random() - 0.5) * towerW * 0.25;
      sign.position.y = tower.position.y + (Math.random() - 0.5) * towerH * 0.25;
      sign.position.z = tower.position.z + towerD / 2 + 0.13;
      group.add(sign);
    }

    group.position.set(x, 0, z);

    // --- 碰撞包围盒：唯一用于 raycast 的 mesh，避免递归遍历大量子 mesh ---
    const hitbox = new THREE.Mesh(
      new THREE.BoxGeometry(w * 1.1, h * 1.05, d * 1.1),
      getSharedMats().hitbox
    );
    hitbox.position.y = h / 2;
    hitbox.userData.isHitbox = true;
    group.add(hitbox);

    // 阴影：只让主塔和退台投影，细节件跳过，减少 shadow draw call
    tower.castShadow = true;
    tower.receiveShadow = true;

    return group;
  }

  generate() {
    const { buildingSpacing, buildingDensity } = CONFIG.SCENE;

    // 从 works.json 提取所有 buildingId，算出左右侧各需多少栋
    const requiredIds = new Set(worksData.works.map(w => w.buildingId).filter(Boolean));
    const maxLeft = Math.max(...[...requiredIds].filter(id => id.startsWith('bldg-left-')).map(id => parseInt(id.replace('bldg-left-', ''), 10)), -1) + 1;
    const maxRight = Math.max(...[...requiredIds].filter(id => id.startsWith('bldg-right-')).map(id => parseInt(id.replace('bldg-right-', ''), 10)), -1) + 1;

    let leftIndex = 0;
    let rightIndex = 0;

    for (let z = 20; z > -700; z -= buildingSpacing) {
      // 左侧：前 maxLeft 轮强制生成（保证 works.json 需要的 ID 必定存在），之后概率填充
      const leftRequired = leftIndex < maxLeft;
      if (leftRequired || Math.random() < buildingDensity) {
        const { heightBase, heightRange, heightPow } = CONFIG.SCENE;
        const h = heightBase + Math.pow(Math.random(), heightPow) * heightRange;
        const w = 9 + Math.random() * 7;
        const x = -16 - Math.random() * 6;
        const group = this.createModernBuilding(w, h, 10, x, z);
        group.userData.buildingId = `bldg-left-${String(leftIndex).padStart(2, '0')}`;
        group.name = group.userData.buildingId;
        // 把 hitbox mesh 存入列表供 raycast 直接使用
        const hb = group.children[group.children.length - 1];
        hb.userData.buildingId = group.userData.buildingId;
        this.hitboxMeshes.push(hb);
        leftIndex++;
        this.buildings.add(group);
      }

      // 右侧：前 maxRight 轮强制生成，之后概率填充
      const rightRequired = rightIndex < maxRight;
      if (rightRequired || Math.random() < buildingDensity) {
        const { heightBase, heightRange, heightPow } = CONFIG.SCENE;
        const h = heightBase + Math.pow(Math.random(), heightPow) * heightRange;
        const w = 9 + Math.random() * 7;
        const x = 16 + Math.random() * 6;
        const group = this.createModernBuilding(w, h, 10, x, z);
        group.userData.buildingId = `bldg-right-${String(rightIndex).padStart(2, '0')}`;
        group.name = group.userData.buildingId;
        const hb = group.children[group.children.length - 1];
        hb.userData.buildingId = group.userData.buildingId;
        this.hitboxMeshes.push(hb);
        rightIndex++;
        this.buildings.add(group);
      }
    }
  }

  getGroup() {
    return this.buildings;
  }

  /** 暴露 hitbox mesh 数组，供外部直接做 raycast */
  getHitboxMeshes() {
    return this.hitboxMeshes;
  }
}
