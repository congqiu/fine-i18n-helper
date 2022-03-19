import * as t from "@babel/types";

import { DEFAULT_JUDGE_TEXT } from "../constant";

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

export const replaceLineBreak = function (value?: string) {
  return value?.replace(/[\n]/g, "\\n") || "";
};

export const hasI18nText = function (judgeText: RegExp, text?: string) {
  return text ? judgeText.test(text) : false;
};

export const getJudgeText = function (judgeText: RegExp | string) {
  if (typeof judgeText === "string") {
    try {
      return new RegExp(escapeForRegExp(judgeText));
    } catch (error) {
      return DEFAULT_JUDGE_TEXT;
    }
  }
  return judgeText;
};
