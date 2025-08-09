import { BlurFilter, Container, Sprite, Texture } from "pixi.js";
import { gsap } from "gsap";

import { engine } from "../getEngine";
import { Button } from "../ui/Button";
import { Label } from "../ui/Label";
import { RoundedBox } from "../ui/RoundedBox";

/** Popup that shows up when gameplay is paused */
export class PausePopup extends Container {
  /** The dark semi-transparent background covering current screen */
  private bg: Sprite;
  /** Container for the popup UI components */
  private panel: Container;
  /** The popup title label */
  private title: Label;
  /** Button that closes the popup */
  private doneButton: Button;
  /** The panel background */
  private panelBase: RoundedBox;

  constructor() {
    super();

    this.bg = new Sprite(Texture.WHITE);
    this.bg.tint = 0x0;
    this.bg.interactive = true;
    this.addChild(this.bg);

    this.panel = new Container();
    this.addChild(this.panel);

    this.panelBase = new RoundedBox({ height: 300 });
    this.panel.addChild(this.panelBase);

    this.title = new Label({
      text: "Paused",
      style: { fill: 0xec1561, fontSize: 50 },
    });
    this.title.y = -80;
    this.panel.addChild(this.title);

    this.doneButton = new Button({ text: "Resume" });
    this.doneButton.y = 70;
    this.doneButton.onPress.connect(() => engine().navigation.dismissPopup());
    this.panel.addChild(this.doneButton);
  }

  /** Resize the popup, fired whenever window size changes */
  public resize(width: number, height: number) {
    this.bg.width = width;
    this.bg.height = height;
    this.panel.x = width * 0.5;
    this.panel.y = height * 0.5;
  }

  /** Present the popup, animated */
  public async show() {
    const currentEngine = engine();
    if (currentEngine.navigation.currentScreen) {
      currentEngine.navigation.currentScreen.filters = [
        new BlurFilter({ strength: 5 }),
      ];
    }
    // Reset initial states
    this.bg.alpha = 0;
    this.panel.pivot.y = -400;

    // Kill any previous tweens on reused targets
    gsap.killTweensOf([this.bg, this.panel.pivot]);

    // Start background fade (not awaited)
    gsap.to(this.bg, { alpha: 0.8, duration: 0.2, ease: "none" });

    // Pivot animation awaited
    await new Promise<void>((resolve) => {
      gsap.to(this.panel.pivot, {
        y: 0,
        duration: 0.3,
        ease: "back.out(1.7)",
        onComplete: resolve,
      });
    });
  }

  /** Dismiss the popup, animated */
  public async hide() {
    const currentEngine = engine();
    if (currentEngine.navigation.currentScreen) {
      currentEngine.navigation.currentScreen.filters = [];
    }

    gsap.killTweensOf([this.bg, this.panel.pivot]);

    gsap.to(this.bg, { alpha: 0, duration: 0.2, ease: "none" });

    await new Promise<void>((resolve) => {
      gsap.to(this.panel.pivot, {
        y: -500,
        duration: 0.3,
        ease: "back.in(1.7)",
        onComplete: resolve,
      });
    });
  }
}
