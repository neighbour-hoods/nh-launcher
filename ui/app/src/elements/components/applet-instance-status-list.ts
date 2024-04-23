import { consume } from "@lit/context";
import { html, css } from "lit";
import { StoreSubscriber   } from "lit-svelte-stores";
import { matrixContext, weGroupContext } from "../../context";
import { MatrixStore } from "../../matrix-store";
import { sharedStyles } from "../../sharedStyles";
import { property, query, state } from "lit/decorators.js";
import { CreateNeighbourhoodDialog } from "../dialogs/create-nh-dialog";
import { DnaHash, AppInfo } from "@holochain/client";
import { getStatus } from "@neighbourhoods/app-loader";
import { SensemakerStore, sensemakerStoreContext } from "@neighbourhoods/client";
import { AppletListItem } from "./applet-list-item";
import { UninstallApplet } from "../dialogs/uninstall-applet";
import { AppletInstanceInfo } from "../../types";

import NHButton from '@neighbourhoods/design-system-components/button';
import NHDialog from '@neighbourhoods/design-system-components/dialog';
import NHComponent from '@neighbourhoods/design-system-components/ancestors/base';
import { b64images } from "@neighbourhoods/design-system-styles";

export class AppletInstanceStatusList extends NHComponent {
  @consume({ context: sensemakerStoreContext, subscribe: true })
  @property({attribute: false})
  _sensemakerStore!: SensemakerStore;

  @consume({ context: matrixContext , subscribe: true })
  @property({attribute: false})
  matrixStore!: MatrixStore;

  @consume({ context: weGroupContext, subscribe: true })
  @property({attribute: false})
  weGroupId!: DnaHash;

  _installedApplets = new StoreSubscriber(
    this,
    () => this.matrixStore.getAppletInstanceInfosForGroup(this.weGroupId)
  );

  @query("#uninstall-applet-dialog")
  _uninstallAppletDialog;

  @state()
  private _currentAppInfo!: AppletInstanceInfo;

  async uninstallApp(appInfo: AppInfo) {
    console.log("Uninstalling applet: ", appInfo);
    this.matrixStore.uninstallApp(appInfo)
      .then(async () => {
        await this.matrixStore.fetchMatrix();
        this.requestUpdate();
        await this.updateComplete;

        this.dispatchEvent(
          new CustomEvent("trigger-alert", {
            detail: { 
              title: "Applet Uninstalled",
              msg: "You will no longer be able to access this applet or its data.",
              type: "success",
              closable: true,
            },
            bubbles: true,
            composed: true,
          })
        )
      }).catch((e) => {
        console.log("Error: ", e);

        this.dispatchEvent(
          new CustomEvent("trigger-alert", {
            detail: { 
              title: "Error During Uninstall",
              msg: "Look in the developer console for more information.",
              type: "danger",
              closable: true,
            },
            bubbles: true,
            composed: true,
          })
        )
      });
  }

  refresh() {
    this.matrixStore.fetchMatrix();
    this.requestUpdate();
  }

  renderAppStates() {
    const appletInstanceInfos = this._installedApplets.value;
    return html`
      ${
        appletInstanceInfos!.length == 0 || !appletInstanceInfos
          ? html`<p>You have no applet instances installed in this neighbourhood.</p>`
          : html `
          ${appletInstanceInfos
            .sort((info_a, info_b) => { // show disabled applets on top, then sort alphabetically
              if (getStatus(info_a.appInfo) !== getStatus(info_b.appInfo)) {
                return getStatus(info_a.appInfo).localeCompare(getStatus(info_b.appInfo));
              } else {
                return info_a.applet.customName.localeCompare(info_b.applet.customName)
              }
            })
            .map((appletInfo: AppletInstanceInfo) => {
              return html`
                <applet-list-item .sensemakerStore=${this._sensemakerStore} .appletInfo=${appletInfo} .appletStatus=${getStatus(appletInfo.appInfo)} .onDelete=${() => {this._currentAppInfo = appletInfo; this._uninstallAppletDialog.open()}}></applet-list-item>
              `;
            })}`
      }

      <div class="refresh-button-row">
        <nh-button
          .variant=${"neutral"}
          @click=${this.refresh}
          .iconImageB64=${b64images.icons.refresh}
          .size=${"icon-label"}
        >Refresh</nh-button>
      </div>
    `;
  }

  render() {
    return html`
      <uninstall-applet-dialog
        id="uninstall-applet-dialog"
        @confirm-uninstall=${() => {this.uninstallApp(this._currentAppInfo.appInfo)}}
      ></uninstall-applet-dialog>

      ${this.renderAppStates()}
    `;
  }

  static elementDefinitions = {
    "nh-button": NHButton,
    "create-we-group-dialog": CreateNeighbourhoodDialog,
    "applet-list-item": AppletListItem,
    "uninstall-applet-dialog": UninstallApplet,
    'nh-dialog': NHDialog,
  }

  static get styles() {
    let localStyles = css`
      p {
        color: var(--nh-theme-fg-muted);
      }

      .refresh-button-row {
        margin: calc(1px * var(--nh-spacing-lg)) 0;
        display: grid;
        place-content: center;
      }
    `;

    return [sharedStyles, localStyles];
  }
}
