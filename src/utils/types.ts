export interface TBasicConfig {
  localesPath: string; // 国际化文件所在文件夹，默认为src/locales
  mainLocale: string; // 国际化基准文件，如为空则文件夹第一个为基准文件
  functionName: string; // 国际化的方法名
  prefix: string; // 自动生成的key前缀
}

export interface TExtConfiguration {
  entry: string; // 指定被国际化的内容
  exclude: string | string[]; // 国际化目录时排除的内容
  decoratorsBeforeExport: boolean; // babel转换时候的参数
  importLine: string; // 导入行
  judgeText: RegExp; // 匹配要被国际化的内容
  onlyExist: boolean; // 是否只国际化localesPath指定文件中存在的内容
}

export type TConfiguration = TBasicConfig & TExtConfiguration;

export type TVsConfiguration = TBasicConfig & {
  multiRootTip: boolean;
  hoverLocales: string | string[] | null;
  showDecorations: boolean;
  definitions: string | string[];
  transformOnSave: boolean;
  watchMode: boolean;
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