// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

import {
  changeI18nValue,
  changeLogLevel,
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
import { COMMANDS, DOCUMENT_SELECTOR, TOOL_ID, TOOL_NAME } from "./constant";
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
  loggingService.logInfo(`Extension Name: ${TOOL_NAME}.`);
  loggingService.logInfo(
    `Extension Version: ${require("../package.json").version}`
  );

  // 工作区检测
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders?.length) {
    loggingService.logError(`${TOOL_NAME}目前只支持在工作区环境下使用`);
    return;
  }
  const configPath = await iConfig.updateWorkspacePath(
    workspaceFolders[0].uri.fsPath
  );
  iEvents.watchConfigurationFile(configPath);
  if (workspaceFolders.length > 1) {
    iConfig.config.multiRootTip &&
      vscode.window
        .showInformationMessage(
          `检测到当前工作区为Multi-root，${TOOL_NAME}使用${workspaceFolders[0]}作为localesPath路径，可以通过点击左下角状态栏进行切换`,
          "不再提示"
        )
        .then((v) => {
          if (v === "不再提示") {
            iConfig.updateVsConfig("multiRootTip", false);
          }
        });
    context.subscriptions.push(changeWorkspaceBar());
  }

  // 注册切换工作区
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.changeWorkspace.cmd, () =>
      selectWorkspace(workspaceFolders)
    )
  );

  // 注册hover显示国际化值
  context.subscriptions.push(
    vscode.languages.registerHoverProvider(
      DOCUMENT_SELECTOR,
      new I18nHoverProvider()
    )
  );

  // 注册修改国际化的值
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

  // 是否显示全部key的国际化值
  const i18nDecorations = new I18nDecorations(context);
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.toggleShowI18n.cmd, async () => {
      await iConfig.updateVsConfig(
        "showDecorations",
        !iConfig.config.showDecorations
      );
      i18nDecorations.updateDecorations();
    })
  );

  // 注册在当前文件中查找被国际化的值
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.findI18nInFile.cmd, findI18nInFile)
  );

  // 创建右下角文字标
  context.subscriptions.push(createI18nBar());

  // 注册点击key跳转到i18n文件
  context.subscriptions.push(
    vscode.languages.registerDefinitionProvider(
      DOCUMENT_SELECTOR,
      new I18nDefinitionProvider()
    )
  );

  // 注册选中文字进行国际化
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

  // 打开output栏
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.openOutput.cmd, () =>
      loggingService.show()
    )
  );

  // 注册修改日志等级
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.changeLogLevel.cmd, changeLogLevel)
  );

  // 初始化配置文件
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.initConfigFile.cmd, initConfigFile)
  );

  iEvents.init(context);
  // 注册重新加载
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.reload.cmd, () => {
      iEvents.watchLocalesFile();
      iLocales.reload();
    })
  );
  // 监听配置文件变化
  vscode.workspace.onDidChangeConfiguration(
    (e) => {
      iConfig.getVsConfig();
      if (e.affectsConfiguration(`${TOOL_ID}.watchMode`)) {
        iEvents.watchLocalesFile();
      }
      if (e.affectsConfiguration(`${TOOL_ID}.localesPath`)) {
        iEvents.watchLocalesFile();
        iLocales.reload();
      }
      if (e.affectsConfiguration(`${TOOL_ID}.transformOnSave`)) {
        iEvents.transformFileOnSave(context);
      }
    },
    null,
    context.subscriptions
  );

  // ——————————————————————————非通用功能——————————————————

  // --------------------------react---------------------

  // 注册国际化当前文件
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.i18nTransformFile.cmd, () =>
      i18nTransformFile.transformActive()
    )
  );
  // 注册国际化当前工作区
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.i18nTransformWorkspace.cmd, () =>
      i18nTransformFile.transformWorkspace()
    )
  );

  // --------------------------导入导出数据--------------------
  // 导出csv文件
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.exportI18nCSV.cmd, () =>
      i18nCSV.exportCSV()
    )
  );
  // 导入csv文件
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.importI18nCSV.cmd, () =>
      i18nCSV.uploadCSV()
    )
  );

  loggingService.logInfo(`${TOOL_NAME}配置完成！`);
}

// this method is called when your extension is deactivated
export function deactivate() {}
