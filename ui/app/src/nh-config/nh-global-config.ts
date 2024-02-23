import { html, css, TemplateResult, PropertyValueMap } from 'lit';
import { consume, provide } from '@lit/context';
import { StoreSubscriber } from 'lit-svelte-stores';

import { MatrixStore } from '../matrix-store';
import { ConfigPage } from './types';
import { appletContext, appletInstanceInfosContext, matrixContext, resourceDefContext, weGroupContext } from '../context';
import { DnaHash, EntryHash, decodeHashFromBase64, encodeHashToBase64 } from '@holochain/client';

import DimensionsConfig from './pages/nh-dimensions-config';
import AssessmentWidgetConfig from './pages/nh-assessment-widget-config';
import NHDashBoardOverview from './pages/nh-dashboard-overview';

import { NHComponent, NHMenu } from '@neighbourhoods/design-system-components';
import { property, query, state } from 'lit/decorators.js';
import { provideWeGroupInfo } from '../matrix-helpers';
import { removeResourceNameDuplicates } from '../utils';
import { ResourceDef } from '@neighbourhoods/client';
import { cleanForUI } from '../elements/components/helpers/functions';
import { Applet, AppletInstanceInfo } from '../types';
import { derived, get } from 'svelte/store';
import { compareUint8Arrays } from '@neighbourhoods/app-loader';

export default class NHGlobalConfig extends NHComponent {
  @consume({ context: matrixContext, subscribe: true })
  @property({ attribute: false })
  _matrixStore!: MatrixStore;

  @consume({ context: weGroupContext, subscribe: true })
  @property({ attribute: false })
  weGroupId!: DnaHash;

  @provide({ context: appletContext }) @property({attribute: false})
  currentAppletInstanceEh!: string;

  @provide({ context: appletInstanceInfosContext })
  @property({attribute: false})
  _currentAppletInstance = new StoreSubscriber(
    this,
    () =>  derived(this._matrixStore.getAppletInstanceInfosForGroup(this.weGroupId), (appletInstanceInfos: AppletInstanceInfo[] | undefined) => {
      if(!this.currentAppletInstanceEh) return
      const currentApplet = appletInstanceInfos!.find(applet => compareUint8Arrays(decodeHashFromBase64(this.currentAppletInstanceEh), applet.applet.devhubGuiReleaseHash))
      return currentApplet
    }),
    () => [this.loaded],
  );

  @provide({ context: resourceDefContext })
  @property()
  selectedResourceDef!: object | undefined;

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

  _nhName!: string;

  @state() _page?: ConfigPage = ConfigPage.DashboardOverview;

  @query('nh-menu') _menu?: NHMenu;

  protected async firstUpdated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>) {
    // applet entry hash, applet, and federated groups' dnahashes
    const applets : [EntryHash, Applet, DnaHash[]][] = get(await this._matrixStore.fetchAllApplets(this.weGroupId));
    if(!applets?.length || applets?.length == 0) return
    this.currentAppletInstanceEh = encodeHashToBase64(applets[0][1].devhubGuiReleaseHash); // Set context of the default applet - being the first, (up until a e.g. menu is used to set it)
    this!._menu!.selectedMenuItemId = "Neighbourhood" + "-0-1"

    try {
      (await this.fetchCurrentAppletInstanceRenderers());
      this.loaded = true
    } catch (error) {
      console.error(error)
    }
  }

  protected async updated(changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>) {
    if (this._neighbourhoodInfo?.value && !this?._nhName) {
      this._nhName = this._neighbourhoodInfo?.value.name;
    }

    if(changedProperties.has('weGroupId')) {
      if(!this._sensemakerStore.value) return
      const result = await this._sensemakerStore.value.getResourceDefs()
      this._resourceDefEntries = removeResourceNameDuplicates(result.map((entryRec) => ({...entryRec.entry, resource_def_eh: entryRec.entryHash}))); // This de-duplicates resources with the same name from other applets (including uninstalled)
    }
  }

  renderPage() : TemplateResult {
    switch (this._page) {
      case ConfigPage.DashboardOverview:
        return html`<dashboard-overview .sensemakerStore=${this._sensemakerStore.value}></dashboard-overview>`;
      case ConfigPage.Dimensions:
        return html`<dimensions-config></dimensions-config>`;
      case ConfigPage.Widgets:
        return html`<assessment-widget-config .resourceDef=${this.selectedResourceDef}></assessment-widget-config>`;
      default:
        return html`<p>Coming Soon</p>`;
    }
  }

  choosePageFromSubMenuItemId(itemId: string) {
    switch (itemId) {
      case 'sensemaker':
        return ConfigPage.Widgets
      case 'neighbourhood':
        return ConfigPage.DashboardOverview
    }
  }

  async fetchCurrentAppletInstanceRenderers() {
    if(!this._currentAppletInstance.value) return;
    try {
      await this._matrixStore.fetchAppletInstanceRenderers(
        this._currentAppletInstance.value.appletId,
      );
    } catch (error) {
      console.log('Error fetching applet instance renderers ', error);
    }
  }

  render() : TemplateResult {
    return html`
      <main>
        <nh-menu
          @sub-nav-item-selected=${(e: CustomEvent) => {
            const [mainMenuItemName, _mainMenuItemIndex, subMenuItemIndex] = e.detail.itemId.split(/\-/);
            this._page = this.choosePageFromSubMenuItemId(mainMenuItemName.toLowerCase());
            // TODO: fix submenu implementation and choose a different static name for menu item 0 other than Neighbourhood

            if (!(['Sensemaker', "Neighbourhood"].includes(mainMenuItemName))) {
              this.selectedResourceDef = undefined;
              return;
            }; // Only current active main menu item is Sensemaker, but you can change this later

            // THIS RELIES ON THE SAME ORDERING/INDEXING OCCURRING IN `this._resourceDefEntries` AS IN THE RENDERED SUBMENUS for ['Sensemaker', "Neighbourhood"], and may need to be changed
            this.selectedResourceDef = this._resourceDefEntries[subMenuItemIndex]
          }
          }
          .menuSectionDetails=${
            (() => ([{
              sectionName: "Neighbourhood",
              sectionMembers: [
                {
                  label: 'Overview',
                  subSectionMembers: this._resourceDefEntries.map(rd =>  cleanForUI(rd.resource_name)),
                  callback: () => {
                      this.selectedResourceDef = this._resourceDefEntries[0];
                      if(this?._menu) this!._menu!.selectedMenuItemId = "Neighbourhood" + "-0-0"; // pick the first resource as a default
                      this._page = ConfigPage.DashboardOverview
                    }
                },
              ],
            },
            {
              sectionName: 'Sensemaker',
              sectionMembers: [
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
                    if(this?._menu) this!._menu!.selectedMenuItemId = "Sensemaker-1-0"; // pick the first resource as a default
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
          .selectedMenuItemId=${'Neighbourhood' + '-0-0' // This is the default selected item
        }
        >
        </nh-menu>
        <slot name="page"> ${this.renderPage()} </slot>
      </main>
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
      :host,
      .container {
        display: flex;
        width: 100%;
      }

      .container {
        flex-direction: column;
        align-items: flex-start;
      }

      main {
        --menu-width: 200px;
        width: 100%;
        display: grid;
        flex: 1;
        place-content: start;
        color: var(--nh-theme-fg-default);
        grid-template-columns: calc(16px + var(--menu-width)) 3fr;
        grid-template-rows: 4rem auto;
        gap: calc(1px * var(--nh-spacing-sm));
      }

      nh-page-header-card {
        grid-column: 1 / -1;
      }

      nh-menu {
        display: flex;
      }

      nav {
        grid-column: 1 / -2;
        display: flex;
        align-items: start;
      }

      slot[name='page'] {
        grid-column: 2 / -2;
        display: flex;
        align-items: start;
      }
    `;
  }
}
