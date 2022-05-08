import { window } from "vscode";

import { iConfig } from "../configuration";
import { loggingService } from "../lib/loggingService";
import { iLocales } from "../locales";
import { transformText } from "../utils";
import {
  createLocalesFolder,
  updateLocaleData,
  getMainLocalePath,
  getMainLocaleData,
} from "../utils/locale";
import { showErrorMessageTip } from "../utils/vscode";

export const i18nTransformWord = async () => {
  const editor = window.activeTextEditor;
  if (!editor) {
    return;
  }
  const { document, selection } = editor;
  const { config, workspacePath } = iConfig;

  if (!iLocales.check(workspacePath)) {
    const res = await window.showInformationMessage(
      `当前工作区未检测到${config.localesPath}文件夹，是否创建文件夹并继续执行？`,
      { modal: true },
      "创建"
    );
    if (res === "创建") {
      createLocalesFolder(workspacePath, config.localesPath);
      i18nTransformWord();
    }
    return;
  }

  const { wLocales } = iLocales;
  const locales = wLocales
    ? getMainLocaleData(workspacePath, wLocales, config)
    : {};

  let quote = "'";
  let text = document.getText(selection);

  try {
    text = text.replace(/^(['"])(.*)\1$/, (_match, p1, p2) => {
      quote = p1;
      return p2;
    });
    loggingService.debug(`开始转换'${text}'`);
    const result = await transformText(text, locales, config.prefix);

    loggingService.debug(
      `'${text}'的key获取结束，${
        result.add ? "自动翻译" : "从文件中获取"
      }的key为${result.key}`
    );

    const key = await window.showInputBox({
      title: `确认"${text}"的key`,
      prompt: text,
      value: result.key,
      validateInput: (input) => {
        if (locales[input] && locales[input] !== text) {
          return `"${input}"已作为"${locales[input]}"的key存在，请重新输入`;
        }
      },
    });
    if (!key) {
      loggingService.debug(`'${text}'转换未完成，用户取消或没有获取到key`);
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
    loggingService.debug(`'${text}'转换完成，当前key为${key}`);
  } catch (error) {
    showErrorMessageTip(`转换选中文本失败，详细信息请查看输出日志`, error);
  }
};
