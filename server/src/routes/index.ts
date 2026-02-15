import express from "express";
import servicesRouter from "./api/services";
import pricesRouter from "./api/prices";
import continentsRouter from "./api/continents";
import trendsRouter from "./api/trends";
import reportsRouter from "./api/reports";
import alertsRouter from "./api/alerts";
import communityRouter from "./api/community";

const router = express.Router();

router.use("/services", servicesRouter);
router.use("/prices", pricesRouter);
router.use("/continents", continentsRouter);
router.use("/trends", trendsRouter);
router.use("/reports", reportsRouter);
router.use("/alerts", alertsRouter);
router.use("/community", communityRouter);

export default router;
