import { cosmiconfig } from "cosmiconfig";
import { workspace } from "vscode";

import { BASIC_CONFIG, EXT_CONFIG, TOOL_ALIAS, TOOL_ID } from "./constant";

import { loggingService } from "./lib/loggingService";
import { getFilename } from "./utils";
import { TConfiguration, TVsConfiguration } from "./utils/types";

const VS_CONFIG = {
  ...BASIC_CONFIG,
  multiRootTip: true,
  showDecorations: false,
  hoverLocales: "",
  definitions: "",
  transformOnSave: false,
  watchMode: true,
  showWorkbench: false,
};

class I18nConfig {
  public workspacePath = "";
  public extensionPath = "";
  public fConfig: TConfiguration;
  public vsConfig: TVsConfiguration = {
    ...VS_CONFIG,
  };

  public constructor() {
    this.getVsConfig();
    this.fConfig = { ...BASIC_CONFIG, ...EXT_CONFIG };
  }

  // 文件配置 > vscode配置 > 默认配置
  public get config() {
    return {
      ...VS_CONFIG,
      ...EXT_CONFIG,
      ...this.vsConfig,
      ...this.fConfig,
    };
  }

  /**
   * 获取vscode配置项
   */
  public getVsConfig() {
    const config = workspace.getConfiguration(TOOL_ID);
    this.vsConfig = {
      localesPath: config.get("localesPath", VS_CONFIG.localesPath),
      mainLocale: config.get("mainLocale", VS_CONFIG.mainLocale),
      functionName: config.get("functionName", VS_CONFIG.functionName),
      prefix: config.get("prefix", VS_CONFIG.prefix),
      multiRootTip: config.get("multiRootTip", VS_CONFIG.multiRootTip),
      showDecorations: config.get("showDecorations", VS_CONFIG.showDecorations),
      hoverLocales: config.get("hoverLocales", VS_CONFIG.hoverLocales),
      definitions: config.get("definitions", VS_CONFIG.definitions),
      transformOnSave: config.get("transformOnSave", VS_CONFIG.transformOnSave),
      watchMode: config.get("watchMode", VS_CONFIG.watchMode),
      showWorkbench: config.get("showWorkbench", VS_CONFIG.showWorkbench),
    };
  }

  public setExtensionPath(extensionPath: string) {
    this.extensionPath = extensionPath;
  }

  /**
   * 切换工作区
   * @param wPath 当前工作区目录
   * @returns 配置文件路径
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
  public async updateVsConfig<T extends keyof TVsConfiguration>(
    section: T,
    value: TVsConfiguration[T]
  ) {
    const config = workspace.getConfiguration(TOOL_ID);
    await config.update(section, value);
  }

  /**
   * 从配置文件读取配置
   * @returns 配置文件路径
   */
  public async getFConfig() {
    try {
      const explorer = cosmiconfig(`${TOOL_ALIAS}`, {
        stopDir: this.workspacePath,
      });
      const configResult = await explorer.search(this.workspacePath);
      if (configResult) {
        loggingService.info(
          `读取配置文件${getFilename(configResult.filepath)}成功`
        );
        this.fConfig = configResult.config;
        return configResult.filepath;
      }
    } catch (error) {
      loggingService.error("读取配置文件失败", error);
    }
    this.fConfig = { ...BASIC_CONFIG, ...EXT_CONFIG };
  }
}

export const iConfig = new I18nConfig();
