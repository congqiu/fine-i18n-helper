import * as path from "path";

import { window } from "vscode";

import { iConfig } from "../configuration";
import { loggingService } from "../lib/loggingService";
import { iLocales } from "../locales";
import { getFilename } from "../utils";
import { csv2json, json2csv } from "../utils/csv";
import {
  getLocaleData,
  getMainLocaleData,
  updateLocaleData,
  getLocalesExtname,
  getLocaleFilepath,
  getOtherLocaleFilenames,
} from "../utils/locale";
import { showErrorMessageTip, showInfoMessage } from "../utils/vscode";

class I18nCSV {
  async exportCSV() {
    const editor = window.activeTextEditor;
    const locales = iLocales.wLocales;
    if (!editor || !locales) {
      return;
    }
    const { config } = iConfig;
    const { workspacePath } = iConfig;
    const mainLocalesData = getMainLocaleData(workspacePath, locales, config);
    const extname = getLocalesExtname(workspacePath, config);
    const filenames = getOtherLocaleFilenames(workspacePath, config).map(
      (filename) => getFilename(filename)
    );
    const languages = (
      await window.showInputBox({
        title: "请输入要导出的国际化名称如en_US",
        value: filenames.join(","),
        prompt: "如需同时导出多份，请以,分割导出的国际化名称",
        placeHolder: "请输入en_US,ja_JP类似格式",
      })
    )?.split(",");
    if (languages?.length) {
      languages.forEach((language) => {
        try {
          const languageData = getLocaleData(locales, language + extname);
          json2csv(
            path.join(workspacePath, `${language}.csv`),
            mainLocalesData,
            languageData
          );
          loggingService.logInfo(
            `${language}.csv导出完成，请检查工作区目录下csv文件`
          );
        } catch (error) {
          showErrorMessageTip(`${language}.csv导出失败`, error);
        }
      });
      showInfoMessage("导出完成，请检查工作区目录下csv文件");
    } else {
      loggingService.logDebug("未获得导出的文件名");
    }
  }

  uploadCSV() {
    const editor = window.activeTextEditor;
    const locales = iLocales.wLocales;
    if (!editor || !locales) {
      return;
    }
    const { workspacePath } = iConfig;
    const { config } = iConfig;
    const { document } = editor;
    const { fsPath } = document.uri;
    const language = getFilename(fsPath);
    const filename = language + getLocalesExtname(workspacePath, config);
    const mainLocalesData = getMainLocaleData(workspacePath, locales, config);
    const languageData = getLocaleData(locales, filename);
    csv2json(fsPath, mainLocalesData, languageData)
      .then((data) => {
        const localePath = getLocaleFilepath(workspacePath, config, filename);
        localePath && updateLocaleData(localePath, data);
        showInfoMessage(`上传成功，已合并到${filename}中`);
      })
      .catch((error) => {
        showErrorMessageTip(`上传${filename}的国际化失败`, error);
      });
  }
}

export const i18nCSV = new I18nCSV();
