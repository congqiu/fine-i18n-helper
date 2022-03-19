export const EXTENSION_ID = "fine-i18n-helper";
export const EXTENSION_ALIAS = "i18n";
export const EXTENSION_NAME = "国际化辅助工具";

export const COMMANDS = {
  i18nTransformWord: {
    cmd: `${EXTENSION_ID}.i18nTransformWord`,
    title: "翻译选中文字",
  },
  i18nTransformFile: {
    cmd: `${EXTENSION_ID}.i18nTransformFile`,
    title: "翻译文件",
  },
  i18nTransformWorkspace: {
    cmd: `${EXTENSION_ID}.i18nTransformWorkspace`,
    title: "翻译选中工作区",
  },
  toggleShowI18n: {
    cmd: `${EXTENSION_ID}.toggleShowI18n`,
    title: "切换是否显示国际化信息",
  },
  exportI18nCSV: {
    cmd: `${EXTENSION_ID}.exportI18nCSV`,
    title: "导出未翻译文案为文件",
  },
  importI18nCSV: {
    cmd: `${EXTENSION_ID}.importI18nCSV`,
    title: "导入带有翻译文案的文件",
  },
  changeI18nValue: {
    cmd: `${EXTENSION_ID}.changeI18nValue`,
    title: "修改国际化值",
  },
  openI18nFile: {
    cmd: `${EXTENSION_ID}.openI18nFile`,
    title: "打开国际化文件",
  },
  changeWorkspace: {
    cmd: `${EXTENSION_ID}.changeWorkspace`,
    title: "切换国际化根目录",
  },
  findI18nInFile: {
    cmd: `${EXTENSION_ID}.findI18nInFile`,
    title: "查找当前文件国际化",
  },
  openOutput: {
    cmd: `${EXTENSION_ID}.openOutput`,
    title: EXTENSION_ALIAS,
  },
  initConfigFile: {
    cmd: `${EXTENSION_ID}.initConfigFile`,
    title: "创建配置文件",
  },
};

export const DOCUMENT_SELECTOR =  [
  { scheme: "file", language: "javascript" },
  { scheme: "file", language: "javascriptreact" },
  { scheme: "file", language: "typescript" },
  { scheme: "file", language: "typescriptreact" },
];

export const DEFAULT_MAIN_LOCALES = "zh_CN.json";
export const DEFAULT_JUDGE_TEXT =  /[\u4e00-\u9fa5]/;
