import {
  workspace,
  TextDocumentSaveReason,
  Disposable,
  FileSystemWatcher,
  window,
  ExtensionContext,
} from "vscode";

import { iConfig } from "../configuration";
import { iLocales } from "../locales";
import { getJSON } from "../utils";
import {
  checkKeyInLocaleData,
  createLocalesFolder,
  getMainLocaleData,
  getMainLocalePath,
  getOtherLocaleFilenames,
  removeOtherLocales,
} from "../utils/locale";
import { isTargetLanguages } from "../utils/vscode";

import { i18nTransform } from "./i18nTransform";

export class I18nEvents {
  private transformFileOnSaveDisposable: Disposable | undefined;
  private localesFileWatcher: FileSystemWatcher | undefined;
  private configFileWatcher: FileSystemWatcher | undefined;

  private activeEditor = window.activeTextEditor;
  private context: ExtensionContext | undefined;

  public init(context: ExtensionContext) {
    this.context = context;
    window.onDidChangeActiveTextEditor(
      (editor) => {
        this.activeEditor = editor;
      },
      null,
      context.subscriptions
    );
    this.saveMainLocaleTip();
    this.watchLocalesFile();
    this.transformFileOnSave(context);
  }

  /**
   * 保存主国际化文件的提示
   */
  public saveMainLocaleTip() {
    workspace.onWillSaveTextDocument(
      (e) => {
        const { config, workspacePath } = iConfig;
        const { document } = e;
        const { wLocales } = iLocales;
        if (
          document.isDirty &&
          wLocales &&
          document.fileName === getMainLocalePath(workspacePath, config)
        ) {
          const mainLocales = getMainLocaleData(
            workspacePath,
            wLocales,
            config
          );
          const newLocales = getJSON(document.getText());
          // 之前的国际化资源在新的国际化资源中没有或者不相等即认为是被改动的
          // 逻辑变更：除上述条件外，还需要其他文件中有对应的key
          const modifiedKeys = Object.keys(mainLocales).filter((v) => {
            return (
              (newLocales[v] === undefined ||
                newLocales[v] !== mainLocales[v]) &&
              checkKeyInLocaleData(
                wLocales,
                v,
                getOtherLocaleFilenames(workspacePath, config)
              )
            );
          });

          if (modifiedKeys.length > 0) {
            window
              .showWarningMessage(
                `当前文件修改了${modifiedKeys.join(
                  ", "
                )}等key，将会删除其他语言文件对应key，是否删除？`,
                ...["Yes", "No"]
              )
              .then((v) => {
                if (v === "Yes") {
                  removeOtherLocales(workspacePath, config, modifiedKeys);
                }
              });
          }
        }
      },
      null,
      this.context?.subscriptions
    );
  }

  /**
   * 配置项更新后进行重新加载
   */
  public reloadByConfig() {
    this.watchLocalesFile();
    this.transformFileOnSave();
  }

  /**
   * 监听locales中的文件
   */
  public watchLocalesFile() {
    if (iConfig.config.watchMode && iConfig.config.localesPath) {
      this.localesFileWatcher = workspace.createFileSystemWatcher(
        `${iConfig.workspacePath}/${iConfig.config.localesPath}/**/*.{ts,js,json}`,
        true
      );
      this.localesFileWatcher.onDidChange(() => {
        iLocales.reload();
      });
    } else {
      this.localesFileWatcher?.dispose();
    }
  }

  /**
   * transformOnSave开启的情况下文件保存时自动转换
   * @param context
   */
  public transformFileOnSave(context?: ExtensionContext) {
    if (iConfig.config.transformOnSave) {
      this.transformFileOnSaveDisposable = workspace.onWillSaveTextDocument(
        (e) => {
          if (
            this.activeEditor?.document === e.document &&
            e.reason === TextDocumentSaveReason.Manual &&
            isTargetLanguages(e.document.languageId)
          ) {
            i18nTransform.transformActive();
          }
        },
        null,
        (context || this.context)?.subscriptions
      );
    } else {
      this.transformFileOnSaveDisposable?.dispose();
    }
  }

  /**
   * 监听配置文件变化
   * @param filepath 文件路径
   * @param dispose
   */
  public watchConfigurationFile(filepath?: string, dispose = false) {
    this.configFileWatcher?.dispose();
    if (filepath && !dispose) {
      // 如果有配置文件则自动创建国际化目录
      createLocalesFolder(iConfig.workspacePath, iConfig.config.localesPath);
      iLocales.reload();
      this.configFileWatcher = workspace.createFileSystemWatcher(
        filepath,
        true
      );
      this.configFileWatcher.onDidChange(async () => {
        await iConfig.getFConfig();
        iLocales.reload();
        this.reloadByConfig();
      });
      this.configFileWatcher.onDidDelete(async () => {
        this.configFileWatcher?.dispose();
        await iConfig.getFConfig();
        iLocales.reload();
        this.reloadByConfig();
      });
    }
  }
}

export const iEvents = new I18nEvents();
