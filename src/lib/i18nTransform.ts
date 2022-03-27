import * as fs from "fs";
import * as path from "path";

import { Position, window, Selection, ProgressLocation } from "vscode";

import { iConfig } from "../configuration";

import { iLocales } from "../locales";
import { getEntryFiles, getFilename, waitRun } from "../utils";
import {
  convertTexts2Locales,
  createLocalesFolder,
  getMainLocaleData,
  getMainLocalePath,
  updateLocaleData,
} from "../utils/locale";
import { Transform } from "../utils/transform";
import { TLocales } from "../utils/types";
import {
  showDebugMessage,
  showErrorMessageTip,
  showInfoMessage,
} from "../utils/vscode";

import { loggingService } from "./loggingService";

export class I18nTransform {
  private transform: Transform;

  public constructor() {
    this.transform = new Transform();
  }

  private async checkLocalesPath(
    workspacePath: string,
    localesPath: string,
    cb: () => void
  ) {
    if (!iLocales.check(workspacePath)) {
      loggingService.debug(`当前工作区未检测到${localesPath}文件夹`);
      const res = await window.showInformationMessage(
        `当前工作区未检测到${localesPath}文件夹，是否创建文件夹并继续执行？`,
        { modal: true },
        "创建"
      );
      if (res === "创建") {
        createLocalesFolder(workspacePath, localesPath);
        loggingService.debug(`新建${localesPath}文件夹并继续！`);
        cb();
      }
      loggingService.info(`用户取消创建${localesPath}文件夹，后续操作不执行！`);
      return false;
    }
    return true;
  }

  /**
   * 转换当前工作区
   * @returns
   */
  public async transformWorkspace() {
    const { config, workspacePath } = iConfig;

    if (
      !(await this.checkLocalesPath(workspacePath, config.localesPath, () => {
        this.transformWorkspace();
      }))
    ) {
      return;
    }

    const handleResult = await window.showQuickPick(
      [
        "自动处理不存在的文案",
        "只处理国际化文件中已有的文案",
        "只转换文案到国际化文件中",
      ],
      { title: "请选择要处理的文案操作" }
    );

    if (!handleResult) {
      loggingService.debug("用户未选中任何转换当前工作区选项，取消操作");
      return;
    }
    const onlyExist = handleResult === "只处理国际化文件中已有的文案";
    const isExtract = handleResult === "只转换文案到国际化文件中";

    const { wLocales } = iLocales;
    const locales = wLocales
      ? getMainLocaleData(workspacePath, wLocales, config)
      : {};
    let hasFail = false;
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
              const texts = await this.transform.handleTexts(
                this.transform.extract(filepath, config),
                locales,
                config.prefix
              );
              const { newLocales } = convertTexts2Locales(texts);
              needAddLocales = { ...needAddLocales, ...newLocales };
            } else if (onlyExist) {
              this.transformWithLocales(filepath, locales);
            } else {
              const result = await this.transform.transform({
                filepath,
                locales,
                config,
              });
              if (result) {
                const { newLocales, outputCode } = result;
                fs.writeFileSync(filepath, outputCode);
                needAddLocales = { ...needAddLocales, ...newLocales };
              }
            }
          } catch (error) {
            const msg = `${getFilename(filepath)}处理失败`;
            // 第一次报错用error级别，防止错误信息过多
            hasFail
              ? loggingService.debug(msg, error)
              : loggingService.error(msg, error);
            hasFail = true;
          }
        }

        progress.report({
          increment: 99,
          message: "正在将国际化数据写入国际化文件中",
        });
        this.addLocalesToFile(needAddLocales);
        return new Promise<void>((resolve) => {
          resolve();
        });
      }
    );

    hasFail
      ? showErrorMessageTip("当前工作区部分内处理失败！")
      : window.showInformationMessage("当前工作区设定的内容处理完成！");
  }

  /**
   * 转换当前文件
   * @returns
   */
  public async transformActive() {
    const editor = window.activeTextEditor;
    if (!editor) {
      loggingService.warning("转换当前文件失败，未找到当前选中的文件");
      return;
    }
    const { document } = editor;
    const { config, workspacePath } = iConfig;

    if (
      !(await this.checkLocalesPath(workspacePath, config.localesPath, () => {
        this.transformActive();
      }))
    ) {
      return;
    }

    const { wLocales } = iLocales;
    const locales = wLocales
      ? getMainLocaleData(workspacePath, wLocales, config)
      : {};

    const filepath = document.uri.fsPath;

    try {
      const dispose = waitRun(() => {
        showInfoMessage("请稍等，当前文件正在转换中...");
      });
      const result = await this.transform.transform({
        filepath,
        locales,
        config,
      });
      dispose();
      if (!result) {
        showDebugMessage("未找到需要转换的内容", `${filepath}无需再次进行转换`);
        return new Promise<void>((resolve) => {
          resolve();
        });
      }
      const { newLocales, outputCode } = result;

      this.addLocalesToFile(newLocales);

      editor.edit((editBuilder) => {
        editBuilder.replace(
          new Selection(
            new Position(0, 0),
            new Position(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)
          ),
          outputCode
        );
      });

      showDebugMessage("文件内容转换完成！", `${filepath}文件内容转换完成！`);
    } catch (error) {
      showErrorMessageTip(`文件内容转换失败，详细信息请查看输出日志`, error);
    }
  }

  /**
   * 收集当前文件中的国际化数据
   * @returns
   */
  public async extractActive() {
    const editor = window.activeTextEditor;
    if (!editor) {
      loggingService.warning("提取国际化信息失败，未找到当前选中的文件");
      return;
    }
    const { document } = editor;
    const { config, workspacePath } = iConfig;

    if (
      !(await this.checkLocalesPath(workspacePath, config.localesPath, () => {
        this.extractActive();
      }))
    ) {
      return;
    }
    const dispose = waitRun(() => {
      showInfoMessage("请稍等，正在提取中...");
    });

    try {
      const { wLocales } = iLocales;
      const locales = wLocales
        ? getMainLocaleData(workspacePath, wLocales, config)
        : {};

      const filepath = document.uri.fsPath;
      const texts = await this.transform.handleTexts(
        this.transform.extract(filepath, config),
        locales,
        config.prefix
      );
      dispose();
      return { filepath, texts };
    } catch (error) {
      dispose();
      showErrorMessageTip(`文件内容转换失败，详细信息请查看输出日志`, error);
    }
  }

  /**
   * 使用给出的国际化数据转换文件
   * @param filepath 待转换文件路径
   * @param locales 国际化数据
   */
  public async transformWithLocales(filepath: string, locales: TLocales) {
    const { config } = iConfig;
    const result = await this.transform.transformExist({
      filepath,
      locales,
      config,
    });
    if (result) {
      fs.writeFileSync(filepath, result.outputCode);
    }
  }

  /**
   * 把国际化数据写入到国际化文件中
   * @param locales 被增加的国际化数据
   */
  public addLocalesToFile(locales: TLocales) {
    const { config, workspacePath } = iConfig;
    if (Object.keys(locales).length > 0) {
      const mainLocalePath = getMainLocalePath(workspacePath, config);
      mainLocalePath && updateLocaleData(mainLocalePath, locales);
      iLocales.reload();
    }
  }
}

export const i18nTransform = new I18nTransform();
