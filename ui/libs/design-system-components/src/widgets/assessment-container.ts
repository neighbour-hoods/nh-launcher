import { css, CSSResult, html, PropertyValueMap } from "lit";
import { property, query } from "lit/decorators.js";
import { NHComponentShoelace } from "../ancestors/base";
import { InputAssessmentControl } from "@neighbourhoods/client";

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

  @query("slot[name='assessment-control']")
  assessmentControl!: InputAssessmentControl;
  
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
        <div class="assessment-control ${this.selected ? 'selected': ''}">
          <slot name="assessment-control">N O   C O</slot>
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
        background: var(--nh-theme-bg-detail);
        border-radius: calc(1px * var(--nh-radii-md) - 5px);
        transition: background-color var(--animation-shortest);
        cursor: pointer;
        margin: 4px;
        height: 34px;
        min-width: 36px;
      }

      ::slotted([slot="assessment-control"]) {
        height: 34px;
        min-width: 34px;
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        overflow: hidden;
      }

      .assessment-control.selected {
        background: var(--nh-theme-accent-muted);
        border-radius: calc(1px * var(--nh-radii-md) - 5px);
      }

      .click-blocker {
        display: none;
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
        display: inline-block;
      }

      .assessment-container.edit-mode .click-blocker {
        display: block;
        position: relative;
        width: 100%;
        height: 34px;
        z-index: 999999999;
      }

      .assessment-container.edit-mode .assessment-control,
      .assessment-container.edit-mode .assessment-output
       {
        position: relative;
        top: -34px;
      }
    `,
  ];
}
