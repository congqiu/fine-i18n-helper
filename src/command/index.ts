import * as fs from "fs";
import * as path from "path";

import {
  window,
  Uri,
  Range,
  Position,
  WorkspaceFolder,
  Selection,
  TextEditorRevealType,
} from "vscode";

import { iConfig } from "../configuration";
import { TOOL_ALIAS, TOOL_NAME } from "../constant";
import { iEvents } from "../lib/i18nEvents";
import { i18nTransform } from "../lib/i18nTransform";
import { i18nWorkbench } from "../lib/i18nWorkbench";
import { loggingService, LOG_LEVEL, TLogLevel } from "../lib/loggingService";
import { iLocales } from "../locales";
import { getKeyFromJson, getKeyPosition } from "../utils";
import {
  getLocaleFilepath,
  updateLocaleData,
  getMainLocaleFilename,
  getMainLocaleData,
  createLocalesFolder,
} from "../utils/locale";
import { getI18nRangesInfo, showInfoMessage } from "../utils/vscode";

export interface TOpenI18nFileArgs {
  filename: string;
  key?: string;
}

/**
 * 打开国际化文件
 * @param args
 * @returns
 */
export const openI18nFile = (args: TOpenI18nFileArgs) => {
  const { filename, key } = args;
  const editor = window.activeTextEditor;
  if (!editor) {
    return;
  }
  const filepath = getLocaleFilepath(
    iConfig.workspacePath,
    iConfig.config,
    filename
  );
  let position = new Position(0, 0);
  if (key) {
    const keyPosition = getKeyPosition(filepath, key);
    position = keyPosition
      ? new Position(keyPosition.line, keyPosition.character)
      : position;
  }
  window.showTextDocument(Uri.file(filepath), {
    selection: new Range(position, position),
    preview: false,
  });
  loggingService.debug(
    `打开国际化文件${filename}${key ? `，定位于${key}上` : ""}`
  );
};

/**
 * 选择工作区
 * @param workspaceFolders
 */
export const selectWorkspace = (
  workspaceFolders: readonly WorkspaceFolder[]
) => {
  if (workspaceFolders.length > 1) {
    window
      .showQuickPick(
        workspaceFolders.map((w) => w.name),
        {
          title: `选择一个工作区作为根路径`,
          placeHolder: `请为${TOOL_NAME}扩展选择一个工作区，可以通过点击左下角状态栏进行切换`,
        }
      )
      .then(async (val) => {
        const folder = workspaceFolders.find((w) => w.name === val);
        if (folder) {
          const configPath = await iConfig.updateWorkspacePath(
            folder.uri.fsPath
          );
          iEvents.watchConfigurationFile(configPath);
          loggingService.info(`选择了${val}作为新的工作区`);
        }
      });
  }
};

export interface TChangeI18nValueArgs {
  key: string;
  text?: string;
}

/**
 * 修改国际化的值
 * @param args
 * @returns
 */
export const changeI18nValue = (args: TChangeI18nValueArgs) => {
  const { key, text } = args;
  const editor = window.activeTextEditor;
  const locales = iLocales.wLocales;
  if (!editor || !locales) {
    return;
  }
  const { config } = iConfig;
  const { workspacePath } = iConfig;
  const mainLocalesData = getMainLocaleData(workspacePath, locales, config);
  window
    .showInputBox({
      title: `修改${key}对应的中文`,
      prompt: "修改中文会清空其他语言对应的key",
      value: text,
      validateInput: (val) => {
        const existKey = getKeyFromJson(mainLocalesData, val);
        if (val && existKey && existKey !== key) {
          return `当前文案已存在"${existKey}"，暂不支持修改！`;
        }
      },
    })
    .then((value) => {
      if (!value) {
        return;
      }

      const mainFilename = getMainLocaleFilename(workspacePath, config);
      Object.keys(locales).forEach((filename) => {
        let data = { [key]: "" };
        if (filename === mainFilename) {
          data = { [key]: value };
        }
        updateLocaleData(
          path.join(workspacePath, config.localesPath, filename),
          data
        );
      });
      iLocales.reload();
      loggingService.debug(`${key}对应的文案从'${text}'修改为'${value}'`);
    });
};

/**
 * 在当前文档中查找国际化
 * @returns
 */
export const findI18nInFile = () => {
  const editor = window.activeTextEditor;
  if (!editor || !iLocales.wLocales) {
    return;
  }
  const { document } = editor;
  const { config } = iConfig;
  const rangeInfo = getI18nRangesInfo(
    document,
    config.functionName,
    getMainLocaleData(iConfig.workspacePath, iLocales.wLocales, config)
  );

  window
    .showQuickPick(
      rangeInfo.map((v) => `${v.range.start.line + 1}: ${v.text}  ${v.key}`)
    )
    .then((val) => {
      const item = rangeInfo.find(
        (v) => `${v.range.start.line + 1}: ${v.text}  ${v.key}` === val
      );
      if (!item) {
        return;
      }
      editor.selection = new Selection(item.range.start, item.range.end);
      editor.revealRange(item.range, TextEditorRevealType.InCenter);
    });
};

/**
 * 初始化创建配置文件
 * @returns
 */
export const initConfigFile = async () => {
  const filename = `.${TOOL_ALIAS}rc`;
  const filepath = path.join(iConfig.workspacePath, filename);
  if (fs.existsSync(filepath)) {
    const result = await window.showWarningMessage(
      `检测到${filename}已存在，是否覆盖？`,
      "覆盖",
      "打开文件"
    );
    if (result === "打开文件") {
      window.showTextDocument(Uri.file(filepath));
      return;
    }
  }
  fs.writeFileSync(
    filepath,
    JSON.stringify(
      {
        entry: "src",
      },
      null,
      2
    )
  );
  window.showTextDocument(Uri.file(filepath), {});
  loggingService.info(`配置文件${filename}写入成功`);

  createLocalesFolder(iConfig.workspacePath, iConfig.config.localesPath);
};

export const changeLogLevel = () => {
  window.showQuickPick(LOG_LEVEL).then((val) => {
    if (val) {
      loggingService.setLogLevel(val as TLogLevel);
      loggingService.info(`日志等级切换为${val}`);
    }
  });
};

export const transformActiveFile = async () => {
  if (iConfig.config.showWorkbench) {
    const result = await i18nTransform.extractActive();
    if (result) {
      result.texts.length > 0
        ? i18nWorkbench.show(result)
        : showInfoMessage(
            "当前文件无可国际化的内容",
            `${result.filepath} 无可国际化内容`
          );
    }
  } else {
    await i18nTransform.transformActive();
  }
};
