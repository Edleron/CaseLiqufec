import { setup, assign } from "xstate";

export type BottleId = "left" | "right";

export interface MainFlowContext {
  selected: BottleId | null;
  processing: BottleId | null;
}

export type MainFlowEvent =
  | { type: "TAP"; id: BottleId }
  | { type: "RESET" };

export const mainFlowMachine = setup({
  types: {
    context: {} as MainFlowContext,
    events: {} as MainFlowEvent,
  },
  // Implementations belong in setup() in v5
  guards: {
    isSameAsSelected: ({ context, event }) => {
        // TODO -> console.log(context, event);
        return event.type === "TAP" && context.selected === event.id;
    }
      
  },
  actions: {
    // Placeholders; map real side-effects in MainScreen if desired
    animateSelect: () => {},
    approachOther: () => {},
    resetBoth: () => {},
    revertAll: () => {},
    clearContext: assign(() => ({ selected: null, processing: null })),
  },
  // Optional named delay if you prefer: delays: { resolveDelay: 5000 }
}).createMachine({
  id: "mainFlow",
  initial: "idle",
  context: {
    selected: null,
    processing: null,
  },
  states: {
    // 1) Waiting for the first tap
    idle: {
      on: {
        TAP: {
          target: "selected",
          actions: [
            "animateSelect",
            assign(({ event }) => ({ selected: event.id })),
          ],
        },
      },
    },

    // 2) One bottle selected (bumped)
    selected: {
      on: {
        TAP: [
          // same bottle -> reset and go idle
          {
            guard: "isSameAsSelected",
            target: "idle",
            actions: ["resetBoth", "clearContext"],
          },
          // different bottle -> move other bottle and rotate, then wait
          {
            target: "approaching",
            actions: [
              assign(({ event }) => ({
                processing: event.id === "left" ? "right" : "left",
              })),
              "approachOther", // tilt/shift the non-tapped one toward the selected
            ],
          },
        ],
        RESET: {
          target: "idle",
          actions: ["resetBoth", "clearContext"],
        },
      },
    },

    // 3) Other bottle is approaching/tilting; after 5s move to returning
    approaching: {
      after: {
        500: { target: "returning" }, // or use a named delay if configured // TODO -> Approaching process
      },
      on: {
        RESET: {
          target: "idle",
          actions: ["resetBoth", "clearContext"],
        },
      },
    },

    // 4) Bring everything back to base, then finish back at idle
    returning: {
      entry: ["revertAll"], // revert processing + selected back to base (angle 0, x/y base)
      after: {
        500: { target: "idle", actions: ["clearContext"] }, // wait 500ms before going idle
      },
    },
  },
});

// Usage outline (in MainScreen):
// - service = interpret(mainFlowMachine.withConfig({ actions: { animateSelect: () => bottle.bump(), ... } }))
// - service.start(); on bottle:tap => service.send({ type: 'TAP', id: 'left' | 'right' });
// - Optionally send { type: 'RESET' } to cancel and return to idle.
// - service.start(); on bottle:tap => service.send({ type: 'TAP', id: 'left' | 'right' });
// - Optionally send { type: 'RESET' } to cancel and return to idle.
// - Optionally send { type: 'RESET' } to cancel and return to idle.
