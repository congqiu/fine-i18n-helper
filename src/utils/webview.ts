import * as fs from "fs";
import * as path from "path";

import { Uri, WebviewPanel } from "vscode";

const getDiskPath = (webviewPanel: WebviewPanel, filepath: string) => {
  return webviewPanel.webview.asWebviewUri(Uri.file(filepath));
};

export const getHtmlForWebview = (
  webviewPanel: WebviewPanel,
  entryPath: string
) => {
  const html = fs.readFileSync(entryPath, "utf-8");
  const fileContent = html.replace(
    /(<link.+?href="|<script.+?src="|<img.+?src=")(.+?)"/g,
    (_, pre, suf) => {
      const diskPath = getDiskPath(
        webviewPanel,
        path.join(path.dirname(entryPath), suf)
      );
      return `${pre}${diskPath}"`;
    }
  );
  return fileContent;
};
