import { html, css, PropertyValueMap } from 'lit';
import { consume, provide } from '@lit/context';

import { MatrixStore } from '../../matrix-store';
import { matrixContext, resourceDefContext, weGroupContext } from '../../context';
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
import { Readable } from 'svelte/store';
import { cleanResourceNameForUI } from '../../elements/components/helpers/functions';
import {
  LoadingState,
  DimensionDict,
  ContextEhDict,
  AppletRenderInfo,
  AssessmentTableType,
} from '../types';

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
  resourceDef!: object;

  sensemakerStore!: SensemakerStore;
  
  

  async connectedCallback() {
    super.connectedCallback();
    this.setupAssessmentsSubscription();
  }
  
  setupAssessmentsSubscription() {
    // let store = this._matrixStore.sensemakerStore(this.selectedWeGroupId);
    // store.subscribe(store => {
      // (store?.appletConfigs() as Readable<{ [appletName: string]: AppletConfig }>).subscribe(
        //   appletConfigs => {
          //     if(typeof appletConfigs !== 'object') return;
          //     Object.entries(appletConfigs).forEach(([installedAppId, appletConfig]) => {
            //       // flatten resource defs by removing the role name and zome name keys
            //       const flattenedResourceDefs = Object.values(appletConfig.resource_defs).map((zomeResourceMap) => Object.values(zomeResourceMap)).flat().reduce(
    //         (acc, curr) => ({...acc, ...curr}),
    //         {}
    //       );
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
    // if(typeof this.appletDetails !== 'object' || !Object.entries(this.appletDetails)[this.selectedAppletIndex]?.length) return;
    // const [installedAppId, appletDetails] = Object.entries(this.appletDetails)[this.selectedAppletIndex];

    if(_changedProperties.has('selectedAppletIndex')) {
      // this.context_ehs = Object.fromEntries(
      //   zip(this.appletDetails[installedAppId].contexts, appletDetails.context_ehs),
      //   );
      // this.selectedAppletResourceDefs = flattenRoleAndZomeIndexedResourceDefs(this.appletDetails[installedAppId].resource_defs)

      // this.dimensions = this.appletDetails[installedAppId].dimensions;
      // this.requestUpdate('selectedResourceDefIndex')
    }
  }
  // @state() selectedResourceDefIndex: number = -1; // No resource definition selected
  // @state() selectedAppletIndex: number = 0;
  // @state() selectedResourceDefEh!: string;
  // @state() selectedWeGroupId!: Uint8Array;
  
  // @state() appletDetails!: object;
  // @state() selectedAppletResourceDefs!: object;
  // @state() dimensions: DimensionDict = {};
  // @state() context_ehs: ContextEhDict = {};
  
  // @query("#select-context") _contextSelector;
  


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
  async renderSidebar(appletIds: string[]) {
    // const appletInstanceInfos = get(this._matrixStore?.getAppletInstanceInfosForGroup(this._weGroupId))
    // console.log('appletInstanceInfos :>> ', appletInstanceInfos);
    // // const appId = Object.keys(Object.fromEntries((appletInstanceInfos).entries()))[0];
    // // if(!appId) return;

    // const comp = this._matrixStore.createResourceBlockDelegate(decodeHashFromBase64(appId))

    // console.log('this._sensemakerStore :>> ', comp);
    //     console.log('this._matrixStore :>> ', appId);
    // const componentNhDelegate = createInputAssessmentWidgetDelegate(this._sensemakerStore, )
    // return html`
    //   <nav>
    //     <resource-block-renderer .component=${null} .nhDelegate=${null}></resource-block-renderer>
    //     <div>
    //       <sl-input class="search-input" placeholder="SEARCH" size="small"></sl-input>
    //     </div>
    //     <sl-menu class="dashboard-menu-section">
    //       <sl-menu-label class="nav-label">NH NAME</sl-menu-label>
    //       <sl-menu-item class="nav-item" value="overview">Overview</sl-menu-item>
    //       <sl-menu-item class="nav-item" value="roles">Roles</sl-menu-item>
    //     </sl-menu>
    //     <sl-menu class="dashboard-menu-section">
    //       <sl-menu-label class="nav-label">SENSEMAKER</sl-menu-label>
    //       ${appletIds.map((id, i) => {
    //         const applet = this.appletDetails[id];
    //         const appletName = this.appletDetails[id]?.customName;
    //         return !!applet
    //           ? html`
    //               <sl-menu-item
    //                 class="nav-item ${classMap({
    //                   active: this.selectedAppletIndex === i,
    //                 })}"
    //                 value="${appletName}"
    //                 @click=${() => {
    //                   this.selectedAppletIndex = i;
    //                   this.selectedResourceDefIndex = -1;
    //                   this.setupAssessmentsSubscription();
    //                 }}
    //                 >${appletName}</sl-menu-item
    //               >
    //               <div role="navigation" class="sub-nav indented">
    //                 ${applet?.appletRenderInfo?.resourceNames &&
    //                 applet?.appletRenderInfo?.resourceNames.map(
    //                   (resource, resourceIndex) => html`<sl-menu-item
    //                     class="nav-item"
    //                     value="${resource.toLowerCase()}"
    //                     @click=${() => {
    //                       this.selectedAppletIndex = i;
    //                       this.selectedResourceDefIndex = resourceIndex;
    //                       this.setupAssessmentsSubscription();
    //                     }}
    //                     >${resource}</sl-menu-item
    //                   >`,
    //                 )}
    //               </div>
    //             `
    //           : html``;
    //       })}
    //     </sl-menu>
    //     <sl-menu class="dashboard-menu-section">
    //       <sl-menu-label class="nav-label">Member Management</sl-menu-label>
    //       <sl-menu-item class="nav-item" value="overview">Members</sl-menu-item>
    //       <sl-menu-item class="nav-item" value="roles">Invitees</sl-menu-item>
    //     </sl-menu>
    //   </nav>
    // `;
  }

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
    // }

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

        ${this.loadingState !== LoadingState.NoAppletSensemakerData
          ? html`<nh-dashboard-skeleton></nh-dashboard-skeleton>`
          : html`<tabbed-context-tables .selectedResourceName=${this.resourceDef}></tabbed-context-tables>`
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
