import { Container, Sprite, Texture } from "pixi.js";

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
}

const DEFAULTS: Required<Omit<BottleConfig, "x" | "y" | "scale">> = {
  backTexture: "Bottle_Back.png",
  frontTexture: "Bottle_Front.png",
  maskTexture: "Bottle_Mask.png",
};

export function createBottle(config: BottleConfig = {}): Bottle {
  const merged: Required<BottleConfig> = {
    backTexture: config.backTexture ?? DEFAULTS.backTexture,
    frontTexture: config.frontTexture ?? DEFAULTS.frontTexture,
    maskTexture: config.maskTexture ?? DEFAULTS.maskTexture,
    x: config.x ?? 0,
    y: config.y ?? 0,
    scale: config.scale ?? 1,
  };
  return new Bottle(merged);
}
