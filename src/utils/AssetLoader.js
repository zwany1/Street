export class AssetLoader {
  constructor() {
    this.assets = {
      models: {},
      textures: {},
      audio: {}
    };
  }

  async loadGLTF(path, name) {
    // GLTFLoader 集成
    // 暂时返回 mock，后续可以添加真实模型加载
    console.log(`[AssetLoader] GLTF loading: ${name} from ${path}`);
    return null;
  }

  async loadTexture(path, name) {
    // TextureLoader 集成
    console.log(`[AssetLoader] Texture loading: ${name} from ${path}`);
    return null;
  }

  async loadAudio(path, name) {
    // AudioLoader 集成
    console.log(`[AssetLoader] Audio loading: ${name} from ${path}`);
    return null;
  }

  getAsset(type, name) {
    return this.assets[type][name];
  }

  async loadAll(manifest) {
    console.log('[AssetLoader] Starting batch load...');
    const promises = [];

    for (const [name, path] of Object.entries(manifest.models || {})) {
      promises.push(this.loadGLTF(path, name));
    }

    for (const [name, path] of Object.entries(manifest.textures || {})) {
      promises.push(this.loadTexture(path, name));
    }

    for (const [name, path] of Object.entries(manifest.audio || {})) {
      promises.push(this.loadAudio(path, name));
    }

    await Promise.all(promises);
    console.log('[AssetLoader] All assets loaded');
  }
}
