import { MarkdownString, StatusBarAlignment, window } from "vscode";

import { COMMANDS, TOOL_NAME } from "../constant";

/**
 * 切换工作区bar
 * @returns
 */
export const changeWorkspaceBar = () => {
  const barItem = window.createStatusBarItem(StatusBarAlignment.Left);
  barItem.command = COMMANDS.changeWorkspace.cmd;
  barItem.text = COMMANDS.changeWorkspace.title;
  barItem.tooltip = `点击选择${TOOL_NAME}扩展的国际化根节点信息`;
  barItem.show();
  return barItem;
};

/**
 * 创建i18n的bar
 * @returns
 */
export const createI18nBar = () => {
  const barItem = window.createStatusBarItem(StatusBarAlignment.Right);
  barItem.command = COMMANDS.openOutput.cmd;
  barItem.text = COMMANDS.openOutput.title;
  barItem.show();
  barItem.tooltip = new MarkdownString(
    `国际化辅助工具，点击${COMMANDS.openOutput.title}打开输出日志[${COMMANDS.reload.title}](command:${COMMANDS.reload.cmd})\n* [${COMMANDS.findI18nInFile.title}](command:${COMMANDS.findI18nInFile.cmd})\n* [${COMMANDS.toggleShowI18n.title}](command:${COMMANDS.toggleShowI18n.cmd})\n* [${COMMANDS.changeLogLevel.title}](command:${COMMANDS.changeLogLevel.cmd})`
  );
  barItem.tooltip.isTrusted = true;
  return barItem;
};
