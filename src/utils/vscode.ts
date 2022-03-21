import * as path from "path";

import * as vscode from "vscode";

import { COMMANDS } from "../constant";
import { loggingService } from "../lib/loggingService";

import { TLocales, TVsConfiguration } from "./types";

import { coverFnNameToRegExp, coverPrefixToRegExp, getKeyPosition } from ".";

/**
 * 获取当前文件所在工作区
 * @deprecated 直接使用i18nConfig.workspacePath
 * @param document
 * @returns
 */
export function getCurrentWorkspace(document: vscode.TextDocument) {
  const { fileName } = document;
  const workspaceFolders = vscode.workspace.workspaceFolders || [];
  return workspaceFolders.find(
    (item) => fileName.indexOf(item.uri.fsPath) > -1
  );
}

/**
 * 根据配置获取匹配的文字范围
 * 优先根据函数名获取，再根据配置了的前缀获取
 * @param document
 * @param position
 * @param config
 * @returns
 */
export const getI18nRange = (
  document: vscode.TextDocument,
  position: vscode.Position,
  config: TVsConfiguration
) => {
  const regex = coverFnNameToRegExp(config.functionName);
  let matchRange = document.getWordRangeAtPosition(position, regex);
  // todo getWordRangeAtPosition只能获取到单行的，如果换行则无法匹配，所以采取前缀再匹配一次，还是应该看看怎么获取多行的
  if (!matchRange && config.prefix?.trim()) {
    try {
      matchRange = document.getWordRangeAtPosition(
        position,
        coverPrefixToRegExp(config.prefix)
      );
    } catch (error) {}
  }
  return matchRange;
};

/**
 * 获取文件中全部国际化的range信息
 * @param document
 * @param functionName 国际化函数名
 * @param locales 国际化信息
 * @returns
 */
export const getI18nRangesInfo = (
  document: vscode.TextDocument,
  functionName: string,
  locales: TLocales
) => {
  const text = document.getText();
  const regExp = coverFnNameToRegExp(functionName);
  const ranges: {
    range: vscode.Range;
    key: string;
    text: string;
  }[] = [];
  let match;
  while ((match = regExp?.exec(text))) {
    const start = document.positionAt(match.index);
    const key = match[0];
    const end = document.positionAt(match.index + key.length);
    const text = locales[key];

    ranges.push({
      range: new vscode.Range(start, end),
      key,
      text,
    });
  }
  return ranges;
};

/**
 * 返回key在i18n文件中的位置
 * @param key 搜索的key
 * @param wLocalesPath 工作区i18n文件路径
 * @param paths i18n文件路径数组
 * @returns
 */
export function getKeyLocations(
  key: string,
  wLocalesPath: string,
  paths: string[]
) {
  const locations = [];
  try {
    for (let i = 0; i < paths.length; i++) {
      const filepath = path.join(wLocalesPath, paths[i]);
      const position = getKeyPosition(filepath, key);
      if (position) {
        locations.push(
          new vscode.Location(
            vscode.Uri.file(filepath),
            new vscode.Position(position.line, position.character)
          )
        );
      }
    }
  } catch (error) {
    loggingService.logError("返回key在i18n文件中的位置失败", error);
  }

  return locations;
}

export const isTargetLanguages = (language: string) => {
  return [
    "javascriptreact",
    "javascript",
    "typescript",
    "typescriptreact",
  ].includes(language);
};

export const showErrorMessageTip = (message: string, error?: unknown) => {
  loggingService.logError(message, error);
  vscode.window.showErrorMessage(message, "查看输出日志").then((v) => {
    if (v === "查看输出日志") {
      vscode.commands.executeCommand(COMMANDS.openOutput.cmd);
    }
  });
};

export const showInfoMessage = (message: string, data?: unknown) => {
  loggingService.logInfo(message, data);
  vscode.window.showInformationMessage(message);
};
