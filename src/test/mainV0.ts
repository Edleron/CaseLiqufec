// eslint-disable

import * as PIXI from "pixi.js";
import { Application, Assets, Sprite, Geometry, Mesh, Shader, Texture, Ticker} from "pixi.js";
import { PixiPlugin } from "gsap/PixiPlugin";
import gsap from "gsap";
import Background from "../Background";

import fragment from './sharedShader.frag?raw';
import vertex from './sharedShader.vert?raw';

(async () => {
  const app = new Application();
  await app.init({ background: "#ffffff", resizeTo: window });
  document.getElementById("pixi-container")!.appendChild(app.canvas);

  (globalThis as any).__PIXI_APP__ = app;
  (globalThis as any).app = app;

  gsap.registerPlugin(PixiPlugin);
  PixiPlugin.registerPIXI(PIXI);

  const assetList = [
    { alias: "Bottle_Front", src: "/assets/Bottle_Front.png" },
    { alias: "Bottle_Back", src: "/assets/Bottle_Back.png" },
    { alias: "Bottle_Mask", src: "/assets/Bottle_Mask.png" },
    { alias: "EllipseRed", src: "/assets/EllipseRed.png" },
    { alias: "water_body", src: "/assets/water_body.png" },
    { alias: "test",       src: "/assets/bg_rotate.jpg" },
    // ...
  ];

  assetList.forEach((asset) => {
    Assets.add({ alias: asset.alias, src: asset.src });
  });

  // Load assets
  await Promise.all(assetList.map((asset) => Assets.load(asset.alias)));

  const background = new Background(Texture.WHITE);
  background.resize(app.screen.width, app.screen.height);
  app.stage.addChild(background);


  // Sample Pixi Sprite object
  const bottleFront = Sprite.from("Bottle_Front");
  bottleFront.anchor.set(0.5);
  bottleFront.scale.set(1);
  bottleFront.position.set(0, 0);
  app.stage.addChild(bottleFront);

  // 1. Geometriyi Oluştur
  // Sıvıyı çizeceğimiz alanı belirleyen bir dörtgen geometri oluşturuyoruz.
  // Boyutları, şişenin maskesiyle aynı olmalı ki tam otursun.
  const liquidGeometry = new Geometry({
    attributes: {
      aPosition: [
        -bottleFront.width / 2, -bottleFront.height / 2,
         bottleFront.width / 2, -bottleFront.height / 2,
         bottleFront.width / 2,  bottleFront.height / 2,
        -bottleFront.width / 2,  bottleFront.height / 2
      ],
      aUV: [0, 0, 1, 0, 1, 1, 0, 1],
    },
    indexBuffer: [0, 1, 2, 0, 2, 3],
  });

  // 2. Shader'ı Oluştur
  // Uniform'larımızı tanımlıyoruz.
  const liquidUniforms = {
    uColor: new PIXI.Color('rgba(255, 0, 80, 1.0)').toRgbArray(),
    uFill: 0.75,
    uRotation: 0.0,
    uTime: 0.0,
    uWaveSpeed: 5.0,
    uWaveFrequency: 15.0,
    uWaveAmplitude: 0.01,
  };

  // PIXI.Shader nesnesini oluşturuyoruz.
  // Bu nesne hem shader kodunu hem de uniform'ları bir arada tutar.
  let liquidShader = Shader.from({
    gl: {
        vertex,
        fragment,
    },
    resources: {
      sharedShader : {
        uColor: {
          value: new PIXI.Color('rgba(255, 0, 80, 1.0)').toRgbArray(),
          type: 'vec4<f32>'
        },
        uFill: {
          value: 1.0,
          type: 'f32'
        },
        uRotation: {
          value: 0.0,
          type: 'f32'
        },
        uTime: {
          value: 0.0,
          type: 'f32'
        },
        uWaveSpeed: {
          value: 25.0,
          type: 'f32'
        },
        uWaveFrequency: {
          value: 15.0,
          type: 'f32'
        },
        uWaveAmplitude: {
          value: 0.01,
          type: 'f32'
        }
      }
    }
  });

  // 3. Mesh'i Oluştur
  // Geometri ve Shader'ı birleştirerek ekranda görünecek nesneyi (Mesh) oluşturuyoruz.
  const liquidMesh = new Mesh({ geometry: liquidGeometry, shader: liquidShader });
  liquidMesh.position.set(640, 360);
  app.stage.addChild(liquidMesh);


  // Can use GSAP for animations
  // gsap.to(bottleFront, {
  //   pixi: {
  //     scale: 1.1,
  //   },
  //   duration: 0.7,
  //   ease: "none",
  //   repeat: -1,
  //   yoyo: true,
  // });

  /*
  const quadGeometry = new Geometry({
    attributes: {
      aPosition: [
        -100,
        -100, // x, y
        100,
        -100, // x, y
        100,
        100, // x, y,
        -100,
        100, // x, y,
      ],
      aUV: [0, 0, 1, 0, 1, 1, 0, 1],
    },
    indexBuffer: [0, 1, 2, 0, 2, 3],
  });

  const shader = Shader.from({
    gl: {
      vertex,
      fragment,
    },
    resources: {
      uTexture: Sprite.from("Bottle_Front").texture.source,
    },
  });

  const quad = new Mesh({
    geometry: quadGeometry,
    shader,
  });

  quad.position.set(400, 300);
  app.stage.addChild(quad);
  */
  
  // Pixi update loop
  app.ticker.add((ticker: Ticker) => {
    liquidShader.resources.sharedShader.uniforms.uFill -= ticker.elapsedMS / 5000;
  });
})();


async function triangle(app : any, shader : any) { 
  const triGeometry = new Geometry({
    attributes: {
      aPosition: [
        -100,
        -100, // x, y
        100,
        -100, // x, y
        100,
        100, // x, y,
      ],
      aUV: [0, 0, 1, 0, 1, 1],
    },
  });

  const triangle = new Mesh({
    geometry: triGeometry,
    shader,
  });

  app.stage.addChild(triangle);
  triangle.position.set(800, 300);
}