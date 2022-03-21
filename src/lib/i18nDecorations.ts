import * as vscode from "vscode";

import { iConfig } from "../configuration";
import { iLocales } from "../locales";
import { getMainLocaleData } from "../utils/locale";
import { getI18nRangesInfo } from "../utils/vscode";

export class I18nDecorations {
  private i18nDecorationType = vscode.window.createTextEditorDecorationType({
    overviewRulerLane: vscode.OverviewRulerLane.Right,
  });

  private activeEditor = vscode.window.activeTextEditor;

  constructor(context: vscode.ExtensionContext) {
    this.init(context);
  }

  init(context: vscode.ExtensionContext) {
    let timeout: NodeJS.Timer | undefined = undefined;

    const triggerUpdateDecorations = (throttle = false) => {
      if (timeout) {
        clearTimeout(timeout);
        timeout = undefined;
      }
      if (throttle) {
        timeout = setTimeout(this.updateDecorations.bind(this), 500);
      } else {
        this.updateDecorations();
      }
    };

    if (this.activeEditor) {
      triggerUpdateDecorations();
    }

    vscode.window.onDidChangeActiveTextEditor(
      (editor) => {
        this.activeEditor = editor;
        if (editor) {
          triggerUpdateDecorations();
        }
      },
      null,
      context.subscriptions
    );

    vscode.workspace.onDidChangeTextDocument(
      (event) => {
        if (
          this.activeEditor &&
          event.document === this.activeEditor.document
        ) {
          triggerUpdateDecorations(true);
        }
      },
      null,
      context.subscriptions
    );
  }

  clear() {
    this.i18nDecorationType.dispose();
    this.i18nDecorationType = vscode.window.createTextEditorDecorationType({
      overviewRulerLane: vscode.OverviewRulerLane.Right,
    });
  }

  // 更新
  updateDecorations() {
    const { config } = iConfig;
    const document = this.activeEditor?.document;
    if (!document || !config.showDecorations || !iLocales.wLocales) {
      this.clear();
      return;
    }
    const i18nDecorations: vscode.DecorationOptions[] = getI18nRangesInfo(
      document,
      config.functionName,
      getMainLocaleData(iConfig.workspacePath, iLocales.wLocales, config)
    ).map((info) => {
      return {
        range: info.range,
        renderOptions: {
          after: {
            color: info.text ? "rgba(153,153,153,0.8)" : "red",
            contentText: ` ➟ ${info.text || info.key}`,
            fontWeight: "normal",
            fontStyle: "italic",
            // textDecoration: `underline solid ${contentText ? "green" : "red"}`
          },
        },
      };
    });
    this.activeEditor?.setDecorations(this.i18nDecorationType, i18nDecorations);
  }
}
