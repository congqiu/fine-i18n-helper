import { window } from "vscode";

import { iConfig } from "../configuration";
import { iLocales } from "../locales";
import { transformText } from "../utils";
import {
  createLocalesFolder,
  getMainLocalePath,
  updateLocaleData,
} from "../utils/locale";

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
    text = text.replace(/^(['"])(.*)\1$/, (_match, p1, p2) => {
      quote = p1;
      return p2;
    });

    const result = await transformText(text, wLocales, config);

    const key = await window.showInputBox({
      title: `确认"${text}"的key`,
      prompt: text,
      value: result.key,
    });
    if (!key) {
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
  }
}
