import { Router, type Router as RouterType } from "express";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { getQueues } from "../jobs/index.js";
import { env } from "../config/env.js";

const router: RouterType = Router();

if (env.NODE_ENV === "development") {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath("/api/v1/admin/queues");

  // Board is created lazily after queues are initialized
  let boardCreated = false;

  router.use("/queues", (req, res, next) => {
    if (!boardCreated) {
      const queues = getQueues();
      createBullBoard({
        queues: queues.map((q) => new BullMQAdapter(q)),
        serverAdapter,
      });
      boardCreated = true;
    }
    next();
  }, serverAdapter.getRouter());
}

export { router as adminRoutes };
