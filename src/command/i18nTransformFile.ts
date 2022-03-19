import * as fs from "fs";
import * as path from "path";

import { Position, window, Selection, ProgressLocation } from "vscode";

import { iConfig } from "../configuration";

import { loggingService } from "../lib/loggingService";
import { iLocales } from "../locales";
import { getEntryFiles, getFilename } from "../utils";
import { createLocalesFolder, getMainLocaleData, getMainLocalePath, updateLocaleData } from "../utils/locale";
import { Transform } from "../utils/transform";
import { TLocales, TVsConfiguration } from "../utils/types";
import { showErrorMessageTip } from "../utils/vscode";

export class I18nTransformFile {
  private i18nTransform: Transform;

  constructor() {
    this.i18nTransform = new Transform();
  }

  async transformWorkspace() {
    const editor = window.activeTextEditor;
    if (!editor) {
      return;
    }
    const config = iConfig.config;

    const workspacePath = iConfig.workspacePath;

    if (
      !this.checkLocalesPath(workspacePath, config.localesPath, () => {
        this.transformWorkspace();
      })
    ) {
      return;
    }

    const handleResult = await window.showQuickPick(
      [
        "自动处理不存在的文案",
        "只处理国际化文件中已有的文案",
        "只收集原始文案到国际化文件中",
      ],
      { title: "请选择要处理的文案操作" }
    );

    if (!handleResult) {
      return;
    }
    const onlyExist = handleResult === "只处理国际化文件中已有的文案";
    const isExtract = handleResult === "只收集原始文案到国际化文件中";

    const wLocales = iLocales.wLocales;
    const locales = wLocales
      ? getMainLocaleData(workspacePath, wLocales, config)
      : {};

    const hasFail = false;
    await window.withProgress(
      {
        location: ProgressLocation.Notification,
        title: "正在处理当前工作区设定的内容，请勿操作文件！",
        cancellable: false,
      },
      async (progress) => {
        progress.report({ increment: 0 });

        let needAddLocales = {};
        const files = getEntryFiles(
          path.join(workspacePath, config.entry),
          config.exclude
        );
        for (let index = 0; index < files.length; index++) {
          const filepath = files[index];
          progress.report({
            increment: index / files.length,
            message: `正在处理第${index + 1}/${files.length + 1}个文件...`,
          });
          try {
            if (isExtract) {
              const texts = await this.i18nTransform.handleTexts(
                this.i18nTransform.extract(filepath, config),
                locales,
                config.prefix
              );
              texts
                .filter((v) => !v.exist)
                .forEach((v) => {
                  needAddLocales = { ...needAddLocales, [v.key]: v.text };
                });
            } else {
              const result = await this.i18nTransform.transform({
                filepath,
                locales,
                config: {
                  ...config,
                  onlyExist,
                },
              });
              if (result) {
                const { newLocales, outputCode } = result;
                fs.writeFileSync(filepath, outputCode);
                needAddLocales = { ...needAddLocales, ...newLocales };
              }
            }
          } catch (error) {
            const msg = getFilename(filepath) + "处理失败";
            // 第一次报错用error级别，防止错误信息过多
            hasFail
              ? loggingService.logDebug(msg, error)
              : loggingService.logError(msg, error);
          }
        }

        progress.report({
          increment: 99,
          message: "正在将国际化数据写入国际化文件中",
        });
        this.addLocalesToFile(workspacePath, config, needAddLocales);
        return new Promise<void>((resolve) => {
          resolve();
        });
      }
    );

    hasFail
      ? showErrorMessageTip("当前工作区部分内处理失败！")
      : window.showInformationMessage("当前工作区设定的内容处理完成！");
  }

  async transformActive() {
    const editor = window.activeTextEditor;
    if (!editor) {
      return;
    }
    const document = editor.document;
    const config = iConfig.config;

    const workspacePath = iConfig.workspacePath;

    if (
      !this.checkLocalesPath(workspacePath, config.localesPath, () => {
        this.transformActive();
      })
    ) {
      return;
    }

    const wLocales = iLocales.wLocales;
    const locales = wLocales
      ? getMainLocaleData(workspacePath, wLocales, config)
      : {};

    const filepath = document.uri.fsPath;
    
    await window.withProgress(
      {
        location: ProgressLocation.Notification,
        title: "正在转换当前文件，请勿操作文件！",
        cancellable: false,
      },
      async (progress) => {
        progress.report({ increment: 0 });

        try {
          const result = await this.i18nTransform.transform({
            filepath,
            locales,
            config,
          });
          if (!result) {
            loggingService.logDebug(`${filepath}无需再次进行转换`);
            window.showInformationMessage("未找到需要转换的内容");
            return new Promise<void>((resolve) => {
              resolve();
            });
          }
          const { newLocales, outputCode } = result;
    
          progress.report({
            increment: 99,
            message: "正在将国际化数据写入国际化文件中",
          });

          this.addLocalesToFile(workspacePath, config, newLocales);
    
          editor.edit((editBuilder) => {
            editBuilder.replace(
              new Selection(
                new Position(0, 0),
                new Position(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)
              ),
              outputCode
            );
          });
    
          window.showInformationMessage("文件内容转换完成！");
          loggingService.logDebug(`${filepath}文件内容转换完成！`);
        } catch (error) {
          progress.report({
            increment: 100,
            message: "文件内容转换失败",
          });
          showErrorMessageTip(`文件内容转换失败，详细信息请查看输出日志`, error);
        }

        return new Promise<void>((resolve) => {
          resolve();
        });
      }
    );
  }

  private async checkLocalesPath(
    workspacePath: string,
    localesPath: string,
    cb: () => void
  ) {
    if (!iLocales.check(workspacePath)) {
      loggingService.logDebug(`当前工作区未检测到${localesPath}文件夹`);
      const res = await window.showInformationMessage(
        `当前工作区未检测到${localesPath}文件夹，是否创建文件夹并继续执行？`,
        { modal: true },
        ...["创建", "停止"]
      );
      if (res === "创建") {
        createLocalesFolder(workspacePath, localesPath);
        loggingService.logDebug(`新建${localesPath}文件夹并继续！`);
        cb();
      }
      return false;
    }
    return true;
  }

  private addLocalesToFile(
    workspacePath: string,
    config: TVsConfiguration,
    locales: TLocales
  ) {
    if (Object.keys(locales).length > 0) {
      const mainLocalePath = getMainLocalePath(workspacePath, config);
      mainLocalePath && updateLocaleData(mainLocalePath, locales);
      iLocales.reload();
    }
  }
}

export const i18nTransformFile = new I18nTransformFile();
