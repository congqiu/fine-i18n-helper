import * as fs from "fs";
import * as path from "path";

import * as vscode from "vscode";

import { BASIC_CONFIG, COMMANDS } from "../constant";
import { loggingService } from "../lib/loggingService";

import { THandledText } from "./transform";
import {
  TWLocales,
  TVsConfiguration,
  TWorkspacesLocales,
  TLocales,
  TBasicConfig,
} from "./types";

import { getFilename, getJSON, mkdirsSync, sortJSON } from ".";

/**
 * 根据配置获取定义的i18n文件列表
 * @param localesFolder i18n文件夹路径
 * @param conf 获取文件名的参数
 * @returns
 */
export function getLocaleFilenamesByConfig(
  localesFolder: string,
  conf: string | string[]
) {
  try {
    let filenames = fs.readdirSync(localesFolder);
    if (typeof conf === "string" && conf !== "") {
      filenames = filenames.filter((f) => f.indexOf(conf) > -1);
    } else if (Array.isArray(conf)) {
      filenames = filenames.filter((f) => conf.includes(getFilename(f)));
    }
    return filenames;
  } catch (error) {
    loggingService.error("根据配置获取定义的i18n文件列表失败", error);
  }
  return [];
}

/**
 * 检查当前文件所在工作区是否有国际化localesPath目录
 * @param workspacePath 工作区路径
 * @param localesPath config.localesPath
 * @returns
 */
export function checkLocalesPath(workspacePath: string, localesPath: string) {
  return fs.existsSync(path.join(workspacePath, localesPath));
}

/**
 * 创建localesPath目录
 * @param workspacePath 工作区路径
 * @param localesPath config.localesPath
 * @returns
 */
export function createLocalesFolder(
  workspacePath: string,
  localesPath: string
) {
  if (!checkLocalesPath(workspacePath, localesPath)) {
    mkdirsSync(path.join(workspacePath, localesPath));
  }
}

/**
 * 读取i18n文件数据
 * @param localesFolder i18n文件夹路径
 * @returns
 */
export function getLocalesData(localesFolder: string) {
  if (!fs.existsSync(localesFolder)) {
    return;
  }

  const locales: TWLocales = {};
  fs.readdirSync(localesFolder).forEach((filename) => {
    try {
      const filePath = path.join(localesFolder, filename);
      const value = getJSON(fs.readFileSync(filePath).toString("utf8"));
      locales[filename] = value;
    } catch (error) {
      loggingService.error("读取i18n文件数据失败", error);
    }
  });

  if (Object.keys(locales).length > 0) {
    return locales;
  }
}

/**
 * 获取全部工作区i18n文件数据
 * 返回类似{w1: TWLocales, w2: TWLocales}数据
 * @param config 配置信息
 * @returns
 */
export function getWorkspacesLocales(config: TVsConfiguration) {
  const workspaceFolders = vscode.workspace.workspaceFolders || [];
  const workspacesLocales: TWorkspacesLocales = {};

  for (let i = 0; i < workspaceFolders.length; i++) {
    try {
      const { fsPath } = workspaceFolders[i].uri;
      const localesPath = path.join(fsPath, config.localesPath);
      const data = getLocalesData(localesPath);
      if (data) {
        workspacesLocales[fsPath] = data;
      }
    } catch (error) {
      loggingService.error("获取全部工作区i18n文件数据失败", error);
    }
  }

  if (Object.keys(workspacesLocales).length > 0) {
    loggingService.debug("获取18n文件内容成功");
    return workspacesLocales;
  }
}

/**
 * 获取所选工作区文件夹的国际化文件数据
 * @deprecated 直接使用iLocales.wLocales
 * @param workspacePath 工作区路径
 * @param workspacesLocales 全部国际化数据
 * @returns
 */
export function getWorkspaceLocales(
  workspacePath: string,
  workspacesLocales: TWorkspacesLocales
) {
  return workspacesLocales[workspacePath] || {};
}

/**
 * 获取所选工作区文件夹的国际化文件路径
 * @param workspacePath 工作区路径
 * @param localesPath config.localesPath
 * @returns
 */
export function getWLocalesPath(workspacePath: string, localesPath: string) {
  return path.join(workspacePath, localesPath);
}

/**
 * 获取主国际化文件名，优先从配置中获取
 * @param workspacePath 工作区路径
 * @param config 配置信息
 * @returns
 */
export function getMainLocaleFilename(
  workspacePath: string,
  config: TBasicConfig
) {
  const localesPath = path.join(workspacePath, config.localesPath);
  if (config.mainLocale) {
    const filename = config.mainLocale;
    if (fs.existsSync(path.join(localesPath, filename))) {
      return filename;
    }
    return (
      fs.readdirSync(localesPath).find((f) => getFilename(f) === filename) ||
      BASIC_CONFIG.mainLocale
    );
  }
  return BASIC_CONFIG.mainLocale;
}

/**
 * 获取非主国际化文件名，优先从配置中获取
 * @param workspacePath 工作区路径
 * @param config 配置信息
 * @returns 非主国际化文件名
 */
export function getOtherLocaleFilenames(
  workspacePath: string,
  config: TVsConfiguration
) {
  const localesPath = getWLocalesPath(workspacePath, config.localesPath);
  const mainFilename = getMainLocaleFilename(workspacePath, config);
  return fs.readdirSync(localesPath).filter((f) => f !== mainFilename);
}

/**
 * 获取主国际化文件路径
 * @param workspacePath 工作区路径
 * @param config 配置信息
 * @returns
 */
export function getMainLocalePath(
  workspacePath: string,
  config: TVsConfiguration
) {
  const localesPath = getWLocalesPath(workspacePath, config.localesPath);
  const filename = getMainLocaleFilename(workspacePath, config);
  return path.join(localesPath, filename);
}

/**
 * 获取主国际化文件数据
 * @param workspacePath 工作区路径
 * @param wLocales 当前工作区国际化数据
 * @param config 配置信息
 * @returns
 */
export function getMainLocaleData(
  workspacePath: string,
  wLocales: TWLocales,
  config: TVsConfiguration
) {
  const mainPath = getMainLocalePath(workspacePath, config);
  return wLocales[getFilename(mainPath, true)] || {};
}

/**
 * 获取国际化文件扩展名
 * @param workspacePath 工作区路径
 * @param config 配置信息
 * @returns
 */
export function getLocalesExtname(
  workspacePath: string,
  config: TVsConfiguration
) {
  const mainFilename = getMainLocaleFilename(workspacePath, config);
  return path.extname(mainFilename);
}

/**
 * 获取国际化文件路径
 * @param workspacePath 工作区路径
 * @param config 配置信息
 * @param filename 文件名
 * @returns
 */
export function getLocaleFilepath(
  workspacePath: string,
  config: TVsConfiguration,
  filename: string
) {
  const localesPath = getWLocalesPath(workspacePath, config.localesPath);
  return path.join(localesPath, filename);
}

/**
 * 获取指定语言国际化数据
 * @param wLocales 当前工作区国际化数据
 * @param filename 文件名，即语言
 * @returns
 */
export function getLocaleData(wLocales: TWLocales, filename: string) {
  return wLocales[filename] || {};
}

/**
 * 检查key是否在国际化数据中
 * @param wLocales 国际化数据
 * @param key 指定的key
 * @param filenames 检查哪些文件
 * @returns boolean
 */
export function checkKeyInLocaleData(
  wLocales: TWLocales,
  key: string,
  filenames?: string[]
) {
  if (!filenames) {
    filenames = Object.keys(wLocales);
  }
  return filenames.some((filename) => wLocales[filename][key]);
}

/**
 * 获取key对应的文本
 * @param key key值
 * @param wLocales 当前工作区的i18n数据
 * @param hoverLocales 显示哪些文件里的文本
 * @returns
 */
export function getLocaleKeyText(
  key: string,
  wLocales: TWLocales,
  hoverLocales: TVsConfiguration["hoverLocales"]
) {
  let show = [...Object.keys(wLocales)];
  if (typeof hoverLocales === "string" && hoverLocales !== "") {
    show = [hoverLocales];
  } else if (Array.isArray(hoverLocales)) {
    show = [...hoverLocales];
  } else if (hoverLocales === null) {
    show = [];
  }
  let str = "";
  for (const filename in wLocales) {
    if (
      Object.prototype.hasOwnProperty.call(wLocales, filename) &&
      show.includes(filename) &&
      wLocales[filename][key]
    ) {
      const text = wLocales[filename][key].replace(/[\n]/g, "\\n");
      const link = `[${text}](command:${
        COMMANDS.openI18nFile.cmd
      }?${encodeURIComponent(
        JSON.stringify({
          filename,
          key,
        })
      )} "在'${filename}'中打开")`;
      str += `* _${getFilename(filename)}_&nbsp;&nbsp;${link}\n`;
    }
  }
  if (str === "") {
    // todo 给出更明显的错误提示或者可以直接进行添加
    str = "当前key在i18n文件中没有找到，请检查是否正确添加";
  }

  const text = new vscode.MarkdownString(str);
  text.isTrusted = true;
  return text;
}

/**
 * 检查如果不存在则生成国际化文件路径
 * @param filepath 国际化文件路径
 */
export function updateLocalePath(filepath: string) {
  try {
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      mkdirsSync(dir);
    }
    if (!fs.existsSync(filepath)) {
      fs.writeFileSync(filepath, sortJSON({}));
    }
  } catch (error) {
    loggingService.error("生成国际化文件路径失败", error);
  }
}

/**
 * 往i18n文件中追加国际化数据
 * @param filepath 国际化文件路径
 * @param data 国际化数据
 */
export function updateLocaleData(filepath: string, data: TLocales) {
  try {
    updateLocalePath(filepath);
    let json = {};
    json = getJSON(fs.readFileSync(filepath).toString("utf8"));
    fs.writeFileSync(filepath, sortJSON({ ...json, ...data }));
  } catch (error) {
    loggingService.debug("往i18n文件中追加国际化数据失败", error);
  }
}

/**
 * 删除国际化数据
 * @param filepath 国际化文件路径
 * @param keys 要删除的国际化key数组
 */
export function removeLocaleData(filepath: string, keys: string[]) {
  try {
    let json: TLocales = {};
    json = getJSON(fs.readFileSync(filepath).toString("utf8"));
    keys.forEach((key) => delete json[key]);
    fs.writeFileSync(filepath, sortJSON(json));
  } catch (error) {
    loggingService.debug("删除国际化数据失败", error);
  }
}

/**
 * 删除非主语言的国际化中对应的数据
 * @param workspacePath
 * @param config
 * @param keys
 */
export function removeOtherLocales(
  workspacePath: string,
  config: TVsConfiguration,
  keys: string[]
) {
  const localesPath = getWLocalesPath(workspacePath, config.localesPath);
  const mainFilename = getMainLocaleFilename(workspacePath, config);
  const files = fs.readdirSync(localesPath);
  files.forEach((file) => {
    if (file !== mainFilename) {
      removeLocaleData(path.join(localesPath, file), keys);
    }
  });
}

/**
 * 获取国际化的key提示
 * @param locales 当前工作区国际化数据
 * @param mainLocalePath 主国际化路径
 * @returns
 */
export function getLocaleCompletionItem(
  mainLocales: TLocales,
  wLocales: TWLocales
) {
  return Object.keys(mainLocales).map((key) => {
    const completion = new vscode.CompletionItem(
      key,
      vscode.CompletionItemKind.Variable
    );
    completion.label = mainLocales[key];
    completion.documentation = getLocaleKeyText(key, wLocales, "");
    completion.insertText = key;
    return completion;
  });
}

/**
 * 把texts转换成国际化数据
 * @param texts THandledText
 * @returns \{ locales, newLocales }
 */
export function convertTexts2Locales(
  texts: (THandledText & { override?: boolean })[]
) {
  let newLocales: TLocales = {};
  const locales: TLocales = {};
  texts.forEach((v) => {
    locales[v.key] = v.text;
    if (!v.exist || v.override) {
      newLocales = { ...newLocales, [v.key]: v.text };
    }
  });
  return { locales, newLocales };
}
