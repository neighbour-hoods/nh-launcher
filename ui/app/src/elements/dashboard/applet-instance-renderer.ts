import { EntryHash } from "@holochain/client";
import { AppBlockDelegate } from "@neighbourhoods/client";
import { consume } from "@lit/context";
import { Task } from "@lit/task";
import { ScopedRegistryHost } from "@lit-labs/scoped-registry-mixin"
import { css, html, LitElement } from "lit";
import { property } from "lit/decorators.js";
import { matrixContext } from "../../context";
import { MatrixStore } from "../../matrix-store";
import { sharedStyles } from "../../sharedStyles";
import { AppBlockRenderer } from "@neighbourhoods/app-loader";
import { NHSpinner } from "@neighbourhoods/design-system-components";

export class AppletInstanceRenderer extends ScopedRegistryHost(LitElement) {

  @consume({ context: matrixContext , subscribe: true })
  @property({attribute: false})
  _matrixStore!: MatrixStore;

  @property()
  appletInstanceId!: EntryHash;

  _rendererTask = new Task(
    this,
    async () => {
      return this._matrixStore.fetchAppletInstanceRenderers(this.appletInstanceId);
    },
    () => [this._matrixStore, this.appletInstanceId]
  );

  render() {
    return this._rendererTask.render({
      pending: () => html`<nh-spinner type=${"icon"}></nh-spinner>`,
      complete: (renderers) => {
        console.log("got renderers", renderers)
        if (renderers.appletRenderers && renderers.appletRenderers['full']) {
          const delegate: AppBlockDelegate = this._matrixStore.createAppDelegate(this.appletInstanceId)
          console.log(delegate)
          return html`<app-block-renderer .component=${renderers.appletRenderers['full']} .nhDelegate=${delegate} style="flex: 1"></app-block-renderer>`
        }
      },
    });
  }

  static elementDefinitions = {
    "nh-spinner": NHSpinner,
    "app-block-renderer": AppBlockRenderer,
  }

  static styles = [
    sharedStyles,
    css`
      :host {
        display: flex;
        position: relative;
      }
    `,
  ];

}
