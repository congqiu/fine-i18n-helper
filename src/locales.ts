import { iConfig } from "./configuration";
import { checkLocalesPath, getWorkspacesLocales } from "./utils/locale";
import { TWorkspacesLocales } from "./utils/types";

class Locales {
  constructor() {
    this.getLocales();
    this.triggerReload = (throttle = true) => {
      if (this.timeout) {
        clearTimeout(this.timeout);
        this.timeout = undefined;
      }
      if (throttle) {
        this.timeout = setTimeout(() => {
          this.getLocales();
        }, 500);
      } else {
        this.getLocales();
      }
    };
  }

  private triggerReload: (throttle?: boolean) => void;

  private timeout: NodeJS.Timer | undefined = undefined;

  public workspacesLocales: TWorkspacesLocales | undefined;

  public get wLocales() {
    return this.workspacesLocales?.[iConfig.workspacePath];
  }

  private getLocales() {
    this.workspacesLocales = getWorkspacesLocales(iConfig.config);
  }

  public reload() {
    this.triggerReload(true);
  }

  public check(workspacePath: string) {
    return checkLocalesPath(workspacePath, iConfig.config.localesPath);
  }
}

export const iLocales = new Locales();
