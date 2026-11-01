import { Collection } from "discord.js";
import * as logsCommand from "./logs.js";
import * as exportLogsCommand from "./exportLogs.js";
import * as studentCommand from "./student.js";
import * as classCommand from "./class.js";
import * as attendanceCommand from "./attendance.js";
import * as scoreCommand from "./score.js";
import * as financeCommand from "./finance.js";
import * as alertsCommand from "./alerts.js";

export const commandList = [
  logsCommand,
  exportLogsCommand,
  studentCommand,
  classCommand,
  attendanceCommand,
  scoreCommand,
  financeCommand,
  alertsCommand,
];

export const getCommandsCollection = () => {
  const collection = new Collection();
  for (const cmd of commandList) {
    if (cmd.data && cmd.execute) {
      collection.set(cmd.data.name, cmd);
    }
  }
  return collection;
};

export const getCommandsJSON = () => {
  return commandList.map((cmd) => cmd.data.toJSON());
};

export default {
  commandList,
  getCommandsCollection,
  getCommandsJSON,
};
