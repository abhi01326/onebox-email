import pino from "pino";

const logger = pino({
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:standard",
      ignore: "pid,hostname",
    },
  },
});


export default logger;
// Use logger.info(...) or logger.error(...) from application code where emailId/category/error are available.
