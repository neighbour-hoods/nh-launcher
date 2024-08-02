import { html, css, CSSResult, PropertyValueMap} from "lit";
import { property, query, state } from "lit/decorators.js";

import NHComponent from '@neighbourhoods/design-system-components/ancestors/base';
import NHDialog from '@neighbourhoods/design-system-components/dialog';
import NHForm from '@neighbourhoods/design-system-components/form/form';
import NHSpinner from '@neighbourhoods/design-system-components/spinner';
import { ConfigDimensionList, MAX_RANGE_FLOAT, MAX_RANGE_INT, MIN_RANGE_FLOAT, MIN_RANGE_INT } from "../../nh-config";
import { AppletConfigInput, ConfigDimension, ConfigMethod, Dimension, Method, serializeAsyncActions, Range, RangeKind, RangeKindFloat, RangeKindInteger } from "@neighbourhoods/client";
import { DnaHash, EntryHash } from "@holochain/client";
import { StoreSubscriber } from "lit-svelte-stores";
import { MatrixStore } from "../../matrix-store";
import { consume } from "@lit/context";
import { matrixContext, weGroupContext } from "../../context";
import { sleep } from "../../utils";
import { compareUint8Arrays } from "@neighbourhoods/app-loader";
import { matchesConfigMethodOutputDimension } from "../../nh-config/lists/config-dimension-list";

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

  @query('#applet-input-dimension-list') inputConfigDimensionList!: ConfigDimensionList;
  @query('#applet-output-dimension-list') outputConfigDimensionList!: ConfigDimensionList;

  @state() private _dimensionsCreated: boolean = false;
  @state() private _configDimensionsToCreate: Array<ConfigDimension & { range_eh?: EntryHash, dimension_eh?: EntryHash }> = [];
  @state() private _existingDimensionEntries!: Array<Dimension & { dimension_eh: EntryHash }>;
  @state() private _existingRangeEntries!: Array<Range & { range_eh: EntryHash }>;
  @state() private _existingMethodEntries!: Array<Method & { method_eh: EntryHash }>;

  private findConfigMethodsForDimensions() : ConfigMethod[] {
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

  private coerceOutputDimensionRanges() {
    if(!(this.config?.methods)) return;
    for(let dim of this._configDimensionsToCreate) {
      if(!dim.computed) continue;

      const dimensionLinkedMethods: ConfigMethod[] = this.config.methods.filter(method => matchesConfigMethodOutputDimension(dim, method));
      if(dimensionLinkedMethods.length == 0) continue;
      // NOTE: assuming one linked method only for simplicity at this stage but may need to be revised later
      const { program, input_dimensions } = dimensionLinkedMethods[0];

      const newRange : Range = this.getCoercedOutputDimensionRange(input_dimensions[0].range, Object.keys(program)[0] as "Average" | "Sum", Object.keys(dim.range.kind)[0] as keyof RangeKindInteger | keyof RangeKindFloat)
      dim.range = newRange;
    }
    console.log('coerced ranges for output config dimensions')
  }

  private async createRangesOfCheckedDimensions() {
    for(let dim of this._configDimensionsToCreate) {
          const rangeEntryRecord = await this._sensemakerStore.value?.createRange(dim.range);
          // Assign entry hash to config dimensions ready for creation of dimensions
          dim.range_eh = rangeEntryRecord?.entryHash;
        }
    console.log('ranges created for config dimensions')
  }

  private createCheckedDimensions() {
    serializeAsyncActions(this._configDimensionsToCreate.map((dimension: (ConfigDimension & { range_eh?: EntryHash, dimension_eh?: EntryHash,  })) => {
      if(!(dimension.range_eh)) throw new Error("Could not find created range for dimension");
      return async () => {
        try {  
          const response = await this._sensemakerStore.value?.createDimension(({name: dimension.name, computed: dimension.computed, range_eh: (dimension!.range_eh)} as Dimension))
          dimension.dimension_eh = response!.entryHash;
        } catch (error) {
          console.error("Could not create config dimension: ", error)
        }
      }
    }))

    console.log('config dimensions created')
  }

  private createMethodsOfCheckedDimensions(updatedConfigMethods: Method[]) {
    serializeAsyncActions(updatedConfigMethods.map((method: Method) => {
      return async () => {return this._sensemakerStore.value?.createMethod(method)}
    }))

    console.log('config methods created')
  }

  private findExistingEntryHashForInputDimensionOverlap(configMethod: ConfigMethod) : EntryHash | undefined {
    const overlappingInputDimension = this.inputConfigDimensionList.inboundDimensionDuplicates.find(dim => dim == configMethod.input_dimensions[0]) 
    if(!overlappingInputDimension) return;
    const existing = overlappingInputDimension.duplicateOf!.find(existingEntry => existingEntry.useExisting);
    if(!existing) return;
    
    return existing.dimension_eh
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
          if(!alreadyInList) {
            this._configDimensionsToCreate.push(newDimension)
            newDimension.useExisting = !newDimension.isDuplicate; 
            newDimension.duplicateOf?.forEach(dup => dup.useExisting = !(newDimension.useExisting)); 
          };
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
          setTimeout(() => {
            if(!this._dimensionsCreated) this.dispatchEvent(
              new CustomEvent("configure-dimensions-manually", {
                bubbles: true,
                composed: true,
              })
            );
          }, 500);
        }}
        .handleOk=${async () => {
          try {
            this.coerceOutputDimensionRanges()
            await this.createRangesOfCheckedDimensions()
            await sleep(100);
          } catch (error) {
            console.error("Could not create ranges from config: ", error)
          }
          try {
            this.createCheckedDimensions()
            await sleep(350); //TODO: Serialise this whole chain of actions to prevent race condition errors and remove sleeps
          } catch (error) {
            console.error("Could not create dimensions from config: ", error)
          }
          try {
            let remainingConfigMethods: any = [];
            const methodsToCreate = this.findConfigMethodsForDimensions();
            // The rest of the config methods should be stored in local state so we can create them, bound to existing dimensions instead
            this.config.methods?.forEach(method => !methodsToCreate.includes(method) ? remainingConfigMethods.push(method) : null);

            // Create methods linked to newly created inbound dimensions
            if(methodsToCreate.length > 0) {
              const updatedConfigMethods: Array<Method> = this.mapConfigMethodToCreateMethodInput(methodsToCreate, "inbound").filter(m => m !== null) as Method[];
              await this.createMethodsOfCheckedDimensions(updatedConfigMethods)
              console.log('updatedConfigMethods :>> ', updatedConfigMethods);
            }

            // Create methods not linked to newly created inbound dimensions but to existing dimension entries
            if(remainingConfigMethods.length > 0) {
              const updatedRemainingConfigMethods: Array<Method> = this.mapConfigMethodToCreateMethodInput(remainingConfigMethods, "existing").filter(m => m !== null) as Method[];
              await this.createMethodsOfCheckedDimensions(updatedRemainingConfigMethods);
              console.log('updatedRemainingConfigMethods :>> ', updatedRemainingConfigMethods);
            }

            this._configDimensionsToCreate = [];
            this._dimensionsCreated = true;
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
                    .otherConfigDimensionList=${this.outputConfigDimensionList}
                    .configDimensions=${(this.config as AppletConfigInput)!.dimensions!.filter(dimension => !dimension.computed)}
                    .existingDimensions=${this._existingDimensionEntries}
                    .existingRanges=${this._existingRangeEntries}
                    .existingMethods=${this._existingMethodEntries}
                    .configMethods=${(this.config as AppletConfigInput)!.methods}
                  >
                  </config-dimension-list>
                  <config-dimension-list
                    id="applet-output-dimension-list"
                    .otherConfigDimensionList=${this.inputConfigDimensionList}
                    .dimensionType=${'output'}
                    .configDimensions=${(this.config as AppletConfigInput)!.dimensions!.filter(dimension => dimension.computed)}
                    .existingDimensions=${this._existingDimensionEntries}
                    .existingRanges=${this._existingRangeEntries}
                    .existingMethods=${this._existingMethodEntries}
                    .configMethods=${(this.config as AppletConfigInput)!.methods}
                  >
                  </config-dimension-list>
                `
              : html`<nh-spinner type=${"page"}></nh-spinner>`
            } 
        </div>
      </nh-dialog>
    `;
  }

  private checkDimensionEqualityByNameOrOriginalName(dimension1, dimension2) {
    return dimension1.name == dimension2?.originalName || dimension1.name == dimension2.name
  }

  private mapConfigMethodToCreateMethodInput(configMethods: ConfigMethod[], linkedDimensionType: "inbound" | "existing"): Array<Method | null> {
    return configMethods.map((configMethod: ConfigMethod) => {
      // Try to use existing input dimension instead if there is an overlap on input dimension
      const usedExistingOverlappingInputDimensionEntryHash = linkedDimensionType == "inbound" && this.findExistingEntryHashForInputDimensionOverlap(configMethod);
      const linkedInputDimension = (linkedDimensionType == "existing" ? this._existingDimensionEntries : this._configDimensionsToCreate).find(dim => !dim.computed && this.checkDimensionEqualityByNameOrOriginalName(configMethod.input_dimensions[0], dim)) // TODO: also check ranges
      const linkedOutputDimension = (linkedDimensionType == "existing" ? this._existingDimensionEntries : this._configDimensionsToCreate).find(dim => dim.computed && this.checkDimensionEqualityByNameOrOriginalName(configMethod.output_dimension, dim));
      if(!linkedInputDimension || !linkedOutputDimension) return null
      if(!linkedInputDimension?.dimension_eh || !linkedOutputDimension?.dimension_eh) {
        throw new Error("Linked dimension entry hashes not available")
      }
      const updatedMethod: Method = {
        name: configMethod.name,
        program: configMethod.program,
        can_compute_live: configMethod.can_compute_live,
        requires_validation: configMethod.requires_validation,
        input_dimension_ehs: [usedExistingOverlappingInputDimensionEntryHash || linkedInputDimension.dimension_eh as EntryHash],
        output_dimension_eh: linkedOutputDimension.dimension_eh as EntryHash
      }

      const existsMethodEntryWithSameDetails = this._existingMethodEntries?.find(methodEntry => {
        return methodEntry.program == updatedMethod.program 
          && methodEntry.can_compute_live == updatedMethod.can_compute_live 
          && methodEntry.requires_validation == updatedMethod.requires_validation 
          && compareUint8Arrays(methodEntry.output_dimension_eh, updatedMethod.output_dimension_eh)
          && compareUint8Arrays(methodEntry.input_dimension_ehs[0], updatedMethod.input_dimension_ehs[0])
      })
      // TODO: create tests for this - currently filtering to dedup new methods may no be working due to which dimensions are used
      // console.log('existsMethodEntryWithSameDetails :>> ', existsMethodEntryWithSameDetails);
      if(existsMethodEntryWithSameDetails) return null

      return updatedMethod;
    })
  }
  // Helpers to calculate output range
  private getRangeForSumComputation(min: number, max: number, numberType: keyof RangeKindInteger | keyof RangeKindFloat): RangeKind {
    const rangeMin = numberType == 'Integer' ? MIN_RANGE_INT : MIN_RANGE_FLOAT;
    const rangeMax = numberType == 'Integer' ? MAX_RANGE_INT : MAX_RANGE_FLOAT;
    switch (true) {
      case max <= min:
        throw new Error('Invalid RangeKind limits');
      case min >= 0:
        // range is [0, x], where x is positive the output range will be [0, INF].
        //@ts-ignore
        return {
          [numberType]: {
            min: 0,
            max: rangeMax,
          },
        } as RangeKind;
      case min < 0 && max > 0:
        // range is [x, y], where x is negative and y is positive the output range will be [-INF, INF].
        //@ts-ignore
        return {
          [numberType]: {
            min: rangeMin,
            max: rangeMax,
          },
        } as RangeKind;
      default:
        // range is [x, 0], where x is negative the output range will be [-INF, 0].
        //@ts-ignore
        return {
          [numberType]: {
            min: rangeMin,
            max: 0,
          },
        } as RangeKind;
    }
  }
  private getCoercedOutputDimensionRange(inputRange: Range, methodProgram: "Sum" | "Average", numberType: keyof RangeKindInteger | keyof RangeKindFloat) : Range {
    let outputRange;

    if (methodProgram === 'Sum') {
      const rangeKindLimits = Object.values(inputRange.kind)[0];
      const { min, max } = rangeKindLimits;
      try {
        outputRange = {
          name: inputRange.name,
          kind: this.getRangeForSumComputation(min, max, numberType),
        };
      } catch (error) {
        console.log('Error calculating output range: ', error);
      }
    } else {
      // Else it is Avg...
      outputRange = inputRange;
    }
    return outputRange
  }

  private async fetchRangeEntriesFromHashes(rangeEhs: EntryHash[]) {
    let response;
    try {
      response = await Promise.all(rangeEhs.map(eH => this._sensemakerStore.value?.getRange(eH)))
    } catch (error) {
      console.log('Error fetching range details: ', error);
    }
    this._existingRangeEntries = response.map((entryRecord) => ({...entryRecord.entry, range_eh: entryRecord.entryHash})) as Array<Range & { range_eh: EntryHash }>;
  }

  private async fetchDimensionEntries() {
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

  private async fetchMethodEntries() {
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
    "nh-spinner": NHSpinner,
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
