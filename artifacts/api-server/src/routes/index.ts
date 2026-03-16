import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import routesRouter from "./routes";
import profilesRouter from "./profiles";
import runsRouter from "./runs";
import openaiRouter from "./openai/index";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(routesRouter);
router.use(profilesRouter);
router.use(runsRouter);
router.use(openaiRouter);

export default router;
