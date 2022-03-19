import { window } from "vscode";

import { EXTENSION_ALIAS } from "../constant";

type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR" | "NONE";

export class LoggingService {
  private outputChannel = window.createOutputChannel(EXTENSION_ALIAS);

  private logLevel: LogLevel = "INFO";

  public setLogLevel(logLevel: LogLevel) {
    this.logLevel = logLevel;
  }

  public logDebug(message: string, data?: unknown) {
    this.logMessage(message, "DEBUG");
    if (data) {
      this.logObject(data);
    }
  }

  public logInfo(message: string, data?: unknown) {
    this.logMessage(message, "INFO");
    if (data) {
      this.logObject(data);
    }
  }

  public logWarning(message: string, data?: unknown) {
    this.logMessage(message, "WARN");
    if (data) {
      this.logObject(data);
    }
  }

  public logError(message: string, error?: unknown) {
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

  private logMessage(message: string, logLevel: LogLevel) {
    // todo delete
    // eslint-disable-next-line no-console
    console.log(message);
    const LEVEL = ["DEBUG", "INFO", "WARN", "ERROR", "NONE"];
    if (LEVEL.slice(LEVEL.indexOf(logLevel) + 1).includes(this.logLevel)) {
      return;
    }
    const title = new Date().toLocaleTimeString();
    this.outputChannel.appendLine(`["${logLevel}" - ${title}] ${message}`);
  }
}

export const loggingService = new LoggingService();

