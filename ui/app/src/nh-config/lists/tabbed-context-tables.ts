import { consume } from '@lit/context';
import { b64images } from '@neighbourhoods/design-system-styles';
import { classMap } from 'lit/directives/class-map.js';
import { cleanForUI, snakeCase } from '../../elements/components/helpers/functions';
import { CSSResult, PropertyValueMap, css, html } from 'lit';
import { NHAlert, NHButton, NHButtonGroup, NHComponent, NHPageHeaderCard, NHTabButton, NHTooltip } from '@neighbourhoods/design-system-components';
import { property, query, state } from 'lit/decorators.js';
import { SlTab, SlTabGroup, SlTabPanel } from '@scoped-elements/shoelace';
import NHContextSelector from '../nh-context-selector';
import { AssessmentTableType } from '../types';
import { resourceDefContext } from '../../context';
import { ResourceDef } from '@neighbourhoods/client';
import { DashboardFilterMap } from './dashboard-filter-map';
import { encodeHashToBase64 } from '@holochain/client';

export default class TabbedContextTables extends NHComponent {
  @property() loaded!: boolean;
  @property() selectedContextEhB64: string = 'none';
  @property() selectedAppletInstanceId: string = 'none';
  @property() contexts: any;

  @consume({ context: resourceDefContext, subscribe: true })
  @property({ attribute: false }) selectedResourceDef!: object | undefined;

  @property({ attribute: false }) resourceDefEntries!: object[];
  
  @query('#danger-toast-1') private _dangerAlert;
  @query('dashboard-filter-map') private _table;

  protected updated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
    if(!this?.contexts || this.contexts.length == 0) {
      try {
        // this._dangerAlert.openToast();
      } catch (error) {
        console.log('error :>> ', error);
      }
    } else {
      this._table.loaded = true;
      this._table.requestUpdate();
    }
  }

  renderActionButtons() {
    return html`
      <div slot="buttons">
        <nh-button-group
          class="dashboard-action-buttons"
          .direction=${'horizontal'}
          .fixedFirstItem=${false}
          .addItemButton=${false}
        >
          <div slot="buttons">
            <nh-button
              .iconImageB64=${b64images.icons.refresh}
              .variant=${'neutral'}
              .size=${'icon'}
            ></nh-button>
          </div>
        </nh-button-group>
      </div>
    `
  }

  renderTabPanel(type: AssessmentTableType) {
    return html`
      <sl-tab-panel
        class="dashboard-tab-panel"
        name=${type}
        .active=${type == "resource"}
        @display-context=${(e: CustomEvent) => {
          const flatResults = typeof e.detail.results == "object" ? e.detail.results[this.selectedContextEhB64].flat() : [];
          const dashboardFilterComponent = (e.currentTarget as any).children[0];
          console.log('contextEhs :>> ', flatResults.map(eh => encodeHashToBase64(eh)));
          // dashboardFilterComponent.contextEhsB64 = flatResults.map(eh => encodeHashToBase64(eh));
        }}
      >
        <dashboard-filter-map
          .tableType=${type}
          .resourceDefEntries=${this.resourceDefEntries}
          .resourceName=${this.selectedResourceDef?.resource_name ? cleanForUI(this.selectedResourceDef.resource_name) : "All Resources"}
          .resourceDefEh=${this.selectedResourceDef?.resource_def_eh || "none"}
          .selectedContextEhB64=${this.selectedContextEhB64}
          .loaded=${this.loaded}
        ></dashboard-filter-map>
      </sl-tab-panel>
    `
  }

  render() {
    return html`
      <nh-page-header-card class="nested" role="navigation" .heading=${''}>
        <nh-tab-button
          slot="primary-action"
          .fixed=${true}
          class="dashboard-tab resource${classMap({ active: this.selectedContextEhB64 === 'none' })}"
          @click=${() => { this.selectedContextEhB64 = 'none' }}
        >
          ${(!this?.selectedResourceDef ? "All Resources" : cleanForUI((this?.selectedResourceDef as ResourceDef)!.resource_name))}
        </nh-tab-button>
        
        ${this.renderActionButtons()}
      </nh-page-header-card>

      ${this.renderTabPanel(this.selectedContextEhB64 == 'none' ? AssessmentTableType.Resource : AssessmentTableType.Context)} 

      <nh-alert 
        id="danger-toast-1"
        .title=${"You do not have any applets yet."}
        .description=${"Return to your Neighbourhood home page by clicking its icon on the left sidebar, or the back arrow from this page. Then just install an applet to enable configuring of widgets."}
        .closable=${false}
        .isToast=${true}
        .open=${false}
        .type=${"danger"}>
      </nh-alert>
    `;
  }

  static elementDefinitions = {
    'nh-alert': NHAlert,
    'nh-tooltip': NHTooltip,
    'nh-button': NHButton,
    'nh-button-group': NHButtonGroup,
    'nh-page-header-card': NHPageHeaderCard,
    'sl-tab-panel': SlTabPanel,
    'nh-tab-button': NHTabButton,
    'nh-context-selector': NHContextSelector,
    'dashboard-filter-map': DashboardFilterMap,
  }

  static styles : CSSResult[] = [
    super.styles as CSSResult,
    css`
      :host {
        display: flex;
        flex-direction: column;
        grid-column: 1/-1;
      }

      nh-page-header-card {
        display: flex;
        flex: 1;
      }

      /* Side scrolling **/
      .dashboard-tab-group {
        display: flex;
        flex: 1;
        flex-direction: column;

        max-width: calc(100vw - calc(1px * var(--nh-spacing-sm)));
        overflow: hidden;
        background: var(--nh-theme-bg-canvas);
      }
      .dashboard-tab-panel {
        overflow: auto;
      }

      .dashboard-action-buttons {
        display: flex;
        align-items: center
      }

      /** Tab Nav **/
      [slot='button-fixed'] {
        background: var(--nh-theme-bg-detail);
        border: 0;
        border-radius: calc(1px * var(--nh-radii-lg));
        border-bottom-right-radius: 0;
        border-top-right-radius: 0;
        font-family: 'Work Sans', 'Open Sans';
      }

      [slot='buttons'] > div {
        display: flex;
        gap: 4px;
        font-family: 'Work Sans', 'Open Sans';
      }

      [slot='buttons'] :hover::part(base) {
        background-color: var(--nh-theme-bg-canvas);
        color: var(--nh-theme-accent-emphasis);
      }

      /* Tab hover effect */
      [slot='buttons'] :hover::part(base)::after,
      [slot='buttons'] .active::part(base)::after {
        position: absolute;
        background-color: var(--nh-theme-bg-canvas);
        bottom: calc(-1px * var(--nh-spacing-sm));
        left: 0px;
        content: '';
        width: 100%;
        bottom: calc(-1px * var(--nh-spacing-lg));
        height: calc(1px * var(--nh-spacing-lg));
      }

      [slot='button-fixed']::part(base) {
        color: var(--nh-theme-fg-default);
        background-color: var(--nh-theme-bg-element);
        border: 4px solid --nh-colors-eggplant-800;
        border-radius: calc(8px);
        border-bottom-right-radius: 0;
        border-top-right-radius: 0;
      }
      [slot='button-fixed'].active::part(base) {
        background-color: var(--nh-theme-bg-canvas);
      }

      /* Divider after resource name */
      [slot='button-fixed'].resource::before {
        position: absolute;
        background-color: var(--nh-theme-bg-surface);
        bottom: 1px;
        right: -3px;
        content: '';
        height: calc(100% - 2px);
        width: 2px;
      }

      /** Tab Panels **/
      .dashboard-tab-panel::part(base) {
        padding: 0;
      }
      .dashboard-tab-group::part(tabs) {
        border: none;
      }
    `]
}
