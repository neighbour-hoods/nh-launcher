import { consume } from '@lit/context';
import { classMap } from 'lit/directives/class-map.js';
import { cleanForUI } from '../../elements/components/helpers/functions';
import { CSSResult, css, html } from 'lit';

import NHAlert from '@neighbourhoods/design-system-components/alert';
import NHButton from '@neighbourhoods/design-system-components/button';
import NHButtonGroup from '@neighbourhoods/design-system-components/button-group';
import NHPageHeaderCard from '@neighbourhoods/design-system-components/page-header-card';
import NHTooltip from '@neighbourhoods/design-system-components/tooltip';
import NHTabButton from '@neighbourhoods/design-system-components/tab-button';
import NHComponent from '@neighbourhoods/design-system-components/ancestors/base';
import { b64images } from '@neighbourhoods/design-system-styles';

import { property, query } from 'lit/decorators.js';
import NHContextSelector from '../nh-context-selector';
import { AssessmentTableType } from '../types';
import { resourceDefContext } from '../../context';
import { ResourceDef } from '@neighbourhoods/client';
import { DashboardFilterMap } from './dashboard-filter-map';

// TODO: componentise remaining tab/table logic and styles, wire up, once Spaces have replaced contexts.
export default class TabbedContextTables extends NHComponent {
  @property() loaded!: boolean;
  @property() selectedContextEhB64: string = 'none';
  @property() selectedAppletInstanceId: string = 'none';

  @consume({ context: resourceDefContext, subscribe: true })
  @property({ attribute: false }) selectedResourceDef!: object | undefined;

  @property({ attribute: false }) resourceDefEntries!: object[];
  
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

  renderTable(type: AssessmentTableType) {
    return html`
      <div
        class="dashboard-tab-panel"
      >
        <dashboard-filter-map
          .tableType=${type}
          .resourceDefEntries=${this.resourceDefEntries}
          .resourceName=${this.selectedResourceDef?.resource_name ? cleanForUI(this.selectedResourceDef.resource_name) : "All Resources"}
          .resourceDefEh=${this.selectedResourceDef?.resource_def_eh || "none"}
          .loaded=${this.loaded}
        ></dashboard-filter-map>
      </div>
    `
  }

  render() {
    return html`
      <nav>
        <nh-tab-button
          slot="primary-action"
          .fixed=${true}
          class="dashboard-tab resource${classMap({ active: this.selectedContextEhB64 === 'none' })}"
          @click=${() => { this.selectedContextEhB64 = 'none' }}
        >
          ${(!this?.selectedResourceDef ? "All Resources" : cleanForUI((this?.selectedResourceDef as ResourceDef)!.resource_name))}
        </nh-tab-button>
      </nav>

      ${this.renderTable(this.selectedContextEhB64 == 'none' ? AssessmentTableType.Resource : AssessmentTableType.Context)}
    `;
  }

  static elementDefinitions = {
    'nh-alert': NHAlert,
    'nh-tooltip': NHTooltip,
    'nh-button': NHButton,
    'nh-button-group': NHButtonGroup,
    'nh-page-header-card': NHPageHeaderCard,
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

      nav {
        display: flex;
        flex: 1;
        margin-left: calc(1px * var(--nh-spacing-sm));
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
    `]
}
