import * as path from "path";

import {
  WebviewPanel,
  window,
  ViewColumn,
  Uri,
  Disposable,
  Position,
  Range,
} from "vscode";

import { iConfig } from "../configuration";
import { iLocales } from "../locales";
import { getFilename } from "../utils";
import { convertTexts2Locales, getMainLocaleData } from "../utils/locale";
import { THandledText } from "../utils/transform";
import { showErrorMessageTip } from "../utils/vscode";

import { getHtmlForWebview } from "../utils/webview";

import { i18nTransform } from "./i18nTransform";
import { loggingService } from "./loggingService";

import { TextDecorations } from "./textDecorations";

export interface Message {
  type: string | number;
  data?: any;
}

export enum EventTypes {
  READY, // 面板初始化完成
  CONFIG, // 发送配置信息
  SAVE, // 保存
  CANCEL, // 取消
  FOCUS, // 面板中选中某个文本进行操作时
}

export class I18nWorkbench {
  private panel?: WebviewPanel;
  private disposables: Disposable[] = [];
  private filepath?: string;
  private texts?: THandledText[];
  private textDecorations = new TextDecorations();

  /**
   *创建面板
   * @memberof I18nWorkbench
   */
  public create() {
    this.panel = window.createWebviewPanel(
      "i18n-workbench",
      "国际化转换面板",
      ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    this.panel.iconPath = {
      light: Uri.file(path.join(iConfig.extensionPath, "media/icon.svg")),
      dark: Uri.file(path.join(iConfig.extensionPath, "media/icon-dark.svg")),
    };

    this.panel.webview.html = getHtmlForWebview(
      this.panel,
      path.join(iConfig.extensionPath, "webapp/dist/index.html")
    );

    this.panel.webview.onDidReceiveMessage(
      (message) => this.handleMessage(message),
      undefined,
      this.disposables
    );

    this.panel.onDidDispose(() => this.dispose(), undefined, this.disposables);
  }

  /**
   * 接收面板发送的消息
   * @param message 消息
   * @returns
   */
  private async handleMessage(message: Message) {
    const { type, data } = message;
    switch (type) {
      case EventTypes.READY:
        // 面板准备完成，发送相关信息
        if (!this.filepath) {
          showErrorMessageTip(
            "保存文件失败，未找到文件",
            `${this.filepath}未找到`
          );
          this.dispose();
          return;
        }
        this.sendMessage({
          type: EventTypes.CONFIG,
          data: {
            filename: getFilename(this.filepath, true),
            texts: this.texts,
            keys: Object.keys(
              getMainLocaleData(
                iConfig.workspacePath,
                iLocales.wLocales || {},
                iConfig.config
              )
            ),
          },
        });
        break;
      case EventTypes.FOCUS:
        // 面板中选中文本进行操作的时候，在源文件除加上提示
        const textInfo = this.texts?.[data?.index || 0];
        if (!textInfo || !this.filepath) {
          loggingService.debug("focus时未找到文件", `${this.filepath}未找到`);
          return;
        }
        const { end, start } = textInfo;
        const range = new Range(
          new Position(start.line, start.column),
          new Position(end.line, end.column)
        );
        const decorations = [
          {
            range,
          },
        ];
        const editor = window.visibleTextEditors.find(
          (e) => e.document.fileName === this.filepath
        );
        if (editor) {
          window.showTextDocument(editor.document, {
            viewColumn: editor.viewColumn,
            selection: range,
            preserveFocus: true,
          });
          this.textDecorations.updateEditor(editor);
          this.textDecorations.updateDecorations(decorations);
        } else {
          // loggingService.debug("未找到当前文件的editor，无法更新标记");
        }
        break;
      case EventTypes.SAVE:
        if (!this.filepath) {
          showErrorMessageTip(
            "保存文件失败，未找到文件",
            `${this.filepath}未找到`
          );
          this.dispose();
          return;
        }
        const { newLocales, locales } = convertTexts2Locales(data.texts);
        i18nTransform.addLocalesToFile(newLocales);
        if (data.transform) {
          i18nTransform.transformWithLocales(this.filepath, locales);
        }
        loggingService.debug("即将关闭workbench，国际化信息保存成功");
        this.dispose();
        break;
      case EventTypes.CANCEL:
        // 取消操作，关闭面板
        this.dispose();
        break;
    }
  }

  /**
   * 发送消息给面板
   * @param message 消息
   */
  public sendMessage(message: Message) {
    this.panel?.webview.postMessage(message);
  }

  /**
   * 显示国际化面板
   * @param data 文件提取出来的相关信息
   */
  public show(data: { filepath?: string; texts?: THandledText[] }) {
    this.create();
    this.filepath = data.filepath;
    this.texts = data.texts;
    loggingService.debug(
      "打开国际化转换面板",
      `当前文件为：${this.filepath}，共传入${this.texts?.length}条文本`
    );
  }

  /**
   * 销毁面板，释放资源
   */
  public dispose() {
    Disposable.from(...this.disposables).dispose();
    this.panel?.dispose();
    this.panel = undefined;
    this.texts = [];
    this.textDecorations.clear();
  }
}

export const i18nWorkbench = new I18nWorkbench();
