const cron = require("node-cron");
const findMissionHouses = require("./findMissionHouses");

cron.schedule("*/15 * * * *", findMissionHouses);
