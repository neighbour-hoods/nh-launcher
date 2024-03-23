import { html, css, TemplateResult, PropertyValueMap, CSSResult } from 'lit';
import { consume } from '@lit/context';
import { StoreSubscriber } from 'lit-svelte-stores';

import { object, string } from 'yup';
import { appletInstanceInfosContext } from '../../context';
import {
  EntryHash,
  EntryHashB64,
  decodeHashFromBase64,
  encodeHashToBase64,
} from '@holochain/client';
import { compareUint8Arrays } from '@neighbourhoods/app-loader';

import {
  NHAlert,
  NHAssessmentContainer,
  NHButton,
  NHButtonGroup,
  NHCard,
  NHComponent,
  NHDialog,
  NHForm,
  NHIconContainer,
  NHPageHeaderCard,
  NHResourceAssessmentTray,
  NHTooltip,
} from '@neighbourhoods/design-system-components';

import { property, query, queryAll, state } from 'lit/decorators.js';
import { b64images } from '@neighbourhoods/design-system-styles';
import { SlDetails, SlSpinner } from '@scoped-elements/shoelace';
import { classMap } from 'lit/directives/class-map.js';
import {
  AssessmentWidgetBlockConfig,
  AssessmentWidgetConfig,
  AssessmentWidgetRegistrationInput,
  AssessmentWidgetRenderer,
  Dimension,
  Method,
  ResourceDef,
  SensemakerStore,
} from '@neighbourhoods/client';
import {repeat} from 'lit/directives/repeat.js';
import { InputAssessmentRenderer } from '@neighbourhoods/app-loader';
import { derived } from 'svelte/store';
import { Applet } from '../../types';
import { FakeInputAssessmentWidgetDelegate } from '@neighbourhoods/app-loader';
import { dimensionIncludesControlRange } from '../../utils';
import { ResourceBlockRenderer } from '@neighbourhoods/app-loader';

export default class NHAssessmentWidgetConfig extends NHComponent {
  @property() loaded!: boolean;

  sensemakerStore!: SensemakerStore;

  @consume({ context: appletInstanceInfosContext })
  @property({attribute: false}) _currentAppletInstances;

  // Asssessment/Resource renderer dictionary, keyed by Applet EH
  @state() _appletInstanceRenderers : StoreSubscriber<any> = new StoreSubscriber(
    this,
    () =>  derived(this._currentAppletInstances.store, (appletInstanceInfos: any) => {
      //@ts-ignore
      return !!appletInstanceInfos && Object.values(appletInstanceInfos).some(appletInfo => appletInfo!.gui)
      //@ts-ignore
        ? Object.fromEntries(Object.entries(appletInstanceInfos).map(([appletEh, appletInfo]) => {
          if(typeof appletInfo?.gui == 'undefined') return;
          return [appletEh, {...(appletInfo as any)?.gui?.resourceRenderers, ...(appletInfo as any).gui.assessmentWidgets}]
        }))
        : null
    }),
    () => [this.loaded],
  );

  @property() // Selected from the sub-menu of the page
  resourceDef!: ResourceDef & {resource_def_eh: EntryHash };

  currentApplet!: Applet;

  @query('nh-form') private _form;
  @query('#success-toast') private _successAlert;
  @query("nh-button[type='submit']") private submitBtn;
  @queryAll("assessment-container") private _assessmentContainers;

  @state() loading: boolean = false;
  @state() editMode: boolean = false;
  @state() editingConfig: boolean = false;
  @state() placeHolderWidget!: (() => TemplateResult) | undefined;
  @state() configuredWidgetsPersisted: boolean = true; // Is the in memory representation the same as on DHT?

  @state() selectedWidgetKey: string | undefined; // nh-form select options for the 2nd/3rd selects are configured dynamically when this state change triggers a re-render
  @state() selectedInputDimensionEh: EntryHash | undefined; // used to filter for the 3rd select

  @state() _workingWidgetControls: AssessmentWidgetBlockConfig[] = [];
  @state() _workingWidgetControlRendererCache: Map<string, () => TemplateResult> = new Map();

  // AssessmentWidgetBlockConfig (group) and AssessmentWidgetRegistrationInputs (individual)
  @state() private _fetchedConfig!: AssessmentWidgetBlockConfig[];
  @state() private _registeredWidgets: Record<EntryHashB64, AssessmentWidgetRegistrationInput> = {};

  // Derived from _fetchedConfig
  @state() configuredInputWidgets!: AssessmentWidgetBlockConfig[];

  @state() private _inputDimensionEntries!: Array<Dimension & { dimension_eh: EntryHash }>;
  @state() private _outputDimensionEntries!: Array<Dimension & { dimension_eh: EntryHash }>;
  /* Temp - need to add Store method that returns records with entry hashes*/
  @state() private _unpartitionedDimensionEntries!: Array<Dimension & { dimension_eh: EntryHash }>;
  @state() private _rangeEntries!: Array<Range & { range_eh: EntryHash }>;
  @state() private _methodEntries!: Method[] | undefined;


  async firstUpdated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>) {
    this.loading = true;
    try {
      if (!this.sensemakerStore) return;
      await this.fetchDimensionEntries();
      await this.fetchRangeEntries();
      await this.fetchMethodEntries();
      await this.partitionDimensionEntries();
      await this.fetchRegisteredWidgets();
      await this.fetchExistingWidgetConfigBlock();

      this.loading = false;
    } catch (error) {
      console.error('Could not fetch/assign applet and widget data: ', error);
      this.loading = false;
    }
  }

  protected async updated(changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>) {
    if(changedProperties.has('resourceDef') && typeof changedProperties.get('resourceDef') !== 'undefined') {
      await this.resetWorkingState()
      await this.fetchExistingWidgetConfigBlock();
    }
    if(changedProperties.has('editMode') && !!this.editMode && this._assessmentContainers.slice(0,-1).length > 1) {
      this.resetAssessmentControlsSelected();
    }
  }

  private findInputDimensionsForOutputDimension(outputDimensionEh: EntryHash) {
    const methods = this._methodEntries!.filter((method: Method) => compareUint8Arrays(method.output_dimension_eh, outputDimensionEh))
    return methods.map((method: Method) => method.input_dimension_ehs[0])
  }

  private getCombinedWorkingAndFetchedWidgets() {
    let widgets: AssessmentWidgetBlockConfig[]
    if(this._fetchedConfig && this._workingWidgetControls && this._workingWidgetControls.length > 0) {
      widgets = this._fetchedConfig.length > 0 ? [
        ...this._fetchedConfig, ...this._workingWidgetControls
      ] : this._workingWidgetControls;
    } else if(this._fetchedConfig) {
      widgets = this._fetchedConfig;
    } else {
      widgets = [];
    }
    return widgets;
  }

  private async resetWorkingState() {
    await this.fetchExistingWidgetConfigBlock();
    this.configuredWidgetsPersisted = true
    this.placeHolderWidget = undefined;
    this.selectedWidgetKey = undefined;
    this._workingWidgetControls = [];
    this.configuredInputWidgets = this._fetchedConfig
    this._form.reset()
    this.requestUpdate()
  }

  renderWidgetControlPlaceholder() {
    if(typeof this.selectedWidgetKey != 'undefined' && this._workingWidgetControlRendererCache?.has(this.selectedWidgetKey) && this?.placeHolderWidget) {
      return repeat([this.selectedWidgetKey], () => +(new Date), (_, _idx) => this.placeHolderWidget!())
    }
    return html`<span slot="assessment-control"></span>`
  }

  handleAssessmentControlSelected(e: CustomEvent) {
      this._assessmentContainers 
        .forEach((container) => container.selected = !!(container == e.currentTarget));
      this.editMode = true;
  }
  resetAssessmentControlsSelected() {
      this._assessmentContainers 
        .forEach((container) => container.selected = false);
  }

  render(): TemplateResult {
    let renderableWidgets = (this.configuredInputWidgets || this.getCombinedWorkingAndFetchedWidgets())?.map((widgetRegistrationEntry: AssessmentWidgetBlockConfig) => widgetRegistrationEntry.inputAssessmentWidget as AssessmentWidgetConfig)
    return html`
      <div class="container" @assessment-widget-config-set=${async () => {await this.fetchRegisteredWidgets()}}>
        <nh-page-header-card .heading=${'Assessment Widget Config'}>
          <nh-button
            slot="secondary-action"
            .variant=${'neutral'}
            .size=${'icon'}
            .iconImageB64=${b64images.icons.backCaret}
            @click=${() => this.onClickBackButton()}
          >
          </nh-button>
        </nh-page-header-card>

        <div class="description">
          <p>Add as many widgets as you need - the changes won't be saved until the Update Config button is pressed</p>
        </div>
        <div>
          <div class="widget-block-config">
            <assessment-widget-tray
              .editable=${true}
              .editing=${!!this.editingConfig}
            >
              <div slot="widgets">
                ${
                  this._appletInstanceRenderers?.value && (this._fetchedConfig && this._fetchedConfig.length > 0 || this?._workingWidgetControls)
                    ? renderableWidgets.map((inputWidgetConfig, index) => {
                        const appletEh = (inputWidgetConfig as any)?.appletId;
                        const appletKey = appletEh && encodeHashToBase64(appletEh);
                        const appletRenderers = this._appletInstanceRenderers.value[appletKey] as (AssessmentWidgetConfig | ResourceBlockRenderer)[];
                        if(!appletRenderers) throw new Error('Could not get applet renderers linked to this ResourcDef');

                        const fakeDelegate = new FakeInputAssessmentWidgetDelegate();
                        const filteredComponentRenderers = Object.values(appletRenderers).find(component => component.name == (inputWidgetConfig as { dimensionEh: EntryHash, appletId: string, componentName: string }).componentName);
                        const componentToBind = filteredComponentRenderers?.component;
                        if(!componentToBind) return;
                        return html`
                        <assessment-container .editMode=${true}
                          @selected=${this.handleAssessmentControlSelected}>
                          <span slot="assessment-output">0</span>
                          <input-assessment-renderer slot="assessment-control"
                            .component=${componentToBind}
                            .nhDelegate=${fakeDelegate}
                          ></input-assessment-renderer>
                        </assessment-container>
                        `;
                      })
                    : null
                }
                ${this.loading 
                  ? html`<sl-spinner class="icon-spinner"></sl-spinner>`
                  : this.editingConfig || !this._fetchedConfig
                    ? html` <assessment-container .editMode=${true} 
                              @selected=${this.handleAssessmentControlSelected}
                              .selected=${true}
                            >
                              <span slot="assessment-output">0</span>
                              ${this.renderWidgetControlPlaceholder()}
                            </assessment-container>`
                    : null}
              </div>
              <div slot="controls">
                <div name="add-widget-icon" class="add-widget-icon" @click=${async (e: CustomEvent) => {
                  this.resetAssessmentControlsSelected();
                  this.editingConfig = true;
                }}>
                  ${
                  this.editingConfig
                  ? html`<sl-spinner class="icon-spinner"></sl-spinner>`
                  : html`
                    <nh-tooltip .variant=${this.editingConfig ? "warning" : "success"} text="To add a widget, click the plus icon." class="right">
                      <img slot="hoverable" class="add-assessment-icon" src=${`data:image/svg+xml;base64,${b64images.icons.plus}`} alt=${"Add a widget"} />
                    </nh-tooltip>
                  `
                  }
                </div>
              </div>
            </assessment-widget-tray>
            <nh-button
              id="set-widget-config"
              .variant=${'primary'}
              .loading=${this.loading}
              .disabled=${!this.loading && this._fetchedConfig && this.configuredWidgetsPersisted}
              .size=${'md'}
              @click=${async () => {
                try {
                  await this.createEntries();
                } catch (error) {
                  console.warn('error :>> ', error);
                }
                this._successAlert.openToast();
                this.configuredWidgetsPersisted = true
              }}
            >Update Config</nh-button>
          </div>

          <sl-details
            class="${classMap({
              editing: !!this.editingConfig,
            })}"
            .open=${!!this.editingConfig}
            @sl-hide=${(_e: Event) => {
              this.editingConfig = false;
            }}
            @submit-successful=${async () => {
              this.placeHolderWidget = undefined;
              this.requestUpdate()
              await this.updateComplete
            }}
          >
            <div>
              <h2>Add Assessment Control</h2>
              ${this.renderMainForm()}
            </div>
            <nh-button-group
              .direction=${'horizontal'}
              class="action-buttons"input
            >
              <span slot="buttons">
                <nh-button
                  id="close-widget-config"
                  .variant=${'danger'}
                  .size=${'md'}
                  @click=${async () => {
                    this.editingConfig = false;
                    this._form?.reset();
                    await this.resetWorkingState()
                  }}
                >Cancel</nh-button>

                <nh-button
                  id="reset-widget-config"
                  .variant=${'warning'}
                  .size=${'md'}
                  @click=${async () => {
                    this._form?.reset();
                    await this.resetWorkingState()
                  }}
                >Reset</nh-button>

                <nh-button
                  type="submit"
                  id="add-widget-config"
                  .variant=${'success'}
                  .size=${'md'}
                >Add</nh-button>
              </span>
            </nh-button-group>
          </div>
        </sl-details>
        <nh-alert
          id="success-toast"
          .title=${"You have saved your changes."}
          .description=${"You have saved your changes."}
          .closable=${true}
          .isToast=${true}
          .open=${false}
          .type=${"success"}></nh-alert>
        </div>
        </div>
      </div>
    </div>`;
  }

  async pushToInMemoryWidgetControls(model: any) {
    const { assessment_widget, input_dimension, output_dimension } = model;

    const selectedWidgetDetails = Object.entries(this._registeredWidgets || {}).find(
      ([_widgetEh, widget]) => widget.name == assessment_widget,
    );
    const selectedWidgetEh = selectedWidgetDetails?.[0];
    if (!selectedWidgetEh) return Promise.reject('Could not get an entry hash for your selected widget.');

    const inputDimensionBinding = {
      type: "applet",
      appletId: this.resourceDef.applet_eh as any,
      componentName: assessment_widget,
      dimensionEh: decodeHashFromBase64(input_dimension),
    } as AssessmentWidgetConfig;
    const outputDimensionBinding = {
      type: "applet",
      appletId: this.resourceDef.applet_eh as any,
      componentName: assessment_widget,
      dimensionEh: decodeHashFromBase64(output_dimension),
    } as AssessmentWidgetConfig;
    const input = {
      inputAssessmentWidget: inputDimensionBinding,
      outputAssessmentWidget: outputDimensionBinding,
    }
    this.configuredInputWidgets = [ ...this?.getCombinedWorkingAndFetchedWidgets(), input];
    this._workingWidgetControls = [ ...(this?._workingWidgetControls || []), input];
    this.configuredWidgetsPersisted = false;
    this.requestUpdate();
  }

  async createEntries() {
    if(!this._workingWidgetControls || !(this._workingWidgetControls.length > 0)) throw Error('Nothing to persist, try adding another widget to the config.')
    const resource_def_eh = this.resourceDef?.resource_def_eh;

    let successful;
    try {
      successful = await (
        this.sensemakerStore as SensemakerStore
      ).setAssessmentWidgetTrayConfig(resource_def_eh, this.getCombinedWorkingAndFetchedWidgets());
    } catch (error) {
      return Promise.reject('Error setting assessment widget config');
    }
    if (!successful) return;
    console.log('successfully set the widget tray config? ', successful);
    await this.updateComplete;
    this._form.dispatchEvent(
      new CustomEvent('assessment-widget-config-set', {
        bubbles: true,
        composed: true,
      }),
    );
  }

  handleFormChange = async e => {
    const widgets = typeof this._registeredWidgets == 'object' && Object.values(this._registeredWidgets) || []

    const selectedWidget = widgets?.find(widget => widget.name == this._form._model.assessment_widget);
    this.selectedWidgetKey = selectedWidget?.widgetKey;

    this.placeHolderWidget = this?._workingWidgetControlRendererCache.get(this.selectedWidgetKey as string) as () => TemplateResult;

    this.selectedInputDimensionEh = this._form._model.input_dimension;

    e.currentTarget.requestUpdate();
    await e.currentTarget.updateComplete;
  }

  private renderMainForm(): TemplateResult {
    return html`
      <nh-form
        class="responsive"
        @change=${this.handleFormChange}
        .config=${{
          submitBtnRef: (() => this.submitBtn)(),
          rows: [1, 1, 1],
          fields: [
            [
              {
                type: 'select',
                placeholder: 'Select',
                label: '1. Select an assessment widget for this resource: ',
                selectOptions: (() =>
                  this?._registeredWidgets && this?._appletInstanceRenderers.value
                    ? Object.values(this._registeredWidgets)!
                      .filter((widget: AssessmentWidgetRegistrationInput) => {
                        const linkedResourceDefApplet = Object.values(this._currentAppletInstances.value).find(applet => compareUint8Arrays(applet.appletId, this.resourceDef.applet_eh))
                        const fromLinkedApplet = !!linkedResourceDefApplet && (linkedResourceDefApplet.appInfo.installed_app_id == widget.appletId)
                        return fromLinkedApplet && widget.kind == "input"
                      })
                      .map((widget: AssessmentWidgetRegistrationInput) => {
                          const possibleRenderers : ({string: AssessmentWidgetRenderer | ResourceBlockRenderer})[] = this._appletInstanceRenderers.value[encodeHashToBase64(this.resourceDef.applet_eh)];
                          const renderer = possibleRenderers[widget.widgetKey];
                          if(!renderer || renderer?.kind !== 'input') throw new Error('Could not fill using widget renderer as none could be found')
                          let renderBlock = () => html`
                            <input-assessment-renderer slot="assessment-control"
                              .component=${renderer.component}
                              .nhDelegate=${new FakeInputAssessmentWidgetDelegate()}
                            ></input-assessment-renderer>`

                          this._workingWidgetControlRendererCache?.set(widget.widgetKey, renderBlock)
                          return ({
                            label: widget.name,
                            value: widget.name,
                            renderBlock
                          })})
                    : []
                )(), // IIFE regenerates select options dynamically
                name: 'assessment_widget',
                id: 'assessment-widget',
                defaultValue: '',
                size: 'large',
                required: true,
              },
            ],

            [
              {
                type: 'select',
                placeholder: 'Select',
                label: '2. Select the input dimension: ',
                selectOptions: (() =>
                  this._rangeEntries && this._rangeEntries.length
                    ? this?._inputDimensionEntries
                        ?.filter(dimension => {
                          const selectedWidgetRangeKind = Object.values(
                            this._registeredWidgets,
                          ).find(widget => widget.widgetKey == this.selectedWidgetKey)?.rangeKind;
                          const widgetKeyFromLinkedApplet = false;
                          
                          if (typeof this.selectedWidgetKey == 'undefined' || !selectedWidgetRangeKind) return false;

                          const dimensionRange = this._rangeEntries!.find(range =>
                            compareUint8Arrays(range.range_eh, dimension.range_eh),
                          ) as any;
                          return dimensionIncludesControlRange(
                            dimensionRange.kind,
                            selectedWidgetRangeKind,
                          );
                        })
                        .map(dimension => {
                          return {
                            label: dimension.name,
                            value: encodeHashToBase64(dimension.dimension_eh),
                          };
                        })
                    : [])(),
                name: 'input_dimension',
                id: 'input-dimension',
                defaultValue: '',
                size: 'large',
                required: true,
              },
            ],

            [
              {
                type: 'select',
                placeholder: 'Select',
                label: '3. Select the output dimension: ',
                selectOptions: (() =>
                this._methodEntries && this?._outputDimensionEntries
                  ? this._outputDimensionEntries
                    ?.filter(dimension => {
                      if(typeof this._methodEntries !== 'undefined') {
                        const inputDimensions = this.findInputDimensionsForOutputDimension(dimension.dimension_eh);
                        return inputDimensions.map(eh => encodeHashToBase64(eh)).includes(this._form._model.input_dimension)
                      } else return false
                    })
                    .map(dimension => ({
                      label: dimension.name,
                      value: encodeHashToBase64(dimension.dimension_eh),
                    }))
                  : []).bind(this)(),
                name: 'output_dimension',
                id: 'output-dimension',
                defaultValue: '',
                size: 'large',
                required: true,
              },
            ],
          ],
          submitOverload: model => this.pushToInMemoryWidgetControls(model),
          progressiveValidation: true,
          schema: object({
            assessment_widget: string()
              .min(1, 'Must be at least 1 characters')
              .required('Select a widget'),
            input_dimension: string()
              .min(1, 'Must be at least 1 characters')
              .required('Select an input dimension'),
            output_dimension: string()
              .min(1, 'Must be at least 1 characters')
              .required('Select an output dimension'),
          }),
        }}
      >
      </nh-form>
    `;
  }

  static elementDefinitions = {
    'nh-button': NHButton,
    'nh-button-group': NHButtonGroup,
    'nh-card': NHCard,
    'nh-form': NHForm,
    'nh-dialog': NHDialog,
    'nh-page-header-card': NHPageHeaderCard,
    'nh-tooltip': NHTooltip,
    'sl-details': SlDetails,
    'sl-spinner': SlSpinner,
    'nh-alert': NHAlert,
    'assessment-widget-tray': NHResourceAssessmentTray,
    'input-assessment-renderer': InputAssessmentRenderer,
    'nh-icon-container': NHIconContainer,
    'assessment-container': NHAssessmentContainer,
  };

  private onClickBackButton() {
    this.dispatchEvent(new CustomEvent('return-home', { bubbles: true, composed: true }));
  }

  static styles: CSSResult[] = [
    ...super.styles as CSSResult[],
    css`
      /* Layout */
      :host {
        width: 100%;
        height: 100%;
      }

      div.container {
        width: 100%;
        display: flex;
        color: var(--nh-theme-fg-default);
        gap: calc(1px * var(--nh-spacing-sm));
        flex-direction: column;  
        padding: calc(1px * var(--nh-spacing-xl));
        box-sizing: border-box;
      }

      nh-page-header-card {
        grid-column: 1 / -1;
      }

      .description {
        text-align: center;
      }

      input-assessment-renderer {
        display: flex;
        align-items: center;
      }

      /* Typo */
      h2 {
        text-align: center;
        margin: 0 auto;
        width: 18rem;
      }

      /* Top of the page display for current widget config with create/update actions */
      .widget-block-config {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-around;
        width: 100%;
      }

      /* Slide up accordion for main form container, uses sl-details */

      sl-details {
        margin-top: 3em;
      }

      sl-details.editing::part(base) {
        opacity: 1;
      }

      sl-details::part(content) {
        min-height: 28rem;
        padding: calc(1px * var(--nh-spacing-xl));
      }

      sl-details::part(base) {
        opacity: 0;
        transition: 0.5s all cubic-bezier(0.4, 0, 1, 1);

        border-radius: calc(1px * var(--nh-radii-lg));
        background-color: var(--nh-theme-bg-surface);
        border-color: var(--nh-theme-fg-disabled);
        margin: 0 calc(1px * var(--nh-spacing-lg));
      }

      sl-details::part(summary-icon) {
        display: none;
      }

      /* Form actions */
      .action-buttons {
        position: absolute;
        right: calc(1px * var(--nh-spacing-xl));
        bottom: calc(1px * var(--nh-spacing-xs));
      }

      /* Form layout */
      nh-form {
        display: flex;
        max-width: initial !important;
        min-height: 5rem;
      }

      .add-assessment-icon {
        height: 32px;
        width: 32px;
        margin: 4px;
        padding: 0px;
        border-radius: calc(1px * var(--nh-radii-xl));
        background-color: var(--nh-theme-accent-default);
      }

      .add-assessment-icon:hover {
        background-color: var(--nh-theme-accent-emphasis);
        cursor: pointer;
      }

      .icon-spinner {
        font-size: 1.75rem;
        --speed: 10000ms;
        --track-width: 4px;
        --indicator-color: var(--nh-theme-accent-emphasis);
        margin: 3px
      }

      @media (min-width: 1350px) {
        form {
          flex-wrap: nowrap;
          padding-bottom: 0;
          margin-bottom: 0;
        }
        :host {
          overflow: hidden;
        }
      }
  `];


  async fetchExistingWidgetConfigBlock() {
    if (!this.sensemakerStore || !this.resourceDef) return;
    try {
      this._fetchedConfig = await this.sensemakerStore.getAssessmentWidgetTrayConfig(
        this.resourceDef?.resource_def_eh,
      );
      console.log('fetched persisted widget config block :>> ', this._fetchedConfig);
    } catch (error) {
      console.error(error);
    }
  }

  async partitionDimensionEntries() {
    try {
      const input: any = [];
      const output: any = [];
      this._unpartitionedDimensionEntries!.forEach(dimension => {
        if (dimension.computed) {
          output.push(dimension);
          return;
        }
        input.push(dimension);
      });
      this._inputDimensionEntries = input;
      this._outputDimensionEntries = output;
    } catch (error) {
      console.log('Error partitioning dimensions: ', error);
    }
  }

  async fetchRegisteredWidgets() {
    try {
      this._registeredWidgets = await this.sensemakerStore!.getRegisteredWidgets();
    } catch (error) {
      console.log('Error fetching widget registrations: ', error);
    }
  }

  async fetchRangeEntries() {
    await this.fetchRangeEntriesFromHashes(
      this._unpartitionedDimensionEntries.map((dimension: Dimension) => dimension.range_eh),
    );
  }

  async fetchMethodEntries() {
    this._methodEntries = (await this.sensemakerStore?.getMethods())?.map(eR => eR.entry);
  }

  async fetchDimensionEntries() {
    try {
      const entryRecords = await this.sensemakerStore?.getDimensions();
      this._unpartitionedDimensionEntries = entryRecords!.map(entryRecord => {
        return {
          ...entryRecord.entry,
          dimension_eh: entryRecord.entryHash
        }
      })
    } catch (error) {
      console.log('Error fetching dimension details: ', error);
    }
  }

  async fetchRangeEntriesFromHashes(rangeEhs: EntryHash[]) {
    let response;
    try {
      response = await Promise.all(rangeEhs.map(eH => this.sensemakerStore?.getRange(eH)))
    } catch (error) {
      console.log('Error fetching range details: ', error);
    }
    this._rangeEntries = response.map((entryRecord) => ({...entryRecord.entry, range_eh: entryRecord.entryHash})) as Array<Range & { range_eh: EntryHash }>;
  }
}
