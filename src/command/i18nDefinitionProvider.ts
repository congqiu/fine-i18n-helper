import { DefinitionProvider, TextDocument, Position } from "vscode";

import { iConfig } from "../configuration";
import { iLocales } from "../locales";
import { getWLocalesPath, getLocaleFilenamesByConfig } from "../utils/locale";
import { getI18nRange, getKeyLocations } from "../utils/vscode";

export class I18nDefinitionProvider implements DefinitionProvider {
  async provideDefinition(document: TextDocument, position: Position) {
    const { config } = iConfig;
    if (!config?.functionName || !iLocales.wLocales) {
      return;
    }

    const matchRange = getI18nRange(document, position, config);
    if (matchRange) {
      const i18nKey = document.getText(matchRange);
      const wLocalesPath = getWLocalesPath(
        iConfig.workspacePath,
        config.localesPath
      );
      return getKeyLocations(
        i18nKey,
        wLocalesPath,
        getLocaleFilenamesByConfig(wLocalesPath, config.definitions)
      );
    }
  }
}
