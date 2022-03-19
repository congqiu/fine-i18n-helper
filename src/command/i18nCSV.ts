import * as fs from "fs";
import * as path from "path";

import { Row, writeToStream } from "@fast-csv/format";
import { parse } from "@fast-csv/parse";
import * as chardet from "chardet";
import * as iconv from "iconv-lite";
import { window } from "vscode";

import { iConfig } from "../configuration";
import { loggingService } from "../lib/loggingService";
import { iLocales } from "../locales";
import { getFilename } from "../utils";
import {
  updateLocaleData,
  getLocaleData,
  getLocaleFilepath,
  getMainLocaleData,
  getLocalesExtname,
} from "../utils/locale";

const I18N_VALUE_KEY = "i18n";
class I18nCSV {
  async exportCSV() {
    const editor = window.activeTextEditor;
    const locales = iLocales.wLocales;
    if (!editor || !locales) {
      return;
    }
    const config = iConfig.config;
    const workspacePath = iConfig.workspacePath;
    const mainLocalesData = getMainLocaleData(workspacePath, locales, config);
    const filenames = (
      await window.showInputBox({
        title: "请输入要导出的文件名",
        prompt: "如需同时导出多份，请以,分割文件名",
        placeHolder: "请输入en_US.json,ja_JP.json类似格式",
      })
    )?.split(",");
    filenames?.slice(1).forEach((filename) => {
      const languageData = getLocaleData(locales, filename);
      const rows: Row[] = [];
      Object.keys(mainLocalesData).forEach((key) => {
        if (!languageData[key]) {
          rows.push({
            key,
            main: mainLocalesData[key]?.replace(/[\n]/g, "\\n"),
            [I18N_VALUE_KEY]: languageData[key]?.replace(/[\n]/g, "\\n") || "",
          });
        }
      });
      writeToStream(
        fs.createWriteStream(
          path.join(workspacePath, `${getFilename(filename)}.csv`)
        ),
        rows,
        { headers: true, writeBOM: true }
      );
    });
    loggingService.logInfo("导出完成，请检查工作区目录下csv文件");
    window.showInformationMessage("导出完成，请检查工作区目录下csv文件");
  }

  uploadCSV() {
    const editor = window.activeTextEditor;
    const locales = iLocales.wLocales;
    if (!editor || !locales) {
      return;
    }
    const workspacePath = iConfig.workspacePath;
    const config = iConfig.config;
    const document = editor.document;
    const fsPath = document.uri.fsPath;
    const language = getFilename(fsPath);
    const filename = language + getLocalesExtname(workspacePath, config);
    const mainLocalesData = getMainLocaleData(workspacePath, locales, config);
    const languageData = getLocaleData(locales, filename);
    fs.createReadStream(fsPath)
      .pipe(iconv.decodeStream(chardet.detectFileSync(fsPath) as string))
      .pipe(iconv.encodeStream("utf8"))
      .pipe(
        parse({
          headers: true,
          encoding: "utf8",
        })
      )
      .on("error", (error) => {
        loggingService.logError(`上传${filename}失败`, error);
        window.showErrorMessage(error.message);
      })
      .on("data", (row) => {
        if (
          mainLocalesData[row.key] !== undefined &&
          row[I18N_VALUE_KEY] !== undefined
        ) {
          languageData[row.key] = row[I18N_VALUE_KEY]?.replace(/\\n/g, "\n");
        }
      })
      .on("end", () => {
        const localePath = getLocaleFilepath(workspacePath, config, filename);
        localePath && updateLocaleData(localePath, languageData);
        loggingService.logInfo(`上传成功，已合并到${filename}中`);
        window.showInformationMessage(`上传成功，已合并到${filename}中`);
      });
  }
}

export const i18nCSV = new I18nCSV();
