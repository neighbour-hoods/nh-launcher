import { b64images } from '@neighbourhoods/design-system-styles';
import { classMap } from 'lit/directives/class-map.js';
import { snakeCase } from '../../elements/components/helpers/functions';
import { css, html } from 'lit';
import { NHComponent, NHTooltip } from '@neighbourhoods/design-system-components';
import { property } from 'lit/decorators.js';

export default class TabbedContextTables extends NHComponent {
  @property() selectedResourceName!: string;

  render() {
    console.log('this.selectedResourceName :>> ', this.selectedResourceName);
    return html` <sl-tab-group
      class="dashboard-tab-group"
      @context-selected=${function (e: CustomEvent) {
        [...(e.currentTarget as any).querySelectorAll('sl-tab-panel')].forEach(tab => {
          tab.name === snakeCase(e.detail.contextName) &&
            tab.dispatchEvent(
              new CustomEvent('context-display', {
                detail: e.detail,
                bubbles: false,
                composed: true,
              }),
            );
        });
      }.bind(this)}
    >
      <nh-page-header-card slot="nav" role="nav" .heading=${''}>
        <nh-context-selector
          slot="secondary-action"
          id="select-context"
          .selectedContext=${'this.selectedContext'}
        >
          <sl-tab
            slot="button-fixed"
            panel="resource"
            class="dashboard-tab resource ${classMap({
              // active: this.selectedContext === 'none',
            })}"
            @click=${() => {
              // this.loadingState = LoadingState.FirstRender;
              // this.selectedContext = 'none';
            }}
          >
            ${this.selectedResourceName || 'No Applets Installed'}</sl-tab
          >

          <div slot="buttons" class="tabs tab-buttons">
            <nh-button-group
              class="dashboard-action-buttons"
              style="display: flex; align-items: center;"
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

      <sl-tab-panel active class="dashboard-tab-panel" name="resource"> </sl-tab-panel>
    </sl-tab-group>`;
  }

  static get elementDefinitions() {
    return {
      'nh-tooltip': NHTooltip,
      // 'nh-context-selector': NHContextSelector,
    };
  }

  static get styles() {
    return css`
      /* Side scrolling **/
      .dashboard-tab-group {
        max-width: calc(100vw - calc(1px * var(--nh-spacing-sm)));
        overflow: hidden;
        background: var(--nh-theme-bg-canvas);
      }
      .dashboard-tab-panel {
        overflow: auto;
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
        height: calc(1px * var(--nh-spacing-sm));
      }

      sl-tab::part(base) {
        color: #d9d9d9;
        background-color: var(--nh-theme-bg-surface);
        padding: calc(1px * var(--nh-spacing-md)) calc(1px * var(--nh-spacing-xl));
        height: 52px;
        position: relative;

        border: 0;
        border-radius: calc(1px * var(--nh-radii-lg));
        border-bottom-right-radius: 0;
        border-bottom-left-radius: 0;

        font-family: var(--nh-font-families-menu);
        letter-spacing: var(--nh-letter-spacing-buttons);
      }
      [slot='button-fixed']::part(base) {
        color: var(--nh-theme-fg-default);
        background-color: var(--nh-theme-bg-element);
        border: 4px solid --nh-colors-eggplant-800;
        border-radius: calc(1px * var(--nh-radii-lg) - 4px);
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
    `;
  }
}
