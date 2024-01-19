import { NHBaseForm, NHButton, NHCard, NHComponent, NHForm, NHTextInput, NHTooltip } from "@neighbourhoods/design-system-components";
import { html, css, CSSResult, TemplateResult } from "lit";
import { SlCheckbox, SlInput, SlRadio, SlRadioGroup } from "@scoped-elements/shoelace";
import { object, string, number, ObjectSchema, boolean } from 'yup';
import { Dimension, Range, RangeKind, SensemakerStore, RangeKindFloat, RangeKindInteger } from "@neighbourhoods/client";
import { property, query, state } from "lit/decorators.js";
import { MAX_RANGE_FLOAT, MAX_RANGE_INT, MIN_RANGE_FLOAT, MIN_RANGE_INT } from ".";
import { decode } from "@msgpack/msgpack";

export default class CreateDimension extends NHComponent {
  @property()
  sensemakerStore!: SensemakerStore;

  /* Concrete implementations of the abstract BaseForm interface */  
  // Form model
  @state()
  protected _model = { 
    // This form's model is for two zome calls (Range and Dimension), but keep it in a flat structure for now
    // Dimension:
    name: "",
    range_eh: undefined,
    // Range:
    min: undefined as number | undefined,
    max: undefined as number | undefined,
  };

  private get isIntegerRangeKind() { return this._numberType == "Integer" }

  // Helper to generate nested, dynamic schema for the Range
  private _dimensionRangeSchema = (model: object) => {
    const rangeMin = this.isIntegerRangeKind ? MIN_RANGE_INT : MIN_RANGE_FLOAT
    const rangeMax = this.isIntegerRangeKind ? MAX_RANGE_INT : MAX_RANGE_FLOAT
    const numberType = number().typeError('The input must be numeric').required('Enter a number');
    return {
      min: (this.isIntegerRangeKind 
          ? numberType.integer('Must be an integer') 
          : numberType.test('is-decimal', 'Must be a decimal number', ((value: number) => value.toString().match(/^(\-)?\d+(\.\d+)?$/)) as any)
        )
        .min(rangeMin, "The lower extent of this range cannot be lower than " + rangeMin),
      max:(this.isIntegerRangeKind 
          ? numberType.integer('Must be an integer') 
          : numberType.test('is-decimal', 'Must be a decimal number', ((value: number) => value.toString().match(/^\d+(\.\d+)?$/)) as any)
        )
        .min(((model as any)?.min || - 1) + 1, "The higher extent of this range cannot be lower than the lower extent: " + ((model as any)?.min || 0))
        .max(rangeMax, "The higher extent of this range cannot be higher than " + rangeMax),
  }};

  schema(model: object) : ObjectSchema<any> { 
    return object({
    name: string().min(1, "Must be at least 1 characters").required("Enter a dimension name, e.g. Likes"),
    number_type: string().required("Pick an option"),
    global_min: boolean(),
    global_max: boolean(),
    ...this._dimensionRangeSchema(model)
  })};
  
  // Extra form state, not in the model
  @property()
  private _numberType?: (keyof RangeKindInteger | keyof RangeKindFloat) | undefined;

  @property()
  submitBtn!: NHButton;

  parseZomeError(err: Error) {
    if(!err!.message) return "Not a valid error type";

    const decodedErrors = err.message.match(/Deserialize\(\[(.*?)\]\)/);
    const error = decodedErrors![1];
    return JSON.stringify(error ? decode(JSON.parse("[" + error + "]")) : "{}", null, 2)
  }

  async createEntries(model: object) {
    const formData : { name?: string, min?: number, max?: number, } = model;
    
    let rangeEh, dimensionEh;    
    let inputRange: Range = {
      name: formData.name + '_range',
      //@ts-ignore
      kind: { [this._numberType]: {
        min: formData.min,
        max: formData.max
        }
      }
    }
    
    try {
      rangeEh = await this.sensemakerStore.createRange(inputRange);
    } catch (error) {
      return Promise.reject(Error(' creating new range for dimension: ' + this.parseZomeError(error as Error)))
    }
    if(!rangeEh) return
    let inputDimension: Dimension = {
      name: formData!.name as string,
      computed: false, // Hard coded for input dimensions
      range_eh: rangeEh
    }
    try {
      dimensionEh = await this.sensemakerStore.createDimension(inputDimension);
    } catch (error) {
      return Promise.reject(Error(' creating new dimension: ' + this.parseZomeError(error as Error)))
    }

    if(!dimensionEh) return

    await this.updateComplete;
    this.dispatchEvent(
      new CustomEvent("dimension-created", {
        detail: { dimensionEh, dimensionType: "input", dimension: inputDimension },
        bubbles: true,
        composed: true,
      })
    );
    this.dispatchEvent(
      new CustomEvent('form-submitted', {
        bubbles: true,
        composed: true,
      }),
    );
  }

  async resetForm() {
    this._numberType = undefined;
  }

  setRangeBoundsByNumberType(model: any) {
    if(model.global_min) {
      model.min = this.isIntegerRangeKind ? MIN_RANGE_INT : MIN_RANGE_FLOAT;
    }
    if(model.global_max) {
      model.max = this.isIntegerRangeKind ? MAX_RANGE_INT : MAX_RANGE_FLOAT;
    }
  }

  render() : TemplateResult {
    return html`
      <nh-form
        .config=${(() => ({
          rows: [1, 1, 2, 2],
          submitBtnRef: (() => this.submitBtn)(),
          fields: [
            [{
              type: 'text',
              name: "name",
              id: "dimension-name",
              defaultValue: "",
              size: "medium",
              required: true,
              placeholder: 'Enter a dimension name',
              label: 'Dimension Name',
            }],

            [{
              type: 'radio-group',
              options: ['Whole', 'Decimal'],
              name: "number_type",
              id: "number-type",
              defaultValue: "",
              size: "medium",
              required: true,
              direction: 'vertical',
              label: 'Number type',
              handleInputChangeOverload: (_e, model, _fields) => {
                this._numberType = model.number_type == 'Decimal' ? 'Float' : 'Integer' // Need to rely on local state for dynamic schema, and translate from Display number type
                this.setRangeBoundsByNumberType(model)
              },
            }],

            [{
              type: 'text',
              name: "min",
              id: "min",
              size: "small",
              required: true,
              placeholder: 'Min',
              label: 'Min Value',
              mutateValue: (val: string) => Number(val)
            },
            {
              type: 'text',
              name: "max",
              id: "max",
              size: "small",
              required: true,
              placeholder: 'Max',
              label: 'Max Value',
              mutateValue: (val: string) => Number(val)
            }],

            [{
              type: 'checkbox',
              name: "global_min",
              id: "global-min",
              defaultValue: false,
              size: "small",
              required: false,
              label: 'Use Lowest',
              handleInputChangeOverload: (e, model, fields) => {
                model.min = this.isIntegerRangeKind ? MIN_RANGE_INT : MIN_RANGE_FLOAT;
                if (fields?.min) fields.min.disabled = e.target.value;
                this.setRangeBoundsByNumberType(model)
              }},
            {
              type: 'checkbox',
              name: "global_max",
              id: "global-max",
              defaultValue: false,
              size: "small",
              required: false,
              label: 'Use Highest',
              handleInputChangeOverload: (e, model, fields) => {
                model.max = this.isIntegerRangeKind ? MAX_RANGE_INT : MAX_RANGE_FLOAT;
                if (fields?.max) fields.max.disabled = e.target.value;
                this.setRangeBoundsByNumberType(model)
              }
            }],
          ],
          submitOverload: this.createEntries.bind(this),
          resetOverload: this.resetForm,
          progressiveValidation: false,
          schema: (model: object) => (() => this.schema(model))() // Relies on dynamic elements so use and IIFE
        }))()}></nh-form>
    `;
  }

  static elementDefinitions = {
    "nh-form": NHForm,
    "nh-card": NHCard,
  }

  static get styles() {
    return [
      ...super.styles as CSSResult[],
      css`
        /* Layout */
        :host {
          display: grid;
          flex: 1;
          place-content: start;
          color: var(--nh-theme-fg-default);
          margin: 0 auto;
        }
      `
    ]
  }
}