import { consume } from '@lit/context';
import { html, css, CSSResult, PropertyValueMap } from 'lit';

import { matrixContext, weGroupContext } from '../../context';
import { MatrixStore } from '../../matrix-store';

import { property, state } from 'lit/decorators.js';
import { InvitationsBlock } from '../components/invitations-block';
import { AppletLibrary } from '../components/applet-library';
import { StoreSubscriber } from 'lit-svelte-stores';
import { DnaHash, EntryHash } from '@holochain/client';
import { NeighbourhoodSettings } from './neighbourhood-settings';
import { ProfilePrompt } from '../components/profile-prompt';
import { AppletNotInstalled } from './applet-not-installed';
import { provideWeGroupInfo } from '../../matrix-helpers';

import NHButton from '@neighbourhoods/design-system-components/button';
import NHCard from '@neighbourhoods/design-system-components/card';
import NHDialog from '@neighbourhoods/design-system-components/dialog';
import NHPageHeaderCard from '@neighbourhoods/design-system-components/page-header-card';
import NHSpinner from '@neighbourhoods/design-system-components/spinner';
import NHComponent from '@neighbourhoods/design-system-components/ancestors/base';

export class NeighbourhoodHome extends NHComponent {
  @consume({ context: matrixContext, subscribe: true })
  @property({ attribute: false })
  _matrixStore!: MatrixStore;

  _profilesStore = new StoreSubscriber(
    this,
    () => this._matrixStore.profilesStore(this.weGroupId),
    () => [this._matrixStore, this.weGroupId, this._profileCreated],
  );

  @consume({ context: weGroupContext, subscribe: true })
  @property({ attribute: false })
  weGroupId!: DnaHash;

  _neighbourhoodInfo = new StoreSubscriber(
    this,
    () => provideWeGroupInfo(this._matrixStore, this.weGroupId),
    () => [this._matrixStore, this.weGroupId, this._profileCreated],
  );

  @state() agentProfile = new StoreSubscriber(
    this,
    () => (this._profilesStore)?.value?.profiles.get(this._matrixStore.myAgentPubKey),
    () => [this.weGroupId, this._profilesStore]
  );
  
  @state() private _showLibrary: boolean = false;
  @state() private _profileCreated: boolean = false;

  @state()
  private _showInstallScreen: boolean = false;

  @state()
  private _installAppletId: EntryHash | undefined;

  @state()
  private _installMode: 'reinstall' | 'join' = 'join';

  public showLibrary() {
    this._showLibrary = true;
  }

  protected updated(changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
    if (this._profilesStore?.value && changedProperties.has("weGroupId")) {
      const task = this.agentProfile.value?.valueOf();
      if(!task) return;

      const allProfiles = Object.fromEntries(this._profilesStore?.value.profiles.map._map.entries())
      if(Object.values(allProfiles).length > 0) {
        Object.values(allProfiles)[0].subscribe(allProfiles0 => {
          const { value } = allProfiles0;
          // TODO: revise this approach this when we have multiple agent profiles in a NH. For demo purposes this now suffices. 
          this._profileCreated = !!value;
      });
      }
    }
  }

  renderContent() {
    if (!this._showInstallScreen && !this._showLibrary) {
      return html`
        <div class="container">
          <div class="nh-image">
            ${this._neighbourhoodInfo.value
              ? html`<img class="logo-large" src=${this._neighbourhoodInfo.value?.logoSrc} />`
              : html`<nh-spinner type=${"icon"}></nh-spinner>`}
            <h1>
              ${this._neighbourhoodInfo.value?.name !== undefined
                ? this._neighbourhoodInfo.value?.name
                : html`<nh-spinner type=${"icon"}></nh-spinner>`}
            </h1>
          </div>

          ${this._neighbourhoodInfo.value
            ? html`<div class="card-block">
            <invitations-block></invitations-block>

            <nh-card
              .theme=${'dark'}
              .title=${''}
              .heading=${'Add new applet'}
              .textSize=${'sm'}
              .hasPrimaryAction=${true}
            >
              <p>
                Initiate a new Applet instance from scratch that other neighbourhood members will
                be able to join.
              </p>
              <div slot="footer">
                <nh-button
                  .variant=${'primary'}
                  @click=${() => (this._showLibrary = true)}
                  .size=${'auto'}
                  >Browse Applets</nh-button
                >
              </div>
            </nh-card>
                  </div>`
            : html`<nh-spinner type=${"icon"}></nh-spinner>`}
          
          ${this._neighbourhoodInfo.value
            ? html`
              <neighbourhood-settings
                class="settings"
                @join-applet=${(e: CustomEvent) => {
                  this._installAppletId = e.detail;
                  this._installMode = 'join';
                  this._showInstallScreen = true;
                }}
                @reinstall-applet=${(e: CustomEvent) => {
                  this._installAppletId = e.detail;
                  this._installMode = 'reinstall';
                  this._showInstallScreen = true;
                }}
              >
                <div class="to-join"></div>
                <div class="installed"></div>
                <div class="uninstalled"></div>
                <div class="danger-zone"></div>
              </neighbourhood-settings>`
            : html`<nh-spinner type=${"icon"}></nh-spinner>`}
              
        </div>
      </div>
      `;
    }

    if (!this._showLibrary && this._showInstallScreen) {
      return html`
        <applet-not-installed
          .appletInstanceId=${this._installAppletId}
          .mode=${this._installMode}
          @cancel-reinstall=${() => {
            this._showInstallScreen = false;
            this._installAppletId = undefined;
          }}
        >
        </applet-not-installed>
      `;
    }

    return html`
      <div class="container">
        <applet-library
          .toggleVisible=${() => {
            this._showLibrary = false;
          }}
        ></applet-library>
      </div>
    `
  }

  async handleProfileCreated() {
    this._neighbourhoodInfo.store = provideWeGroupInfo(this._matrixStore, this.weGroupId);
    this._profileCreated = true;
    await this.requestUpdate();
  }

  render() {
    return this._profileCreated ? this.renderContent() : this.renderProfilePrompt();
  }

  renderProfilePrompt() {
    return typeof this._profileCreated !== 'undefined' && this._neighbourhoodInfo?.value
      ? html` 
          <div class="container" @profile-created=${() => this.handleProfileCreated()}>
            <nh-profile-prompt
              .profilesStore=${this._profilesStore.value}
              .neighbourhoodInfo=${this._neighbourhoodInfo.value}
            >
            </nh-profile-prompt>
          </div>`
      : html`
          <nh-spinner type=${'page'}></nh-spinner>
        `;
  }

  static elementDefinitions = {
    'nh-page-header-card': NHPageHeaderCard,
    'nh-button': NHButton,
    'nh-card': NHCard,
    'nh-spinner': NHSpinner,
    'nh-dialog': NHDialog,
    'applet-library': AppletLibrary,
    'nh-profile-prompt': ProfilePrompt,
    'invitations-block': InvitationsBlock,
    'neighbourhood-settings': NeighbourhoodSettings,
    'applet-not-installed': AppletNotInstalled,
  };

  static styles: CSSResult[] = [
    super.styles as CSSResult,
    css`
      /** Layout **/

      .container {
        flex: 1;
        display: grid;
        gap: calc(1px * var(--nh-spacing-sm));
        padding: calc(1px * var(--nh-spacing-3xl));
        grid-template-columns: 1fr 1fr;
        grid-template-rows: auto;
        grid-template-areas:
          'nh-image card-block'
          'nh-settings nh-settings';
      }
      .nh-image {
        grid-area: nh-image;
        align-self: center;
      }

      nh-profile-prompt {
        align-items: flex-start;
        grid-row: 1/-1;
        grid-column: 1/-1;
      }

      .card-block {
        grid-area: card-block;
        align-self: center;
      }
      .settings {
        grid-area: nh-settings;
        display: flex;
        flex-direction: column;
      }
      applet-library {
        grid-column: -1/1;
        grid-row: -1/1;
      }

      /** Sub-Layout **/
      .to-join,
      .installed,
      .uninstalled,
      .danger-zone {
        display: flex;
        flex: 1;
      }

      .nh-image {
        display: grid;
        place-content: center;
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
    `,
  ];
}
