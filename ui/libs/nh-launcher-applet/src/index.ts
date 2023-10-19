import { ProfilesStore } from "@holochain-open-dev/profiles";
import {
  AppInfo,
  AppAgentClient,
  EntryHash,
} from "@holochain/client";
import { AppletConfigInput, SensemakerStore } from "@neighbourhoods/client";
import { WidgetBundle } from "./resource-assessment-tray";
import { CreateAssessmentWidget } from "./create-assessment-widget";
import { DisplayAssessmentWidget } from "./display-assessment-widget";
import { FullAppletView } from "./full-applet-view";
import { ResourceView } from "./resource-view";

export interface NeighbourhoodServices {
  profilesStore?: ProfilesStore;  // in case of cross-we renderers the profilesStore may not be required
  sensemakerStore?: SensemakerStore;
}
export interface NeighbourhoodInfo {
  logoSrc: string;
  name: string;
}
export interface AppletInfo {
  neighbourhoodInfo: NeighbourhoodInfo,
  appInfo: AppInfo,
}

export interface NeighbourhoodApplet {
  appletConfig: AppletConfigInput;
  viewElements: {
    full: new () => FullAppletView,
    resourceViews: {
      [resourceDefName: string]: new () => ResourceView,
    }
  }
  widgets: WidgetBundle<CreateAssessmentWidget | DisplayAssessmentWidget>[]
}


export * from "./resource-view";
export * from "./create-assessment-widget";
export * from "./display-assessment-widget";
export * from "./resource-assessment-tray";
export * from "./full-applet-view";
