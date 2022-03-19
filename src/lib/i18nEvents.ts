import {
  workspace,
  TextDocumentSaveReason,
  Disposable,
  FileSystemWatcher,
  window,
  ExtensionContext,
} from "vscode";

import { i18nTransformFile } from "../command/i18nTransformFile";
import { iConfig } from "../configuration";
import { iLocales } from "../locales";
import { getJSON } from "../utils";
import {
  getMainLocalePath,
  getMainLocaleData,
  removeOtherLocales,
} from "../utils/locale";
import { isTargetLanguages } from "../utils/vscode";

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

  public saveMainLocaleTip() {
    workspace.onWillSaveTextDocument(
      (e) => {
        const config = iConfig.config;
        const document = e.document;
        const workspacePath = iConfig.workspacePath;
        if (
          document.isDirty &&
          iLocales.wLocales &&
          document.fileName === getMainLocalePath(workspacePath, config)
        ) {
          const mainLocales = getMainLocaleData(
            workspacePath,
            iLocales.wLocales,
            config
          );
          const newLocales = getJSON(document.getText());
          const removeKeys = Object.keys(mainLocales).filter((v) => {
            return (
              newLocales[v] === undefined || newLocales[v] !== mainLocales[v]
            );
          });

          if (removeKeys.length > 0) {
            window
              .showWarningMessage(
                `当前文件修改了${removeKeys.join(
                  ", "
                )}等key，将会删除其他语言文件对应key，是否删除？`,
                ...["Yes", "No"]
              )
              .then((v) => {
                if (v === "Yes") {
                  removeOtherLocales(workspacePath, config, removeKeys);
                }
              });
          }
        }
      },
      null,
      this.context?.subscriptions
    );
  }

  public reloadByConfig() {
    this.watchLocalesFile();
    this.transformFileOnSave();
  }

  public watchLocalesFile() {
    if (iConfig.config.watchMode) {
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

  public transformFileOnSave(context?: ExtensionContext) {
    if (iConfig.config.transformOnSave) {
      this.transformFileOnSaveDisposable = workspace.onWillSaveTextDocument(
        (e) => {
          if (
            this.activeEditor?.document === e.document &&
            e.reason === TextDocumentSaveReason.Manual &&
            isTargetLanguages(e.document.languageId)
          ) {
            i18nTransformFile.transformActive();
          }
        },
        null,
        (context || this.context)?.subscriptions
      );
    } else {
      this.transformFileOnSaveDisposable?.dispose();
    }
  }

  public watchConfigurationFile(filepath?: string, dispose = false) {
    this.configFileWatcher?.dispose();
    if (filepath && !dispose) {
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
