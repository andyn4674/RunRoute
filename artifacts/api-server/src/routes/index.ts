import { Router, type IRouter } from "express";
import healthRouter from "./health";
import routesRouter from "./routes";
import profilesRouter from "./profiles";
import runsRouter from "./runs";
import openaiRouter from "./openai/index";

const router: IRouter = Router();

router.use(healthRouter);
router.use(routesRouter);
router.use(profilesRouter);
router.use(runsRouter);
router.use(openaiRouter);

export default router;
