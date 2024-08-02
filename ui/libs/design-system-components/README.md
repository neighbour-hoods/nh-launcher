# Neighbourhoods Design System Components
A set of components for easily building user interfaces, using the design tokens/CSS from the `@neighbourhoods/design-system-styles` package.

All of the named components can be imported as named imports e.g.
` import { NHButton } from '@neighbourhoods/design-system-components'`

...or as individual components for when you might benefit from treeshaking e.g.
` import NHButton from '@neighbourhoods/design-system-components/button'`

All components provided are under development, but act as a good starting point for building Neighbourhoods UI.
Currently this package exports these components:

## Base Components

(Comprising of the LitElement ancestor components originally from the `neighbourhoods-design-system-components` package - now deprecated). Use these as a base if you just want to inherit styles or functionality.

`NHComponent` - Just inherits the Neighbourhoods design token CSS variables. To extend styles in the component add this css getter:
```js
  static get styles() {
    return [
      super.styles as CSSResult,
      css`
        /* Here you can use NH design token CSS variables... */

        border: 1px solid var(--nh-theme-success-default);
      `
    ]
  }
```

`NHBaseForm` - See 'Forms', underneath.

## NH Components
### Generic

`NHAlert`

`NHButton`

`NHButtonGroup`

`NHCard`

`NHCardList`

`NHPageHeaderCard`

`NHDialog`

`NHDropdownAccordion`

`NHTabButton`

`NHPagination`

`NHProfileCard`

`NHProfileIdenticon`

`NHSelectAvatar`

`NHPagination`

`NHAssessmentWidget`

`NHSkeleton`

`NHSlide`

`NHTooltip`

`NHTabButton`

`NHMenu`

## Form Inputs

`NHCheckbox`

`NHRadioGroup`

`NHSelect`

`NHTextInput`

`NHTextarea`

### Used in the Neighbourhoods 'Feed Applet' for creating and viewing posts

`NHPostCard`

`NHCreatePost`

## Forms
To make elegant, reactive forms with data validation using the popular [Yup](https://www.npmjs.com/package/yup) library, use `NHForm` or `NHBaseForm`. 

### `NHBaseForm`
Takes care of tracking the validation of fields, touched state, change handlers for most common fields, and form reset. 

#### Public Instance Fields:
`errors`: A record of error messages for each form field.

`touched`: A record indicating whether each form field has been touched.

`formWasSubmitted`: A boolean indicating whether the form has been submitted.

#### Abstract Methods:
`get validationSchema()`: Should return the Yup validation schema for the form.

`handleValidSubmit()`: Should implement the logic to execute when the form is valid and submitted.

`handleFormError()`: Should implement the logic to execute when there is a form-level error during submission.

#### Usage:
To use `NHBaseForm`, create a new class that extends it and implement the abstract methods. Define the validation schema, and the specific logic for handling successful or unsuccessful submissions.

Also you might want to define a `_model` property which has same shape as your schema, and populate it with default values.

Make sure to give your input fields the correct names (same as in the schema), and bind them to the model/event handlers!

```js
import { html } from "lit";
import { state } from "lit/decorators.js";
import { object, string, number, ObjectSchema } from 'yup';
import NHBaseForm from '@neighbourhoods/design-system-components/ancestors/base-form';

class MyForm extends NHBaseForm {
  protected get validationSchema(): ObjectSchema<any> {
    return object({
      name: string().required('Name is required'),
      age: number().required('Age is required')
    });
  }

  protected handleValidSubmit(): void {
    console.log('Form submitted successfully with model:', this._model);
  }

  protected handleFormError(): void {
    console.error('Form submission failed with error:', this._formErrorMessage);
  }

  // Form model populated with default values
  @state()
  protected _model: any = {
    name: '',
    age: 99
  };

  render() {
    return html`
      <form>
        <nh-text-input
          .name=${"name"}
          .value=${this._model.name}
          @change=${(e: CustomEvent) => this.handleInputChange(e)}

          // ...
        ></nh-text-input>

        <nh-text-input
          .name=${"age"}
          .value=${this._model.age}
          @change=${(e: CustomEvent) => this.handleInputChange(e)}

          // ...
        ></nh-text-input>

        <nh-button
          @click=${(e: CustomEvent) => this.handleSubmit(e)}
          type="submit"
        >Submit Form</nh-button>
      </form>`
  }
  // ...
}
```

### `NHForm`
Allows you to easily build a form with built in validation error handling based on the Yup schema (using `NHTooltip`) for various field types, just by passing a config object as a property to the component.

This component is used extensively in the Neighbourhoods launcher and is very opinionated. If it doesn't work for your application, `NHBaseForm` (which this component inherits from) is a lot more lightweight and flexible so might be a better fit. 

Features:
- Automatic tooltip validation messages for any `NHTextInput`, `NHTextarea`, `NHRadioGroup`, `NHSelect`, `NHSelectAvatar`, or file upload field. Other field types will not be recognised/rendered.
- Automatic danger-styled toast pops up when the form is submitted but encounters an error.
- Default Neighbourhoods styled submit button (with loading state on form submit) can be used by passing a string value as the `submitBtnLabel` property of the config.
- Alternatively, pass a reference to an existing HTML button element and it will be bound to the submit handler.
- Allows use of dynamic schema by passing a callback as the `schema` config value. This allows you to update validation rules based on changes to local state.
- If you have multiple `NHSelect` components in a form, allows only one to be expanded at once, for better UX.
- Neighbourhoods styled field labels for all your fields by passing the `label` property on the `FieldConfig`

#### Properties
`config`: A configuration object that implements the `FormConfig` interface detailed below.

#### Interfaces
```js
interface FormConfig {
  rows: number[]; // Defines the layout as an array of row lengths e.g. [1,1,1] for three rows with one field each. This should work for lengths of 1 or 2 for most fields.
  fields: FieldConfig[][]; // One sub-array per row, must mirror the `rows` array to avoid rendering errors
  schema: ObjectSchema<any> | ((model: object) => ObjectSchema<any>); // Static or dynamic schema
  
  // Optional use of custom submit button
  submitBtnRef?: NHButton | HTMLElement;
  // If not using custom submit button, give a label for the default button
  submitBtnLabel?: string;

  // Optional overloading of handlers
  submitOverload?: (model: object) => void;
  resetOverload?: () => void;
}

// Field configs vary slightly depending on the field type
type FieldConfig = BaseFieldConfig | SelectFieldConfig | RadioGroupFieldConfig | CheckboxFieldConfig | FileUploadFieldConfig| ImageUploadFieldConfig;

interface BaseFieldConfig {
  type: 'text' | 'select' | 'checkbox' | 'radio-group'| 'textarea' | 'file'| 'image';
  name: string;
  id?: string;
  size?: 'small' | 'medium' | 'large';
  required?: boolean;
  placeholder?: string;
  label?: string;
  defaultValue: string | boolean | OptionConfig;
  useDefault?: () => boolean;
  handleInputChangeOverload?: (e: Event, model: any, fields: any, errors: any) => void; // Add additonal functionality for each field  beyond controlled components and validation e.g. change local state
  mutateValue?: (value: string | boolean) => unknown; // Callback to mutate the value before it is stored in the model and validated
}

// select field configuration
interface SelectFieldConfig extends BaseFieldConfig {
  type: 'select';
  selectOptions: OptionConfig[]; // See the NHSelect component for the OptionConfig interface
}

// checkbox field configuration
interface CheckboxFieldConfig extends BaseFieldConfig {
  type: 'checkbox';
  defaultValue: boolean;
}

// radio group field configuration
interface RadioGroupFieldConfig extends BaseFieldConfig {
  type: 'radio-group';
  options: String[];
  direction: 'horizontal' | 'vertical';
}

// file upload field configuration
interface FileUploadFieldConfig extends BaseFieldConfig {
  type: 'file';
  extension: string;
}

// image upload field configuration
interface ImageUploadFieldConfig extends BaseFieldConfig {
  shape: "circle" | "square"
  customPlaceholder?: string;
}

```

#### Events Emitted
`submit-successful`: Emitted when the validation and submit handler are executed without error.

#### Usage:
To use `NHForm`, define the validation schema, submit handler etc. and pass them in to the config object with the rest of the details as shown in the example below.

Make sure to give your input config values the correct names (same as in the schema), but now you don't need to worry about binding fields to the model/event handlers.

`NHForm` inherits from `NHBaseForm` but you don't need to implement abstract methods as it takes care of it for you. Don't name your submit handler after any of the abstract methods.


```js
  // ... 
  @query("nh-button[type='submit']") private _submitBtn;

  async doStuff(model: object) {
    // Your submit handler logic
  }

  render() {
    return html`
      <nh-form
        .config=${{ // If you need this config to be dynamic, use and IIFE here
          rows: [1, 1, 2, 2],
          submitBtnRef: this._submitBtn,
          fields: [
            // First Row Field Configs
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

            // Second Row Field Configs
            [{
              type: 'radio-group',
              options: ['Whole', 'Decimal'],
              name: "number_type",
              id: "number-type",
              defaultValue: "Whole",
              size: "medium",
              required: true,
              direction: 'vertical',
              label: 'Number type',
              handleInputChangeOverload: async (_e, model, fields) => {
                // ... some logic
              },
            }],

            // Third Row Field Configs
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

            // Fourth Row Field Configs
            [{
              type: 'checkbox',
              name: "global_min",
              id: "global-min",
              defaultValue: false,
              size: "small",
              required: false,
              label: 'Use Lowest',
              handleInputChangeOverload: async(e, model, fields) => {
                // ... some logic e.g. disable other fields
              }},
            {
              type: 'checkbox',
              name: "global_max",
              id: "global-max",
              defaultValue: false,
              size: "small",
              required: false,
              label: 'Use Highest'
            }],
          ],
          submitOverload: this.doStuff.bind(this),
          resetOverload: () => {
            // Reset local state here 
          },
          schema: object({
            name: string()
              .min(1, "Must be at least 1 characters") // Include your tooltip validation messages
              .required("Enter a dimension name, e.g. Likes"),
            number_type: string().required("Pick an option"),
            global_min: boolean(),
            global_max: boolean(),
            // ...
          })
        }}></nh-form>

        <nh-button
          type="submit"
        >Submit</nh-button>
    `;
  }

// ... 
```