import { classMap } from 'lit/directives/class-map.js';
import { css, CSSResult, html, TemplateResult } from 'lit';
import { property, query } from 'lit/decorators.js';
import { NHComponent } from '../ancestors/base';

export default class NHTextInput extends NHComponent {
  @property()
  name: string = "Field";
  @property()
  label?: string = "Your field";
  @property()
  size: "small" | "medium" | "large" | "auto" = "medium";
  @property()
  placeholder?: string = "Select your option:";
  @property()
  required: boolean = false;
  @property()
  disabled: boolean = false;
  @property()
  errored: boolean = false;

  @property()
  value?: string = '';
  @property()
  defaultValue?: string = '';
  @query('input')
  _input!: HTMLInputElement;

  protected firstUpdated(): void {
    this.value = this.defaultValue || "";
  }

  handleInputChange(e: Event) {
    this.value = (e.target as any).value

    this.dispatchEvent(
      new CustomEvent("change", {
        bubbles: true,
        composed: true,
      })
    );
  }

  render() : TemplateResult {
    return html`
    <div class="field${classMap({
      'errored': this.errored,
      [this.size]: this.size,
      'disabled': !!this.disabled
    })}">
        ${this.label ? html`<div class="row">
          <label
            for=${this.name}
          >${this.label}</label>

          ${this.required
            ? html`<label
              class="reqd"
              for=${this.name}
              name=${this.name}
              data-name=${this.name}
            >⁎</label>`
            : null
          }
        </div>` : null}
          <input
            autocomplete="off"
            aria-autocomplete="none"
            disabled=${this.disabled}
            type="text"
            name=${this.name}
            id=${this.name}
            placeholder=${this.placeholder}
            ?disabled=${this.disabled}
            ?required=${this.required}
            @input=${this.handleInputChange}
            value=${this.value}
          ></input>
      </div>
    `;
  }

  reset() {
    this.value = '';
    this._input.value = this.value;
  }

  static styles: CSSResult[] = [
    css`
      input {
        margin-top: calc(1px * var(--nh-spacing-md));
        padding: calc(1px * var(--nh-spacing-sm)) calc(1px * var(--nh-spacing-lg));
        color: var(--nh-theme-fg-default);
        background-color: var(--nh-theme-bg-detail); 
        border-radius:  calc(1px * var(--nh-radii-base));
        border: 1px solid var(--nh-theme-accent-disabled);
      }

      /* Sizes */

      .field.medium input, .field.small input {
        --scale: 1px;
      }

      .field.large input {
        --scale: 1.5px;
        padding: calc(1px * var(--nh-spacing-sm)) calc(1px * var(--nh-spacing-lg));
      }
      
      .field input {
        min-width: 16rem;
        height: calc(var(--scale) * var(--nh-spacing-3xl));
      }

      .field.auto input {
        min-width: initial;
        width: 100%;
        box-sizing: border-box;
      }

      .field.small input {
        min-width: initial;
        max-width: 6rem;
      }

      .field:hover input{
        background: var(--nh-theme-bg-element);
      }

      .field input:focus-visible{
        outline: 1px solid var(--nh-theme-accent-default);
      }

      /* Layout */

      .field, .row {
        display: flex;
      }

      .field {
        margin-top: calc(1px * var(--nh-spacing-md));
        flex-direction: column;
      }

      .row {
        justify-content: space-between;
        align-items: center;
      }

      .field.auto {
        width: 100%;
        box-sizing: border-box;
      }
      
      .field.auto, .field.auto input {
        justify-content: center;
        height: 100%;
        margin-top: 0;
      }

      /* Typo */

      input, label:not(.reqd), input::placeholder {
        font-size: calc(1px * var(--nh-font-size-base));
        font-family: var(--nh-font-families-body);
        font-weight: var(--nh-font-weights-body-regular);
        line-height: normal;
        color: var(--nh-theme-fg-default);
      }
      
      .field.large input::placeholder, .field.large label:not(.reqd) {
        font-size: calc(1px * var(--nh-font-size-lg));
        font-weight: var(--nh-font-weights-body-bold);
      }

      input::placeholder {
        color: #9E9E9E;
      }

      /* Labels */
      
      label {
        padding: 0;
      }
    
      label.reqd {
        height: 100%;
        align-items: center;
        padding-left: 8px;
        flex: 1;
        flex-grow: 0;
        flex-basis: 8px;
        color: var(--nh-theme-error-default);
        line-height: 1rem;
      }

      /* Error state */
      .field.errored input {
        outline: 2px solid var(--nh-theme-error-default, #E95C7B);
      }

      /* Disabled state */
      .field.disabled input{
        background-color: var(--nh-theme-input-fg-disabled); 
        border-color: var(--nh-theme-input-border-disabled);
      }
      .field.disabled:hover input{
        background: var(--nh-theme-input-fg-disabled);
        border-color: var(--nh-theme-input-border-disabled);
        cursor: not-allowed;
      }
    `,
  ];
}