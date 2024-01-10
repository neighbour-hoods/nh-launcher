import { classMap } from 'lit/directives/class-map.js';
import { CSSResult, css, html } from "lit"
import { property, state } from "lit/decorators.js";
import { b64images } from "@neighbourhoods/design-system-styles";
import { NHComponent } from '..';
import NHAssessmentContainer from './assessment-container';
import { AssessmentWidgetBlockConfig, AssessmentWidgetConfig } from '@neighbourhoods/client';
import { SlSpinner } from '@shoelace-style/shoelace';

export function mockWidgetRegistry(widgetName : string) { // temp
  switch (widgetName) {
    case 'Heart':
      return "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" 
    default:
      //'thumb'
      return "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"
  }
}

export default class NHResourceAssessmentTray extends NHComponent {
  @property()
  assessmentWidgetTrayConfig: Array<AssessmentWidgetBlockConfig> = [];
  @property()
  resourceEh!: any
  @property()
  resourceDefEh!: any
  @property()
  editable: boolean = false;
  
  @state()
  editing: boolean = true;
  @state()
  expanded: boolean = false;

  toggleExpanded() {
    this.expanded = !this.expanded
  }

  render() {
    console.log('this.assessmentWidgetTrayConfig :>> ', this.assessmentWidgetTrayConfig);
    return html`
      <div*::slotted(div
        class="assessment-widget-tray${classMap({
          editable: !!this.editable,
        })}"
        data-expanded=${this.expanded}
      >
      ${this.assessmentWidgetTrayConfig.length > 0
        ? html`<span class="widget-config-icons">${this.assessmentWidgetTrayConfig?.map(({inputAssessmentWidget} : {inputAssessmentWidget: AssessmentWidgetConfig}) => html`
          <assessment-container
            .assessmentValue=${1}
            .iconImg=${mockWidgetRegistry((inputAssessmentWidget as any).componentName)}
          ></assessment-container>`)}
          <assessment-container
            .assessmentValue=${0}
            .iconImg=${""}
          ></assessment-container></span>`
        : html`<slot name="widgets"></slot>`}

        <div name="add-widget-icon" class="add-widget-icon" @click=${() => {
          this.dispatchEvent(
            new CustomEvent("add-widget", {
              bubbles: true,
              composed: true,
            })
          );
        }}>
          ${ // Add spacers to the add-widget-icon div to position the button
          this.editable ? this.assessmentWidgetTrayConfig.map((_widget) => html`
              <assessment-container
                .assessmentValue=${0}
                .iconImg=${""}
              ></assessment-container>
          `)
          : null
          }
          ${ 
          this.editing
          ? html`<sl-spinner class="icon-spinner"></sl-spinner>`
          : null
          }
          ${ 
          this.editable && !this.editing
            ? html`<img class="add-assessment-icon" src=${`data:image/svg+xml;base64,${b64images.icons.plus}`} alt=${"Add a widget"} />`
            : null
          }
        </div>
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
    'sl-spinner': SlSpinner,
  }

  static styles = [
    super.styles as CSSResult,
    css`
      slot[name="widgets"], span.widget-config-icons {
        background: var(--nh-theme-bg-detail);
        overflow-x: auto;
        max-height: 48px;
        display: flex;
      }

      .assessment-widget-tray {
        border-radius: calc(1px * var(--nh-radii-md));
      }

      span.widget-config-icons {
        padding-left: 6px;
        padding-right: 6px;
        gap: 8px
      }

      *::slotted(div), span.widget-config-icons, slot[name="widgets"] {
        border-radius: calc(1px * var(--nh-radii-md) - 5px);
      }
      
      *::slotted(div) {
        display: flex;
      }

      .assessment-widget-menu {
        margin: auto 4px;
        cursor: pointer;
      }
      
      .assessment-widget-tray {
        background-color: var(--nh-theme-bg-surface);
        padding: 4px;
        border: 1px solid var(--nh-theme-accent-default);
        display: flex;
        width: min-content;
        max-width: 100%;
        max-height: 48px;
        overflow: hidden;
      }

      .editable {
        position: relative;
      }

      .editable .add-assessment-icon {
        height: 24px;
        width: 24px;
        margin-left: 4px;
        padding: 6px;
        border-radius: calc(1px * var(--nh-radii-xl));
        background-color: var(--nh-theme-accent-default);
      }

      .editable .add-assessment-icon:hover {
        background-color: var(--nh-theme-accent-emphasis);
        cursor: pointer;
      }

      .editable .add-widget-icon {
        visibility: visible;
        opacity: 1;
        position: absolute;
        height: 48px;
        left: 0px;
        top: 4px;
        left: 4px;
        padding-left: 6px;
        padding-right: 6px;
        gap: 8px;
      }

      .editable .icon-spinner {
        font-size: 2.15rem;
        --speed: 10000ms;
        --track-width: 4px;
        --indicator-color: var(--nh-theme-accent-emphasis);
        margin: 3px
      }

      .add-widget-icon {
        display: flex;
        align-items: center;
        visibility: hidden;
        opacity: 0;
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