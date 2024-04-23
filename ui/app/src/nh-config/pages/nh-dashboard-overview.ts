import { encodeHashToBase64 } from '@holochain/client';
import { html, css, PropertyValueMap } from 'lit';
import { consume } from '@lit/context';

import { MatrixStore } from '../../matrix-store';
import { matrixContext, appletInstanceInfosContext, resourceDefContext, weGroupContext } from '../../context';

import NHButton from '@neighbourhoods/design-system-components/button';
import NHPageHeaderCard from '@neighbourhoods/design-system-components/page-header-card';
import NHComponent from '@neighbourhoods/design-system-components/ancestors/base';
import NHSkeleton from '@neighbourhoods/design-system-components/skeleton';
import { b64images } from '@neighbourhoods/design-system-styles';

import TabbedContextTables from '../lists/tabbed-context-tables';
import { property, state } from 'lit/decorators.js';
import { SensemakerStore, AppletConfig } from '@neighbourhoods/client';
import { derived } from 'svelte/store';
import {
  LoadingState,
} from '../types';
import { AppletGui, AppletInstanceInfo } from '../../types';
import { StoreSubscriber } from 'lit-svelte-stores';

export default class NHDashBoardOverview extends NHComponent {
  @property() loaded!: boolean;
  @state() loadedState: LoadingState = LoadingState.FirstRender;

  @consume({ context: matrixContext, subscribe: true })
  @property({ attribute: false }) _matrixStore!: MatrixStore;
  @consume({ context: weGroupContext, subscribe: true })
  @property({ attribute: false }) _weGroupId!: Uint8Array;
  @consume({ context: resourceDefContext, subscribe: true })
  @property({ attribute: false }) selectedResourceDef!: object | undefined;
  @consume({ context: appletInstanceInfosContext, subscribe: true })
  @property({ attribute: false }) _currentAppletInstances!: StoreSubscriber<{EntryHashB64: AppletInstanceInfo & {gui: AppletGui}} | undefined>;

  @property({ attribute: false }) resourceDefEntries!: object[];
  
  sensemakerStore!: SensemakerStore;

  @state() currentAppletInstanceId : string = '';

  _currentAppletConfig = new StoreSubscriber(
    this,
    () =>  derived(this._currentAppletInstances.store, async (applets: { EntryHashB64: AppletInstanceInfo & {gui: AppletGui}} | undefined) => {
      if(!applets || !this.selectedResourceDef) return {}
      const appletId = (this.selectedResourceDef as any).applet_eh;
      return applets[encodeHashToBase64(appletId)]
    }),
    () => [this._currentAppletInstances],
  );

  @state() _currentAppletContexts : any[] = [];

  protected async firstUpdated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>) {
    // If we have a derived applet config, set its contexts in state so that the tab buttons are rendered
    if(this._currentAppletConfig?.value) {
      const currentConfig = await this._currentAppletConfig.value as AppletConfig;
      if(typeof currentConfig?.cultural_contexts !== 'object') return
      this._currentAppletContexts = Object.entries(currentConfig!.cultural_contexts);
    }
  }

  protected updated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {

    if(this.loaded && !(this._currentAppletInstances?.value && Object.values(this._currentAppletInstances.value).length > 0)) {
      
      this.dispatchEvent(
        new CustomEvent("trigger-alert", {
          detail: { 
            title: "No Applets Installed",
            msg: "You cannot use the Sensemaker dashboard without installing and using applets.",
            type: "success",
            closable: true,
          },
          bubbles: true,
          composed: true,
        })
      );
    }  
  }

  render() {
    return html`
      <div class="container">
        <nh-page-header-card .heading=${'Sensemaker Dashboard Overview'}>
          <nh-button
            slot="secondary-action"
            .variant=${'neutral'}
            .size=${'icon'}
            .iconImageB64=${b64images.icons.backCaret}
            @click=${() => this.onClickBackButton()}
          >
          </nh-button>
        </nh-page-header-card>

        ${  !this.loaded || this.loadedState == LoadingState.NoAppletSensemakerData
          ? html`<nh-skeleton type=${"dashboard-basic-grid"}></nh-skeleton>`
          : html` <tabbed-context-tables
                    .resourceDefEntries=${this.resourceDefEntries}
                    .selectedAppletInstanceId=${this.currentAppletInstanceId}
                    .contexts=${this._currentAppletContexts}
                    .loaded=${this.loaded}
                  ></tabbed-context-tables>`
        }
      </div>
    `;
  }

  static elementDefinitions = {
    'nh-button': NHButton,
    'nh-page-header-card': NHPageHeaderCard,
    'nh-skeleton': NHSkeleton,
    'tabbed-context-tables': TabbedContextTables
  };

  renderIcons() {
    return html`
      <div class="icon-container">
        <div class="mock-icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="w-6 h-6"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15M9 12l3 3m0 0l3-3m-3 3V2.25"
            />
          </svg>
        </div>
        <div class="mock-icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="{1.5}"
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
            />
          </svg>
        </div>
      </div>
    `;
  }

  private onClickBackButton() {
    this.dispatchEvent(new CustomEvent('return-home', { bubbles: true, composed: true }));
  }

  static get styles() {
    return css`
      :host {
        display: flex;
        width: 100%;
      }

      nh-skeleton {
        grid-column: 1/-1;
        grid-row: auto;
        min-height: 50vh
      }

      div.container {
        --menu-width: 200px; /* TODO: lift this variable up do dedup in the parent component */
        width: 100%;
        display: grid;
        flex: 1;
        place-content: start;
        color: var(--nh-theme-fg-default);
        grid-template-columns: 2fr 1fr;
        grid-template-rows: 3rem auto;
        padding: calc(1px * var(--nh-spacing-xl));
        gap: calc(1px * var(--nh-spacing-sm));
      }

      h2 {
        margin: 0 auto;
        width: 18rem;
      }

      nh-page-header-card {
        grid-column: 1 / -1;
      }
    `;
  }
}
