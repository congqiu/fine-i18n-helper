import * as vscode from "vscode";

export class TextDecorations {
  private textDecorationType: vscode.TextEditorDecorationType;

  private editor?: vscode.TextEditor;

  private timeout: NodeJS.Timeout | undefined = undefined;

  constructor() {
    this.textDecorationType = this.createTextDecoration();
  }

  private createTextDecoration() {
    // 配置提示框样式
    const hasOverviewRuler = true;
    const shouldMark = true;
    const color = "red";
    return vscode.window.createTextEditorDecorationType({
      borderWidth: shouldMark ? "1px" : undefined,
      borderStyle: shouldMark ? "dotted" : undefined,
      overviewRulerColor: hasOverviewRuler ? color : undefined,
      overviewRulerLane: hasOverviewRuler
        ? vscode.OverviewRulerLane.Right
        : undefined,
      light: {
        borderColor: shouldMark ? color : undefined,
      },
      dark: {
        borderColor: shouldMark ? color : undefined,
      },
    });
  }

  triggerUpdateDecorations(decorations: vscode.DecorationOptions[]) {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = undefined;
    }
    this.timeout = setTimeout(
      this.updateDecorations.bind(this, decorations),
      500
    );
  }

  clear() {
    this.textDecorationType?.dispose();
    this.textDecorationType = this.createTextDecoration();
  }

  updateEditor(editor?: vscode.TextEditor) {
    this.editor = editor;
  }

  // 更新
  updateDecorations(decorations: vscode.DecorationOptions[]) {
    this.clear();
    this.editor?.setDecorations(this.textDecorationType, decorations);
  }
}
