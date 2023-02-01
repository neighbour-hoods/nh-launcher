import { ProfilesStore } from "@holochain-open-dev/profiles";
import {
  AdminWebsocket,
  AppWebsocket,
  AppInfo,
} from "@holochain/client";
import { SensemakerStore } from "./sensemaker/sensemakerStore";

export type Renderer = (
  rootElement: HTMLElement,
  registry: CustomElementRegistry
) => void;

export interface AppletBlock {
  name: string;
  render: Renderer;
}

export interface AppletRenderers {
  full: Renderer;
  blocks: Array<AppletBlock>;
}

export interface WeServices {
  profilesStore?: ProfilesStore;  // in case of cross-we renderers the profilesStore may not be required
  sensemakerStore?: SensemakerStore;
}

export { SensemakerStore } from "./sensemaker/sensemakerStore";
export { SensemakerService } from "./sensemaker/sensemakerService";
export { sensemakerStoreContext } from "./sensemaker/context";
export interface WeApplet {
  appletRenderers: (
    appWebsocket: AppWebsocket,
    adminWebsocket: AdminWebsocket,
    weStore: WeServices,
    appletInfo: AppletInfo[],
  ) => Promise<AppletRenderers>;
}


export interface WeInfo {
  logoSrc: string;
  name: string;
}
export interface AppletInfo {
  weInfo: WeInfo,
  appInfo: AppInfo,
}