import { html, css, CSSResult, PropertyValueMap} from "lit";
import { property, query, state } from "lit/decorators.js";

import { NHComponentShoelace, NHDialog, NHForm } from "@neighbourhoods/design-system-components";
import { ConfigDimensionList } from "../../nh-config";
import { AppletConfigInput, ConfigDimension, Dimension, serializeAsyncActions } from "@neighbourhoods/client";
import { DnaHash, EntryHash } from "@holochain/client";
import { StoreSubscriber } from "lit-svelte-stores";
import { MatrixStore } from "../../matrix-store";
import { consume } from "@lit/context";
import { matrixContext, weGroupContext } from "../../context";
import { rangeKindEqual } from "../../utils";

export class ConfigureAppletDimensions extends NHComponentShoelace {
  @consume({ context: matrixContext , subscribe: true })
  @property({attribute: false}) _matrixStore!: MatrixStore;

  @consume({ context: weGroupContext, subscribe: true })
  @property({attribute: false}) weGroupId!: DnaHash;

  _sensemakerStore = new StoreSubscriber(this, () =>
    this._matrixStore?.sensemakerStore(this.weGroupId),
  );

  @property() handleSubmit!: Function;
  @property() config!: AppletConfigInput;

  @query('nh-dialog') dialog!: NHDialog;

  @state() private _configDimensionsToCreate: Array<ConfigDimension & { range_eh?: EntryHash }> = [];
  @state() private _existingDimensionEntries!: Array<Dimension & { dimension_eh: EntryHash }>;
  @state() private _existingRangeEntries!: Array<Range & { range_eh: EntryHash }>;

  createRangesOfCheckedDimensions() {
    serializeAsyncActions(this._configDimensionsToCreate.map((dimension: ConfigDimension)=> {
        return async () => {
          const rangeEntryHash = await this._sensemakerStore.value?.createRange(dimension.range);
          (dimension as any).range_eh = rangeEntryHash;
          // Assign entry hash to config dimensions ready for creation of dimensions
          return Promise.resolve(rangeEntryHash)
        }
    }))
    console.log('ranges created for config dimensions')
  }
  createCheckedDimensions() {
    serializeAsyncActions(this._configDimensionsToCreate.map((dimension: (ConfigDimension & { range_eh?: EntryHash })) => {
      console.log('({name: dimension.name, computed: dimension.computed, range_eh: (dimension!.range_eh) :>> ', ({name: dimension.name, computed: dimension.computed, range_eh: (dimension!.range_eh)}));
        return async () => await this._sensemakerStore.value?.createDimension(({name: dimension.name, computed: dimension.computed, range_eh: (dimension!.range_eh)} as Dimension))
    }))
    console.log('config dimensions created')
  }

  render() {
    return html`
      <nh-dialog
        id="dialog"
        .dialogType=${"dimension-config"}
        .size=${"large"}
        .title=${"Configuring Dimensions"}
        @config-dimension-selected=${(e: CustomEvent) => {
          const newDimension = e.detail.dimension;
          if(!newDimension) return;
          const alreadyInList = this._configDimensionsToCreate.find(dimension => dimension.name == newDimension.name && rangeKindEqual(dimension.range.kind, newDimension.range.kind))
          if(!alreadyInList) this._configDimensionsToCreate.push(e.detail.dimension);
        }}
        .handleOk=${() => {
          try {
            this.createRangesOfCheckedDimensions()
            console.log('this._configDimensionsToCreate :>> ', this._configDimensionsToCreate);
            this.createCheckedDimensions()
            this.handleSubmit();
          } catch (error) {
            console.error("Could not create dimensions from config: ", error)
          }
        }}
      >
        <div slot="inner-content" class="dialog-container">
          ${ this.config 
              ? html`
                      <config-dimension-list
                        id="applet-input-dimension-list"
                        .dimensionType=${'input'}
                        .configDimensions=${(this.config as AppletConfigInput)!.dimensions!.filter(dimension => !dimension.computed)}
                        .existingDimensions=${this._existingDimensionEntries}
                        .existingRanges=${this._existingRangeEntries}
                        .configMethods=${(this.config as AppletConfigInput)!.methods}
                      >
                      </config-dimension-list>
                      <config-dimension-list
                        id="applet-output-dimension-list"
                        .dimensionType=${'output'}
                        .configDimensions=${(this.config as AppletConfigInput)!.dimensions!.filter(dimension => dimension.computed)}
                        .existingDimensions=${this._existingDimensionEntries}
                        .existingRanges=${this._existingRangeEntries}
                        .configMethods=${(this.config as AppletConfigInput)!.methods}
                      >
                      </config-dimension-list>
                  `
              : html`No config!` // Need to add loading spinner instead?
            } 
        </div>
      </nh-dialog>
    `;
  }

  async updated(changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>) {
    if(changedProperties.has("handleSubmit")) { // By now we have a Sensemaker store value
      if(!this._sensemakerStore?.value) return;
      await this.fetchDimensionEntries();
    }
    if(changedProperties.has("_existingDimensionEntries") && this._existingDimensionEntries?.length > 0) {
      await this.fetchRangeEntriesFromHashes(this._existingDimensionEntries.map((dimension: Dimension) => dimension.range_eh));
    }
  }

  async fetchRangeEntriesFromHashes(rangeEhs: EntryHash[]) {
    let response;
    try {
      response = await Promise.all(rangeEhs.map(eH => this._sensemakerStore.value?.getRange(eH)))
    } catch (error) {
      console.log('Error fetching range details: ', error);
    }
    this._existingRangeEntries = response.map((entryRecord) => ({...entryRecord.entry, range_eh: entryRecord.entryHash})) as Array<Range & { range_eh: EntryHash }>;
  }

  async fetchDimensionEntries() {
    try {
      const entryRecords = await this._sensemakerStore.value?.getDimensions();
      this._existingDimensionEntries = entryRecords!.map(entryRecord => {
        return {
          ...entryRecord.entry,
          dimension_eh: entryRecord.entryHash
        }
      })
    } catch (error) {
      console.log('Error fetching dimension details: ', error);
    }
  }

  async fetchRangeEntries() {
    try {
      const entryRecords = await this._sensemakerStore.value?.getDimensions();
      this._existingDimensionEntries = entryRecords!.map(entryRecord => {
        return {
          ...entryRecord.entry,
          dimension_eh: entryRecord.entryHash
        }
      })
    } catch (error) {
      console.log('Error fetching dimension details: ', error);
    }
  }

  static elementDefinitions = {
    'nh-dialog' : NHDialog,
    'nh-form' : NHForm,
    'config-dimension-list' : ConfigDimensionList
  }

  static styles : CSSResult[] = [
      super.styles as CSSResult,
      css`
        config-dimension-list {
          width: 100%;
        }

        h1 {
          color: white;
          margin: 0 auto;
          font-size: calc(1px * var(--nh-font-size-4xl));
        }
        
        .dialog-container {
          display: flex;
          width: 100%;
          max-height: 85vh;
          flex-direction: column;
          align-items: flex-start;
          overflow-x: hidden;
          overflow-y: auto;
          padding-bottom: 4rem;
        }

        h2 {
          color: white;
          margin: 0 auto;
          width: 18rem;
        }
      `,
    ];
}
