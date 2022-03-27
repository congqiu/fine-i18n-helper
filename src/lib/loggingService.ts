import { window } from "vscode";

import { TOOL_ALIAS } from "../constant";

export const LOG_LEVEL = <const>["DEBUG", "INFO", "WARN", "ERROR", "NONE"];

export type TLogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR" | "NONE";

export class LoggingService {
  private outputChannel = window.createOutputChannel(TOOL_ALIAS);

  private logLevel: TLogLevel = "INFO";

  public setLogLevel(logLevel: TLogLevel) {
    this.logLevel = logLevel;
  }

  public debug(message: string, data?: unknown) {
    this.logMessage(message, "DEBUG");
    if (data) {
      this.logObject(data);
    }
  }

  public info(message: string, data?: unknown) {
    this.logMessage(message, "INFO");
    if (data) {
      this.logObject(data);
    }
  }

  public warning(message: string, data?: unknown) {
    this.logMessage(message, "WARN");
    if (data) {
      this.logObject(data);
    }
  }

  public error(message: string, error?: unknown) {
    this.logMessage(message, "ERROR");
    if (typeof error === "string") {
      this.outputChannel.appendLine(error);
    } else if (error instanceof Error) {
      if (error?.message) {
        this.logMessage(error.message, "ERROR");
      }
      if (error?.stack) {
        this.outputChannel.appendLine(error.stack);
      }
    } else if (error) {
      this.logObject(error);
    }
  }

  public show() {
    this.outputChannel.show();
  }

  private logObject(data: unknown) {
    const message = JSON.stringify(data, null, 2);
    this.outputChannel.appendLine(message);
  }

  private logMessage(message: string, logLevel: TLogLevel) {
    const LEVEL = ["DEBUG", "INFO", "WARN", "ERROR", "NONE"];
    if (LEVEL.slice(LEVEL.indexOf(logLevel) + 1).includes(this.logLevel)) {
      return;
    }
    const title = new Date().toLocaleTimeString();
    this.outputChannel.appendLine(`["${logLevel}" - ${title}] ${message}`);
  }
}

export const loggingService = new LoggingService();
