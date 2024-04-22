import { consume } from "@lit/context";
import { html, css, CSSResult, PropertyValueMap } from "lit";
import { get } from "svelte/store";

import { matrixContext, weGroupContext } from "../../context";
import { MatrixStore } from "../../matrix-store";

import { property, state } from "lit/decorators.js";
import { NHButton, NHCard, NHComponentShoelace, NHDialog, NHPageHeaderCard, NHSkeleton, NHSpinner } from '@neighbourhoods/design-system-components';
import { InvitationsBlock } from "../components/invitations-block";
import { AppletLibrary } from "../components/applet-library";
import { StoreSubscriber, subscribe } from "lit-svelte-stores";
import { DnaHash, EntryHash } from "@holochain/client";
import { NeighbourhoodSettings } from "./neighbourhood-settings";
import { ProfilePrompt } from "../components/profile-prompt";
import { AppletNotInstalled } from "./applet-not-installed";
import { provideWeGroupInfo } from "../../matrix-helpers";

export class NeighbourhoodHome extends NHComponentShoelace {
  @consume({ context: matrixContext , subscribe: true })
  @property({attribute: false})
  _matrixStore!: MatrixStore;

  _profilesStore = new StoreSubscriber(
    this,
    () => this._matrixStore.profilesStore(this.weGroupId),
    () => [this._matrixStore, this.weGroupId, this._profileCreated]
  );

  @consume({ context: weGroupContext, subscribe: true })
  @property({attribute: false})
  weGroupId!: DnaHash;

  _neighbourhoodInfo = new StoreSubscriber(
    this,
    () => provideWeGroupInfo(this._matrixStore, this.weGroupId),
    () => [this._matrixStore, this.weGroupId, this._profileCreated]
  );

  @state() private _showLibrary: boolean = false;
  @state() private _profileCreated: boolean = false;

  @state()
  private _showInstallScreen: boolean = false;

  @state()
  private _installAppletId: EntryHash | undefined;

  @state()
  private _installMode: "reinstall" | "join" = "join";

  public showLibrary() {
    this._showLibrary = true
  }

  protected updated(_: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
      if(this._profilesStore?.value) {
        this._profilesStore.value.myProfile.subscribe(task => {
          if(task!.status == "pending") return;
          this._profileCreated = !!((task as any).value);
        })
      }
  }

  renderContent() {
    if (this._showInstallScreen) {
      return html`
              <applet-not-installed
                .appletInstanceId=${this._installAppletId}
                .mode=${this._installMode}
                @cancel-reinstall=${() => { this._showInstallScreen = false; this._installAppletId = undefined; }}>
              </applet-not-installed>
      `
    }

    return this._showLibrary
      ? html`
            <div class="container">
              <applet-library .toggleVisible=${() => { this._showLibrary = false }}></applet-library>
            </div>
        `
      : html`
            <div class="container">
              <div class="nh-image">
                ${this._neighbourhoodInfo.value
                  ? html`<img
                      class="logo-large"
                      src=${this._neighbourhoodInfo.value?.logoSrc}
                    />`
                  : html``}
                <h1>
                  ${this._neighbourhoodInfo.value?.name !== undefined ? this._neighbourhoodInfo.value?.name : ''}
                </h1>
              </div>

              <div class="card-block">
                <invitations-block></invitations-block>

                <nh-card .theme=${"dark"} .title=${""} .heading=${"Add new applet"} .textSize=${"sm"} .hasPrimaryAction=${true}>
                  <p>
                    Initiate a new Applet instance from scratch that other neighbourhood members will be able to join.
                  </p>
                  <div slot="footer">
                    <nh-button .variant=${"primary"} @click=${() => this._showLibrary = true} .size=${"auto"}>Browse Applets</nh-button>
                  </div>
                </nh-card>
              </div>
              <neighbourhood-settings class="settings"
                @join-applet=${(e: CustomEvent) => {
                  this._installAppletId = e.detail;
                  this._installMode = "join";
                  this._showInstallScreen = true;
                  }
                }
                @reinstall-applet=${(e: CustomEvent) => {
                  this._installAppletId = e.detail;
                  this._installMode = "reinstall";
                  this._showInstallScreen = true;
                  }
                }
              >
                <div class="to-join"></div>
                <div class="installed"></div>
                <div class="uninstalled"></div>
                <div class="danger-zone"></div>
              </neighbourhood-settings>
            </div>
    `
  }

  handleProfileCreated() {
    this._neighbourhoodInfo.store = provideWeGroupInfo(this._matrixStore, this.weGroupId)
    this._profileCreated = true;
  }

  render() {
    return this._profileCreated
      ? this.renderContent()
      : this.renderProfilePrompt();
  }

  renderProfilePrompt() {
    return this._neighbourhoodInfo?.value
      ? html`
        <main @profile-created=${this.handleProfileCreated}>
          <profile-prompt .profilesStore=${this._profilesStore.value} .neighbourhoodInfo=${this._neighbourhoodInfo.value}>
          </profile-prompt>
        </main>`
      : html`<nh-spinner type=${"page"}></nh-spinner>`
  }

  static elementDefinitions = {
      'nh-page-header-card': NHPageHeaderCard,
      "nh-button": NHButton,
      "nh-card": NHCard,
      "nh-spinner": NHSpinner,
      'nh-dialog': NHDialog,
      "applet-library": AppletLibrary,
      "profile-prompt": ProfilePrompt,
      "invitations-block": InvitationsBlock,
      "neighbourhood-settings": NeighbourhoodSettings,
      'applet-not-installed': AppletNotInstalled,
  }

  static styles : CSSResult[] = [
    super.styles as CSSResult,
      css`
        /** Layout **/

        main {
          display: flex;
          flex: 1;
        }

        .container {
          flex: 1;
          display: grid;
          gap: calc(1px * var(--nh-spacing-sm));
          padding: calc(1px * var(--nh-spacing-3xl));
          grid-template-columns: 1fr 1fr;
          grid-template-rows: auto;
          grid-template-areas:  "nh-image card-block"
                                "nh-settings nh-settings";
        }
        .nh-image { grid-area: nh-image; align-self: center; }
        .card-block { grid-area: card-block; align-self: center; }
        .settings { grid-area: nh-settings; display: flex; flex-direction: column;}
        applet-library { grid-column: -1/1; grid-row: -1/1; }

        /** Sub-Layout **/
        .to-join, .installed, .uninstalled, .danger-zone {
          display: flex;
          flex: 1;
        }

        .nh-image {
          display: grid;
          place-content: center
        }

        .card-block {
          display: flex;
          flex-direction: column;
          gap: calc(1px * var(--nh-spacing-3xl));
        }

        .logo-large {
          width: 200px;
          height: 200px;
          border-radius: 100%;
        }

        /** Typo **/
        h1 {
          text-align: center;
        }
    `
  ];
}
