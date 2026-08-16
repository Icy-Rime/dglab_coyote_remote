import { Logger } from "@deno-library/logger";

const LOG_PATH = "log";

export const logger = new Logger();

export const initLogger = async () => {
    await logger.initFileLogger(LOG_PATH, { rotate: true });
    logger.disableConsole();
};
