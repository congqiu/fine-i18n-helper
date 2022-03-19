import * as fs from "fs";
import * as path from "path";

import * as babel from "@babel/core";
import generate from "@babel/generator";
import traverse from "@babel/traverse";
import * as t from "@babel/types";
import * as prettier from "prettier";
import { Position, window, Selection, ProgressLocation } from "vscode";

import { TConfiguration, iConfig } from "../configuration";
import { loggingService } from "../lib/loggingService";
import { TLocales, iLocales } from "../locales";
import { getEntryFiles, getFilename, autoTranslateText } from "../utils";
import {
  generateI18nFunction,
  getJudgeText,
  hasI18nText,
  replaceLineBreak,
} from "../utils/ast";
import {
  createLocalesFolder,
  getMainLocaleData,
  getMainLocalePath,
  updateLocaleData,
} from "../utils/locale";

interface TPathInfo {
  text: string;
  path: any;
  isJsx?: boolean;
  vars?: t.Expression[];
}

type TAstConfig = TConfiguration & {
  isTsx: boolean;
};

function doPathReplace(pathInfo: Omit<TPathInfo, "text">, value: string) {
  const { isJsx, path, vars } = pathInfo;
  const functionName = iConfig.config.functionName;
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
    loggingService.logError("path替换失败", error);
  }
}

export class I18nTransformFile {
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

  async transformWorkspace() {
    const editor = window.activeTextEditor;
    if (!editor) {
      return;
    }
    const config = iConfig.config;

    const workspacePath = iConfig.workspacePath;

    if (!iLocales.check(workspacePath)) {
      const res = await window.showInformationMessage(
        `当前工作区未检测到${config.localesPath}文件夹，是否创建文件夹并继续执行？`,
        { modal: true },
        ...["创建", "停止"]
      );
      if (res === "创建") {
        createLocalesFolder(workspacePath, config.localesPath);
        this.transformWorkspace();
      }
      return;
    }

    const wLocales = iLocales.wLocales;
    const locales = wLocales
      ? getMainLocaleData(workspacePath, wLocales, config)
      : {};

    await window.withProgress(
      {
        location: ProgressLocation.Notification,
        title: "转换工作区中，请勿操作文件！",
        cancellable: false,
      },
      async (progress) => {
        progress.report({ increment: 0 });

        let needAddLocales = {};
        const files = getEntryFiles(
          path.join(workspacePath, config.entry),
          config.exclude
        );
        for (let index = 0; index < files.length; index++) {
          const filepath = files[index];
          progress.report({
            increment: index / files.length,
            message: `正在处理第${index + 1}/${files.length + 1}个文件...`,
          });
          try {
            const result = await this.transform({
              filepath,
              locales,
              config,
            });
            if (result) {
              const { newLocales, outputCode } = result;
              fs.writeFileSync(filepath, outputCode);
              needAddLocales = { ...needAddLocales, ...newLocales };
            }
          } catch (error) {
            loggingService.logError(
              getFilename(filepath) + "转换处理失败",
              error
            );
          }
        }

        progress.report({
          increment: 99,
          message: "正在将国际化数据写入国际化文件中",
        });
        this.addLocalesToFile(workspacePath, config, needAddLocales);
        return new Promise<void>((resolve) => {
          resolve();
        });
      }
    );

    window.showInformationMessage("工作区内容转换完成！");
  }

  async transformActive() {
    const editor = window.activeTextEditor;
    if (!editor) {
      return;
    }
    const document = editor.document;
    const config = iConfig.config;

    const workspacePath = iConfig.workspacePath;

    if (!iLocales.check(workspacePath)) {
      const res = await window.showInformationMessage(
        `当前工作区未检测到${config.localesPath}文件夹，是否创建文件夹并继续执行？`,
        { modal: true },
        ...["创建", "停止"]
      );
      if (res === "创建") {
        createLocalesFolder(workspacePath, config.localesPath);
        this.transformActive();
      }
      return;
    }

    const wLocales = iLocales.wLocales;
    const locales = wLocales
      ? getMainLocaleData(workspacePath, wLocales, config)
      : {};

    const filepath = document.uri.fsPath;
    try {
      const result = await this.transform({
        filepath,
        locales,
        config,
      });
      if (!result) {
        return;
      }
      const { newLocales, outputCode } = result;

      this.addLocalesToFile(workspacePath, config, newLocales);

      editor.edit((editBuilder) => {
        editBuilder.replace(
          new Selection(
            new Position(0, 0),
            new Position(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)
          ),
          outputCode
        );
      });

      window.showInformationMessage("文件内容转换完成！");
    } catch (error) {
      loggingService.logError("文件内容转换失败", error);
      window.showErrorMessage("文件内容转换失败: " + error);
    }
  }

  // todo 支持import形式的
  async transform(options: {
    filepath: string;
    locales: TLocales;
    config: TConfiguration;
  }) {
    const { filepath, locales, config } = options;
    const localesMap = new Map();
    Object.keys(locales).forEach((key) => localesMap.set(locales[key], key));

    // 解析当前文档为ast
    const inCode = fs.readFileSync(filepath).toString();
    const ast = babel.parseSync(
      inCode,
      this.getParseOption({
        ...config,
        isTsx: path.extname(filepath) === ".tsx",
      })
    )!;

    const texts: TPathInfo[] = [];
    let hasTransformed = false;

    const judgeText = getJudgeText(config.judgeText);

    // 遍历ast
    traverse(ast, {
      JSXText(path) {
        const value = path.node.value.trim();
        if (hasI18nText(judgeText, value)) {
          hasTransformed = true;
          if (localesMap.has(value)) {
            doPathReplace({ path, isJsx: true }, localesMap.get(value));
          } else {
            texts.push({
              text: value,
              path,
              isJsx: true,
            });
          }
        }
        path.skip();
      },
      CallExpression(path) {
        const callee = path.node.callee;
        const functionNames = config.functionName.split(".").reverse();
        const isIdentifierName = functionNames.length === 1;

        // 跳过已经被国际化函数处理的内容
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
                } else if (
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
          callee.name === config.functionName
        ) {
          path.skip();
        }
      },
      StringLiteral(path) {
        const value = path.node.value.trim();
        if (hasI18nText(judgeText, value)) {
          hasTransformed = true;
          if (localesMap.has(value)) {
            doPathReplace(
              { path, isJsx: t.isJSXAttribute(path.parent) },
              localesMap.get(value)
            );
          } else {
            texts.push({
              text: value,
              path,
              isJsx: t.isJSXAttribute(path.parent),
            });
          }
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
            .sort(function (a, b) {
              return a.start - b.start;
            });
          let hasI18n = false;
          let v = "";
          const vars: TPathInfo["vars"] = [];
          nodes.forEach(function (node) {
            if (t.isTemplateElement(node)) {
              const cooked = node.value.cooked;
              v += `${replaceLineBreak(cooked)}`;
              if (hasI18nText(judgeText, cooked)) {
                hasTransformed = true;
                hasI18n = true;
              }
            } else {
              v += `{}`;
              vars.push(node);
            }
          });
          v = v.trim();
          if (!hasI18n || v === "") {
            path.skip();
            return;
          }
          if (localesMap.has(v)) {
            doPathReplace({ path, vars }, localesMap.get(v));
          } else {
            texts.push({
              text: v,
              path,
              isJsx: false,
              vars,
            });
          }
        }
        path.skip();
      },
    });

    const newLocales: TLocales = {};
    for (let i = 0; i < texts.length; i++) {
      if (!localesMap.has(texts[i].text)) {
        const key = await autoTranslateText(texts[i].text, config.prefix);
        localesMap.set(texts[i].text, key);
        newLocales[key] = texts[i].text;
      }
      doPathReplace(texts[i], localesMap.get(texts[i].text));
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

  private addLocalesToFile(
    workspacePath: string,
    config: TConfiguration,
    locales: TLocales
  ) {
    if (Object.keys(locales).length > 0) {
      const mainLocalePath = getMainLocalePath(workspacePath, config);
      mainLocalePath && updateLocaleData(mainLocalePath, locales);
      iLocales.reload();
    }
  }
}

export const i18nTransformFile = new I18nTransformFile();
