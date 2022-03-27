export interface TBasicConfig {
  localesPath: string; // 国际化文件所在文件夹，默认为src/locales
  mainLocale: string; // 国际化基准文件
  functionName: string; // 国际化调用的方法名
  prefix: string; // 自动生成key的前缀
}

export interface TExtConfiguration {
  entry: string; // 转换工作区指定文件的入口
  exclude: string | string[]; // 转换工作区指定文件时排除的文件
  decoratorsBeforeExport: boolean; // babel转换时候的参数
  importLine: string; // 导入行，暂不支持
  judgeText: RegExp; // 匹配要被国际化的内容
}

export type TConfiguration = TBasicConfig & TExtConfiguration;

export type TVsConfiguration = TBasicConfig & {
  multiRootTip: boolean;
  hoverLocales: string | string[] | null;
  showDecorations: boolean;
  definitions: string | string[];
  transformOnSave: boolean;
  watchMode: boolean; // 是否开启监听国际化配置，目前暂不可配置
  showWorkbench: boolean;
};

// 国际化数据{key: value}
export interface TLocales {
  [key: string]: string;
}

// 选定工作区国际化{localeFilepath: TLocales}
export interface TWLocales {
  [key: string]: TLocales;
}

// 全部工作区国际化{workspace.fsPath: TWLocales}
export interface TWorkspacesLocales {
  [key: string]: TWLocales;
}
