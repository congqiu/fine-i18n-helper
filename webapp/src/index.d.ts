interface Window {
  acquireVsCodeApi(): {
    postMessage: (options: any) => void;
  };
}
