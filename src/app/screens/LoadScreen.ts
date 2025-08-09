import { Container, Sprite, Texture, Graphics } from "pixi.js";
import { gsap } from "gsap";

/** Screen shown while loading assets */
export class LoadScreen extends Container {
  /** Assets bundles required by this screen */
  public static assetBundles = ["preload"];
  /** The PixiJS logo */
  private grandLogo: Sprite;
  /** Progress Bar */
  private progressBar: Container;
  private barBg: Graphics;
  private barFill: Graphics;
  private readonly barWidth = 320;
  private readonly barHeight = 28;
  private barRadius = 0;

  constructor() {
    super();

    this.progressBar = new Container();
    this.barRadius = this.barHeight / 2;

    this.barBg = new Graphics()
      .lineStyle(2, 0xffffff, 0.15)
      .beginFill(0x3d3d3d, 0.5)
      .drawRoundedRect(0, 0, this.barWidth, this.barHeight, this.barRadius)
      .endFill();

    this.barFill = new Graphics();
    this.drawFill(0); // start empty

    this.progressBar.addChild(this.barBg, this.barFill);
    this.addChild(this.progressBar);

    this.grandLogo = new Sprite({
      texture: Texture.from("logo.png"),
      anchor: 0.5,
      scale: 0.5,
    });
    this.addChild(this.grandLogo);
  }

  public onLoad(progress: number) {
    const p = Math.max(0, Math.min(1, progress)); // clamp
    this.drawFill(p);
  }

  /** Resize the screen, fired whenever window size changes  */
  public resize(width: number, height: number) {
    this.grandLogo.position.set(width * 0.5, height * 0.5 - 80);
    this.progressBar.position.set(
      width * 0.5 - this.barWidth / 2,
      height * 0.5 + 20
    );
  }

  /** Show screen with animations */
  public async show() {
    this.alpha = 1;
  }

  /** Hide screen with animations */
  public async hide() {
    gsap.killTweensOf(this);
    await new Promise<void>((resolve) => {
      gsap.to(this, {
        alpha: 0,
        duration: 0.3,
        delay: 1,
        ease: "none",
        onComplete: resolve,
      });
    });
  }

  private drawFill(progress: number) {
    const w = this.barWidth * progress;
    this.barFill.clear();
    if (w <= 0) return;
    const radius = Math.min(this.barRadius, w / 2);
    this.barFill
      .beginFill(0xe72264, 0.9)
      .drawRoundedRect(0, 0, w, this.barHeight, radius)
      .endFill();
  }
}
