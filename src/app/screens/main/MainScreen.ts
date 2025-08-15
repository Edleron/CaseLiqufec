import { FancyButton } from "@pixi/ui";
// import { animate } from "motion";
// import type { AnimationPlaybackControls } from "motion/react";
import type { Ticker } from "pixi.js";
import { Container } from "pixi.js";
import { gsap } from "gsap";
import { createBottle, Bottle } from "../../builder/bottle";
import { createActor } from "xstate";
import { mainFlowMachine } from "./state/MainFlow";

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

  private flowService = createActor(mainFlowMachine);
  private flowSub?: { unsubscribe: () => void }; // subscribe handle
  private currentFlowState: string = "idle";


  // Click-toggle + position memory
  private isBumped  = new WeakMap<Bottle, boolean>();
  private basePos   = new WeakMap<Bottle, { x: number; y: number }>();

  private paused              = false;
  private readonly bumpHeight = 300;

  constructor() {
    super();

    this.mainContainer      = new Container();
    this.mainContainer.name = "Capsulater";
    this.addChild(this.mainContainer);

    // Sol şişe: 3 farklı renk katmanı ile dolu
    this.bottleLeft  = createBottle({ 
      scale: 1,
    });
    this.bottleLeft.name        = "bottle left";
    this.addChild(this.bottleLeft);

    // Sağ şişe: Boş
    this.bottleRight = createBottle({ 
      scale: 1,
      liquidLayers: [
        { color: 'rgba(100, 0, 80, 1.0)', fillAmount: 0.65 }, // Kırmızı - alt katman
        { color: 'rgba(200, 0, 80, 1.0)', fillAmount: 1 },  // Yeşil - orta katman  
        { color: 'rgba(255, 0, 80, 1.0)', fillAmount: 1 }   // Mavi - üst katman
      ]
     });
    this.bottleRight.name       = "bottle right";
    this.addChild(this.bottleRight);

    // Bottle click (pointer/tap) ayarları -> move to Bottle class
    // this.bottleLeft.interactive = true;
    // @ts-ignore - (Pixi v7'de cursor/buttonMode kullanılabilir)
    // this.bottleLeft.buttonMode = true;
    // @ts-ignore
    // this.bottleLeft.cursor = "pointer";
    // this.bottleLeft.on("pointertap", () => this.bumpBottle(this.bottleLeft));
    this.bottleLeft.enableClick();
    this.bottleLeft.on("bottle:tap", () => {

      if (this.currentFlowState !== "selected") {
        console.log("Click blocked - currently in state:", this.currentFlowState);
        return;
      }

      // TODO -> console.log("Left bottle tapped");
      this.flowService.send({ type: "TAP", id: "left" });
      // this.bumpBottle(this.bottleLeft);
    });

    // this.bottleRight.interactive = true;
    // @ts-ignore
    // this.bottleRight.buttonMode = true;
    // @ts-ignore
    // this.bottleRight.cursor = "pointer";
    // this.bottleRight.on("pointertap", () => this.bumpBottle(this.bottleRight));
    this.bottleRight.enableClick();
    this.bottleRight.on("bottle:tap", () => {

      if (this.currentFlowState !== "idle" && this.currentFlowState !== "selected") {
        console.log("Click blocked - currently in state:", this.currentFlowState);
        return;
      }
      // TODO -> console.log("Right bottle tapped");
      this.flowService.send({ type: "TAP", id: "right" });
      // this.bumpBottle(this.bottleRight);
    });

    // Start FSM
    this.flowService.start();

    // Log state transitions (state value + context)
    this.flowSub = this.flowService.subscribe((snapshot) => {
      // snapshot.value -> "idle" | "selected" | "approaching" | "returning"
      // snapshot.context -> { selected, processing }
      this.currentFlowState = snapshot.value as string;

      console.log("[MainFlow]", snapshot.value, snapshot.context);

      if (snapshot.value === "idle") {
        // Reset both bottles to base position when going idle
        this.resetBottles(this.bottleRight);
      }

      if (snapshot.value === "selected" && snapshot.context.selected === "right") {
        this.bumpBottle(this.bottleRight);
      }

      if (snapshot.value === "approaching" && snapshot.context.selected === "right") {
        this.warpBottle(this.bottleRight, -60);
        this.bottleRight.drainLayer(0);
      }

      if (snapshot.value === "returning" && snapshot.context.processing === "right") {
        this.warpBottle(this.bottleRight, 0);
      }
    });

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

    // Init bump states
    this.isBumped.set(this.bottleLeft, false);
    this.isBumped.set(this.bottleRight, false);
  }

  private warpBottle(target: Bottle, setAngle : number) {
     if (this.paused) return;

     gsap.killTweensOf(target);
     gsap.to(target, {
       rotation: setAngle * (Math.PI / 180), // -60 degrees converted to radians
       duration: 0.4,
       ease: "power2.out",
     });

     this.isBumped.set(target, true);
  }

  private bumpBottle(target: Bottle) {
    if (this.paused) return;

    const base = this.getBasePos(target);
    gsap.killTweensOf(target);
    gsap.to(target, {
      y: base.y - this.bumpHeight,
      duration: 0.4,
      ease: "power2.out",
    });

    this.isBumped.set(target, true);
  }

  // Animate both bottles back to their base positions
  private resetBottles(target: Bottle) {
    const base = this.getBasePos(target);
    gsap.killTweensOf(target);
    gsap.to(target, { y: base.y, duration: 0.35, ease: "power2.inOut" });
     this.isBumped.set(target, false);
  }

  // Remember base position for a bottle
  private setBasePos(b: Bottle, x: number, y: number) {
    this.basePos.set(b, { x, y });
  }

  // Get base position (fallback to current if missing)
  private getBasePos(b: Bottle) {
    return this.basePos.get(b) ?? { x: b.x, y: b.y };
  }



  /** Prepare the screen just before showing */
  public prepare() {}

  /** Update the screen */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public update(_time: Ticker) {
    if (this.paused) return;
    this.bottleRight.update(_time.elapsedMS / 5000);
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
    this.bottleLeft.x = centerX - 175;
    this.bottleLeft.y = centerY + 125;

    this.bottleRight.x = centerX + 175;
    this.bottleRight.y = centerY + 125;

    // Update base positions after layout so "return to base" knows where to go
    this.setBasePos(this.bottleLeft, this.bottleLeft.x, this.bottleLeft.y);
    this.setBasePos(this.bottleRight, this.bottleRight.x, this.bottleRight.y);
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
  public async hide() {
    // Stop FSM when screen hides (optional cleanup)
    this.flowSub?.unsubscribe();
    this.flowSub = undefined;
    this.flowService.stop();
  }

  /** Auto pause the app when window go out of focus */
  public blur() {
    if (!engine().navigation.currentPopup) {
      engine().navigation.presentPopup(PausePopup);
    }
  }
}
