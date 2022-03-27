import { HoverProvider, TextDocument, Position, Hover } from "vscode";

import { iConfig } from "../configuration";
import { COMMANDS } from "../constant";
import { iLocales } from "../locales";
import { getLocaleKeyText, getMainLocaleData } from "../utils/locale";
import { getI18nRange } from "../utils/vscode";

export class I18nHoverProvider implements HoverProvider {
  async provideHover(document: TextDocument, position: Position) {
    const { config } = iConfig;
    const { wLocales } = iLocales;
    if (config.hoverLocales === null || !config.functionName || !wLocales) {
      return;
    }

    const { workspacePath } = iConfig;
    const matchRange = getI18nRange(document, position, config);
    if (matchRange) {
      const i18nKey = document.getText(matchRange);
      const text = getLocaleKeyText(i18nKey, wLocales, config.hoverLocales);
      const mainLocales = getMainLocaleData(workspacePath, wLocales, config);
      mainLocales[i18nKey] &&
        text.appendMarkdown(
          `\n [修改中文](command:${
            COMMANDS.changeI18nValue.cmd
          }?${encodeURIComponent(
            JSON.stringify({
              key: i18nKey,
              text: mainLocales[i18nKey],
            })
          )})`
        );
      return new Hover(text);
    }
  }
}
