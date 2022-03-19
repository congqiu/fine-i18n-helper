import { TBasicConfig, TExtConfiguration } from "./utils/types";

export const TOOL_ID = "fine-i18n-helper";
export const TOOL_ALIAS = "i18n";
export const TOOL_NAME = "国际化辅助工具";

export const COMMANDS = {
  i18nTransformWord: {
    cmd: `${TOOL_ID}.i18nTransformWord`,
    title: "转换选中文本",
  },
  i18nTransformFile: {
    cmd: `${TOOL_ID}.i18nTransformFile`,
    title: "转换当前文件",
  },
  i18nTransformWorkspace: {
    cmd: `${TOOL_ID}.i18nTransformWorkspace`,
    title: "转换当前工作区",
  },
  toggleShowI18n: {
    cmd: `${TOOL_ID}.toggleShowI18n`,
    title: "切换国际化信息显隐",
  },
  changeI18nValue: {
    cmd: `${TOOL_ID}.changeI18nValue`,
    title: "修改国际化值",
  },
  openI18nFile: {
    cmd: `${TOOL_ID}.openI18nFile`,
    title: "打开国际化文件",
  },
  changeWorkspace: {
    cmd: `${TOOL_ID}.changeWorkspace`,
    title: "切换国际化根目录",
  },
  findI18nInFile: {
    cmd: `${TOOL_ID}.findI18nInFile`,
    title: "查找当前文件国际化",
  },
  initConfigFile: {
    cmd: `${TOOL_ID}.initConfigFile`,
    title: "初始化国际化配置文件",
  },
  openOutput: {
    cmd: `${TOOL_ID}.openOutput`,
    title: TOOL_ALIAS,
  },
  changeLogLevel: {
    cmd: `${TOOL_ID}.changeLogLevel`,
    title: "修改日志等级",
  },
  reload: {
    cmd: `${TOOL_ID}.reload`,
    title: "重新加载",
  },
  exportI18nCSV: {
    cmd: `${TOOL_ID}.exportI18nCSV`,
    title: "导出未处理的国际化",
  },
  importI18nCSV: {
    cmd: `${TOOL_ID}.importI18nCSV`,
    title: "导入国际化",
  },
};

export const DOCUMENT_SELECTOR = [
  { scheme: "file", language: "javascript" },
  { scheme: "file", language: "javascriptreact" },
  { scheme: "file", language: "typescript" },
  { scheme: "file", language: "typescriptreact" },
];

export const BASIC_CONFIG: TBasicConfig = {
  localesPath: "src/locales",
  mainLocale: "zh_CN.json",
  functionName: "fineIntl.get",
  prefix: "",
};

export const EXT_CONFIG: TExtConfiguration = {
  entry: "src",
  exclude: [],
  decoratorsBeforeExport: true,
  importLine: "",
  judgeText: /[\u4e00-\u9fa5]/,
  onlyExist: false
};