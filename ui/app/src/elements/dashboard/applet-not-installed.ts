import { DnaHash, EntryHash } from "@holochain/client";
import { consume } from "@lit/context";
import { ScopedRegistryHost } from "@lit-labs/scoped-registry-mixin"
import { css, html, LitElement } from "lit";
import { property, query, state } from "lit/decorators.js";
import { matrixContext, weGroupContext } from "../../context";
import { MatrixStore } from "../../matrix-store";
import { sharedStyles } from "../../sharedStyles";
import { AppletInstanceInfo, NewAppletInstanceInfo } from "../../types";
import { InstallFromFsDialog } from "../dialogs/install-from-file-system";

import NHButton from '@neighbourhoods/design-system-components/button';
import NHSpinner from '@neighbourhoods/design-system-components/spinner';

export class AppletNotInstalled extends ScopedRegistryHost(LitElement) {
  @consume({ context: matrixContext , subscribe: true })
  @property({attribute: false})
  _matrixStore!: MatrixStore;

  @consume({ context: weGroupContext, subscribe: true })
  @property({attribute: false})
  weGroupId!: DnaHash;

  @property()
  appletInstanceId!: EntryHash;

  @state()
  private _showAppletDescription: boolean = false;

  @property()
  mode!: "reinstall" | "join";

  @query("#join-from-fs-dialog")
  joinFromFsDialog!: InstallFromFsDialog;


  private toggleAppletDescription() {
    this._showAppletDescription = !this._showAppletDescription;
  }

  async joinApplet() {
    await this._matrixStore.joinApplet(this.weGroupId, this.appletInstanceId)
      .then(() => {
        this.dispatchEvent(
          new CustomEvent("applet-installed", {
            detail: { appletEntryHash: this.appletInstanceId, weGroupId: this.weGroupId },
            composed: true,
            bubbles: true,
            }
          )
        );
      }).catch((e) => {
        console.log("Installation Error: ", e);
      })
  }

  async reinstallApplet() {
    await this._matrixStore.reinstallApplet(this.weGroupId, this.appletInstanceId)
      .then(() => {
        this.dispatchEvent(
          new CustomEvent("applet-installed", {
            detail: { appletEntryHash: this.appletInstanceId, weGroupId: this.weGroupId },
            composed: true,
            bubbles: true,
            }
          )
        );
      }).catch((e) => {
        console.log("Installation Error: ", e);
      })
  }

  cancelReinstall() {
    this.dispatchEvent(
      new CustomEvent("cancel-reinstall", {
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    const appletInstanceInfo: AppletInstanceInfo | NewAppletInstanceInfo | undefined = this.mode == "reinstall"
      ? this._matrixStore.getUninstalledAppletInstanceInfo(this.appletInstanceId)
      : this._matrixStore.getNewAppletInstanceInfo(this.appletInstanceId);

    if (!appletInstanceInfo) return html`<nh-spinner type=${"icon"}></nh-spinner>`;

    return html`
      <join-from-fs-dialog
        mode=${this.mode}
        .appletInstanceId=${this.appletInstanceId}
        id="join-from-fs-dialog">
      </join-from-fs-dialog>

      <div class="content">
        ${!appletInstanceInfo.applet.logoSrc
          ? html`<div
              class="logo-placeholder-large"
              style="width: 100px; height: 100px;"
            >
              ${appletInstanceInfo.applet.customName[0]}
            </div>`
          : html`<img class="logo-large" src=${appletInstanceInfo.applet.logoSrc} />`}
        <div>
          <div
          >
            ${appletInstanceInfo.applet.customName}
          </div>
        </div>
        ${this._showAppletDescription
          ? html`<div
            >
              ${appletInstanceInfo.applet.description}
            </div>`
          : html``}

        ${this.mode == "reinstall"
          ? html`
              <div
              >
                Reinstall this applet?
              </div>
            `
          : html`
              <p>
                This applet has been added by someone else from your group.
              </p>
              <p>
                You haven't installed it yet.
              </p>
            `
        }
        <div class="buttons">
          <nh-button
            .variant=${"primary"}
            @click=${async () => this.joinFromFsDialog.open()}
          >Upload from Filesystem</nh-button>
          <nh-button
            .variant=${"secondary"}
            @click=${this.cancelReinstall}
          >Cancel</nh-button>
        </div>
      </div>
    `;
  }

  static elementDefinitions = {
    "nh-button": NHButton,
    "nh-spinner": NHSpinner,
    "join-from-fs-dialog": InstallFromFsDialog,
  }

  static get styles() {
    const localStyles = css`
      :host {
        display: grid;
        flex: 1;
        place-content: center;
        color: var(--nh-theme-fg-default);
      }

      .logo-large {
        border-radius: 50%;
        width: 100px;
        height: 100px;
        object-fit: cover;
        background: white;
      }

      .content, .buttons {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        gap: calc(1px * var(--nh-spacing-xl));
      }

      .buttons {
        flex-direction: row-reverse;
      }
    `;

    return [sharedStyles, localStyles];
  }


}
