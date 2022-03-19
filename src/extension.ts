// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

import {
  changeI18nValue,
  findI18nInFile,
  initConfigFile,
  openI18nFile,
  selectWorkspace,
  TChangeI18nValueArgs,
  TOpenI18nFileArgs,
} from "./command";
import { i18nCSV } from "./command/i18nCSV";
import { i18nTransformFile } from "./command/i18nTransformFile";
import { I18nTransformWord } from "./command/i18nTransformWord";
import { iConfig } from "./configuration";
import {
  COMMANDS,
  DOCUMENT_SELECTOR,
  EXTENSION_ID,
  EXTENSION_NAME,
} from "./constant";
import { changeWorkspaceBar, createI18nBar } from "./lib";
import { I18nCompletionItemProvider } from "./lib/i18nCompletionProvider";
import { I18nDecorations } from "./lib/i18nDecorations";
import { I18nDefinitionProvider } from "./lib/i18nDefinitionProvider";
import { iEvents } from "./lib/i18nEvents";
import { I18nHoverProvider } from "./lib/i18nHoverProvider";
import { loggingService } from "./lib/loggingService";
import { iLocales } from "./locales";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
  loggingService.logInfo(`Extension Name: ${EXTENSION_NAME}.`);
  loggingService.logInfo(
    `Extension Version: ${require("../package.json").version}`
  );

  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders?.length) {
    loggingService.logError(`${EXTENSION_NAME}目前只支持在工作区环境下使用`);
    return;
  }

  const configPath = await iConfig.updateWorkspacePath(
    workspaceFolders[0].uri.fsPath
  );
  iEvents.watchConfigurationFile(configPath);
  if (workspaceFolders.length > 1 && iConfig.config.multiRootTip) {
    vscode.window
      .showInformationMessage(
        `检测到当前工作区为Multi-root，${EXTENSION_NAME}使用${workspaceFolders[0]}作为localesPath路径，可以通过点击左下角状态栏进行切换`,
        "不再提示"
      )
      .then((v) => {
        if (v === "不再提示") {
          iConfig.updateVsConfig("multiRootTip", false);
        }
      });
    context.subscriptions.push(changeWorkspaceBar());
  }

  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.changeWorkspace.cmd, () => {
      selectWorkspace(workspaceFolders);
    })
  );

  // 注册hover显示翻译值
  context.subscriptions.push(
    vscode.languages.registerHoverProvider(
      DOCUMENT_SELECTOR,
      new I18nHoverProvider()
    )
  );

  // 注册选中文字进行翻译
  context.subscriptions.push(
    vscode.commands.registerCommand(
      COMMANDS.changeI18nValue.cmd,
      (args: TChangeI18nValueArgs) => changeI18nValue(args)
    )
  );
  // 打开国际化文件
  context.subscriptions.push(
    vscode.commands.registerCommand(
      COMMANDS.openI18nFile.cmd,
      (args: TOpenI18nFileArgs) => openI18nFile(args)
    )
  );

  // 是否显示全部key的翻译值
  const i18nDecorations = new I18nDecorations(context);

  // 注册是否显示文字翻译
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.toggleShowI18n.cmd, async () => {
      await iConfig.updateVsConfig(
        "showDecorations",
        !iConfig.config.showDecorations
      );
      i18nDecorations.updateDecorations();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.findI18nInFile.cmd, findI18nInFile)
  );

  context.subscriptions.push(createI18nBar(COMMANDS.openOutput));

  // 注册点击key跳转到i18n文件
  context.subscriptions.push(
    vscode.languages.registerDefinitionProvider(
      DOCUMENT_SELECTOR,
      new I18nDefinitionProvider()
    )
  );

  // 注册选中文字进行翻译
  context.subscriptions.push(
    vscode.commands.registerCommand(
      COMMANDS.i18nTransformWord.cmd,
      () => new I18nTransformWord()
    )
  );

  // 注册代码补全
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      DOCUMENT_SELECTOR,
      new I18nCompletionItemProvider(),
      ...[`"`, `'`]
    )
  );

  iEvents.init(context);
  vscode.workspace.onDidChangeConfiguration(
    (e) => {
      iConfig.getVsConfig();
      if (e.affectsConfiguration(`${EXTENSION_ID}.watchMode`)) {
        iEvents.watchLocalesFile();
      }
      if (e.affectsConfiguration(`${EXTENSION_ID}.localesPath`)) {
        iEvents.watchLocalesFile();
        iLocales.reload();
      }
      if (e.affectsConfiguration(`${EXTENSION_ID}.transformOnSave`)) {
        iEvents.transformFileOnSave(context);
      }
    },
    null,
    context.subscriptions
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.openOutput.cmd, () => {
      loggingService.show();
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.initConfigFile.cmd, initConfigFile)
  );

  // ——————————————————————————非通用功能——————————————————
  // --------------------------react---------------------
  // 注册当前文件进行翻译
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.i18nTransformFile.cmd, () =>
      i18nTransformFile.transformActive()
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.i18nTransformWorkspace.cmd, () =>
      i18nTransformFile.transformWorkspace()
    )
  );

  // --------------------------导出数据--------------------
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.exportI18nCSV.cmd, () =>
      i18nCSV.exportCSV()
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.importI18nCSV.cmd, () =>
      i18nCSV.uploadCSV()
    )
  );

  loggingService.logInfo(`${EXTENSION_NAME}配置完成！`);
}

// this method is called when your extension is deactivated
export function deactivate() {}
