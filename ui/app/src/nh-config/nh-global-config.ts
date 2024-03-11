import { html, css, TemplateResult, PropertyValueMap } from 'lit';
import { consume, provide } from '@lit/context';
import { StoreSubscriber } from 'lit-svelte-stores';

import { MatrixStore } from '../matrix-store';
import { ConfigPage } from './types';
import { currentAppletEhContext, appletInstanceInfosContext, matrixContext, resourceDefContext, weGroupContext } from '../context';
import { DnaHash, EntryHash, EntryHashB64, encodeHashToBase64 } from '@holochain/client';

import DimensionsConfig from './pages/nh-dimensions-config';
import AssessmentWidgetConfig from './pages/nh-assessment-widget-config';
import NHDashBoardOverview from './pages/nh-dashboard-overview';

import { NHComponent, NHMenu } from '@neighbourhoods/design-system-components';
import { property, query, state } from 'lit/decorators.js';
import { provideWeGroupInfo } from '../matrix-helpers';

import { NeighbourhoodAppletRenderers, ResourceDef, serializeAsyncActions } from '@neighbourhoods/client';
import { cleanForUI } from '../elements/components/helpers/functions';
import { Applet, AppletGui, AppletInstanceInfo } from '../types';
import { derived, get } from 'svelte/store';
import { compareUint8Arrays } from '@neighbourhoods/app-loader';

export default class NHGlobalConfig extends NHComponent {
  @consume({ context: matrixContext, subscribe: true })
  @property({ attribute: false })
  _matrixStore!: MatrixStore;

  @consume({ context: weGroupContext, subscribe: true })
  @property({ attribute: false })
  weGroupId!: DnaHash;

  @provide({ context: currentAppletEhContext }) @property({attribute: false})
  currentAppletInstanceEh!: string | null;

  @state() applets : [EntryHash, Applet, DnaHash[]][] = [];
  @state() guis!: { EntryHashB64 : AppletGui };

  @provide({ context: appletInstanceInfosContext })
  @property({attribute: false})
  _currentAppletInstances = new StoreSubscriber(
    this,
    () =>  derived(this._matrixStore.getAppletInstanceInfosForGroup(this.weGroupId), (appletInstanceInfos: AppletInstanceInfo[] | undefined) => {
      if(this._resourceDefEntries.length == 0) return
      return this._resourceDefEntries.reduce((acc, resourceDef) => {
        const appletEh = encodeHashToBase64(resourceDef.applet_eh) as EntryHashB64;
        const linkedApplet : AppletInstanceInfo | undefined = appletInstanceInfos!.find(applet => compareUint8Arrays(resourceDef.applet_eh, applet.appletId))
        if(!linkedApplet) return acc

        acc[appletEh] = {...linkedApplet};
        if(!this.guis || !this.guis[encodeHashToBase64(resourceDef.applet_eh)]) return acc
        
        acc[appletEh].gui = this.guis[encodeHashToBase64(resourceDef.applet_eh)] as AppletGui;
        return acc
      }, {} as {EntryHashB64: AppletInstanceInfo & {gui: AppletGui}})
    }),
    () => [this.currentAppletInstanceEh, this.loaded],
  );

  @provide({ context: resourceDefContext })
  @property() selectedResourceDef!: object | undefined;

  _sensemakerStore = new StoreSubscriber(this, () =>
    this._matrixStore?.sensemakerStore(this.weGroupId),
  );

  @state() loaded : boolean = false;

  private _resourceDefEntries: Array<ResourceDef> = [];

  _neighbourhoodInfo = new StoreSubscriber(
    this,
    () => provideWeGroupInfo(this._matrixStore, this.weGroupId),
    () => [this._matrixStore, this.weGroupId],
  );

  @state() _nhName!: string;

  @state() _page?: ConfigPage = ConfigPage.DashboardOverview;

  @query('nh-menu') _menu?: NHMenu;

  protected async firstUpdated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>) {
      // get all applet entry hash, applet, and federated groups' dnahashes
      this.applets = get(await this._matrixStore.fetchAllApplets(this.weGroupId));
      console.log('applet tuples fetched :>> ', this. applets);
  }

  protected async updated(changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>) {
    if (this._neighbourhoodInfo?.value && !this?._nhName) { // Update NH name state which triggers re-render of the menu
      this._nhName = this._neighbourhoodInfo?.value.name;
    }

    if(changedProperties.has('weGroupId')) { // Fetch all resourceDefEntries in the Neighbourhood
      if(!this._sensemakerStore.value) return
      const result = await this._sensemakerStore.value.getResourceDefs()
      this._resourceDefEntries = result.map((entryRec) => ({...entryRec.entry, resource_def_eh: entryRec.entryHash})); 
    }
    if(changedProperties.has('applets') && typeof changedProperties.get('applets') !== 'undefined') { // Set current applet state whether or not Resource Def is selected from the menu
      if(!this.applets?.length || this.applets?.length == 0) return
      
      if(this.selectedResourceDef) {
        const linkedAppletDetails : [EntryHash, Applet, DnaHash[]] | undefined = this.applets!.find(appletDetails =>  compareUint8Arrays(appletDetails[0], (this.selectedResourceDef as ResourceDef).applet_eh))
        if(!linkedAppletDetails) return;
        this.currentAppletInstanceEh = encodeHashToBase64(linkedAppletDetails[0]);
      } else {
        this.currentAppletInstanceEh = null
      }
      console.log('this.currentAppletInstanceEh set :>> ', this.currentAppletInstanceEh);
    }

    if(changedProperties.has('currentAppletInstanceEh') && !!this._currentAppletInstances.value) { // By now the current ResourceDef with its linked Current AppletEh has been chosen (or set to null for All Resources)
      try {
        await this.fetchAllAppletInstanceRenderers();

        // Add GUIs so that correct assessment controls can be loaded later
        const guis = {} as { EntryHashB64 : AppletGui };
        serializeAsyncActions<AppletGui>((Object.values(this._currentAppletInstances.value) as any).map(
          (appletInstanceInfo: AppletInstanceInfo) => this._matrixStore.queryAppletGui(appletInstanceInfo.applet.devhubGuiReleaseHash).then(gui => {console.log('Gui added to applet instances: ', gui); guis[encodeHashToBase64(appletInstanceInfo.appletId)] = gui})
        ))
        this.guis = guis;

        this.loaded = true
      } catch (error) {
        console.error(error)
      }
    }
  }

  renderPage() : TemplateResult {
    switch (this._page) {
      case ConfigPage.DashboardOverview:
        return html`<dashboard-overview .sensemakerStore=${this._sensemakerStore.value} .resourceDefEntries=${this._resourceDefEntries}></dashboard-overview>`;
      case ConfigPage.Dimensions:
        return html`<dimensions-config></dimensions-config>`;
      case ConfigPage.Widgets:
        return html`<assessment-widget-config .resourceDef=${this.selectedResourceDef}></assessment-widget-config>`;
      default:
        return html`<p>Coming Soon</p>`;
    }
  }

  choosePageFromSubMenuItemId(itemId: string, mainMenuItemIndex: number) {
    switch (itemId) {
      case 'Sensemaker':
        if(mainMenuItemIndex == 0) {
          return ConfigPage.DashboardOverview
        } else if (mainMenuItemIndex == 1) {
          return ConfigPage.Dimensions 
        } else { // 2
          return ConfigPage.Widgets
        }
      default:
        return
    }
  }

  async fetchAllAppletInstanceRenderers() {
    if(!this._currentAppletInstances.value) return;
    try {
      serializeAsyncActions<NeighbourhoodAppletRenderers>(
        Object.values(this._currentAppletInstances.value).map(
          (appletInstanceInfo: AppletInstanceInfo) => {
            return () => this._matrixStore.fetchAppletInstanceRenderers(appletInstanceInfo.appletId)
          }
        )
      )
      console.log('got all applet instance renderers')
    } catch (error) {
      console.log('Error fetching applet instance renderers ', error);
    }
  }

  render() : TemplateResult {
    return html`
      <div class="container">
        ${this._nhName 
          ? html`<nh-menu
          @sub-nav-item-selected=${(e: CustomEvent) => {
            const [mainMenuItemName, mainMenuItemIndex, subMenuItemIndex] = e.detail.itemId.split(/\-/);
            this._page = this.choosePageFromSubMenuItemId(mainMenuItemName, mainMenuItemIndex);
            if (!(['Sensemaker'].includes(mainMenuItemName))) {
              this.selectedResourceDef = undefined;
              return;
            };

            // THIS RELIES ON THE SAME ORDERING/INDEXING OCCURRING IN `this._resourceDefEntries` AS IN THE RENDERED SUBMENUS for ['Sensemaker', "Neighbourhood"], and may need to be changed
            this.selectedResourceDef = this._resourceDefEntries[subMenuItemIndex]
          }
          }
          .menuSectionDetails=${
            (() => ([{
              sectionName: this._nhName,
              sectionMembers: []
            },
            {
              sectionName: 'Sensemaker',
              sectionMembers: [
                  {
                    label: 'Overview',
                    subSectionMembers: this._resourceDefEntries.map(rd =>  cleanForUI(rd.resource_name)),
                    callback: () => {
                      if(this?._menu) {
                        const subMenuIdx = this._menu.selectedMenuItemId.split('-', 2)
                        this.selectedResourceDef = this._resourceDefEntries[+subMenuIdx];
                      } 
                        this._page = ConfigPage.DashboardOverview
                      }
                  },
                {
                  label: 'Dimensions',
                  subSectionMembers: [],
                  callback: () => {
                    this._page = ConfigPage.Dimensions;
                  },
                },
                {
                  label: 'Assessments',
                  subSectionMembers: this._resourceDefEntries.map(rd =>  cleanForUI(rd.resource_name)),
                  callback: () => {
                    this.selectedResourceDef = this._resourceDefEntries[0];
                    if(this?._menu) this!._menu!.selectedMenuItemId = "Sensemaker-2-0"; // pick the first resource as a default
                    this._page = ConfigPage.Widgets
                  },
                },
                {
                  label: 'Contexts',
                  subSectionMembers: [],
                  callback: () => (this._page = undefined),
                },
              ],
            },
            {
              sectionName: 'Member Management',
              sectionMembers: [
                {
                  label: 'Members',
                  subSectionMembers: [],
                  callback: () => (this._page = undefined),
                },
                {
                  label: 'Invites',
                  subSectionMembers: [],
                  callback: () => (this._page = undefined),
                },
                {
                  label: 'Roles',
                  subSectionMembers: [],
                  callback: () => (this._page = undefined),
                },
              ],
            }]))()
          }
          .selectedMenuItemId=${'Sensemaker' + '-0' // This is the default selected item
        }
        >
        </nh-menu>`
          : null
        }
        <slot name="page"> ${this.renderPage()} </slot>
      </div>
    `;
  }

  static elementDefinitions = {
    'nh-menu': NHMenu,
    'dimensions-config': DimensionsConfig,
    'assessment-widget-config': AssessmentWidgetConfig,
    'dashboard-overview': NHDashBoardOverview,
  };

  static get styles() {
    return css`
      :host {
        display: flex;
        width: 100%;
      }

      div.container {
        --menu-width: 200px;
        width: 100%;
        display: grid;
        flex: 1;
        place-content: start;
        color: var(--nh-theme-fg-default);
        grid-template-columns: calc(16px + var(--menu-width)) 3fr;
        grid-template-rows: 3rem auto;
        gap: calc(1px * var(--nh-spacing-sm));
      }

      nh-page-header-card {
        grid-column: 1 / -1;
      }

      nh-menu {
        display: flex;
        grid-row: 1 / -1;
      }

      nav {
        grid-column: 1 / -2;
        display: flex;
        align-items: start;
      }

      slot[name='page'] {
        grid-area: 1 / 2 / -1 / -2;
        display: flex;
        align-items: start;
        height: calc(-72px + 100vh);
      }
    `;
  }
}
