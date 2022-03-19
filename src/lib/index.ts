import { MarkdownString, StatusBarAlignment, window } from "vscode";

import { COMMANDS, EXTENSION_NAME } from "../constant";

/**
 * 切换工作区bar
 * @returns
 */
export const changeWorkspaceBar = () => {
  const barItem = window.createStatusBarItem(StatusBarAlignment.Left);
  barItem.command = COMMANDS.changeWorkspace.cmd;
  barItem.text = COMMANDS.changeWorkspace.title;
  barItem.tooltip = `点击选择${EXTENSION_NAME}扩展的国际化根节点信息`;
  barItem.show();
  return barItem;
};

/**
 * 创建i18n的bar
 * @param command
 * @returns
 */
export const createI18nBar = (command: { cmd: string; title: string }) => {
  const barItem = window.createStatusBarItem(StatusBarAlignment.Right);
  barItem.command = command.cmd;
  barItem.text = command.title;
  barItem.show();
  barItem.tooltip = new MarkdownString(
    `国际化辅助工具，点击i18n打开输出日志\n* [查找当前国际化](command:${COMMANDS.findI18nInFile.cmd})\n* [切换当前页国际化显隐](command:${COMMANDS.toggleShowI18n.cmd})`
  );
  barItem.tooltip.isTrusted = true;
  return barItem;
};
