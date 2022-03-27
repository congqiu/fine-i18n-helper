import { EventTypes } from "./App";

export const acquireVsCodeApi = {
  postMessage: (message: any) => {
    if (message.type === EventTypes.READY) {
      window.postMessage({
        type: EventTypes.CONFIG,
        data: {
          filename: "App.tsx",
          texts: new Array(10).fill("").map((v, i) => {
            return {
              text: `Text${i}`,
              key: `Text${i}`,
              exist: Math.random() > 0.5,
            };
          }),
        },
      });
    }
  },
};
