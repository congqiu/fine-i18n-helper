import { cosmiconfig } from "cosmiconfig";
import { workspace } from "vscode";

import { EXTENSION_ALIAS, EXTENSION_ID } from "./constant";
import { loggingService } from "./lib/loggingService";

export interface TCommonConfiguration {
  localesPath: string;
  mainLocale: string;
  functionName: string;
  prefix: string;
}

export type TVsConfiguration = TCommonConfiguration & {
  multiRootTip: boolean;
  hoverLocales: string | string[] | null;
  showDecorations: boolean;
  definitions: string | string[];
  transformOnSave: boolean;
  watchMode: boolean;
};

export type TExtendConfiguration = TCommonConfiguration & {
  entry: string;
  exclude: string | string[];
  decoratorsBeforeExport: boolean;
  // importLine: string;
  judgeText: RegExp | string;
};

export type TConfiguration = TVsConfiguration & TExtendConfiguration;

const DEFAULT = {
  multiRootTip: true,
  localesPath: "src/locales",
  mainLocale: "zh_CN.json",
  functionName: "i18n.get",
  prefix: "",
  showDecorations: false,
  hoverLocales: "",
  definitions: "",
  transformOnSave: false,
  watchMode: true,
};

const EXTEND_DEFAULT = {
  localesPath: "src/locales",
  mainLocale: "zh_CN.json",
  functionName: "i18n.get",
  prefix: "",
  entry: "src",
  exclude: [],
  decoratorsBeforeExport: true,
  // importLine: "",
  judgeText: /[\u4e00-\u9fa5]/,
};

class I18nConfig {
  public workspacePath = "";
  public fConfig: TExtendConfiguration;
  public vsConfig: TVsConfiguration = {
    ...DEFAULT,
  };

  public constructor() {
    this.getVsConfig();
    this.fConfig = { ...EXTEND_DEFAULT };
  }

  // 文件配置 > vscode配置 > 默认配置
  public get config() {
    return {
      ...DEFAULT,
      ...EXTEND_DEFAULT,
      ...this.vsConfig,
      ...this.fConfig,
    };
  }

  /**
   * 获取vscode配置项
   */
  public getVsConfig() {
    const config = workspace.getConfiguration(EXTENSION_ID);
    this.vsConfig = {
      multiRootTip: config.get("multiRootTip", DEFAULT.multiRootTip),
      localesPath: config.get("localesPath", DEFAULT.localesPath),
      mainLocale: config.get("mainLocale", DEFAULT.mainLocale),
      functionName: config.get("functionName", DEFAULT.functionName),
      prefix: config.get("prefix", DEFAULT.prefix),
      showDecorations: config.get("showDecorations", DEFAULT.showDecorations),
      hoverLocales: config.get("hoverLocales", DEFAULT.hoverLocales),
      definitions: config.get("definitions", DEFAULT.definitions),
      transformOnSave: config.get("transformOnSave", DEFAULT.transformOnSave),
      watchMode: config.get("watchMode", DEFAULT.watchMode),
    };
  }

  /**
   * 切换工作区
   * @param wPath 当前工作区目录
   * @returns
   */
  public async updateWorkspacePath(wPath: string) {
    this.workspacePath = wPath;
    return await this.getFConfig();
  }

  /**
   * 更新vscode配置项
   * @param section 配置项名称
   * @param value 配置项值
   */
  public async updateVsConfig(section: string, value: any) {
    const config = workspace.getConfiguration(EXTENSION_ID);
    await config.update(section, value);
  }

  /**
   * 从配置文件读取配置
   */
  public async getFConfig() {
    try {
      const explorer = cosmiconfig(`${EXTENSION_ALIAS}`, {
        stopDir: this.workspacePath,
      });
      const configResult = await explorer.search(this.workspacePath);
      if (configResult) {
        this.fConfig = configResult.config;
        return configResult.filepath;
      } else {
        this.fConfig = { ...EXTEND_DEFAULT };
      }
    } catch (error) {
      loggingService.logError("读取配置文件失败", error);
    }
  }
}

export const iConfig = new I18nConfig();
