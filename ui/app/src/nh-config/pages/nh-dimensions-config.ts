import { html, css, TemplateResult, PropertyValueMap } from 'lit';
import { consume } from '@lit/context';
import { StoreSubscriber } from 'lit-svelte-stores';

import { MatrixStore } from '../../matrix-store';
import { matrixContext, weGroupContext } from '../../context';
import { DnaHash } from '@holochain/client';

import NHButton from '@neighbourhoods/design-system-components/button';
import NHCard from '@neighbourhoods/design-system-components/card';
import NHDialog from '@neighbourhoods/design-system-components/dialog';
import NHPageHeaderCard from '@neighbourhoods/design-system-components/page-header-card';
import NHComponent from '@neighbourhoods/design-system-components/ancestors/base';
import { b64images } from '@neighbourhoods/design-system-styles';

import CreateDimension from '../forms/create-input-dimension-form';
import DimensionList from '../lists/dimension-list';
import { property, query, state } from 'lit/decorators.js';
import CreateOutputDimensionMethod from '../forms/create-output-dimension-form';

export default class NHDimensionsConfig extends NHComponent {
  @consume({ context: matrixContext, subscribe: true })
  @property({ attribute: false })
  _matrixStore!: MatrixStore;
  
  @consume({ context: weGroupContext, subscribe: true })
  @property({ attribute: false })
  weGroupId!: DnaHash;

  @query('nh-dialog')
  private _dialog;
  @query('#input-dimension-list')
  private _inputDimensionList;
  @query('#output-dimension-list')
  private _outputDimensionList;
  @property()
  private _dimensionForm;

  @state()
  private _formType: 'input-dimension' | 'method' = 'input-dimension';

  @query("nh-button[type='submit']")
  submitBtn;

  _sensemakerStore = new StoreSubscriber(this, () =>
    this._matrixStore?.sensemakerStore(this.weGroupId),
  );

  protected firstUpdated(
    _changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>,
  ): void {
    if (_changedProperties.has('_formType')) {
      this._dimensionForm = this.renderRoot.querySelector('create-input-dimension-form');
    }
  }

  protected async updated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>) {
    if (
      _changedProperties.has('_formType') &&
      typeof _changedProperties.get('_formType') !== 'undefined'
    ) {
      this._dimensionForm = this.renderRoot.querySelector(
        this._formType == 'input-dimension'
          ? 'create-input-dimension-form'
          : 'create-output-dimension-method-form',
      );
    }
  }

  render() : TemplateResult {
    return html`
      <div
        class="container"
        @dimension-created=${async (e: CustomEvent) => await this.onDimensionCreated(e)}
      >
        <nh-page-header-card .heading=${'Dimensions'}>
          <nh-button
            slot="secondary-action"
            .variant=${'neutral'}
            .size=${'icon'}
            .iconImageB64=${b64images.icons.backCaret}
            @click=${() => this.onClickBackButton()}
          >
          </nh-button>
        </nh-page-header-card>

        <dimension-list
          id="input-dimension-list"
          .sensemakerStore=${this._sensemakerStore.value}
          .dimensionType=${'input'}
        >
          <nh-button
            slot="action-button"
            id="add-dimension"
            .variant=${'primary'}
            .size=${'md'}
            @click=${() => {
              this._formType = 'input-dimension';
              this._dialog.showDialog();
              this.requestUpdate();
            }}
          >
            Add
          </nh-button>
        </dimension-list>

        <dimension-list
          id="output-dimension-list"
          .sensemakerStore=${this._sensemakerStore.value}
          .dimensionType=${'output'}
        >
          <nh-button
            slot="action-button"
            id="add-dimension"
            .variant=${'primary'}
            .size=${'md'}
            @click=${() => {
              this._formType = 'method';
              this._dialog.showDialog();
              this.requestUpdate();
            }}
          >
            Add
          </nh-button>
        </dimension-list>

        <nh-dialog
          id="create-dimension-dialog"
          .dialogType=${'input-form'}
          .size=${'medium'}
          @form-submitted=${(e: CustomEvent) => { (e.currentTarget as NHDialog).hideDialog(); this._formType == 'method' ? this._dimensionForm.reset() : this._dimensionForm.form.reset() }}
        >
          <div slot="inner-content" class="dialog-container">
            <h2>
              ${'Add ' + (this._formType == 'input-dimension' ? 'Input' : 'Output') + ' Dimension'}
            </h2>
            ${this.renderMainForm()}
          </div>

          <nh-button
            slot="primary-action"
            type="submit"
            .size=${'auto'}
            .variant=${'primary'}
            @click=${() => {
                const cannotCreateOutputMethod = !(this._inputDimensionList._dimensionEntries && this._inputDimensionList._dimensionEntries.length > 0);
                if(this._formType == 'method' && cannotCreateOutputMethod) this._formType = 'input-dimension'
                // Note: due to the complexity of converting the create-output-dimension-form to use NHForm, it is still using NHBaseForm and needs to be submitted differently 
                this._dimensionForm?.form ? this._dimensionForm.form.handleSubmit() : this._dimensionForm.handleSubmit()
              }
            }
            .loading=${false}
            >Add</nh-button
          >
        </nh-dialog>
      </div>
    `;
  }

  private renderMainForm(): TemplateResult {
    if (this._formType == 'input-dimension') {
      return html`
      <create-input-dimension-form
        .sensemakerStore=${this._sensemakerStore.value}
        .submitBtn=${(() => this.submitBtn)()}
      ></create-input-dimension-form>`
      ;
    }
    return html`<create-output-dimension-method-form
      .sensemakerStore=${this._sensemakerStore.value}
      .inputDimensions=${this._inputDimensionList._dimensionEntries}
      .inputDimensionRanges=${this._inputDimensionList._rangeEntries}
      .submitBtn=${(() => this.submitBtn)()}
    ></create-output-dimension-method-form>`;
  }

  static elementDefinitions = {
    'nh-button': NHButton,
    'nh-card': NHCard,
    'nh-dialog': NHDialog,
    'nh-page-header-card': NHPageHeaderCard,
    'create-input-dimension-form': CreateDimension,
    'create-output-dimension-method-form': CreateOutputDimensionMethod,
    'dimension-list': DimensionList,
  };

  private onClickBackButton() {
    this.dispatchEvent(new CustomEvent('return-home', { bubbles: true, composed: true }));
  }

  private onDimensionCreated = async (e: CustomEvent) => {
    if (e.detail.dimensionType == 'input') {
      await this._inputDimensionList.firstUpdated()
      return
    }
    await this._outputDimensionList.firstUpdated()
  };

  static get styles() {
    return css`
      :host,
      .dialog-container {
        display: flex;
        width: 100%;
      }

      .container {
        --menu-width: 200px; /* TODO: lift this variable up do dedup in the parent component */
        width: 100%;
        display: grid;
        flex: 1;
        place-content: start;
        color: var(--nh-theme-fg-default);
        grid-template-columns: 2fr 1fr;
        grid-template-rows: 4rem auto;
        padding: calc(1px * var(--nh-spacing-xl));
        gap: calc(1px * var(--nh-spacing-sm));
      }

      .dialog-container {
        flex-direction: column;
        align-items: flex-start;
      }

      h2 {
        margin: 0 auto;
        width: 18rem;
      }

      nh-page-header-card {
        grid-column: 1 / -1;
      }
      dimension-list {
        grid-column: 1 / -1;
        display: flex;
        align-items: start;
      }
    `;
  }
}
