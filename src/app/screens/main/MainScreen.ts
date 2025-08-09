import { FancyButton } from "@pixi/ui";
// import { animate } from "motion";
// import type { AnimationPlaybackControls } from "motion/react";
import type { Ticker } from "pixi.js";
import { Container } from "pixi.js";
import { gsap } from "gsap";
import { createBottle, Bottle } from "../../builder/bottle";

import { engine } from "../../getEngine";
import { PausePopup } from "../../popups/PausePopup";
import { SettingsPopup } from "../../popups/SettingsPopup";

// TODO DEL -> import { Bouncer } from "./olders/Bouncer";

/** The screen that holds the app */
export class MainScreen extends Container {
  /** Assets bundles required by this screen */
  public static assetBundles = ["main"];

  public mainContainer      : Container;
  private bottleLeft        : Bottle;
  private bottleRight       : Bottle;
  private pauseButton       : FancyButton;
  private settingsButton    : FancyButton;
  // TODO DEL -> private bouncer: Bouncer;
  private paused = false;


  constructor() {
    super();

    this.mainContainer      = new Container();
    this.mainContainer.name = "Capsulater";
    this.addChild(this.mainContainer);


    this.bottleLeft             = createBottle({ scale: 1});
    this.bottleLeft.name        = "bottle left";
    this.addChild(this.bottleLeft);

    this.bottleRight            = createBottle({ scale: 1});
    this.bottleRight.name       = "bottle right";
    this.addChild(this.bottleRight);

    const buttonAnimations = {
      hover: {
        props: {
          scale: { x: 1.1, y: 1.1 },
        },
        duration: 100,
      },
      pressed: {
        props: {
          scale: { x: 0.9, y: 0.9 },
        },
        duration: 100,
      },
    };
    this.pauseButton = new FancyButton({
      defaultView: "icon-pause.png",
      anchor: 0.5,
      animations: buttonAnimations,
    });
    this.pauseButton.onPress.connect(() =>
      engine().navigation.presentPopup(PausePopup),
    );
    this.addChild(this.pauseButton);

    this.settingsButton = new FancyButton({
      defaultView: "icon-settings.png",
      anchor: 0.5,
      animations: buttonAnimations,
    });
    this.settingsButton.onPress.connect(() =>
      engine().navigation.presentPopup(SettingsPopup),
    );
    this.addChild(this.settingsButton);
  }

  /** Prepare the screen just before showing */
  public prepare() {}

  /** Update the screen */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public update(_time: Ticker) {
    if (this.paused) return;
    // TODO DEL -> this.bouncer.update();
  }

  /** Pause gameplay - automatically fired when a popup is presented */
  public async pause() {
    this.mainContainer.interactiveChildren  = false;
    this.bottleLeft.interactive             = false;
    this.bottleRight.interactive            = false;
    this.paused                             = true;
  }

  /** Resume gameplay */
  public async resume() {
    this.mainContainer.interactiveChildren  = true;
    this.bottleLeft.interactive             = true;
    this.bottleRight.interactive            = true;
    this.paused                             = false;
  }

  /** Fully reset */
  public reset() {}

  /** Resize the screen, fired whenever window size changes */
  public resize(width: number, height: number) {
    const centerX = width * 0.5;
    const centerY = height * 0.5;

    this.mainContainer.x = centerX;
    this.mainContainer.y = centerY;
    this.pauseButton.x = 30;
    this.pauseButton.y = 30;
    this.settingsButton.x = width - 30;
    this.settingsButton.y = 30;

    // Bottle local koordinatları (0,0) kalsın; mainContainer zaten ortada.
    this.bottleLeft.x = centerX - 250;
    this.bottleLeft.y = centerY;

    this.bottleRight.x = centerX + 250;
    this.bottleRight.y = centerY;

    // TODO DEL -> this.bouncer.resize(width, height);
  }

  /** Show screen with animations */
  public async show(): Promise<void> {
    engine().audio.bgm.play("main/sounds/bgm-main.mp3", { volume: 0.5 });

    const elementsToAnimate = [
      this.pauseButton,
      this.settingsButton,
      this.bottleLeft, // bottle da fade-in
      this.bottleRight, // bottle da fade-in
    ];

    gsap.killTweensOf(elementsToAnimate);
    elementsToAnimate.forEach((el) => (el.alpha = 0));

    const tweens = elementsToAnimate.map((el) =>
      gsap.to(el, {
        alpha: 1,
        duration: 0.3,
        delay: 0.75,
        ease: "back.out(1.7)",
      }),
    );

    await new Promise<void>((resolve) =>
      tweens[tweens.length - 1].eventCallback("onComplete", resolve),
    );

    // TODO DEL -> this.bouncer.show(this);
  }

  /** Hide screen with animations */
  public async hide() {}

  /** Auto pause the app when window go out of focus */
  public blur() {
    if (!engine().navigation.currentPopup) {
      engine().navigation.presentPopup(PausePopup);
    }
  }
}
