import { CSSResult, css, html } from "lit"
import { property, state } from "lit/decorators.js";
import { NHComponent, NHTooltip } from '..';
import NHAssessmentContainer from './assessment-container';
import { AssessmentWidgetBlockConfig } from '@neighbourhoods/client';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';

/**
 */
export default class NHResourceAssessmentTray extends NHComponent {
  @property()
  assessmentWidgetTrayConfig: Array<AssessmentWidgetBlockConfig> = []; // Still used for storybook currently

  @state()
  expanded: boolean = false;

  toggleExpanded() {
    this.expanded = !this.expanded
  }

  render() {
    return html`
    <div class="assessment-widget-tray" data-expanded=${this.expanded}>
      <slot name="widgets"></slot>
      <slot name="controls"></slot>
      <nav class="assessment-widget-menu" @click=${() => {this.toggleExpanded(); this.requestUpdate()}}>
        <div class="menu-dot"></div>
        <div class="menu-dot"></div>
        <div class="menu-dot"></div>
      </nav>
    </div>
    `
  }

  static elementDefinitions = {
    'assessment-container': NHAssessmentContainer,
    'nh-tooltip': NHTooltip,
  }

  static styles = [
    super.styles as CSSResult,
    css`
      slot[name="widgets"],
      slot[name="controls"] {
        height: 42px;
        min-width: min-content;
        width: max-content;
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
      }

      .assessment-widget-tray {
        background-color: var(--nh-theme-bg-surface);
        padding: 4px;
        border: 1px solid var(--nh-theme-accent-default);
        display: flex;
        min-width: min-content;
        width: max-content;
        max-width: 100%;
        height: 42px;
        overflow: visible;
        border-radius: calc(1px * var(--nh-radii-md));
      }

      *::slotted(div), span.widget-config-icons, slot[name="widgets"] {
        border-radius: calc(1px * var(--nh-radii-md) - 5px);
        display: flex;
      }

      .assessment-widget-menu {
        margin: auto 4px;
        cursor: pointer;
        display: none;
      }

      .menu-dot {
        width: 5px;
        height: 5px;
        margin: 4px;
        border-radius: var(--border-r-tiny);
        background-color: var(--nh-theme-accent-default);
      }
    `,
  ];
}
