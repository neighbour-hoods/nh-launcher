import { classMap } from 'lit/directives/class-map.js';
import { css, CSSResult, html } from 'lit';
import { property, state } from 'lit/decorators.js';
import '@shoelace-style/shoelace/dist/components/checkbox/checkbox.js';
import { NHComponent } from '../ancestors/base';

export default class NHCheckbox extends NHComponent {
  @property()
  name: string = "Field";
  @property()
  label?: string = "Your field";
  @property()
  size: "small" |"medium" | "large" | "auto" = "medium";
  @property()
  required: boolean = false;
  @property()
  disabled: boolean = false;
  @property()
  errored: boolean = false;

  @state()
  defaultValue?: boolean = false;
  @state()
  value?: boolean = false;

  protected firstUpdated(): void {
    this.value = this.defaultValue || this.value;
  }

  handleInputChange(e: Event) {
    this.value = !!(e.target as any).checked
    this.dispatchEvent(
      new CustomEvent("change", {
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    return html`
      <div class="field checkbox${classMap({
        'errored': this.errored,
        [this.size]: this.size,
        'disabled': !!this.disabled
      })}">
          ${ this.label && this.label !== '' ? html`<label
              for=${this.name}
            >${this.label}</label>` : null }

          ${ this.required
            ? html`<label
              class="reqd"
              for=${this.name}
              name=${this.name}
              data-name=${this.name}
            >*</label>`
            : null
          }
          <sl-checkbox .checked=${this.value} @sl-change=${(e: CustomEvent) => this.handleInputChange(e)} data-name=${this.name}></sl-checkbox>
        </div>
      </div>
    `;
  }

  reset() {
    this.value = false;
  }

  static styles: CSSResult[] = [
    css`
      :host {
        --sl-input-font-size-medium: 1rem;
        --sl-toggle-size-medium: 1rem;
        --sl-font-size-base: 14;
      }

      /* Layout */

      .field, .row {
        display: flex;
      }

      .field:not(.auto) {
        margin-top: calc(1px * var(--nh-spacing-md));
        flex-direction: column;
      }

      .row {
        justify-content: space-between;
        align-items: center;
      }

      /* Typo */

      label:not(.reqd), sl-checkbox::part(label) {
        font-size: calc(1px * var(--nh-font-size-base));
        font-family: var(--nh-font-families-body);
        font-weight: var(--nh-font-weights-body-regular);
        line-height: normal;
        color: var(--nh-theme-fg-default);
      }

      .field.small label:not(.reqd), .field.small sl-checkbox::part(label) {
        font-size: calc(1px * var(--nh-font-size-sm));
      }

      .field.large sl-checkbox::part(base), .field.large sl-checkbox::part(label) {
        font-size: calc(1px * var(--nh-font-size-lg));
        font-weight: var(--nh-font-weights-body-bold);
      }

      /* Checkbox */

      sl-checkbox::part(base) {
        position: relative;
        right: -1rem;
        bottom: 0px;
        height: 100%;
        display: flex;
        justify-content: flex-end;
        align-items: center;
      }

      sl-checkbox::part(control) {
        color: var(--nh-theme-accent-default);
        background-color: var(--nh-theme-fg-default);
        border-color: var(--nh-theme-accent-default);
        border-radius: 3px;
      }

      .field.checkbox {
        justify-content: space-around;
        display: flex;
        width: 8rem;
        font-size: 80%;
        flex-direction: initial;
        padding: calc(1px * var(--nh-spacing-sm));
      }

      :host(.checkbox-only){
        width: 48px;
        height: 48px;
        display: grid;
        margin: 0px auto;
        place-content: center;
      }
      :host(.checkbox-only) .field.checkbox {
        justify-content: center;
        padding: 0;
        width: fit-content;
        margin-right: 4px;
        margin-bottom: 4px;
      }
      :host(.checkbox-only) sl-checkbox {
        margin-right: 100%;
      }

      .field.small.checkbox {
        padding: calc(1px * var(--nh-spacing-xs));
      }

      /* Labels */
      
      sl-checkbox::part(label) {
        color: var(--nh-theme-fg-default);
        padding-left: 4px;
      }

      label {
        padding: 0;
      }
    
      label.reqd {
        height: 100%;
        align-items: center;
        flex: 1;
        flex-grow: 0;
        flex-basis: 8px;
        padding-left: 4px;
        color: var(--nh-theme-error-default);
        line-height: 1rem;
      }

      /* Error state */
      .field.errored {
        outline: 2px solid var(--nh-theme-error-default, #E95C7B);
        border-radius: 4px;
      }

      /* Disabled state */
      .field.disabled sl-checkbox::part(control) {
        background-color: var(--nh-theme-input-fg-disabled); 
        border-color: var(--nh-theme-input-border-disabled);
      }
      .field.disabled:hover sl-checkbox::part(control) {
        background: var(--nh-theme-input-fg-disabled);
        border-color: var(--nh-theme-input-border-disabled);
        cursor: not-allowed;
      }
    `,
  ];
}