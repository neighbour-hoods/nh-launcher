import { css, CSSResult, html, PropertyValueMap, TemplateResult } from "lit";
import { property, query, queryAll, state } from "lit/decorators.js";

import NHComponent from '@neighbourhoods/design-system-components/ancestors/base';
import NHButton from '@neighbourhoods/design-system-components/button';
import NHButtonGroup from '@neighbourhoods/design-system-components/button-group';
import NHCard from '@neighbourhoods/design-system-components/card';
import NHDialog from '@neighbourhoods/design-system-components/dialog';
import NHForm from '@neighbourhoods/design-system-components/form/form';
import CreateOrEditTrayConfig from '../forms/create-edit-assessment-tray';
import AssessmentTrayConfigList from '../lists/assessment-tray-config-list';
import { SensemakerStore } from "@neighbourhoods/client";
import { b64images } from "@neighbourhoods/design-system-styles";
import { consume } from "@lit/context";
import { appletInstanceInfosContext } from "../../context";
import { EntryHash, EntryHashB64 } from "@holochain/client";
import { StoreSubscriber } from "lit-svelte-stores";
import { repeat } from "lit/directives/repeat.js";
import { derived } from "svelte/store";
import { compareUint8Arrays } from "../../../../libs/app-loader/dist";
import { NHAssessmentContainer } from "../../../../libs/design-system-components/dist";
import { ResourceDef, Constructor, AssessmentControlConfig, InputAssessmentControlDelegate, AssessmentTrayConfig, AssessmentControlRegistrationInput, Dimension, Method, DimensionControlMapping } from "../../../../libs/sensemaker-client/dist";
import { Applet } from "../../types";

export default class AssessmentTrayConfigs extends NHComponent {
  @property() loaded: boolean = false;

  @query('nh-dialog')
  private _dialog;

  @property()
  createTrayConfigDialogButton!: HTMLElement;

  @property()
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
        ? Object.fromEntries((Object.entries(appletInstanceInfos) || [])?.map(([appletEh, appletInfo]) => {
          if(typeof appletInfo?.gui == 'undefined') return;
          return [appletEh, {...(appletInfo as any)?.gui?.resourceRenderers, ...(appletInfo as any).gui.assessmentControls}]
        }).filter(value => !!value) || [])
        : null
    }),
    () => [this.loaded],
  );

  @property() // Selected from the sub-menu of the page
  resourceDef!: ResourceDef & {resource_def_eh: EntryHash };

  currentApplet!: Applet;

  @query('nh-form') private _form;
  @query("nh-button[type='submit']") private submitBtn;
  @queryAll("assessment-container") private _assessmentContainers;

  @state() loading: boolean = false;
  @state() editMode: boolean = false;
  @state() editingConfig: boolean = false;
  @state() updatedComponent!: Constructor<unknown> | undefined;
  @state() placeHolderWidget!: (() => TemplateResult) | undefined;
  @state() configuredWidgetsPersisted: boolean = true; // Is the in memory representation the same as on DHT?
  
  @state() selectedWidgetIndex: number | undefined = -1; // -1 represents the placeholder widget, otherwise this is the index of the widget in the renderableWidgets array
  @state() selectedWidgetKey: string | undefined; // nh-form select options for the 2nd/3rd selects are configured dynamically when this state change triggers a re-render
  @state() selectedInputDimensionEh: EntryHash | undefined; // used to filter for the 3rd select

  @state() _workingWidgetControls: AssessmentControlConfig[] = [];
  @state() _workingWidgetControlRendererCache: Map<string, (delegate?: InputAssessmentControlDelegate, component?: unknown) => TemplateResult> = new Map();

  @state() private _trayName!: string; // Text input value for the name
  @state() private _trayNameFieldErrored: boolean = false; // Flag for errored status on name field
  
  // AssessmentControlConfig (group) and AssessmentControlRegistrationInputs (individual)
  @state() private _fetchedConfig!: AssessmentTrayConfig | undefined;
  @state() private _updateToFetchedConfig!: AssessmentTrayConfig;
  @state() private _registeredWidgets: Record<EntryHashB64, AssessmentControlRegistrationInput> = {};

  // Derived from _fetchedConfig
  @state() configuredInputWidgets!: AssessmentControlConfig[];

  @state() private _inputDimensionEntries!: Array<Dimension & { dimension_eh: EntryHash }>;
  @state() private _outputDimensionEntries!: Array<Dimension & { dimension_eh: EntryHash }>;

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
      await this.fetchRegisteredAssessmentControls();
      if(this.editMode && this._updateToFetchedConfig) {
        this._fetchedConfig = this._updateToFetchedConfig;
      } else {
        this._fetchedConfig = await this.fetchExistingTrayConfig();
      }

      this.loading = false;
    } catch (error) {
      console.error('Could not fetch/assign applet and widget data: ', error);
      this.loading = false;
    }
  }

  protected async updated(changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>) {
    if(changedProperties.has('resourceDef') && typeof changedProperties.get('resourceDef') !== 'undefined') {
      await this.resetWorkingState()
      await this.fetchExistingTrayConfig();
    }
  }

  private findInputDimensionsForOutputDimension(outputDimensionEh: EntryHash) {
    const methods = this._methodEntries!.filter((method: Method) => compareUint8Arrays(method.output_dimension_eh, outputDimensionEh))
    return methods.map((method: Method) => method.input_dimension_ehs[0])
  }

  private findOutputDimensionForInputDimension(inputDimensionEh: EntryHash) {
    const methods = this._methodEntries!.filter((method: Method) => compareUint8Arrays(method.input_dimension_ehs[0], inputDimensionEh))
    return methods.map((method: Method) => method.output_dimension_eh)[0]
  }

  private getCombinedWorkingAndFetchedWidgets() {
    let widgets: AssessmentControlConfig[]
    if((this._updateToFetchedConfig || this._fetchedConfig) && this._workingWidgetControls && this._workingWidgetControls.length > 0) {
      widgets = this._fetchedConfig.length > 0 ? [
        ...(this._updateToFetchedConfig || this._fetchedConfig), ...this._workingWidgetControls
      ] : this._workingWidgetControls;
    } else if(this._fetchedConfig) {
      widgets = this._fetchedConfig;
    } else {
      widgets = [];
    }
    return widgets;
  }

  private async resetWorkingState() {
    await this.fetchExistingTrayConfig();
    this.configuredWidgetsPersisted = true
    this.placeHolderWidget = undefined;
    this.selectedWidgetKey = undefined;
    this.selectedWidgetIndex = undefined;
    this._workingWidgetControls = [];
    this.configuredInputWidgets = this._fetchedConfig
    this.resetAssessmentControlsSelected()
    this._form.reset()
    this.requestUpdate()
  }

  // Methods for managing the state of the placeholder/selected control
  renderWidgetControlPlaceholder() {
    if(!this.editMode && typeof this.selectedWidgetKey != 'undefined' && this._workingWidgetControlRendererCache?.has(this.selectedWidgetKey) && this?.placeHolderWidget) {
      return repeat([this.selectedWidgetKey], () => +(new Date), (_, _idx) => this.placeHolderWidget!())
    }
    return html`<span slot="assessment-control"></span>`
  }
  handleAssessmentControlSelected(e: CustomEvent) {
    this.resetAssessmentControlsSelected();
    e.currentTarget.selected = true;
    this.editMode = true;
    this.editingConfig = true;
    
    const selectedIndex = [...this._assessmentContainers].findIndex(container => container.selected)
    this.selectedWidgetIndex = selectedIndex;
    this._form.reset()
    if(selectedIndex == -1 || e.currentTarget.id == 'placeholder') {
      this.editMode = false;
      this.placeHolderWidget = undefined;
      this._form.requestUpdate()
    }
  }
  undoDeselect(e: CustomEvent) {
    const container = e.target as NHAssessmentContainer;
    container.selected = true;
    container.requestUpdate()
  }
  resetAssessmentControlsSelected() {
      this._assessmentContainers
        .forEach((container) => container.selected = false);
  }
  reselectPlaceholderControl() {
      const containers = [...this._assessmentContainers]
      const placeHolderContainer = containers[containers.length - 1]?.id == "placeholder" && containers[containers.length - 1];
      if(placeHolderContainer) placeHolderContainer.selected = true;
  }

  render(): TemplateResult {
    let renderableWidgets = (this.configuredInputWidgets || this.getCombinedWorkingAndFetchedWidgets())?.map((widgetRegistrationEntry: AssessmentControlConfig) => widgetRegistrationEntry.inputAssessmentControl as DimensionControlMapping)
    
    const foundEditableWidget = this.editMode && this.selectedWidgetIndex !== -1 && renderableWidgets[this.selectedWidgetIndex as number] && Object.values(this._registeredWidgets)?.find(widget => widget.name == renderableWidgets[this.selectedWidgetIndex as number]?.componentName);
    const foundEditableWidgetConfig = this.editMode && this.selectedWidgetIndex as number !== -1 && renderableWidgets[this.selectedWidgetIndex as number]
    return html`
    <div class="container">
      <nh-page-header-card .heading=${'Assessment Tray Configurations'}>
        <nh-button
          slot="secondary-action"
          .variant=${'neutral'}
          .size=${'icon'}
          .iconImageB64=${b64images.icons.backCaret}
          @click=${() => this.onClickBackButton()}
        >
        </nh-button>
      </nh-page-header-card>

      <nh-dialog
        id="dialog"
        class="no-title"
        .dialogType=${"input-form"}
        .title="Create Assessment Tray Config"
        .handleOk=${() => {}}
        size=${"large"}
        .openButtonRef=${(() => this.createTrayConfigDialogButton)()}
      >
        <div slot="inner-content" class="row">
          <create-or-edit-tray
            .sensemakerStore=${this.sensemakerStore}
          >
          </create-or-edit-tray>
        </div>
      </nh-dialog>
      <assessment-tray-config-list
        .sensemakerStore=${this.sensemakerStore}
      >
        <nh-button
          slot="action-button"
          @click=${() => this._dialog.showDialog()}
          class="create-config"
          .variant=${"primary"}
          .iconImageB64=${b64images.icons.plus}
          .size=${"md"}
        >Add</nh-button>
      </assessment-tray-config-list>
    </div>
    `;
  }

  static elementDefinitions = {
    'nh-button': NHButton,
    'nh-button-group': NHButtonGroup,
    'nh-card': NHCard,
    'nh-form': NHForm,
    'nh-dialog': NHDialog,
    'assessment-tray-config-list': AssessmentTrayConfigList,
    'create-or-edit-tray': CreateOrEditTrayConfig,
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

      div.tray-name-field {
        width: 18rem;
        margin: 0 auto 1rem auto;
      }

      nh-page-header-card {
        grid-column: 1 / -1;
      }

      .description {
        text-align: center;
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


  async fetchExistingTrayConfig() : Promise<AssessmentTrayConfig | undefined> {
    if (!this.sensemakerStore || !this.resourceDef) return;
    const defaultConfig = await this.sensemakerStore.getDefaultAssessmentTrayForResourceDef(
      this.resourceDef?.resource_def_eh,
    );
    console.log('defaultConfig :>> ', defaultConfig);
    return defaultConfig?.entry
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

  async fetchRegisteredAssessmentControls() {
    try {
      this._registeredWidgets = await this.sensemakerStore!.getRegisteredAssessmentControls();
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
