import { css, CSSResult, html, PropertyValueMap } from "lit";
import { property } from "lit/decorators.js";
import { NHComponentShoelace } from "../ancestors/base";

/**
 * NHAssessmentContainer has as slot for an assessment-control and a slot for an
 * assessment-output. The assessment-output is only displayed when the user's
 * mouse hover over the assessment-control.
 *
 * The editMode allows showing the control in a non-interactive manner and allows
 * selecting a container.
 */
export default class NHAssessmentContainer extends NHComponentShoelace {
  @property()
  selected: boolean = false;

  @property()
  editMode: boolean = false;

  render() {
    return html`
      <div class="assessment-container ${this.editMode ? 'edit-mode': ''}">
        <div class="click-blocker" @click=${(e: Event) => {
          e.preventDefault()
          e.stopImmediatePropagation();
          this.selected = !this.selected;
          if(this.selected) {
            const detail = {selected: true};
            const event = new CustomEvent('selected', {detail, bubbles: true, composed: true, cancelable: true});
            this.dispatchEvent(event);
          } else {
            const detail = {selected: false};
            const event = new CustomEvent('deselected', {detail, bubbles: true, composed: true, cancelable: true});
            this.dispatchEvent(event);
          }

        }}></div>
        <div class="assessment-control">
          <slot name="assessment-control" class="${this.selected ? 'selected': ''}">N O   C O</slot>
        </div>
        <div class="assessment-output">
          <slot name="assessment-output">0</slot>
        </div>
      </div>
    `;
  }

  static styles: CSSResult[] = [
    super.styles as CSSResult,
    css`
      :host {
        /*Variables not defined as tokens*/
        --animation-short: 250ms;
        --animation-shortest: 180ms;

        --border-r-medium: 24px;
        --border-r-small: 12px;
        --border-r-tiny: 6px;

        --box-shadow-subtle-small: 0px 0px 2px rgba(0, 0, 0, 0.5);
      }

      .assessment-container {
        height: 34px;
        min-width: 34px;
        overflow: hidden;
        margin: 4px;
        cursor: pointer;
        transition: background-color var(--animation-shortest);
      }

      slot[name="assessment-control"] {
        background: var(--nh-theme-bg-detail);
        border-radius: calc(1px * var(--nh-radii-md) - 5px);
        height: 34px;
        width: 34px;
        max-height: 34px;
        overflow: hidden;
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
      }

      slot[name="assessment-control"].selected {
        background: var(--nh-theme-accent-muted);
      }

      .assessment-container.edit-mode .assessment-control {
        position: relative;
        top: -40px;
      }
      .assessment-container.edit-mode .assessment-output {
        /* slot[name="assessment-control"] + border width */
        margin-top: -36px;
      }

      .click-blocker {
        display: none;
      }

      .assessment-container.edit-mode .click-blocker {
        display: block;
        position: relative;
        width: -webkit-fill-available;
        height: 40px;
        z-index: 999999999;
      }

      .assessment-output {
        background-color: var(--nh-theme-accent-muted);
        color: var(--nh-theme-fg-default);
        min-width: 32px;
        padding: 4px 2px;
        margin-top: 4px;
        border-radius: var(--border-r-tiny);
        text-align: center;
        position: absolute;
        display: none;
        transition: margin var(--animation-short),
          opacity var(--animation-shortest);
      }

      .assessment-container:hover > .assessment-output {
        display: block;
      }
    `,
  ];
}
