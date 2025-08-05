import { Container, Sprite, Texture } from "pixi.js";

export default class Background extends Container {
  sprite: Sprite;
  constructor(bgFrame: string | Texture) {
    super();

    this.sprite = Sprite.from(bgFrame);
    this.addChild(this.sprite);

    this.sprite.tint = 0xdad2d6;
  }

  resize(width: number, height: number) {
    this.sprite.width = width;
    this.sprite.height = height;
  }
}
