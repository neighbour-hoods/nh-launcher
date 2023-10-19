import { CSSResult, LitElement } from "lit"
import { property } from "lit/decorators.js";
import { AppAgentClient } from "@holochain/client"
import { AppletInfo, NeighbourhoodServices } from ".";

export interface IFullAppletView {
  appAgentWebsocket: AppAgentClient
  neighbourhoodServices: NeighbourhoodServices
  appletInfo: AppletInfo[]
}

export abstract class FullAppletView extends LitElement {
  @property()
  appAgentWebsocket!: AppAgentClient

  @property()
  neighbourhoodServices!: NeighbourhoodServices

  @property()
  appletInfo!: AppletInfo[]

  registry?: CustomElementRegistry

  override createRenderRoot() {
    this.registry = new CustomElementRegistry()

    //@ts-ignore
    const renderRoot = (this.renderOptions.creationScope = this.attachShadow({
      mode: 'open',
      customElements: this.registry,
    }));

    return renderRoot;
  }

  connectedCallback(): void {
    super.connectedCallback();
    const scopedElements = Object.entries(this.scopedElements());
    scopedElements.forEach(([name, element]) => {
      this.registry?.define(name, element);
   });
  }

  abstract scopedElements(): { [component: string]: new () => HTMLElement }
}

