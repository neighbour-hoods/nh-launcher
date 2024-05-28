import { html, css, CSSResult, PropertyValueMap} from "lit";
import { property, query, state } from "lit/decorators.js";

import NHComponent from '@neighbourhoods/design-system-components/ancestors/base';
import NHDialog from '@neighbourhoods/design-system-components/dialog';
import NHForm from '@neighbourhoods/design-system-components/form/form';
import { ConfigDimensionList } from "../../nh-config";
import { AppletConfigInput, ConfigDimension, ConfigMethod, Dimension, Method, serializeAsyncActions } from "@neighbourhoods/client";
import { DnaHash, EntryHash } from "@holochain/client";
import { StoreSubscriber } from "lit-svelte-stores";
import { MatrixStore } from "../../matrix-store";
import { consume } from "@lit/context";
import { matrixContext, weGroupContext } from "../../context";
import { sleep } from "../../utils";

export class ConfigureAppletDimensions extends NHComponent {
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

  @state() private dimensionsCreated: boolean = false;
  @state() private _configDimensionsToCreate: Array<ConfigDimension & { range_eh?: EntryHash, dimension_eh?: EntryHash }> = [];
  @state() private _existingDimensionEntries!: Array<Dimension & { dimension_eh: EntryHash }>;
  @state() private _existingRangeEntries!: Array<Range & { range_eh: EntryHash }>;
  @state() private _existingMethodEntries!: Array<Method & { method_eh: EntryHash }>;

  findConfigMethodsForDimensions() : ConfigMethod[] {
    const methodsToCreate: ConfigMethod[] = []
    for(let dim of this._configDimensionsToCreate) {
      if(dim.computed) {
        const method = this.config.methods!.find(method => method.output_dimension == dim);
        if(method) methodsToCreate.push(method as ConfigMethod)
      } else {
        const method = this.config.methods!.find(method => method.input_dimensions.includes(dim));
        if(method) methodsToCreate.push(method as ConfigMethod)
      }
      }
    return methodsToCreate
  }

  async createRangesOfCheckedDimensions() {
    for(let dim of this._configDimensionsToCreate) {
          const rangeEntryRecord = await this._sensemakerStore.value?.createRange(dim.range);
          // Assign entry hash to config dimensions ready for creation of dimensions
          dim.range_eh = rangeEntryRecord;
        }
    console.log('ranges created for config dimensions')
  }

  createCheckedDimensions() {
    serializeAsyncActions(this._configDimensionsToCreate.map((dimension: (ConfigDimension & { range_eh?: EntryHash, dimension_eh?: EntryHash,  })) => {
      if(!(dimension.range_eh)) throw new Error("Could not find created range for dimension");
      return async () => {
        const eH = await this._sensemakerStore.value?.createDimension(({name: dimension.name, computed: dimension.computed, range_eh: (dimension!.range_eh)} as Dimension))
        if(!eH) return eH;
        dimension.dimension_eh = eH;
        return eH
      }
    }))

    console.log('config dimensions created')
  }

  createMethodsOfCheckedDimensions(updatedConfigMethods: Method[]) {
    serializeAsyncActions(updatedConfigMethods.map((method: Method) => {
      return async () => {return this._sensemakerStore.value?.createMethod(method)}
    }))

    console.log('config methods created')
  }

  async updated(changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>) {
    if(changedProperties.has("config")) { // By now we should have a Sensemaker store value
      if(!this._sensemakerStore?.value) return;
      await this.fetchDimensionEntries();
    }
    if(changedProperties.has("_existingDimensionEntries") && this._existingDimensionEntries?.length > 0) {
      await this.fetchMethodEntries();
      await this.fetchRangeEntriesFromHashes(this._existingDimensionEntries.map((dimension: Dimension) => dimension.range_eh));
    }
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
          const alreadyInList = this._configDimensionsToCreate.find(dimension => dimension.name == newDimension.name) // Assume name uniqueness based on new dimension clash renaming validation
          if(!alreadyInList) this._configDimensionsToCreate.push(e.detail.dimension);
          console.log('this._configDimensionsToCreate :>> ', this._configDimensionsToCreate);
        }}
        @config-dimension-deselected=${(e: CustomEvent) => {
          const newDimension = e.detail.dimension;
          if(!newDimension) return;
          const alreadyInListIdx = this._configDimensionsToCreate.findIndex(dimension => dimension.name == newDimension.name) // Assume name uniqueness based on new dimension clash renaming validation
          this._configDimensionsToCreate.splice(alreadyInListIdx, 1)
          console.log('this._configDimensionsToCreate :>> ', this._configDimensionsToCreate);
        }}
        .handleClose=${() => {
          if(!this.dimensionsCreated) this.dispatchEvent(
            new CustomEvent("configure-dimensions-manually", {
              bubbles: true,
              composed: true,
            })
          );
        }}
        .handleOk=${async () => {
          try {
            await this.createRangesOfCheckedDimensions()
            await sleep(100);
          } catch (error) {
            console.error("Could not create ranges from config: ", error)
          }
          try {
            this.createCheckedDimensions()
            await sleep(250);
          } catch (error) {
            console.error("Could not create dimensions from config: ", error)
          }
          try {
            let remainingConfigMethods = [];
            const methodsToCreate = this.findConfigMethodsForDimensions();
            // The rest of the config methods should be stored in state so we can create them, bound to existing dimensions instead
            this.config.methods?.forEach(method => !methodsToCreate.includes(method) ? remainingConfigMethods.push(method) : null);

            // Create methods linked to newly created inbound dimensions
            if(methodsToCreate && methodsToCreate.length > 0) {
              const updatedConfigMethods: Array<Method | null> = methodsToCreate.map((configMethod: ConfigMethod) => {
                const linkedInputDimension = this._configDimensionsToCreate.find(dim => !dim.computed && configMethod.input_dimensions[0].name == dim.name)// TODO: also check ranges
                const linkedOutputDimension = this._configDimensionsToCreate.find(dim => dim.computed && configMethod.output_dimension.name == dim.name);
                if(!linkedInputDimension || !linkedOutputDimension) return null
                if(!linkedInputDimension?.dimension_eh || !linkedOutputDimension?.dimension_eh) throw new Error("Linked dimension entry hashes not available")

                const updatedMethod: Method = {
                  name: configMethod.name,
                  program: configMethod.program,
                  can_compute_live: configMethod.can_compute_live,
                  requires_validation: configMethod.requires_validation,
                  input_dimension_ehs: [linkedInputDimension.dimension_eh as EntryHash],
                  output_dimension_eh: linkedOutputDimension.dimension_eh as EntryHash
                }
                return updatedMethod;
              })

              await this.createMethodsOfCheckedDimensions(updatedConfigMethods.filter(m => m !== null) as Method[])
            }

            // Create methods not linked to newly created inbound dimensions but to existing dimension entries
            if(remainingConfigMethods.length > 0) {
              const updatedRemainingConfigMethods: Array<Method | null> = remainingConfigMethods.map((configMethod: ConfigMethod) => {
                const linkedInputDimension = this._existingDimensionEntries.find(dim => !dim.computed && configMethod.input_dimensions[0].name == dim.name)// TODO: update this criteria by checking linked ranges for equality. This simplified version will do for COMPLETE overlaps only
                const linkedOutputDimension = this._existingDimensionEntries.find(dim => dim.computed && configMethod.output_dimension.name == dim.name);
                if(!linkedInputDimension || !linkedOutputDimension) return null
                if(!linkedInputDimension?.dimension_eh || !linkedOutputDimension?.dimension_eh) throw new Error("Linked dimension entry hashes not available")

                const updatedMethod: Method = {
                  name: configMethod.name,
                  program: configMethod.program,
                  can_compute_live: configMethod.can_compute_live,
                  requires_validation: configMethod.requires_validation,
                  input_dimension_ehs: [linkedInputDimension.dimension_eh as EntryHash],
                  output_dimension_eh: linkedOutputDimension.dimension_eh as EntryHash
                }
                console.log('updatedMethod :>> ', updatedMethod);
                return updatedMethod;
              })

              await this.createMethodsOfCheckedDimensions(updatedRemainingConfigMethods.filter(m => m !== null) as Method[])
            }
            this._configDimensionsToCreate = [];
            this.dimensionsCreated = true;
            await sleep(100);
            this.requestUpdate();
            await this.updateComplete;
          } catch (error) {
            console.error("Could not create methods from config: ", error)
          }

          this.handleSubmit();
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
                    .existingMethods=${this._existingMethodEntries}
                    .configMethods=${(this.config as AppletConfigInput)!.methods}
                  >
                  </config-dimension-list>
                  <config-dimension-list
                    id="applet-output-dimension-list"
                    .dimensionType=${'output'}
                    .configDimensions=${(this.config as AppletConfigInput)!.dimensions!.filter(dimension => dimension.computed)}
                    .existingDimensions=${this._existingDimensionEntries}
                    .existingRanges=${this._existingRangeEntries}
                    .existingMethods=${this._existingMethodEntries}
                    .configMethods=${(this.config as AppletConfigInput)!.methods}
                  >
                  </config-dimension-list>
                `
              : html`No config!` // TODO: replace with nh-spinner once that feature branch is merged.
            } 
        </div>
      </nh-dialog>
    `;
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

  async fetchMethodEntries() {
    try {
      const entryRecords = await this._sensemakerStore.value?.getMethods();
      this._existingMethodEntries = entryRecords!.map(entryRecord => {
        return {
          ...entryRecord.entry,
          method_eh: entryRecord.entryHash
        }
      })
    } catch (error) {
      console.log('Error fetching method details: ', error);
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
          flex-direction: column;
          align-items: flex-start;
          overflow-x: hidden;
          overflow-y: auto;
        }

        h2 {
          color: white;
          margin: 0 auto;
          width: 18rem;
        }
      `,
    ];
}
