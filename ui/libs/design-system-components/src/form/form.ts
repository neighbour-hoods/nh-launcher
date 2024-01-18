import { classMap } from 'lit/directives/class-map.js';
import { NHBaseForm } from '../ancestors/base-form';
import { css, CSSResult, html, PropertyValueMap, TemplateResult } from 'lit';
import { property, query, state } from 'lit/decorators.js';
import { ObjectSchema } from 'yup';
import NHSelect, { OptionConfig } from '../input/select';
import NHButton from '../button';
import NHTooltip from '../tooltip';
import NHCard from '../card';
import { NHTextInput, NHCheckbox } from '../input';
import NHRadioGroup from '../input/radiogroup';
import NHAlert from '../alert';

// Define the interface for the field configuration
interface BaseFieldConfig {
  type: 'text' | 'select' | 'checkbox' | 'radio-group';
  name: string;
  id?: string;
  size?: 'small' | 'medium' | 'large';
  required?: boolean;
  placeholder?: string;
  label?: string;
  defaultValue: string;
}

// Define the interface for select field configuration
interface SelectFieldConfig extends BaseFieldConfig {
  type: 'select';
  selectOptions: OptionConfig[];
  // ... other properties specific to select fields
}

// Define the interface for radio group field configuration
interface RadioGroupFieldConfig extends BaseFieldConfig {
  type: 'radio-group';
  options: String[];
  direction: 'horizontal' | 'vertical';
  handleInputChangeOverload?: (e: Event, model: any) => void;
  // ... other properties specific to select fields
}

// Use a type union for the FieldConfig type
type FieldConfig = BaseFieldConfig | SelectFieldConfig | RadioGroupFieldConfig;

// Define the interface for the form configuration
interface FormConfig {
  rows: number[];
  fields: FieldConfig[][];
  schema: ObjectSchema<any>;
  progressiveValidation?: boolean;
  
  submitBtnLabel?: string;
  submitBtnRef?: NHButton;
  submitOverload?: (model: object) => void;
  resetOverload?: () => void;
}

export default class NHForm extends NHBaseForm {
  @property({ type: Object }) config!: FormConfig;

  @state() _model!: object;
  
  @query("nh-button[type='submit']")
  submitBtn!: NHButton;
  @property()
  _alert!: NHAlert;

  @state() private _selectOpenStates: Record<string, boolean> = {};
  
  firstUpdated(changedProperties: Map<PropertyKey, unknown>): void {
    if (changedProperties.has('config')) {
      this.config.fields.flat().map((field: FieldConfig) => {
        this._model = { ...this._model, [field.name]: field.defaultValue }

        if(field.type == 'select') {
          this._selectOpenStates[field.id as string] = false;
        }
      })
      super.connectedCallback();
    }
  }

  protected updated(changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
    
    if (changedProperties.has('config') && this.config.submitBtnRef && !this.config.submitBtnRef.dataset.bound) {
      this.bindSubmitHandler()
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.unbindSubmitHandler();
  }

  unbindSubmitHandler() {
    if(!this.config?.submitBtnRef) {
      console.error('Could not unbind your submit button handler.');
      return;
    }
    this.config.submitBtnRef.removeEventListener('click', this.handleSubmit.bind(this))
  }

  bindSubmitHandler() {
    if(!this.config?.submitBtnRef) {
      console.error('Could not bind your submit button handler.');
      return 
    }
    (this.config.submitBtnRef as NHButton).addEventListener('click', this.handleSubmit.bind(this));
    this.config.submitBtnRef.dataset.bound = 'true'
  }
  
  async resetForm() {
    super.reset();
    this.config.resetOverload?.call(this);

    this._selectOpenStates = {};
    (this.config?.submitBtnRef || this.submitBtn).loading = false;
    await (this.config?.submitBtnRef || this.submitBtn).updateComplete;
  }

  handleInputChange(e: Event) {
    super.handleInputChange(e);
    // TODO: add individual Overloadss
    // TODO: add mutateValue callbacks if they exist.
  }

  // Hapy path form submit handler
  async handleValidSubmit() {
    (this.config?.submitBtnRef || this.submitBtn).loading = true;
    (this.config?.submitBtnRef || this.submitBtn).requestUpdate("loading");

    this.config?.submitOverload?.call(this, this._model);
  }
  // Sad path form submit handler
  handleFormError() {
    this._alert = (this.renderRoot.querySelector('nh-alert') as NHAlert);
    this._alert.openToast();
    (this.config?.submitBtnRef || this.submitBtn).loading = false;
    (this.config?.submitBtnRef || this.submitBtn).requestUpdate("loading");
  }

  // Overload the render method to use the config for rendering the form
  render(): TemplateResult {
    return html`
      <form method="post" action="" autocomplete="off">
        ${this.renderFormLayout()}
      </form>
      <nh-button class="${classMap({
          ['button-provided']: !!this.config.submitBtnRef,
        })}"
        slot="primary-action"
        type="submit"
        .size=${'auto'}
        .variant=${'primary'}
        @click=${() => this.handleSubmit(undefined as any)}
        .loading=${false}
      >${this.config?.submitBtnLabel || "Submit"}</nh-button>
      <nh-alert
        .open=${false}
        .closable=${true}
        .type=${"danger"}
        .isToast=${true}
        .title=${"There was an error submitting your form:"}
        .description=${this._formErrorMessage}>
      </nh-alert>
    `;
  }

  // Overload the validation schema getter if needed
  protected get validationSchema() {
    return this.config.schema;
  }

  // Method to render the form layout based on the config object
  private renderFormLayout(): TemplateResult {
    return html`${this.config.rows.map((rowLength: number, idx: number) => {
      return html`
        <div class="${classMap({
          [`row${rowLength == 2 ? '-2' : ''}`]: !!rowLength,
        })}">
        ${rowLength == 2
          ? html`${this.config.fields[idx].map((field: FieldConfig) => html`<div class="field">${this.renderField(field)}</div>`)}`
          : html`${this.config.fields[idx].map((field: FieldConfig) => this.renderField(field))}`
        }
        </div>
      `;
    })}`
  }

  private async resetLaterSelects(currentSelectId: string) {
    const selectFieldConfigs: FieldConfig[] = this.config.fields.flat().filter((field: FieldConfig) => field.type == 'select');

    let firstSelectIndex;
    for (let i = 0; i < selectFieldConfigs.length; i++) {
      const element = selectFieldConfigs[i];
      if(element.id == currentSelectId) {
        firstSelectIndex = i
        continue;
      };
      if(typeof firstSelectIndex == 'undefined') continue;

      const select: NHSelect | null = this.renderRoot.querySelector("#" + element.id)
      if(!select) continue;
      select.reset();
      await select.updateComplete;
    } 
  }

  private async closeOtherSelects(currentSelectId: string) {
    const awaitingUpdate : any = [];
    if(this._selectOpenStates[currentSelectId] && Object.values(this._selectOpenStates).filter(value => value).length > 1) {
      const otherSelects = Object.entries(this._selectOpenStates).filter(([id, open]) => open && id !== currentSelectId);
      otherSelects.forEach(selectId => {
        const select : any = this.renderRoot.querySelector("#" + selectId)
        if(!select) return;
        select.open = false;
        select.renderRoot.querySelector('.custom-select')!.classList.remove('active');
        awaitingUpdate.push(select);
      })
    }
    return Promise.all(awaitingUpdate.map(async (select: any) => {return select.updateComplete}))
  }

  // Method to conditionally render different <nh-...> components
  private renderField(fieldConfig: FieldConfig): TemplateResult {
    switch (fieldConfig.type) {
      case "text":
        return html`
          <nh-tooltip .visible=${this.shouldShowValidationErrorForField(fieldConfig.name)} .text=${this.getErrorMessage(fieldConfig.name)} .variant=${"danger"}>
            <nh-text-input
              slot="hoverable"
              .errored=${this.shouldShowValidationErrorForField(fieldConfig.name)}
              .size=${fieldConfig.size}
              .required=${fieldConfig.required}
              id=${fieldConfig.id}
              .name=${fieldConfig.name}
              .placeholder=${fieldConfig.placeholder}
              .label=${fieldConfig.label}
              .value=${(this as any)._model[fieldConfig.name as any]}
              @change=${this.handleInputChange}
            ></nh-text-input>
          </nh-tooltip>`;
      case "select":
        return html`
          <nh-tooltip
            class="tooltip-overflow"
            .visible=${!this._selectOpenStates[fieldConfig.id as string] && this.shouldShowValidationErrorForField(fieldConfig.name)}
            .text=${this.getErrorMessage(fieldConfig.name)}
            .variant=${'danger'}
          >
            <nh-select
              @click=${(e : any) => {this._selectOpenStates[fieldConfig.id as string] = e.currentTarget.open; this.closeOtherSelects(fieldConfig.id as string); if(this.config.progressiveValidation) this.resetLaterSelects(fieldConfig.id as string); this.requestUpdate() }}
              slot="hoverable"
              .errored=${this.shouldShowValidationErrorForField(fieldConfig.name)}
              .size=${fieldConfig.size}
              .required=${fieldConfig.required}
              .id=${fieldConfig.id}
              .name=${fieldConfig.name}
              .placeholder=${fieldConfig.placeholder}
              .label=${fieldConfig.label}
              @change=${this.handleInputChange}
              .options=${(fieldConfig as SelectFieldConfig).selectOptions}
            >
            </nh-select>
          </nh-tooltip>
        `;
      case "radio-group":
        const config = fieldConfig as RadioGroupFieldConfig;
        return html`
          <nh-tooltip
            .visible=${this.shouldShowValidationErrorForField(config.name)}
            .text=${this.getErrorMessage(config.name)}
            .variant=${'danger'}
          >
            <nh-radio-group
              slot="hoverable"
              .errored=${this.shouldShowValidationErrorForField(config.name)}
              .size=${config.size}
              .required=${config.required}
              id=${config.id}
              data-name=${config.name}
              .name=${config.name}
              @change=${(e: Event) => {this.handleInputChange(e); config?.handleInputChangeOverload && config.handleInputChangeOverload(e, this._model)}}
              .direction=${config.direction}
              .options=${config.options}
              .label=${fieldConfig.label}
              .value=${(this as any)._model[fieldConfig.name as any]}
            >
            </nh-radio-group>
          </nh-tooltip>
        `;
      case "checkbox":
        return html`
          <nh-tooltip
            class="checkbox"
            .visible=${this.shouldShowValidationErrorForField(fieldConfig.name)}
            .text=${this.getErrorMessage(fieldConfig.name)}
            .variant=${'danger'}
          >
            <nh-checkbox
              slot="hoverable"
              .errored=${this.shouldShowValidationErrorForField(fieldConfig.name)}
              .size=${fieldConfig.size}
              .required=${fieldConfig.required}
              id=${fieldConfig.id}
              .name=${fieldConfig.name}
              .label=${fieldConfig.label}
              @change=${this.handleInputChange}
            />
          </nh-tooltip>`;
      default:
        return html``;
    }
  }

  static elementDefinitions = {
    'nh-button': NHButton,
    'nh-card': NHCard,
    'nh-checkbox': NHCheckbox,
    'nh-select': NHSelect,
    'nh-text-input': NHTextInput,
    'nh-radio-group': NHRadioGroup,
    'nh-tooltip': NHTooltip,
    'nh-alert': NHAlert,
  };

  static get styles() {
    return [
      ...(super.styles as CSSResult[]),
      css`
        /* Layout */
        :host {
          min-height: 22rem;
          justify-content: center;
          margin: 0px auto;
        }

        form {
          display: flex;
          flex: 1;
          flex-wrap: wrap;
          align-items: flex-start;
          padding: 0;
          margin: calc(1px * var(--nh-spacing-md)) 0 calc(1px * var(--nh-spacing-3xl)) 0;
          gap: 0 calc(1px * var(--nh-spacing-4xl));
          padding-bottom: 4rem;
        }

        form > * {
          display: flex;
          flex: 1;
          justify-content: center;
        }

        nh-button.button-provided {
          visibility: hidden;
          opacity: 0;
          position: absolute;
        }

        /* Scroll bar */

        :host::-webkit-scrollbar-thumb {
          background: var(--nh-theme-bg-element);
          width: 4px;
          border: 4px solid transparent;
        }
        :host::-webkit-scrollbar   {
          width: 8px;
          background: transparent !important;
        }

        .row-2 {
          display: flex;
          justify-content: center;
          align-items: center;
          /* flex-wrap: wrap;  ADD THIS TO MAKE A COL */
        }
        
        .row-2:last-child {
          padding-bottom: calc(1px * var(--nh-spacing-md));
        }

        .field {
          display: flex;
          margin-top: calc(1px * var(--nh-spacing-sm));
        }

        .row-2 .field {
          flex-basis: 9rem;
          margin: 0;
          flex-direction: column;
        }
        .row-2 .field:first-child {
          align-items: flex-start;
        }
        .row-2 .field:last-child {
          align-items: flex-end;
        }

        .row > .checkbox { /* Single row checkboxes */
          display: flex;
          min-width: 18rem;
          justify-content: center;
          margin-top: calc(1px * var(--nh-spacing-md));
        }

        /* Bugfix for custom select */
        .tooltip-overflow {
          --select-height: calc(2.5px * var(--nh-spacing-3xl) - 3px); /* accounts for the label (2*) and borders (-3px) */
          overflow: inherit;
          max-height: var(--select-height);
        }
      `,
    ];
  }
}