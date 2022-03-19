import { window } from "vscode";

import { iConfig } from "../configuration";
import { loggingService } from "../lib/loggingService";
import { iLocales } from "../locales";
import { transformText } from "../utils";
import {
  createLocalesFolder,
  updateLocaleData,
  getMainLocalePath,
} from "../utils/locale";
import { showErrorMessageTip } from "../utils/vscode";

export class I18nTransformWord {
  constructor() {
    this.init();
  }

  async init() {
    const editor = window.activeTextEditor;
    if (!editor) {
      return;
    }
    const document = editor.document;
    const selection = editor.selection;
    const config = iConfig.config;
    const workspacePath = iConfig.workspacePath;

    if (!iLocales.check(workspacePath)) {
      const res = await window.showInformationMessage(
        `当前工作区未检测到${config.localesPath}文件夹，是否创建文件夹并继续执行？`,
        { modal: true },
        ...["创建", "停止"]
      );
      if (res === "创建") {
        createLocalesFolder(workspacePath, config.localesPath);
        this.init();
      }
      return;
    }

    const wLocales = iLocales.wLocales || {};

    let quote = "'";
    let text = document.getText(selection);

    try {
      text = text.replace(/^(['"])(.*)\1$/, (_match, p1, p2) => {
        quote = p1;
        return p2;
      });
      loggingService.logDebug(`开始转换'${text}'`);
      const result = await transformText(text, wLocales, config.prefix);
      loggingService.logDebug(
        `'${text}'的key获取结束，${result.add ? "自动翻译" : "从文件中获取"}的key为${result.key}`
      );
      const key = await window.showInputBox({
        title: `确认"${text}"的key`,
        prompt: text,
        value: result.key,
      });
      if (!key) {
        loggingService.logDebug(`'${text}'转换未完成，用户取消或没有获取到key`);
        return;
      }
      if (result.add) {
        const mainPath = getMainLocalePath(workspacePath, config);
        updateLocaleData(mainPath, { [key]: result.text });
        iLocales.reload();
      }

      editor.edit((editBuilder) => {
        editBuilder.replace(
          selection,
          `${config.functionName}(${quote}${key}${quote})`
        );
      });
      loggingService.logDebug(`'${text}'转换完成，当前key为${key}`);
    } catch (error) {
      showErrorMessageTip(`转换选中文本失败，详细信息请查看输出日志`, error);
    }
  }
}
