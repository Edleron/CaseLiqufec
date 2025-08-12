import { Container, Sprite, Texture, Shader, Geometry, Mesh, Color, Ticker } from "pixi.js";

import fragment from '../../../shaders/liqued/sharedShader.frag?raw';
import vertex   from '../../../shaders/liqued/sharedShader.vert?raw';

export interface LiquidLayer {
  color       : string;
  fillAmount  : number; // 0.0 - 1.0 arası
}

export interface BottleConfig {
  backTexture?    : string;
  frontTexture?   : string;
  maskTexture?    : string;
  x?              : number;
  y?              : number;
  scale?          : number;
  liquidLayers?   : LiquidLayer[]; // Sıvı katmanları
}

export class Bottle extends Container {
  public back             : Sprite;
  public front            : Sprite;
  public vMask            : Sprite;
  public liquidContainer  : Container;
  public layerCount       : number;

  constructor(cfg: Required<BottleConfig>) {
    super();

    this.back       = new Sprite(Texture.from(cfg.backTexture));
    this.vMask      = new Sprite(Texture.from(cfg.maskTexture));
    this.front      = new Sprite(Texture.from(cfg.frontTexture));
    this.layerCount = cfg.liquidLayers.length;

    // Liquid container'ı oluştur
    this.liquidContainer = new Container();
    this.liquidContainer.name = "liquidContainer";

    this.back.anchor.set(0.5);
    this.vMask.anchor.set(0.5);
    this.front.anchor.set(0.5);
    this.back.position.set(0, -10);

    this.liquidContainer.mask = this.vMask;

    // Layering: Back -> Liquid Container -> Front
    this.addChild(this.back);
    this.addChild(this.liquidContainer);
    this.addChild(this.vMask);
    this.addChild(this.front);

    // Liquid katmanlarını oluştur
    this.createLiquidLayers(cfg.liquidLayers);

    if (cfg.scale && cfg.scale !== 1) {
      this.scale.set(cfg.scale);
    }
    if (cfg.x) this.x = cfg.x;
    if (cfg.y) this.y = cfg.y;
  }

  private createLiquidLayers(layers: LiquidLayer[]) {
    if (!layers || layers.length === 0) return;

    let currentFillLevel  = 0;
    let meshIndex         = 0
    let meshPosition      = [-1 * (554 / this.layerCount), 0, (554 / this.layerCount)];

    // Alt katmandan üst katmana doğru mesh'leri oluştur
    layers.forEach((layer, index) => {
      const mesh  = this.createMesh(layer.color, currentFillLevel, layer.fillAmount);
      mesh.name   = `liquidLayer_${index}`;
      mesh.position.set(0, meshPosition[meshIndex]); // Katman yüksekliğine göre ayarla
      this.liquidContainer.addChild(mesh);
      currentFillLevel += layer.fillAmount;
      meshIndex++;
    });
  }

  private createMesh(color: string, startLevel: number, fillAmount: number): Mesh<Geometry, Shader> {
    const geometry  = this.createGeometry(193, 554 / this.layerCount, color);
    const shader    = this.createShader();
    
    // Shader uniform'larını ayarla
    const totalFill = startLevel + fillAmount;
    shader.resources.sharedShader.uniforms.uFill = totalFill;
    
    const mesh = new Mesh({ geometry, shader });
    mesh.position.set(0, 0); // Bottle'ın kendi koordinat sisteminde
    
    return mesh;
  }

  private createColors(color: string, vertexCount: number = 4): any[] {
    const rgbArray = new Color(color).toRgbArray();
    return Array(vertexCount).fill(rgbArray).flat();
  }

  private createGeometry(width: number, height: number, color: string = 'rgba(255, 0, 80, 1.0)'): Geometry {
    const geometry = new Geometry({
      attributes: {
        aPosition: [
          -width / 2, -height / 2,
           width / 2, -height / 2,
           width / 2,  height / 2,
          -width / 2,  height / 2
        ],
        aUV: [0, 0, 1, 0, 1, 1, 0, 1],
        aColor: this.createColors(color),
      },
      indexBuffer: [0, 1, 2, 0, 2, 3],
    });
    return geometry;
  }

  private createShader(): Shader { 
      let shader = Shader.from({
        gl        : { vertex, fragment },
        resources : {
          sharedShader : {
            uFill             : { value: 0.0,   type: 'f32' },
            uRotation         : { value: -1,   type: 'f32' },
            uTime             : { value: 0.0,   type: 'f32' },
            uWaveSpeed        : { value: 25.0,  type: 'f32' },
            uWaveFrequency    : { value: 15.0,  type: 'f32' },
            uWaveAmplitude    : { value: 0.01,  type: 'f32' }
          }
        }
      });
      return shader;
  }

  private targetFrequency = 12;
  private targetAmplitude = 0.015;
  private _lastAngleDeg   = NaN;

  public update(delta: number) {
    const dt = delta / 30; // ~saniye ölçeği

    if (this.angle !== this._lastAngleDeg) {
      this._lastAngleDeg = this.angle;
      const rot = Math.sin(this.rotation); // [-1, 1]
      this.liquidContainer.children.forEach((mesh: any) => {
        const u = mesh.shader.resources.sharedShader.uniforms;
        u.uRotation = rot;
      });
    }

    this.liquidContainer.children.forEach((mesh: any) => {
      const u = mesh.shader.resources.sharedShader.uniforms;

      // Zamanı ilerlet
      u.uTime += dt * u.uWaveSpeed;

      // İsteğe bağlı: anlık parametre ayarları
      u.uWaveFrequency = this.targetFrequency;
      u.uWaveAmplitude = this.targetAmplitude;
       // runtime’da hız değiştirmek için
    });
  }

  // Click handling (encapsulated)
  private _onTap = () => {
    // Emit a semantic event instead of exposing low-level pointer events
    this.emit("bottle:tap", this);
  };

  public enableClick(options?: { cursor?: string; buttonMode?: boolean }) {
    const { cursor = "pointer", buttonMode = true } = options ?? {};
    this.interactive = true;
    // @ts-ignore
    this.buttonMode = buttonMode;
    // @ts-ignore
    this.cursor = cursor;
    this.off("pointertap", this._onTap); // prevent double-binding
    this.on("pointertap", this._onTap);
  }

  public disableClick() {
    this.interactive = false;
    // @ts-ignore
    this.buttonMode = false;
    this.off("pointertap", this._onTap);
  }
}

const DEFAULTS: Required<Omit<BottleConfig, "x" | "y" | "scale" | "liquidLayers">> = {
  backTexture   : "Bottle_Back.png",
  frontTexture  : "Bottle_Front.png",
  maskTexture   : "Bottle_Mask.png",
};

export function createBottle(config: BottleConfig = {}): Bottle {
  const merged: Required<BottleConfig> = {
    backTexture   : config.backTexture ?? DEFAULTS.backTexture,
    frontTexture  : config.frontTexture ?? DEFAULTS.frontTexture,
    maskTexture   : config.maskTexture ?? DEFAULTS.maskTexture,
    x             : config.x ?? 0,
    y             : config.y ?? 0,
    scale         : config.scale ?? 1,
    liquidLayers  : config.liquidLayers ?? [],
  };
  return new Bottle(merged);
}
