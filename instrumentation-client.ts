import { initBotId } from "botid/client/core";

if (process.env.NEXT_PUBLIC_FEATURE_LAUNCH_INVITATION === "1") {
  initBotId({
    protect: [
      {
        path: "/api/launch-access/request",
        method: "POST",
      },
    ],
  });
}
