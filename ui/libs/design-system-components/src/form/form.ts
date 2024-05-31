import { classMap } from 'lit/directives/class-map.js';
import { NHBaseForm } from '../ancestors/base-form';
import { css, CSSResult, html, PropertyValueMap, TemplateResult } from 'lit';
import { property, query, state } from 'lit/decorators.js';
import { ObjectSchema } from 'yup';
import NHSelectAvatar from '../select-avatar';
import NHButton from '../button';
import NHTooltip from '../tooltip';
import NHCard from '../card';
import NHSelect, { OptionConfig } from '../input/select';
import { NHTextInput, NHCheckbox, NHTextArea, NHRadioGroup } from '../input';
import NHAlert from '../alert';


// Define the interface for the field configuration
interface BaseFieldConfig {
  type: 'text' | 'select' | 'checkbox' | 'radio-group'| 'textarea' | 'file'| 'image';
  name: string;
  id?: string;
  size?: 'small' | 'medium' | 'large';
  required?: boolean;
  placeholder?: string;
  label?: string;
  defaultValue: string | boolean | OptionConfig;
  handleInputChangeOverload?: (e: Event, model: any, fields: any, errors: any) => void;
  mutateValue?: (value: string | boolean) => unknown;
  useDefault?: () => boolean;
}

// Define the interface for select field configuration
interface SelectFieldConfig extends BaseFieldConfig {
  type: 'select';
  selectOptions: OptionConfig[];
}

// Define the interface for checkbox field configuration
interface CheckboxFieldConfig extends BaseFieldConfig {
  type: 'checkbox';
  defaultValue: boolean;
}

// Define the interface for radio group field configuration
interface RadioGroupFieldConfig extends BaseFieldConfig {
  type: 'radio-group';
  options: String[];
  direction: 'horizontal' | 'vertical';
}

// Define the interface for file upload field configuration
interface FileUploadFieldConfig extends BaseFieldConfig {
  type: 'file';
  extension: string;
}
// Define the interface for image upload field configuration
interface ImageUploadFieldConfig extends BaseFieldConfig {
  shape: "circle" | "square"
  customPlaceholder?: string;
}

// Use a type union for the FieldConfig/Field types
type FieldConfig = BaseFieldConfig | SelectFieldConfig | RadioGroupFieldConfig | CheckboxFieldConfig | FileUploadFieldConfig| ImageUploadFieldConfig;

type NHField = NHTextInput | NHRadioGroup | NHCheckbox | NHSelect| NHSelectAvatar;

// Define the interface for the form configuration
interface FormConfig {
  rows: number[]; // Defines the layout
  fields: FieldConfig[][]; // One sub-array per row, must mirror the `rows` array form
  schema: ObjectSchema<any> | ((model: object) => ObjectSchema<any>);
  progressiveValidation?: boolean; // TODO: decide whether to implement this or remove it as an option
  
  // Optional use of custom submit button
  submitBtnRef?: NHButton;
  // If not using custom submit button, give a label for the default button
  submitBtnLabel?: string;

  // Optional overloading of handlers
  submitOverload?: (model: object) => void;
  resetOverload?: () => void;
}

export default class NHForm extends NHBaseForm {
  @property({ type: Object }) config!: FormConfig;

  @property() private inputChangeOverloads?: Map<string, (e: Event, model: object, fields: object, errors: object) => void>; // Will be assigned from the config in the firstUpdated hook
  @property() private inputMutationOverloads?: Map<string, (value: string | boolean) => unknown>; // Will be assigned from the config in the firstUpdated hook
  @property() private fieldRefs: Map<string, NHField> = new Map();// Will be assigned from the config in the firstUpdated hook

  @state() _model!: object;
  
  @query("nh-button[type='submit']") submitBtn!: NHButton;
  
  @property() private _alert!: NHAlert;

  @state() private _selectOpenStates: Record<string, boolean> = {};
  
  firstUpdated(changedProperties: Map<PropertyKey, unknown>): void {
    this.inputChangeOverloads = new Map();
    this.inputMutationOverloads = new Map();

    if (changedProperties.has('config')) {
      this.config.fields.flat().map((field: FieldConfig) => {
        // By default enable default value in form reset
        if(!field?.useDefault) {
          field.useDefault = () => true;
        }
        // Set the form model
        const defaultValue = field.type == 'select' ? (field?.defaultValue as OptionConfig)?.value : field?.defaultValue;
        this._model = { ...this._model, [field.name]: defaultValue }
        
        // Index mutation overloads ready for use
        if(field?.mutateValue) {
          this.inputMutationOverloads?.set(field.name, field.mutateValue)
        }
        // Index change handler overloads
        if(field?.handleInputChangeOverload) {
          this.inputChangeOverloads?.set(field.name, field.handleInputChangeOverload)
        }
        // Set form-level select values (used to prevent multiple open selects at once)
        if(field.type == 'select') {
          this._selectOpenStates[field.id as string] = false;
        }
        // Index refs of field inputs to be passed through to change handler callbacks
        this.fieldRefs?.set(field.name, this.renderRoot.querySelector(`#${field.id}`) as NHField)
      })

      super.connectedCallback();
    }
  }

  protected updated(changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
    if (changedProperties.has('config') && this.config.submitBtnLabel || (this.config?.submitBtnRef && !this.config?.submitBtnRef?.dataset?.bound)) {
      this.bindSubmitHandler()
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.unbindSubmitHandler();
  }

  private unbindSubmitHandler() {
    if(!this.config?.submitBtnRef) {
      console.error('Could not unbind your submit button handler.');
      return;
    }
    this.config.submitBtnRef.removeEventListener('click', this.handleSubmit.bind(this))
  }

  private bindSubmitHandler() {
    if(!this.submitButton) {
      console.error('Could not bind your submit button handler.');
      return 
    }
    if(this.submitButton.dataset.bound == 'true') return;
    (this.submitButton as NHButton).addEventListener('click', this.handleSubmit.bind(this));
    this.submitButton.dataset.bound = 'true'
  }

  private get submitButton() {
    return (this.config?.submitBtnRef || this.submitBtn)
  }

  public async reset() {
    this._selectOpenStates = {};
    this.submitButton.loading = false;
    await this.submitButton.updateComplete;

    Object.values(Object.fromEntries(this.fieldRefs.entries())).forEach(inputRef => {if (inputRef !== null) inputRef.disabled = false});
    this.config.resetOverload?.call(this);
    super.reset();
    this.config.fields.flat().map((field: FieldConfig) => {
      const defaultValue = field.type == 'select' ? (field?.defaultValue as OptionConfig)?.value : field?.defaultValue;
      if(typeof field.useDefault !== 'undefined' && field.useDefault() && !!defaultValue) {
        this._model = { ...this._model, [field.name]: defaultValue }
      }
    })
  }

  handleInputChange(e: Event) {
    const target = e.target as any;
    // Mutate target value if overload given
    if(target?.value && this.inputMutationOverloads?.has(target.name)) {
      target.value = (this.inputMutationOverloads!.get(target.name) as (value: string | boolean) => unknown)(target.value)
    }
    super.handleInputChange(e);

    // Additionally overload input change with a callback that takes the model, form field refs (e.g. for manually disabling other inputs)
    if(this.inputChangeOverloads?.has(target.name)) {
      this.inputChangeOverloads?.get(target.name)?.apply(null, [e, this._model, Object.fromEntries(this.fieldRefs.entries()), this.errors]);
    }
  }

  // Hapy path form submit handler
  async handleValidSubmit() {
    this.submitButton.loading = true;
    this.submitButton.requestUpdate("loading");
    try {
      await this.config?.submitOverload?.call(null, this._model);
      this.reset();
      this.dispatchEvent(
        new CustomEvent('submit-successful', {
          bubbles: true,
          composed: true,
        })
      )
    } catch(err) {
      console.error(err)
      this._formErrorMessage = "We couldn't store your data. If this happens again, please log an issue with the Neighbourhoods team, including the message logged in the developer console.";
      this.handleFormError();
    }
  }

  // Sad path form submit handler
  handleFormError() {
    this._alert = (this.renderRoot.querySelector('nh-alert') as NHAlert);
    this._alert.openToast();
    this.submitButton.loading = false;
    this.submitButton.requestUpdate("loading");
  }

  // Implement the render method to use the config for rendering the form
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

  // Overload the validation schema getter if needed, differentiate between static/dynamic schema options
  protected get validationSchema() {
    return typeof this.config.schema == 'function'
      ? this.config.schema.call(this, this._model)
      : this.config.schema
  }

  // Method to render the form layout based on the config object
  // Works for rows of length 1 or 2 
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
              @change=${(e: Event) => this.handleInputChange(e)}
            ></nh-text-input>
          </nh-tooltip>`;
      case "textarea":
        return html`
          <nh-tooltip .visible=${fieldConfig.required && this.shouldShowValidationErrorForField(fieldConfig.name)} .text=${this.getErrorMessage(fieldConfig.name)} .variant=${"danger"}>
            <nh-textarea
              slot="hoverable"
              .errored=${fieldConfig.required && this.shouldShowValidationErrorForField(fieldConfig.name)}
              .size=${fieldConfig.size}
              .required=${fieldConfig.required}
              id=${fieldConfig.id}
              .name=${fieldConfig.name}
              .placeholder=${fieldConfig.placeholder}
              .label=${fieldConfig.label}
              .value=${(this as any)._model[fieldConfig.name as any]}
              @change=${(e: Event) => this.handleInputChange(e)}
            ></nh-textarea>
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
              .defaultValue=${(typeof fieldConfig?.useDefault !== 'undefined') && fieldConfig.useDefault() ? fieldConfig.defaultValue : null}
              .label=${fieldConfig.label}
              @change=${(e: Event) => this.handleInputChange(e)}
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
              .id=${config.id}
              data-name=${config.name}
              .name=${config.name}
              @change=${(e: Event) => this.handleInputChange(e)}
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
              .value=${(this as any)._model[fieldConfig.name as any]}
              @change=${(e: Event) => this.handleInputChange(e)}
            />
          </nh-tooltip>`;
    
      case "file":
        const fileConfig = fieldConfig as FileUploadFieldConfig;
        return html`
          <nh-tooltip
            .variant=${'danger'}
            .visible=${this.shouldShowValidationErrorForField(fileConfig.name)}
            .text=${this.getErrorMessage(fileConfig.name)}
          >
            <div
              slot="hoverable"
              class="file-upload${classMap({
                errored: !!this.shouldShowValidationErrorForField(fileConfig.name)
                })}"
            >
              <label
                for=${fileConfig.name}
              >${fileConfig.label}</label>
              <label
                class="reqd"
                for=${fileConfig.name}
                name=${fileConfig.name}
                data-name=${fileConfig.name}
              >⁎</label>
              <nh-button
                .variant=${"primary"}
                .size=${"md"}
                @click=${(e) => { e.currentTarget.nextElementSibling.click() }}
              >
                ${fileConfig.placeholder}  
              </nh-button>
              <input
                style="display:none;"
                type="file"
                accept=${fileConfig.extension}
                id=${fileConfig.id}
                name=${fileConfig.name}
                @change=${(e: Event) => this.handleInputChange(e)}
                value=${(this as any)._model[fileConfig.name as any]}
              />
            </div>
          </nh-tooltip>
            `;

      case "image":
        const avatarConfig = fieldConfig as ImageUploadFieldConfig; 
        return html`
          <nh-tooltip
            .variant=${'danger'}
            .visible=${this.shouldShowValidationErrorForField(avatarConfig.name)}
            .text=${this.getErrorMessage(avatarConfig.name)}
          >
            <div
              slot="hoverable"
              class="file-upload${classMap({
                errored: !!this.shouldShowValidationErrorForField(avatarConfig.name)
                })}"
            >
              <nh-select-avatar
                .name=${avatarConfig.name}
                .shape=${avatarConfig.shape}
                .size=${avatarConfig.size}
                .label=${avatarConfig.label}
                .customPlaceholder=${avatarConfig?.customPlaceholder}
                .required=${avatarConfig.required}
                @change=${(e: Event) => this.handleInputChange(e)}
              >
              </nh-select-avatar>
          </nh-tooltip>
            `;
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
    'nh-textarea': NHTextArea,
    'nh-select-avatar': NHSelectAvatar,
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

        :host(.auto-height) {
          min-height: initial;
        }

        form {
          display: flex;
          flex: 1;
          flex-wrap: wrap;
          align-items: flex-start;
          
          padding: 0;
          margin: calc(1px * var(--nh-spacing-md)) 0 calc(1px * var(--nh-spacing-3xl)) 0;
          gap: 0 calc(1px * var(--nh-spacing-4xl));
        }

        :host(.responsive) form {
          margin-bottom: 8rem;
          gap: 4rem;
        }

        form > * {
          display: flex;
          flex: 1 1 100%;
          justify-content: center;
          gap: 1rem;
        }
        form > .row:only-child {
          flex-wrap: wrap;
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

        .row .file-upload {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-top: calc(1px * var(--nh-spacing-sm));
        }
        .row .file-upload.errored {
          outline: 2px solid var(--nh-theme-error-default, #E95C7B);
          border-radius: 4px;
        }
    
        label.reqd {
          height: 100%;
          align-items: center;
          flex: 1;
          flex-grow: 0;
          flex-basis: 8px;
          padding-left: 4px;
          color: var(--nh-theme-error-default);
        }

        /* Bugfix for custom select */
        .tooltip-overflow {
          --select-height: calc(2.5px * var(--nh-spacing-3xl) - 3px); /* accounts for the label (2*) and borders (-3px) */
          overflow: inherit;
          max-height: var(--select-height);
        }
        
        /* Hide our submit button when one a ref is provided in config */
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
      `,
    ];
  }
}