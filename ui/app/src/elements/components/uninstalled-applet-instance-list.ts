import { consume } from "@lit/context";
import { ScopedRegistryHost } from "@lit-labs/scoped-registry-mixin"
import { html, LitElement, css } from "lit";
import { StoreSubscriber } from "lit-svelte-stores";
import { matrixContext, weGroupContext } from "../../context";
import { MatrixStore } from "../../matrix-store";
import { sharedStyles } from "../../sharedStyles";
import { property, state } from "lit/decorators.js";
import { DnaHash, EntryHash } from "@holochain/client";
import { AppletListItem } from "./applet-list-item";
import { UninstalledAppletInstanceInfo } from "../../types";

import NHButton from '@neighbourhoods/design-system-components/button';
import { b64images } from "@neighbourhoods/design-system-styles";

export class UninstalledAppletInstanceList extends ScopedRegistryHost(LitElement) {
  @consume({ context: matrixContext , subscribe: true })
  @property({attribute: false})
  matrixStore!: MatrixStore;

  @consume({ context: weGroupContext, subscribe: true })
  @property({attribute: false})
  weGroupId!: DnaHash;

  _uninstalledApplets = new StoreSubscriber(
    this,
    () => this.matrixStore.getUninstalledAppletInstanceInfosForGroup(this.weGroupId)
  );

  @state()
  private _currentAppInfo!: UninstalledAppletInstanceInfo;

  reinstallApp(appletInstanceId: EntryHash) {
    this.dispatchEvent(
      new CustomEvent("reinstall-applet", {
        detail: appletInstanceId,
        bubbles: true,
        composed: true,
      })
    );
  }

  refresh() {
    this.matrixStore.fetchMatrix();
    this.requestUpdate();
  }

  renderAppStates() {
    const appletInstanceInfos = this._uninstalledApplets.value;
    return html`${appletInstanceInfos?.length == 0 || !appletInstanceInfos
      ? html`<p>You have no applet instances to uninstall in this neighbourhood.</p>`
      : html`
      ${
        appletInstanceInfos!.length == 0 || !appletInstanceInfos
          ? html`<p>You have no applet instances installed in this neighbourhood.</p>`
          : html `
          ${appletInstanceInfos
            .sort((info_a, info_b) => info_a.applet.customName.localeCompare(info_b.applet.customName)) // sort alphabetically
          .map((appletInfo) => {
            return html`<applet-list-item .appletInfo=${appletInfo} .onReinstall=${() => {this._currentAppInfo = appletInfo; // TODO do something
          }}></applet-list-item>`;
          })}`
        }
    `}
      <div class="refresh-button-row">
        <nh-button
          .variant=${"neutral"}
          @click=${this.refresh}
          .iconImageB64=${b64images.icons.refresh}
          .size=${"icon-lg"}
        >Refresh</nh-button>
      </div>
    `;
  }

  render() {
    return html`
      <uninstall-applet-dialog
        id="uninstall-applet-dialog"
        @confirm-uninstall=${() => {this.reinstallApp(this._currentAppInfo.appletId)}}
      ></uninstall-applet-dialog>

      ${this.renderAppStates()}
    `;
  }

  static elementDefinitions = {
    "nh-button": NHButton,
    "applet-list-item": AppletListItem,
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
