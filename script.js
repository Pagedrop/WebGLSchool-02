import * as THREE from "./lib/three.module.js";
import { OrbitControls } from "./lib/OrbitControls.js";
import { GLTFLoader } from "./lib/GLTFLoader.js";
import { EffectComposer } from "./lib/EffectComposer.js";
import { RenderPass } from "./lib/RenderPass.js";
import { UnrealBloomPass } from "./lib/UnrealBloomPass.js";

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
    this.groupAll;
    this.groupPanel;
    this.groupbody;
    this.composer;
    this.renderPass;
    this.unrealBloomPass;

    this.powerOn = true;
    this.maxWingSpeed = 0.1;
    this.wingSpeed = 0;
    this.swing = 0;
    this.bodySwing = 0;
    this.runaway = 0;
    this.runawaySpeed = 0.1;

    this.runawayBar = document.querySelector(".runawayInner");
    this.neckSpeed = 100;
    this.bodySpeed = 50;
    this.break = 1000;

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

    document.querySelector(".powerBtn").addEventListener("click", (e) => {
      e.preventDefault();
      if (this.powerOn) {
        this.powerOn = false;
      } else {
        this.powerOn = true;
      }
    });
    document.querySelector(".lowBtn").addEventListener("click", (e) => {
      e.preventDefault();
      this.maxWingSpeed = 0.1;
      this.runawaySpeed = 0.001;
    });
    document.querySelector(".middleBtn").addEventListener("click", (e) => {
      e.preventDefault();
      this.maxWingSpeed = 0.3;
      this.runawaySpeed = 0.1;
    });
    document.querySelector(".highBtn").addEventListener("click", (e) => {
      e.preventDefault();
      this.maxWingSpeed = 0.5;
      this.runawaySpeed = 0.5;
    });

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
    const modelBase = "./assets/fun001-base.glb";
    const modelBody = "./assets/fun001-body-sub.glb";
    const modelPanel = "./assets/fun001-panel-sub.glb";
    // const modelBase = "./assets/PrimaryIonDrive.glb";
    const loader = new GLTFLoader();
    this.modelBase = null;
    const modelLoader = (url) => {
      return new Promise((resolve, reject) => {
        loader.load(url, (data) => resolve(data), null, reject);
      });
    };
    return new Promise(async (resolve) => {
      const obj1 = await modelLoader(modelBase);
      this.modelBase = obj1.scene;
      this.modelBase.scale.set(10.0, 10.0, 10.0);

      const obj2 = await modelLoader(modelBody);
      this.modelBody = obj2.scene;
      this.modelBody.scale.set(10.0, 10.0, 10.0);

      const obj3 = await modelLoader(modelPanel);
      this.modelPanel = obj3.scene;
      this.modelPanel.scale.set(10.0, 10.0, 10.0);

      await resolve();
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
    this.camera.lookAt(0, 0, 0);

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

    this.groupAll = new THREE.Group();
    this.groupPanel = new THREE.Group();
    this.groupBody = new THREE.Group();
    // 3dmodelをシーンに追加
    this.groupPanel.add(this.modelPanel);
    this.modelBody.scale.set(10.0, 10.0, 10.0);
    this.modelBody.position.y = 6.9;
    this.modelPanel.scale.set(10.0, 10.0, 10.0);
    this.groupPanel.position.y = 7.35;
    this.groupPanel.position.z = 0.9;
    this.groupBody.add(this.modelBody);
    this.groupBody.add(this.groupPanel);
    this.groupAll.add(this.groupBody);
    this.groupAll.add(this.modelBase);
    this.groupAll.position.y = -3;
    this.scene.add(this.groupAll);
    this.modelBase.scale.set(10.0, 10.0, 10.0);

    // OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    /**
     * コンポーザー
     */
    const params = {
      exposure: 2,
      bloomStrength: 1.7,
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

    // GUIデバッグ
    // this.gui = new GUI();
    // const lightGUIGroupe = this.gui.addFolder("Light");
    // lightGUIGroupe.add(this.ambientLight, "visible").name("AmbientLight");
    // const helperGUIGroupe = this.gui.addFolder("Helper");
    // helperGUIGroupe.add(this.axesHelper, "visible").name("AxesHelper");
    // helperGUIGroupe;

    // gui.add(params, "exposure", 0.1, 2).onChange((value) => {
    //   this.renderer.toneMappingExposure = Math.pow(value, 4.0);
    // });

    // gui.add(params, "bloomThreshold", 0.0, 1.0).onChange((value) => {
    //   this.unrealBloomPass.threshold = Number(value);
    // });

    // gui.add(params, "bloomStrength", 0.0, 3.0).onChange((value) => {
    //   this.unrealBloomPass.strength = Number(value);
    // });

    // gui
    //   .add(params, "bloomRadius", 0.0, 1.0)
    //   .step(0.01)
    //   .onChange((value) => {
    //     this.unrealBloomPass.radius = Number(value);
    //   });

    // gui.add(this.modelBody.position, "x", 0, 10, 0.01).name("translateX");
    // gui.add(this.modelBody.position, "y", 0, 10, 0.01).name("translateY");
    // gui.add(this.modelBody.position, "z", 0, 10, 0.01).name("translateZ");
  }

  /**
   * 描画処理
   */

  render() {
    requestAnimationFrame(this.render);
    // console.log(this.runaway);

    if (this.powerOn) {
      this.runaway += this.runawaySpeed;
      if (this.runaway < 100) {
        this.runawayBar.style.width = `${this.runaway}%`;
        if (this.runaway > 50) {
          this.runawayBar.style.backgroundColor = "#ffff00";
        }
        if (this.runaway > 80) {
          this.runawayBar.style.backgroundColor = "#ff0000";
        }

        this.groupBody.rotation.y = Math.sin(++this.swing / this.neckSpeed);
        this.wingSpeed += (this.maxWingSpeed - this.wingSpeed) / 50;
        if (this.wingSpeed > this.maxWingSpeed * 0.99) {
          this.wingSpeed = this.maxWingSpeed;
        }
        this.modelPanel.rotation.z += this.wingSpeed;
      }
    } else {
      this.wingSpeed -= this.wingSpeed / 50;
      if (this.wingSpeed < 0.01) {
        this.wingSpeed = 0;
      }
      this.modelPanel.rotation.z += this.wingSpeed;
    }

    if (this.runaway < 100) {
      this.runawayBar.style.width = `${this.runaway}%`;
      if (this.runaway > 50) {
        this.runawayBar.style.backgroundColor = "#ffff00";
      }
      if (this.runaway > 80) {
        this.runawayBar.style.backgroundColor = "#ff0000";
      }
    } else {
      this.break -= 5;
      if (this.neckSpeed > 1) {
        this.neckSpeed -= 0.5;
      }
      if (this.neckSpeed <= 1) {
        this.neckSpeed = 1;
      }
      this.groupAll.position.x =
        Math.sin((++this.bodySwing / this.bodySpeed) * 10) / 20;
      this.groupAll.position.z =
        Math.sin((++this.bodySwing / this.bodySpeed) * 10) / 20;
      this.groupAll.rotation.z =
        Math.sin(++this.bodySwing / this.neckSpeed) / 5;
      this.groupAll.rotation.x =
        Math.sin(++this.bodySwing / this.neckSpeed) / 50;
      this.groupBody.rotation.y = Math.sin(++this.swing / this.neckSpeed);
      if (this.break < 0) {
        this.groupAll.position.y += 5;
        this.groupAll.position.x += 5;
        this.groupAll.position.z -= 5;
      }
    }

    this.controls.update();

    this.composer.render();
  }
}
