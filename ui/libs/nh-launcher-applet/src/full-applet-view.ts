import { LitElement, TemplateResult } from "lit"
import { property } from "lit/decorators.js";
import { AppAgentClient } from "@holochain/client"
import { AppletInfo, NeighbourhoodServices } from ".";

export abstract class FullAppletView extends LitElement {
  @property()
  appAgentWebsocket!: AppAgentClient

  @property()
  neighbourhoodServices!: NeighbourhoodServices

  @property()
  appletInfo!: AppletInfo[]

  abstract render(): TemplateResult;
}

