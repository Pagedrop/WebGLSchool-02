import * as THREE from "./lib/three.module.js";
import { OrbitControls } from "./lib/OrbitControls.js";
import { GLTFLoader } from "./lib/GLTFLoader.js";
import { EffectComposer } from "./lib/EffectComposer.js";
import { RenderPass } from "./lib/RenderPass.js";
import { UnrealBloomPass } from "./lib/UnrealBloomPass.js";

import { GUI } from "./lib/lil-gui.js";

window.addEventListener(
  "DOMContentLoaded",
  () => {
    const app = new App3();

    app.load().then(() => {
      app.init();
      app.render();
    });
  },
  false
);

class App3 {
  /**
   * カメラ定義の定数
   */
  static get CAMERA_PARAM() {
    return {
      fovy: 60,
      aspect: window.innerWidth / window.innerHeight,
      near: 0.1,
      far: 1000,
      x: 0.0,
      y: 2.0,
      z: 20.0,
      lookAt: new THREE.Vector3(0.0, 0.0, 0.0),
    };
  }

  /**
   * レンダラー定義の定数
   */
  static get RENDERER_PARAM() {
    return {
      clearColor: 0x000000,
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }

  /**
   * アンビエントライト定義の定数
   */
  static get AMBIENT_LIGHT_PARAM() {
    return {
      color: 0x404040,
      intensity: 0.2,
    };
  }

  /**
   * マテリアル定義の定数
   */
  static get MATERIAL_PARAM() {
    return {
      color: 0x3399ff,
    };
  }

  /**
   * コンストラクタ
   * @constructor
   */
  constructor() {
    this.renderer;
    this.scene;
    this.camera;
    this.gui;
    this.ambientLight;
    this.material;
    this.boxGeometry;
    this.box;
    this.controls;
    this.axesHelper;
    this.modelBase;
    this.modelBody;
    this.modelPanel;
    this.groupPanel;
    this.groupbody;
    this.composer;
    this.renderPass;
    this.unrealBloomPass;
    this.swingCount = {
      vertical: 0,
      horizontal: 0,
    };

    this.isDown = false;

    // 再帰呼び出しの為のthis固定
    this.render = this.render.bind(this);

    /**
     * イベント
     */

    // キーイベント
    window.addEventListener(
      "keydown",
      (keyEvent) => {
        switch (keyEvent.key) {
          case " ":
            this.isDown = true;
            break;
          default:
        }
      },
      false
    );
    window.addEventListener(
      "keyup",
      (keyEvent) => {
        switch (keyEvent.key) {
          case " ":
            this.isDown = false;
            break;
          default:
        }
      },
      false
    );

    // リサイズイベント
    window.addEventListener(
      "resize",
      () => {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
      },
      false
    );
  }

  /**
   *  アセットのロード
   */
  load() {
    return new Promise((resolve) => {
      // モデルのパス
      const modelBase = "./assets/fun001-base.glb";
      const modelBody = "./assets/fun001-body-sub.glb";
      const modelPanel = "./assets/fun001-panel-sub.glb";
      // const modelBase = "./assets/PrimaryIonDrive.glb";
      const loader = new GLTFLoader();
      this.modelBase = null;
      (async () => {
        await loader.load(modelBase, (gltf) => {
          this.modelBase = gltf.scene;
          this.modelBase.scale.set(10.0, 10.0, 10.0);
        });
        await loader.load(modelBody, (gltf) => {
          this.modelBody = gltf.scene;
          this.modelBody.scale.set(10.0, 10.0, 10.0);
          this.modelBody.position.y = 6.9;
        });
        await loader.load(modelPanel, (gltf) => {
          this.modelPanel = gltf.scene;
          this.modelPanel.scale.set(10.0, 10.0, 10.0);
          // Promise を解決
          resolve();
        });
      })();
    });
  }

  /**
   * 初期化処理
   */
  init() {
    //レンダラー
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setClearColor(App3.RENDERER_PARAM.clearColor);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(
      App3.RENDERER_PARAM.width,
      App3.RENDERER_PARAM.height
    );
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.toneMapping = THREE.ReinhardToneMapping;
    const wrapper = document.querySelector("#webgl");
    wrapper.appendChild(this.renderer.domElement);

    // シーン
    this.scene = new THREE.Scene();

    // カメラ
    this.camera = new THREE.PerspectiveCamera(
      App3.CAMERA_PARAM.fovy,
      App3.CAMERA_PARAM.aspect,
      App3.CAMERA_PARAM.near,
      App3.CAMERA_PARAM.far
    );
    this.camera.position.set(
      App3.CAMERA_PARAM.x,
      App3.CAMERA_PARAM.y,
      App3.CAMERA_PARAM.z
    );
    this.camera.lookAt(App3.CAMERA_PARAM.lookAt);

    // アンビエントライト
    this.ambientLight = new THREE.AmbientLight(
      App3.AMBIENT_LIGHT_PARAM.color,
      App3.AMBIENT_LIGHT_PARAM.intensity
    );
    this.scene.add(this.ambientLight);

    // ポイントライト
    const pointLight = new THREE.PointLight(0xffffff, 1);
    // this.scene.add(pointLight);

    // ジオメトリ
    this.boxGeometry = new THREE.BoxGeometry(1.0, 1.0, 1.0);

    // マテリアル
    this.material = new THREE.MeshPhongMaterial(App3.MATERIAL_PARAM);

    this.groupPanel = new THREE.Group();
    this.groupBody = new THREE.Group();
    // 3dmodelをシーンに追加
    this.scene.add(this.modelBase);
    this.groupPanel.add(this.modelPanel);
    this.groupPanel.position.y = 7.35;
    this.groupPanel.position.z = 0.9;
    this.groupBody.add(this.modelBody);
    this.groupBody.add(this.groupPanel);
    this.scene.add(this.groupBody);

    // OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    /**
     * コンポーザー
     */
    const params = {
      exposure: 2,
      bloomStrength: 1.5,
      bloomThreshold: 0,
      bloomRadius: 0,
    };
    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);

    this.unrealBloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.5,
      0.4,
      0.85
    );
    this.unrealBloomPass.threshold = params.bloomThreshold;
    this.unrealBloomPass.strength = params.bloomStrength;
    this.unrealBloomPass.radius = params.bloomRadius;
    this.composer.addPass(this.unrealBloomPass);
    this.unrealBloomPass.renderToScreen = true;
    this.renderer.toneMappingExposure = Math.pow(params.exposure, 4.0);

    // ヘルパー
    // axesHelper
    const axesBarLength = 5.0;
    this.axesHelper = new THREE.AxesHelper(axesBarLength);
    this.scene.add(this.axesHelper);

    // GUIデバッグ
    this.gui = new GUI();
    const lightGUIGroupe = this.gui.addFolder("Light");
    lightGUIGroupe.add(this.ambientLight, "visible").name("AmbientLight");
    const helperGUIGroupe = this.gui.addFolder("Helper");
    helperGUIGroupe.add(this.axesHelper, "visible").name("AxesHelper");
    helperGUIGroupe;

    const gui = new GUI();

    gui.add(params, "exposure", 0.1, 2).onChange((value) => {
      this.renderer.toneMappingExposure = Math.pow(value, 4.0);
    });

    gui.add(params, "bloomThreshold", 0.0, 1.0).onChange((value) => {
      this.unrealBloomPass.threshold = Number(value);
    });

    gui.add(params, "bloomStrength", 0.0, 3.0).onChange((value) => {
      this.unrealBloomPass.strength = Number(value);
    });

    gui
      .add(params, "bloomRadius", 0.0, 1.0)
      .step(0.01)
      .onChange((value) => {
        this.unrealBloomPass.radius = Number(value);
      });

    gui.add(this.modelBody.position, "x", 0, 10, 0.01).name("translateX");
    gui.add(this.modelBody.position, "y", 0, 10, 0.01).name("translateY");
    gui.add(this.modelBody.position, "z", 0, 10, 0.01).name("translateZ");
  }

  /**
   * 描画処理
   */

  render() {
    requestAnimationFrame(this.render);

    if (this.isDown === true) {
      this.box.rotation.y += 0.02;
    }
    this.modelPanel.rotation.z += 0.02;

    this.groupBody.rotation.y = Math.sin(++this.swingCount.horizontal / 100);

    this.controls.update();

    // this.renderer.render(this.scene, this.camera);
    this.composer.render();
  }
}
