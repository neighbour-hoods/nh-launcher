import { consume } from '@lit/context';
import { b64images } from '@neighbourhoods/design-system-styles';
import { classMap } from 'lit/directives/class-map.js';
import { cleanForUI, snakeCase } from '../../elements/components/helpers/functions';
import { CSSResult, css, html } from 'lit';
import { NHAlert, NHButton, NHButtonGroup, NHComponent, NHPageHeaderCard, NHTooltip } from '@neighbourhoods/design-system-components';
import { property, state } from 'lit/decorators.js';
import { SlTab, SlTabGroup, SlTabPanel } from '@scoped-elements/shoelace';
import NHContextSelector from '../nh-context-selector';
import { AssessmentTableType } from '../types';
import { resourceDefContext } from '../../context';
import { ResourceDef } from '@neighbourhoods/client';
import { DashboardFilterMap } from './dashboard-filter-map';
import { encodeHashToBase64 } from '@holochain/client';

export default class TabbedContextTables extends NHComponent {
  @property() selectedContextEhB64: string = 'none';
  @property() selectedAppletInstanceId: string = 'none';
  @property() contexts: any;

  @consume({ context: resourceDefContext, subscribe: true })
  @property({ attribute: false })
  selectedResourceDef!: object;
  
  renderContextButtons() {
    if(!this.contexts) return null;
    // TODO: skeleton/loading state
    // panel="${snakeCase(context)}" not needed if we just dynamically display context results 
    return html`
      <div slot="buttons" class="tabs" style="width: 100%; display: flex; justify-content: space-between;">
        <div>
          ${this.contexts.map(
            ([context, contextEh]) => html` 
              <nh-tab-button>
                <sl-tab
                  panel="context"
                  class="dashboard-tab ${classMap({
                    active:
                      encodeHashToBase64(contextEh) ===
                      this.selectedContextEhB64,
                  })}"
                  @click=${() => {
                    this.selectedContextEhB64 = encodeHashToBase64(contextEh);
                  }}
                >${cleanForUI(context)}</sl-tab>
              </nh-tab-button>
            `
          )}
        </div>
      </div>
      `
  }

  render() {
    return html`
      <sl-tab-group
        class="dashboard-tab-group"
        @context-selected=${function(e: CustomEvent) {
          [...(e.currentTarget as any).querySelectorAll('sl-tab-panel')].forEach(tab => {
              tab.dispatchEvent(
                new CustomEvent('display-context', {
                  detail: e.detail,
                  bubbles: false,
                  composed: true,
                }),
              );
          });
        }.bind(this)}
      >
        <nh-page-header-card role="navigation" .heading=${''}>
          <nh-context-selector
            slot="secondary-action"
            id="select-context"
            .selectedAppletInstanceId=${this.selectedAppletInstanceId}
            .selectedContextEhB64=${this.selectedContextEhB64}
          >
            <sl-tab
              slot="button-fixed"
              panel="resource"
              class="dashboard-tab resource${classMap({
                active: this.selectedContextEhB64 === 'none',
              })}"
              @click=${() => { this.selectedContextEhB64 = 'none' }}
            >
              ${(!this?.selectedResourceDef ? "All Resources" : cleanForUI((this?.selectedResourceDef as ResourceDef)!.resource_name))}
            </sl-tab>
            
            ${this.renderContextButtons()}
            
            <div slot="buttons">
              <nh-button-group
                class="dashboard-action-buttons nested"
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
          </nh-context-selector>
        </nh-page-header-card>

        ${this.selectedContextEhB64 == 'none'
          ? html`
              <sl-tab-panel active class="dashboard-tab-panel" name="resource">
                <dashboard-filter-map
                  .tableType=${AssessmentTableType.Resource}
                  .resourceName=${this.selectedResourceDef?.resource_name}
                  .resourceDefEh=${this.selectedResourceDef?.resource_def_eh}
                  .selectedContextEhB64=${this.selectedContextEhB64}
                ></dashboard-filter-map>
              </sl-tab-panel>
            `
          : html`<sl-tab-panel class="dashboard-tab-panel" name="context"
                    @display-context=${(e: CustomEvent) => {
                        const flatResults = typeof e.detail.results == "object" ? e.detail.results[this.selectedContextEhB64].flat() : [];
                        const dashboardFilterComponent = (e.currentTarget as any).children[0];
                        dashboardFilterComponent.contextEhs = flatResults;
                        console.log('flatResults :>> ', flatResults);
                      }}
                  >
                    <dashboard-filter-map
                      .tableType=${AssessmentTableType.Context}
                      .resourceName=${this.selectedResourceDef?.resource_name}
                      .resourceDefEh=${this.selectedResourceDef?.resource_def_eh}
                      .selectedContext=${this.selectedContextEhB64}
                    ></dashboard-filter-map>
                </sl-tab-panel>
`
        }
        
        <nh-alert
          .open=${!!this.selectedResourceDef}
          .title=${"You did not select any resources"}
          .description=${"Select one on the menu on the left side of the page to view your assessments."}
          .type=${"danger"}
        >
        </nh-alert>
      </sl-tab-group>
    `;
  }

  static elementDefinitions = {
    'nh-alert': NHAlert,
    'nh-tooltip': NHTooltip,
    'nh-button': NHButton,
    'nh-button-group': NHButtonGroup,
    'nh-page-header-card': NHPageHeaderCard,
    'sl-tab-panel': SlTabPanel,
    'sl-tab': SlTab,
    'sl-tab-group': SlTabGroup,
    'nh-context-selector': NHContextSelector,
    'dashboard-filter-map': DashboardFilterMap,
  }

  static styles : CSSResult[] = [
    super.styles as CSSResult,
    css`
      :host {
        display: flex;
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

      sl-tab::part(base) {
        color: #d9d9d9;
        background-color: var(--nh-theme-bg-surface);
        padding: calc(1px * var(--nh-spacing-md)) calc(1px * var(--nh-spacing-xl));
        height: 52px;
        position: relative;

        border: 0;
        border-radius: calc(8px);
        border-bottom-right-radius: 0;
        border-bottom-left-radius: 0;

        font-family: var(--nh-font-families-menu);
        letter-spacing: var(--nh-letter-spacing-buttons);
      }
      [slot='button-fixed']::part(base) {
        color: var(--nh-theme-fg-default);
        background-color: var(--nh-theme-bg-element);
        border: 4px solid --nh-colors-eggplant-800;
        border-radius: calc(8px);
        border-bottom-right-radius: 0;
        border-top-right-radius: 0;
      }
      [slot='button-fixed'].active::part(base),
      sl-tab.active::part(base)::after,
      sl-tab.active::part(base) {
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
