import { AppletConfig } from '@neighbourhoods/client/dist/applet';
import { EntryHashB64 } from '@holochain/client';
import { ResourceDef } from '@neighbourhoods/client';
import { html, css, PropertyValueMap } from 'lit';
import { consume, provide } from '@lit/context';

import { MatrixStore } from '../../matrix-store';
import { appletContext, matrixContext, appletInstanceInfosContext, resourceDefContext, weGroupContext } from '../../context';
import { EntryHash, decodeHashFromBase64, encodeHashToBase64 } from '@holochain/client';

import {
  NHAlert,
  NHButton,
  NHCard,
  NHComponent,
  NHDialog,
  NHPageHeaderCard,
} from '@neighbourhoods/design-system-components';
import TabbedContextTables from '../lists/tabbed-context-tables';
import CreateDimension from '../forms/create-input-dimension-form';
import DimensionList from '../lists/dimension-list';
import NHDashboardSkeleton from './nh-dashboard-skeleton';
import { property, query, state } from 'lit/decorators.js';
import { b64images } from '@neighbourhoods/design-system-styles';
import CreateOutputDimensionMethod from '../forms/create-output-dimension-form';
import { sensemakerStoreContext, SensemakerStore, AppletConfig, ResourceDef } from '@neighbourhoods/client';
import { zip } from 'fflate';
import { classMap } from 'lit-html/directives/class-map.js';
import { snakeCase } from 'lodash-es';
import { Readable, derived } from 'svelte/store';
import { cleanForUI, cleanResourceNameForUI } from '../../elements/components/helpers/functions';
import {
  LoadingState,
  DimensionDict,
  ContextEhDict,
  AppletRenderInfo,
  AssessmentTableType,
} from '../types';
import { Applet, AppletInstanceInfo } from '../../types';
import { StoreSubscriber } from 'lit-svelte-stores';

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

  async connectedCallback() {
    super.connectedCallback();
    this.setupAssessmentsSubscription();
  }

  // Map of applet configs cached and keyed by AppletEh
  _allAppletConfigs: Map<EntryHashB64, AppletConfig> = new Map();
  
  _currentAppletDetails = new StoreSubscriber(
    this,
    () =>  derived(this.appletInstanceInfos.store, (applets) => {
      const currentApplet =  applets?.find((applet: AppletInstanceInfo) => applet.applet.title == this.currentApplet.title);
      return {
        ...currentApplet
      }
    }),
    () => [this.appletInstanceInfos, this.currentApplet],
  );

  protected firstUpdated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
    if(this.appletInstanceInfos && this.currentApplet) {
    console.log('this._currentAppletDetails :>> ', this._currentAppletDetails);
    }
  }
  
  setupAssessmentsSubscription() {

    //       this.appletDetails[installedAppId].appletRenderInfo = {
      //         resourceNames: Object.keys(flattenedResourceDefs)?.map(cleanResourceNameForUI),
      //       };
      //       // Keep dimensions for dashboard table prop
      //       this.appletDetails[installedAppId].dimensions = appletConfig.dimensions;
      //       //Keep context names for display
      //       this.appletDetails[installedAppId].contexts = Object.keys(appletConfig.cultural_contexts).map(
        //         cleanResourceNameForUI,
        //       );
        //       // Keep context entry hashes and resource_def_eh for filtering in dashboard table
        //       this.appletDetails[installedAppId].context_ehs = Object.values(appletConfig.cultural_contexts);
        //       this.appletDetails[installedAppId].resource_defs = appletConfig.resource_defs;
    //     });
    //     this.loading = false;
    //   },
    // );
    // });
  }
  
  protected updated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
    if(_changedProperties.has('currentApplet')) {
      // console.log('this.appletIn :>> ', this.appletInstanceInfos);
      // this.context_ehs = Object.fromEntries(
      //   zip(this.appletDetails[installedAppId].contexts, appletDetails.context_ehs),
      //   );
      // this.selectedAppletResourceDefs = flattenRoleAndZomeIndexedResourceDefs(this.appletDetails[installedAppId].resource_defs)

      // this.dimensions = this.appletDetails[installedAppId].dimensions;
      // this.requestUpdate('selectedResourceDefIndex')
    }
  }
  // @state() context_ehs: ContextEhDict = {};
  
  // @query("#select-context") _contextSelector;
  
  async renderSidebar(appletIds: string[]) {
    // // const appId = Object.keys(Object.fromEntries((appletInstanceInfos).entries()))[0];
    // // if(!appId) return;
    // const appletIds = this?.appletDetails ? Object.keys(this.appletDetails) : [];
    // const appletDetails =
    //   typeof this.appletDetails == 'object' ? Object.values(this.appletDetails) : [];
    // const appletConfig =
    //   appletDetails.length &&
    //   ([appletDetails[this.selectedAppletIndex]?.appletRenderInfo] as AppletRenderInfo[]);

    // if (appletConfig && appletDetails[this.selectedAppletIndex]) {
    //   this.selectedResourceName =
    //     this.selectedResourceDefIndex < 0
    //       ? 'All Resources'
    //       : appletDetails[this.selectedAppletIndex].appletRenderInfo.resourceNames[
    //           this.selectedResourceDefIndex
    //         ];
    // }
    // const contexts = appletConfig && appletDetails[this.selectedAppletIndex]?.contexts;
    // if (!appletConfig![0] || contexts == 0) {
    //   this.loadingState = LoadingState.NoAppletSensemakerData;
    // 
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
          : html`<tabbed-context-tables .selectedResourceName=${!this?.selectedResourceDef ? "All Resources" : cleanForUI((this?.selectedResourceDef as ResourceDef)!.resource_name)}></tabbed-context-tables>`
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
