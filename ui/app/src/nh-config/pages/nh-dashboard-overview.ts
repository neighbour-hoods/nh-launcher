import { html, css, PropertyValueMap } from 'lit';
import { consume } from '@lit/context';

import { MatrixStore } from '../../matrix-store';
import { appletContext, matrixContext, appletInstanceInfosContext, resourceDefContext, weGroupContext } from '../../context';

import {
  NHAlert,
  NHButton,
  NHComponent,
  NHPageHeaderCard,
} from '@neighbourhoods/design-system-components';
import TabbedContextTables from '../lists/tabbed-context-tables';
import NHDashboardSkeleton from './nh-dashboard-skeleton';
import { property, state } from 'lit/decorators.js';
import { b64images } from '@neighbourhoods/design-system-styles';
import { SensemakerStore, AppletConfig } from '@neighbourhoods/client';
import { derived } from 'svelte/store';
import {
  LoadingState,
} from '../types';
import { Applet, AppletInstanceInfo } from '../../types';
import { StoreSubscriber } from 'lit-svelte-stores';
import { compareUint8Arrays } from '@neighbourhoods/app-loader';

export default class NHDashBoardOverview extends NHComponent {
  @state() loading: boolean = true;
  @state() loadingState: LoadingState = LoadingState.FirstRender;

  @consume({ context: matrixContext, subscribe: true })
  @property({ attribute: false })
  _matrixStore!: MatrixStore;
  @consume({ context: weGroupContext, subscribe: true })
  @property({ attribute: false })
  _weGroupId!: Uint8Array;
  @consume({ context: resourceDefContext, subscribe: true })
  @property({ attribute: false })
  selectedResourceDef!: object;
  @consume({ context: appletContext, subscribe: true })
  @property({ attribute: false })
  currentApplet!: Applet;
  @consume({ context: appletInstanceInfosContext, subscribe: true })
  @property({ attribute: false })
  appletInstanceInfos!: StoreSubscriber<AppletInstanceInfo[] | undefined>;

  sensemakerStore!: SensemakerStore;

  @state() currentAppletInstanceId : string = '';

  _currentAppletConfig = new StoreSubscriber(
    this,
    () =>  derived(this.appletInstanceInfos.store, async (applets) => {
      if(!this.currentApplet) return {}
      const currentAppletInstanceInfo = applets?.find((applet: AppletInstanceInfo) => compareUint8Arrays(applet.applet.devhubHappReleaseHash, this.currentApplet.devhubHappReleaseHash));
      this.currentAppletInstanceId = currentAppletInstanceInfo?.appInfo.installed_app_id as string;
      const maybe_config = await this.sensemakerStore.checkIfAppletConfigExists(currentAppletInstanceInfo!.appInfo.installed_app_id);
      return maybe_config || {}
    }),
    () => [this.appletInstanceInfos, this.currentApplet],
  );

  @state() _currentAppletContexts : any[] = [];

  protected async firstUpdated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
    if(this._currentAppletConfig?.value) {
      const currentConfig = await this._currentAppletConfig.value as  AppletConfig;
      if(typeof currentConfig?.cultural_contexts !== 'object') return
      this._currentAppletContexts = Object.entries(currentConfig!.cultural_contexts);
    }
  }

  render() {
    return html`
      <main>
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

        ${this.loadingState == LoadingState.NoAppletSensemakerData
          ? html`<nh-dashboard-skeleton></nh-dashboard-skeleton>`
          : html`<tabbed-context-tables .selectedAppletInstanceId=${this.currentAppletInstanceId} .contexts=${this._currentAppletContexts}></tabbed-context-tables>`
        }
      </main>
    `;
  }

  static elementDefinitions = {
    'nh-alert': NHAlert,
    'nh-button': NHButton,
    'nh-page-header-card': NHPageHeaderCard,
    'nh-dashboard-skeleton': NHDashboardSkeleton,
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
      :host,
      .container {
        display: flex;
        width: 100%;
      }

      .container {
        flex-direction: column;
        align-items: flex-start;
      }

      h2 {
        margin: 0 auto;
        width: 18rem;
      }

      main {
        --menu-width: 200px; /* TODO: lift this variable up do dedup in the parent component */
        width: 100%;
        display: grid;
        flex: 1;
        place-content: start;
        color: var(--nh-theme-fg-default);
        grid-template-columns: 2fr 1fr;
        grid-template-rows: 4rem auto;
        padding: calc(1px * var(--nh-spacing-xl));
        gap: calc(1px * var(--nh-spacing-sm));
      }

      nh-page-header-card {
        grid-column: 1 / -1;
      }
    `;
  }
}
