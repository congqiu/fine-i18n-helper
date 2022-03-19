import { CompletionItemProvider, TextDocument, Position } from "vscode";

import { iConfig } from "../configuration";
import { iLocales } from "../locales";
import { getLocaleCompletionItem, getMainLocalePath } from "../utils/locale";

export class I18nCompletionItemProvider implements CompletionItemProvider {
  provideCompletionItems(document: TextDocument, position: Position) {
    const lineText = document.lineAt(position).text;
    const linePrefix = lineText.substring(0, position.character);

    const config = iConfig.config;
    const workspacePath = iConfig.workspacePath;

    // 如果当前位置不是在国际化方法之后不进行提示
    if (
      !linePrefix.endsWith(`${config.functionName}("`) &&
      !linePrefix.endsWith(`${config.functionName}('`)
    ) {
      return;
    }

    const locales = iLocales.wLocales;
    if (!locales) {
      return;
    }
    return getLocaleCompletionItem(
      locales,
      getMainLocalePath(workspacePath, config)
    );
  }
}
