import * as vscode from "vscode";

export const showInformationMessage = (message: string, ...items: string[]) => {
  return vscode.window.showInformationMessage(message, ...items);
};
