import * as fs from "fs";
import * as path from "path";

import * as babel from "@babel/core";
import generate from "@babel/generator";
import traverse from "@babel/traverse";
import * as t from "@babel/types";
import * as prettier from "prettier";

import { generateI18nFunction, hasI18nText, replaceLineBreak } from "./ast";
import { TConfiguration, TLocales } from "./types";

import { getUniqueKey } from ".";

interface TPathInfo {
  text: string;
  path: babel.NodePath<t.Node>;
  isJsx?: boolean;
  vars?: t.Expression[];
}

type TAstConfig = TConfiguration & {
  isTsx: boolean;
};

export interface TExtractText {
  text: string;
  start: {
    line: number;
    column: number;
  };
  end: {
    line: number;
    column: number;
  };
}

export interface THandledText extends TExtractText {
  key: string;
  exist: boolean;
}

export class Transform {
  /**
   * 获取解析配置项
   * @param config
   * @returns
   */
  private getParseOption(config: TAstConfig): babel.TransformOptions {
    return {
      sourceType: "module",
      plugins: [
        [require("@babel/plugin-syntax-typescript"), { isTSX: config.isTsx }],
        [
          require("@babel/plugin-syntax-decorators"),
          { decoratorsBeforeExport: config.decoratorsBeforeExport },
        ],
      ],
    };
  }

  /**
   * path替换
   * @param pathInfo
   * @param functionName
   * @param value
   */
  private doPathReplace(
    pathInfo: Omit<TPathInfo, "text">,
    functionName: string,
    value: string
  ) {
    const { isJsx, path, vars } = pathInfo;
    const doReplace = () => {
      return t.callExpression(
        generateI18nFunction(functionName),
        vars ? [t.stringLiteral(value), ...vars] : [t.stringLiteral(value)]
      );
    };

    try {
      isJsx
        ? path.replaceWith(t.jSXExpressionContainer(doReplace()))
        : path.replaceWith(doReplace());
    } catch (error) {
      // console.log("path替换失败", error);
    }
  }

  /**
   * ast查找处理
   * @param ast ast
   * @param handler 处理方法
   */
  private traverse(
    ast: babel.ParseResult,
    config: TConfiguration,
    handler: (pathInfo: TPathInfo) => void
  ) {
    const { judgeText, functionName } = config;
    traverse(ast, {
      JSXText(path) {
        const text = path.node.value.trim();
        if (hasI18nText(judgeText, text)) {
          handler({ path, text, isJsx: true });
        }
        path.skip();
      },
      CallExpression(path) {
        // 跳过已经被国际化函数处理的内容
        const { callee } = path.node;
        const functionNames = functionName.split(".").reverse();
        const isIdentifierName = functionNames.length === 1;

        if (t.isMemberExpression(callee) && !isIdentifierName) {
          let obj = { ...callee };
          const latestIdentifier = functionNames.pop();
          // 判断对象形式的functionName，例如intl.i18n.get
          if (
            functionNames.every((name) => {
              if (t.isIdentifier(obj.property) && obj.property.name === name) {
                if (t.isMemberExpression(obj.object)) {
                  obj = { ...obj.object };
                  return true;
                }
                if (
                  t.isIdentifier(obj.object) &&
                  obj.object.name === latestIdentifier
                ) {
                  return true;
                }
              }
            })
          ) {
            path.skip();
          }
        } else if (
          t.isIdentifier(callee) &&
          isIdentifierName &&
          callee.name === functionName
        ) {
          path.skip();
        }
      },
      StringLiteral(path) {
        const text = path.node.value.trim();
        if (hasI18nText(judgeText, text)) {
          handler({ path, text, isJsx: t.isJSXAttribute(path.parent) });
        }
        path.skip();
      },
      TemplateLiteral(path) {
        if (
          path.node.quasis.some((word) =>
            hasI18nText(judgeText, word.value.cooked)
          )
        ) {
          const nodes = ([] as any[])
            .concat(path.node.quasis, path.node.expressions)
            .sort((a, b) => {
              return a.start - b.start;
            });
          let hasI18n = false;
          let text = "";
          const vars: TPathInfo["vars"] = [];
          nodes.forEach((node) => {
            if (t.isTemplateElement(node)) {
              const { cooked } = node.value;
              text += `${replaceLineBreak(cooked)}`;
              if (hasI18nText(judgeText, cooked)) {
                hasI18n = true;
              }
            } else {
              text += `{}`;
              vars.push(node);
            }
          });
          text = text.trim();
          if (!hasI18n || text === "") {
            path.skip();
            return;
          }
          handler({ path, text, vars, isJsx: false });
        }
        path.skip();
      },
    });
  }

  private pretreatment(options: {
    filepath: string;
    locales: TLocales;
    config: TConfiguration;
  }) {
    const { filepath, locales, config } = options;
    const localesMap = new Map<string, string>();
    Object.keys(locales).forEach((key) => localesMap.set(locales[key], key));

    // 解析当前文档为ast
    const inCode = fs.readFileSync(filepath).toString();
    const ast = babel.parseSync(
      inCode,
      this.getParseOption({
        ...config,
        isTsx: path.extname(filepath) === ".tsx",
      })
    );

    if (!ast) {
      return;
    }

    return {
      inCode,
      ast,
      localesMap,
    };
  }

  /**
   * 国际化转换，locales中不存在的文本自动添加
   * @param options
   * @returns
   */
  // TODO 支持import形式的
  public async transform(options: {
    filepath: string;
    locales: TLocales;
    config: TConfiguration;
  }) {
    const { config } = options;
    const pretreatmentData = this.pretreatment(options);

    if (!pretreatmentData) {
      return;
    }
    const { inCode, ast, localesMap } = pretreatmentData;

    const texts: TPathInfo[] = [];
    let hasTransformed = false;

    this.traverse(ast, config, (info) => {
      hasTransformed = true;
      if (localesMap.has(info.text)) {
        this.doPathReplace(
          { path: info.path, isJsx: info.isJsx },
          config.functionName,
          localesMap.get(info.text) || info.text
        );
      } else {
        texts.push(info);
      }
    });

    const newLocales: TLocales = {};
    for (let i = 0; i < texts.length; i++) {
      if (!localesMap.has(texts[i].text)) {
        const key = await getUniqueKey(
          texts[i].text,
          options.locales,
          config.prefix
        );
        localesMap.set(texts[i].text, key);
        newLocales[key] = texts[i].text;
      }
      this.doPathReplace(
        texts[i],
        config.functionName,
        localesMap.get(texts[i].text) || texts[i].text
      );
    }

    const output = generate(
      ast,
      {
        decoratorsBeforeExport: config.decoratorsBeforeExport,
      },
      inCode
    );
    let outputCode = output.code;
    try {
      outputCode = prettier.format(outputCode, {
        parser: "babel-ts",
      });
    } catch (error) {}

    if (hasTransformed) {
      return {
        outputCode,
        newLocales,
      };
    }
  }

  /**
   * 国际化转换，只转换locales中已经存在的
   * @param options
   * @returns
   */
  public async transformExist(options: {
    filepath: string;
    locales: TLocales;
    config: TConfiguration;
  }) {
    const { config } = options;
    const pretreatmentData = this.pretreatment(options);

    if (!pretreatmentData) {
      return;
    }
    const { inCode, ast, localesMap } = pretreatmentData;

    let hasTransformed = false;

    this.traverse(ast, config, (info) => {
      hasTransformed = true;
      this.doPathReplace(
        { path: info.path, isJsx: info.isJsx },
        config.functionName,
        localesMap.get(info.text) || info.text
      );
    });

    const output = generate(
      ast,
      {
        decoratorsBeforeExport: config.decoratorsBeforeExport,
      },
      inCode
    );
    let outputCode = output.code;
    try {
      outputCode = prettier.format(outputCode, {
        parser: "babel-ts",
      });
    } catch (error) {}

    if (hasTransformed) {
      return {
        outputCode,
      };
    }
  }

  /**
   * 收集要被国际化的内容
   * 返回值的line和column都是zero-based
   * @param options
   * @returns
   */
  public extract(filepath: string, config: TConfiguration) {
    const texts: TExtractText[] = [];

    const ast = babel.parseSync(
      fs.readFileSync(filepath).toString(),
      this.getParseOption({
        ...config,
        isTsx: path.extname(filepath) === ".tsx",
      })
    );

    if (ast) {
      this.traverse(ast, config, (info) => {
        const start = info.path.node.loc?.start || {
          line: 1,
          column: 0,
        };
        const end = info.path.node.loc?.end || {
          line: 1,
          column: 0,
        };
        // TODO 确定babel的loc的规则
        texts.push({
          text: info.text,
          start: {
            line: start.line - 1,
            column: start.column,
          },
          end: {
            line: end.line - 1,
            column: end.column,
          },
        });
      });
    }

    return texts;
  }

  /**
   * 翻译未翻译的文案
   * @param texts
   * @param locales
   * @param prefix
   * @returns
   */
  public async handleTexts(
    texts: TExtractText[],
    locales: TLocales,
    prefix: string
  ) {
    const localesMap = new Map<string, string>();
    Object.keys(locales).forEach((key) => localesMap.set(locales[key], key));
    const handledTexts: THandledText[] = [];

    for (let i = 0; i < texts.length; i++) {
      const handledText = { ...texts[i] };
      const { text } = handledText;
      if (localesMap.has(text)) {
        handledTexts.push({
          ...handledText,
          key: localesMap.get(text) || text,
          exist: true,
        });
      } else {
        const key = await getUniqueKey(text, locales, prefix);
        handledTexts.push({ ...handledText, key, exist: false });
      }
    }
    return handledTexts;
  }
}
