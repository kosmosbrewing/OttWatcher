const express = require("express");
const servicesRouter = require("./api/services");
const pricesRouter = require("./api/prices");
const continentsRouter = require("./api/continents");
const trendsRouter = require("./api/trends");
const reportsRouter = require("./api/reports");
const alertsRouter = require("./api/alerts");

const router = express.Router();

router.use("/services", servicesRouter);
router.use("/prices", pricesRouter);
router.use("/continents", continentsRouter);
router.use("/trends", trendsRouter);
router.use("/reports", reportsRouter);
router.use("/alerts", alertsRouter);

module.exports = router;
