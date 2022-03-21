import * as t from "@babel/types";

import { EXT_CONFIG } from "../constant";

import { escapeForRegExp } from ".";

export const generateI18nFunction = (functionName: string) => {
  const functionNames = functionName.split(".");
  const isIdentifierName = functionNames.length === 1;
  if (isIdentifierName) {
    return t.identifier(functionName);
  }
  return functionNames.slice(1).reduce((p: t.Expression, c) => {
    return t.memberExpression(p, t.identifier(c));
  }, t.identifier(functionNames[0]));
};

export const replaceLineBreak = (value?: string) => {
  return value?.replace(/[\n]/g, "\\n") || "";
};

export const hasI18nText = (judgeText: RegExp, text?: string) => {
  return text ? judgeText.test(text) : false;
};

export const getJudgeText = (judgeText: RegExp | string) => {
  if (typeof judgeText === "string") {
    try {
      return new RegExp(escapeForRegExp(judgeText));
    } catch (error) {
      return EXT_CONFIG.judgeText;
    }
  }
  return judgeText;
};
