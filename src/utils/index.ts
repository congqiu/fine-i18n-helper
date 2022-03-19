import * as fs from "fs";
import * as path from "path";

import * as glob from "glob";
import * as translate from "rita-google-translate-api";

import { TConfiguration } from "../configuration";
import { EXTENSION_NAME } from "../constant";
import { loggingService } from "../lib/loggingService";
import { TLocales, TWLocales } from "../locales";

import { showInformationMessage } from "./message";

/**
 * 获取路径中的文件名
 * @param filePath
 * @returns
 */
export function getFilename(filePath: string, ext = false) {
  return path.basename(filePath, ext ? undefined : path.extname(filePath));
}

/**
 * 递归创建多层目录
 * 注意：不要把文件名传进来
 * @param dirname
 * @returns
 */
export function mkdirsSync(dirname: string) {
  if (fs.existsSync(dirname)) {
    return true;
  } else {
    if (mkdirsSync(path.dirname(dirname))) {
      fs.mkdirSync(dirname);
      return true;
    }
  }
}

/**
 * 转换字符串为JSON
 * @param source 国际化JSON文件字符串
 * @returns json
 */
export function getJSON(source: string): TLocales {
  try {
    return JSON.parse(source);
  } catch (error) {
    return {};
  }
}

/**
 * 用户输入转义为正则表达式中的一个字面字符串
 * https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Regular_Expressions#escaping
 * @param str
 * @returns
 */
export function escapeForRegExp(str: string) {
  //$&表示整个被匹配的字符串
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * i18n方法名称转正则
 * * (?<=${escapeForRegExp(fnName)}\\((\\s*[\\n]\\s*)?(["'])) 是形如 (?<=y)x 的后行断言
 * * (?=\\2) 是形如 x(?=y) 的先行断言，\2 表示捕获到到第二个内容，用来匹配是"或者'，实际上\1被用来可能有的处理换行和空白
 * * 之所以看起来比较复杂就是希望能改直接获取到_i18n.get("xxx")中的xxx
 * @param fnName 正则字符串 _i18n.get
 * @returns 形如 /(?<=_i18n\.get\((\s*[\n]\s*)?(["'])).+(?=\2)/g
 */
export function coverFnNameToRegExp(fnName: string) {
  const str = `(?<=${escapeForRegExp(
    fnName
  )}\\((\\s*[\\n]\\s*)?(["'])).+(?=\\2)`;
  try {
    return new RegExp(str, "gm");
  } catch (error) {
    showInformationMessage(
      `${EXTENSION_NAME}配置项functionName转换成正则出错，${error}`
    );
    return;
  }
}
/**
 * i18n前缀转正则
 * * (?<=(["'])) 是形如 (?<=y)x 的后行断言
 * * (?=\\1) 是形如 x(?=y) 的先行断言，\1 表示捕获到到第一个内容，用来匹配是"或者'
 * @param prefix
 * @returns
 */
export function coverPrefixToRegExp(prefix: string) {
  const str = `(?<=(["']))${escapeForRegExp(prefix)}.+(?=\\1)`;
  try {
    return new RegExp(str, "g");
  } catch (error) {
    showInformationMessage(
      `${EXTENSION_NAME}配置项prefix转换成正则出错，${error}`
    );
    return;
  }
}

/**
 * 获取指定目录下的全部指定文件
 * @param pattern
 * @param exclude
 * @returns
 */
export function getEntryFiles(
  pattern: string,
  exclude: TConfiguration["exclude"]
) {
  if (typeof exclude === "string") {
    exclude = exclude.split(",");
  }
  // todo 使用vscode.workspace.findFiles(pattern)
  return glob.sync(`${pattern}/**/*.{js,jsx,ts,tsx}`, {
    ignore: exclude.map((e) => `${pattern}/${e}`),
  });
}

/**
 * 返回key在文件的位置
 * @param filepath 资源路径
 * @param key 搜索的key
 * @returns
 */
export function getKeyPosition(filepath: string, key: string) {
  const position = {
    line: -1,
    character: -1,
  };

  try {
    const i18nArray = fs.readFileSync(filepath).toString("utf8").split("\n");
    for (let i = 0; i < i18nArray.length; i++) {
      const i18nLine = i18nArray[i];
      const result = i18nLine.match(
        new RegExp(`${escapeForRegExp(key)}['"]?\\s*:\\s*['"]?`)
      );
      if (result) {
        position.line = i;
        position.character = result[0].length + (result.index || 0);
        break;
      }
    }
    return position.line !== -1 ? position : undefined;
  } catch (error) {
    loggingService.logError("获取key所在文件位置失败", error);
  }
}

/**
 * 通过文本获取i18n信息
 * @param text 文本
 * @param locales 当前工作区国际化信息
 * @param config 配置
 * @returns
 */
export async function transformText(
  text: string,
  locales: TWLocales,
  config: TConfiguration
) {
  let key = "";
  let add = false;

  const filenames = Object.keys(locales);
  for (let i = 0; i < filenames.length; i++) {
    const result = getKeyFromJson(locales[filenames[i]], text);
    if (result) {
      key = result;
      break;
    }
  }

  if (!key) {
    key = await autoTranslateText(text, config.prefix);
    add = true;
  }

  return {
    key,
    text,
    add,
  };
}

/**
 * 从json的value获取key
 * @param json 国际化数据
 * @param value 国际化后的值
 * @returns
 */
export function getKeyFromJson(json: TLocales, value: string) {
  for (const [key, val] of Object.entries(json)) {
    if (value === val) {
      return key;
    }
  }
}

/**
 * 根据文本自动生成key值
 * @param text 文本
 * @param prefix 前缀
 * @returns
 */
export function autoTranslateText(text: string, prefix = "") {
  return new Promise<string>((resolve, reject) => {
    translate(text, { from: "zh-CN", to: "en", tld: "cn" })
      .then((res: { text: string }) => {
        const result =
          prefix +
          res.text
            .replace(/\b(\w)(\w*)/g, function ($0, $1, $2) {
              return $1.toUpperCase() + $2.toLowerCase();
            })
            .replace(/\s+/g, "_")
            .replace(/"|,|\./g, "");

        resolve(result);
      })
      .catch((err: any) => {
        reject(err);
      });
  });
}

/**
 * JSON根据key排序
 * @param json 国际化数据
 * @returns
 */
export function sortJSON(json: TLocales) {
  const words = Object.keys(json).sort();
  const data: TLocales = {};
  words.forEach((key) => {
    data[key] = json[key];
  });

  return JSON.stringify(data, null, 2);
}
