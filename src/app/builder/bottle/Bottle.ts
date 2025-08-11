import { Container, Sprite, Texture, Shader, Geometry, Mesh, Color } from "pixi.js";

import fragment from '../../../shaders/liqued/sharedShader.frag?raw';
import vertex   from '../../../shaders/liqued/sharedShader.vert?raw';


export interface BottleConfig {
  backTexture?: string;
  frontTexture?: string;
  maskTexture?: string;
  x?: number;
  y?: number;
  scale?: number;
  // Gelecekte sıvı parametreleri, shader vs. burada genişletilecek
}

export class Bottle extends Container {
  public back: Sprite;
  public front: Sprite;
  public maskSprite: Sprite;

  constructor(cfg: Required<BottleConfig>) {
    super();

    this.back = new Sprite(Texture.from(cfg.backTexture));
    this.maskSprite = new Sprite(Texture.from(cfg.maskTexture));
    this.front = new Sprite(Texture.from(cfg.frontTexture));

    // Anchor ayarlamak isterseniz (eğer kaynak görseller merkez tabanlı değilse)
    [this.back, this.maskSprite, this.front].forEach(s => {
      s.anchor.set(0.5);  // Görsel hazırlığına göre açılabilir
    });

    // Layering: Back -> (mask target) -> Front
    this.addChild(this.back);
    this.addChild(this.maskSprite);
    this.addChild(this.front);

    // Gelecekte: this.mask = this.maskSprite; (liquid clip vs. için)
    // Şimdilik sadece yapıyı kuruyoruz.

    if (cfg.scale && cfg.scale !== 1) {
      this.scale.set(cfg.scale);
    }
    if (cfg.x) this.x = cfg.x;
    if (cfg.y) this.y = cfg.y;
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
            uFill             : { value: 1.0,   type: 'f32' },
            uRotation         : { value: 0.0,   type: 'f32' },
            uTime             : { value: 0.0,   type: 'f32' },
            uWaveSpeed        : { value: 25.0,  type: 'f32' },
            uWaveFrequency    : { value: 15.0,  type: 'f32' },
            uWaveAmplitude    : { value: 0.01,  type: 'f32' }
          }
        }
      });
      return shader;
  }
  
  private createMesh(): Mesh<Geometry, Shader> {
    const geometry  = this.createGeometry(193, 554);
    const shader    = this.createShader();
    const mesh      = new Mesh( { geometry, shader });
    mesh.name       = "liquidMesh";
    mesh.position.x = 640;
    mesh.position.y = 360;
    return mesh;
  }
}

const DEFAULTS: Required<Omit<BottleConfig, "x" | "y" | "scale">> = {
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
  };
  return new Bottle(merged);
}
