import { Router, type Router as RouterType } from "express";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { getQueues } from "../jobs/index.js";
import { env } from "../config/env.js";
import { requireAuth } from "../middleware/auth.js";

const router: RouterType = Router();

// Queue dashboard is development-only AND requires an authenticated user,
// so a misconfigured NODE_ENV never exposes job internals to the public.
if (env.NODE_ENV === "development") {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath("/api/v1/admin/queues");

  // Board is created lazily after queues are initialized
  let boardCreated = false;

  router.use("/queues", requireAuth, (req, res, next) => {
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
