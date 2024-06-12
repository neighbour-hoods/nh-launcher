import { html, css, PropertyValueMap, CSSResult, TemplateResult } from "lit";
import { property, queryAll } from "lit/decorators.js";

import { ConfigDimension, ConfigMethod,  Dimension, Range, Method } from "@neighbourhoods/client";

import { NHButton, NHCard, NHComponent, NHDialog } from "@neighbourhoods/design-system-components";
import { rangeKindEqual } from "../../utils";
import { EntryHash } from "@holochain/client";
import { compareUint8Arrays } from "@neighbourhoods/app-loader";
import { repeat } from "lit/directives/repeat.js";

type DimensionEntry = Dimension & { dimension_eh: EntryHash, useExisting: boolean, overlap?: { type: Overlap, fields?: PartialOverlapField[] } };
type RangeEntry = Range & { range_eh: EntryHash };
type MethodEntry = Method & { method_eh: EntryHash };

type InboundDimension = ConfigDimension & {selected?: boolean };
type PossibleDuplicateInboundDimension = InboundDimension & {isDuplicate?: boolean, useExisting?: boolean, duplicateOf?: Array<DimensionEntry>};
type DuplicateInboundDimension = PossibleDuplicateInboundDimension & { isDuplicate: true, existing_dimension_ehs: EntryHash[]};

enum PartialOverlapField {
  Name = "name",
  Range = "range",
  Operation = "operation",
  InputDimension = "input-dimension",
}

enum Overlap {
  CompleteInput = "complete-input",
  CompleteOutput = "complete-output",
  Partial = "partial",
}

// Helpers for filtering/matching dimensions with methods
export function matchesMethodInputDimension(dimension: InboundDimension, method: ConfigMethod) {
  return method.input_dimensions.some(d => dimension.name == d.name && (dimension.range.name == d.range.name) && rangeKindEqual(dimension.range.kind, d.range.kind))
}

export function matchesConfigMethodOutputDimension(dimension: InboundDimension, method: ConfigMethod) {
  return method.output_dimension.name == dimension.name 
    && method.output_dimension.range.name == dimension.range.name 
    && rangeKindEqual(method.output_dimension.range.kind, dimension.range.kind)
}

export default class ConfigDimensionList extends NHComponent {
  @property() dimensionType: "input" | "output" = "input";

  @property() configDimensions!: Array<PossibleDuplicateInboundDimension>;

  @property() inboundDimensionDuplicates: Array<PossibleDuplicateInboundDimension | DuplicateInboundDimension> = [];

  @property() existingDimensions!: Array<DimensionEntry>;
  @property() existingRanges!: Array<RangeEntry>;
  @property() existingMethods!: Array<MethodEntry>;

  @property() configMethods!: Array<ConfigMethod>;

  @property() otherConfigDimensionList?: ConfigDimensionList; // Used only when overlaps involve the other type of dimension

  @queryAll('.change-dimension-name-dialog') private _changeDimensionNameDialogs!: NHDialog[];

  protected updated(changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
    // Logic for detecting inbound config dimensions that  are duplicates of existing dimension entries
    if(changedProperties.has('configDimensions') && !!this.configDimensions && !!this.configMethods) {  
      try {
        if(this.inboundDimensionDuplicates.length == 0 && typeof this.existingDimensions !== 'undefined' && typeof this.existingRanges !== 'undefined' && this.existingDimensions.length > 0 && this.existingRanges.length > 0) {

          // Add duplicates of existing dimensions to an array in local state
          this.inboundDimensionDuplicates = this.configDimensions.filter((inboundDimension: PossibleDuplicateInboundDimension | DuplicateInboundDimension) => {
            // Find the existing dimension entries for the possible duplicate
            const existingDimensionClashes: Array<DimensionEntry> = this.filterExistingDimensionsByInboundClash(inboundDimension);
            existingDimensionClashes.forEach(clash => clash.useExisting = true); // Add a flag indicating the default existing dimension should be used

            this.categorizeDimensionsByInboundClashType(inboundDimension, existingDimensionClashes);

            if(existingDimensionClashes.length > 0) {
              // If they exist, concretize the type of this inboundDimension as DuplicateInboundDimension by adding relevant properties
              inboundDimension.isDuplicate = true;
              inboundDimension.duplicateOf = existingDimensionClashes.filter(existingDimension => {
                // Filter out clashes of subjective with objective dimensions and vice versa.
                if((this.dimensionType == 'input' && existingDimension.computed) || (this.dimensionType == 'output' && !(existingDimension.computed))) return false                
                return true
              });

              (inboundDimension as DuplicateInboundDimension).existing_dimension_ehs = [];
              inboundDimension.duplicateOf.forEach(existingDimension => (inboundDimension as DuplicateInboundDimension)!.existing_dimension_ehs.push(existingDimension.dimension_eh));
              return true
            }
            return false
          })
        }
      } catch (error) {
        console.log('Error mapping dimensions and ranges to table values: ', error)
      }
    }
  }

  private renderOverlappingDimensionFieldAction(duplicateOf, idx, inboundDimension) : TemplateResult {
    if(duplicateOf.overlap.type.match("complete")) return html`` // NOTE: the best way of currently test the UI with partial overlaps is to comment out this line.
    return html`ACTION: <br />${  
      (() => {switch (true) {
        // TODO: determine UX for the case where we have a partial/complete overlap INCLUDING more than just name.. should we be forcing a name change in order to create inbound dimension?
        // Only the name overlaps:
        case duplicateOf.overlap.fields.includes(PartialOverlapField.Name) && duplicateOf.overlap.fields.length == 1:
          return html`
            <button @click=${() => {
              // TODO: We are using dimension name for equality checks in some places, we will need to add an orginalDimensionName field here if we are changing it, and run equality checks using that (if it exists) or else name
              this._changeDimensionNameDialogs[idx].showDialog()
            }}>${(this._changeDimensionNameDialogs)[idx]?.dataset?.hasUpdated ? "Updated" : "Rename"}
            </button><br />
        `
        // Only the range overlaps:
        case duplicateOf.overlap.type !== Overlap.CompleteOutput && duplicateOf.overlap.fields.includes(PartialOverlapField.Range):
          return html`<select @change=${(e) => {
            this.dispatchEvent(new CustomEvent((e.target.value == "inbound" ? "config-dimension-selected" : "config-dimension-deselected"),
              { detail: { dimension: inboundDimension }, bubbles: true, composed: true }
            ))

            inboundDimension.duplicateOf.forEach(dup => dup.useExisting = !(e.target.value == "inbound"));
            this.otherConfigDimensionList?.requestUpdate();
          }}>
            <option value="existing">Choose Existing</option>
            <option value="inbound">Choose Inbound</option>
          </select><br /><br />`
        // Only input dimension overlaps:
        case duplicateOf.overlap.fields.includes(PartialOverlapField.InputDimension) && duplicateOf.overlap.fields.length == 1:
          const inboundDimensionLinkedMethods = this.configMethods.filter(method => matchesConfigMethodOutputDimension(inboundDimension, method)); 
          const inboundDimensionLinkedInputDimension = inboundDimensionLinkedMethods[0].input_dimensions[0];
          const existingOverlappingInputDimension = this.otherConfigDimensionList?.inboundDimensionDuplicates?.find(dim => dim == inboundDimensionLinkedInputDimension);
          const usingExistingOverlappingInputDimension = existingOverlappingInputDimension && existingOverlappingInputDimension.useExisting;

          return html`Use existing input dimension with overlapping range:
            <input type="checkbox" checked=${usingExistingOverlappingInputDimension} @change=${(e) => {
              const useInboundDimension = !e.target.checked;
              this.dispatchEvent(new CustomEvent((useInboundDimension ? "config-dimension-selected" : "config-dimension-deselected"),
                { detail: { dimension: inboundDimensionLinkedInputDimension }, bubbles: true, composed: true }
              ))
              // NOTE: This will not currently dynamically update this.otherConfigDimensionList (input dimension list) action inputs' conflicting states (this will be a UX issue)
              this.otherConfigDimensionList?.requestUpdate();
            }} /><br /><br />
          `
      }})()
    }`
  }

  private renderOverlappingDimension(inboundDimension, idx) : TemplateResult {
    const self = this;
    return html`<h3>${inboundDimension.name}</h3>
        <nh-dialog
          size="medium"
          .title=${"Change Dimension Name"}
          .dialogType=${"confirm"}
          .handleOk=${function(){
            if(this.dataset.hasUpdated) {
              this.dispatchEvent(new CustomEvent(("config-dimension-deselected"),
                { detail: { dimension: inboundDimension }, bubbles: true, composed: true }
              ))
            }
            const dialogInput = (this.renderRoot.querySelector("slot").assignedElements()[0].querySelector("input")); // Targets inner-content slot (the only slot) and finds only input
            if(dialogInput?.value && dialogInput.value !== "") {
              inboundDimension.originalName = inboundDimension.name; // Useful to keep this for name equality checks in method creation
              inboundDimension.name = dialogInput.value;
              inboundDimension.duplicateOf.forEach(dup => dup.useExisting = false);

              this.dispatchEvent(new CustomEvent(("config-dimension-selected"),
                { detail: { dimension: {...inboundDimension, name: dialogInput.value} }, bubbles: true, composed: true }
              ))
              this.otherConfigDimensionList?.requestUpdate();
              dialogInput.value = "";
            }
            this.dataset.hasUpdated = true;
            self.requestUpdate()
          }}
          class="change-dimension-name-dialog"
        >
          <div slot="inner-content" class="container">
            <input type="text" placeholder="Change the name of the inbound dimension:" />
          </div>
        </nh-dialog>
        ${html`${
          inboundDimension.duplicateOf.map((duplicateOf) => 
            html`<span>DIMENSION:  ${this.existingDimensions.find(dim => compareUint8Arrays(dim.dimension_eh, duplicateOf.dimension_eh))?.name}</span><br />
                <span>OVERLAP: ${JSON.stringify(duplicateOf.overlap, null, 2)}</span><br />
                ${this.renderOverlappingDimensionFieldAction(duplicateOf, idx, inboundDimension)}
            `)}
          ${inboundDimension.duplicateOf.some(duplicateOf => duplicateOf.overlap.type.match("complete"))
            ? html`ACTION: Do not create inbound dimension.<br /><br />` 
            : null
          }
        `}
      `
  }

  private renderOverlaps() : TemplateResult {
    return html`
      ${
        this.inboundDimensionDuplicates.length > 0 && this.inboundDimensionDuplicates.every((inboundDimension: any) => inboundDimension.duplicateOf.some(duplicateOf => duplicateOf.overlap.type.match("complete")))
          ? html`<h2>INBOUND ${this.dimensionType.toUpperCase()} COMPLETE OVERLAP: Your applet config completely overlaps some existing configuration and those dimensions won't be created.</h2>`
          : html`<h2>No complete overlaps - select/edit config dimensions:</h2>
            ${this.configDimensions
              .filter(dimension => !(this.inboundDimensionDuplicates.some(dup => dup.name == dimension.name)))
              .map(dimension => html`
                ${dimension.name} : <input type="checkbox" @change=${(e) => {
                  this.dispatchEvent(new CustomEvent((e.target.checked ? "config-dimension-selected" : "config-dimension-deselected"),
                    { detail: { dimension }, bubbles: true, composed: true }
              ))
              this.otherConfigDimensionList?.requestUpdate();
            }} /><br />
            `)}
          `
      }
      ${html`${repeat(this.inboundDimensionDuplicates, (_el, idx) => idx, ((inboundDimension, idx) => html`${this.renderOverlappingDimension.call(this, inboundDimension, idx)}`))}`}`
  }

  render() : TemplateResult {
    return html`
      <div class="content">
        ${this.renderOverlaps()}
      </div>
    `;
  }

  // Helpers for filtering/matching dimensions with methods
  private findRangeForDimension(dimension: DimensionEntry): Range | null {
    if(!this.existingRanges || this.existingRanges?.length === 0) return null;
    return this.existingRanges.find(range => compareUint8Arrays(range.range_eh, dimension.range_eh)) as RangeEntry || null
  }

  private categorizeDimensionsByInboundClashType(configDimension: PossibleDuplicateInboundDimension, existingDimensions: Array<DimensionEntry>): void {
    existingDimensions.forEach(existingDimension => {
      // Filter out clashes between subjective and objective dimensions
      if((this.dimensionType == 'input' && existingDimension.computed) || (this.dimensionType == 'output' && !existingDimension.computed)) return;

      this.setOverlapDetails(existingDimension, configDimension)
    })
  }

  private getOverlapType(newDimension: InboundDimension, overlapFields: PartialOverlapField[]) : Overlap {
    if(newDimension.computed) { // Check output dimension partial overlaps
      if(overlapFields.includes(PartialOverlapField.Name) && overlapFields.includes(PartialOverlapField.Operation) && overlapFields.includes(PartialOverlapField.Range) && overlapFields.includes(PartialOverlapField.InputDimension)) {
        return Overlap.CompleteOutput
      }
    } else if(overlapFields.includes(PartialOverlapField.Name) && overlapFields.includes(PartialOverlapField.Range) && overlapFields.length == 2) {
       // Check input dimension partial overlaps
      return Overlap.CompleteInput
    }
    return Overlap.Partial
  }

  private setOverlapDetails(existingDimension: DimensionEntry, newDimension: InboundDimension) {
    const overlap = {fields: [] as PartialOverlapField[]} as any;

    if(this.matchesName(newDimension, existingDimension)) {
      overlap.fields.push(PartialOverlapField.Name)
    }
    if(this.matchesRange(newDimension, existingDimension)) {
      overlap.fields.push(PartialOverlapField.Range)
    }

    if(newDimension.computed && this.existingMethods) {
      const existingDimensionLinkedMethods = this.existingMethods.filter(method => this.matchesMethodEntryOutputDimension(existingDimension, method));
      const configDimensionLinkedMethods = this.configMethods.filter(method => matchesConfigMethodOutputDimension(newDimension, method));

      if(this.matchesOperation(existingDimensionLinkedMethods, configDimensionLinkedMethods)) {
        overlap.fields.push(PartialOverlapField.Operation)
      }
      if(this.matchesInputDimension(existingDimensionLinkedMethods, configDimensionLinkedMethods)) {
        overlap.fields.push(PartialOverlapField.InputDimension)
      }
    }
    
    overlap.type = this.getOverlapType(newDimension, overlap.fields)
    existingDimension.overlap = overlap
  }

  // Helpers for determining dimension overlap:
  private matchesName(configDimension: PossibleDuplicateInboundDimension, existingDimension: DimensionEntry): boolean {
    return existingDimension.name == configDimension.name
  }
  private matchesRange(configDimension: PossibleDuplicateInboundDimension, existingDimension: DimensionEntry): boolean {
    const foundRange = this.findRangeForDimension(existingDimension);

    return foundRange?.name == configDimension.range.name || rangeKindEqual(configDimension.range.kind, foundRange!.kind)
  }
  private matchesOperation(existingDimensionMethods: MethodEntry[], configDimensionMethods: ConfigMethod[]): boolean {
    return configDimensionMethods.length > 0 && existingDimensionMethods.length > 0 && configDimensionMethods[0].program && existingDimensionMethods[0].program && Object.keys(configDimensionMethods[0].program)[0] === Object.keys(existingDimensionMethods[0].program)[0]
  }
  private matchesInputDimension(existingDimensionMethods: MethodEntry[], configDimensionMethods: ConfigMethod[]): boolean {
    const bothMethodsHaveInputDimensions = configDimensionMethods.length > 0 && existingDimensionMethods.length > 0 && existingDimensionMethods[0].input_dimension_ehs?.[0] && configDimensionMethods[0].input_dimensions?.[0];
    if(!bothMethodsHaveInputDimensions) return false;

    const inputDimensionEntryForMethodEntry = this.existingDimensions.find(dimension => compareUint8Arrays(dimension.dimension_eh, existingDimensionMethods[0].input_dimension_ehs[0] ))
    if(!inputDimensionEntryForMethodEntry) return false;

    const inputDimensionRangeEntryForMethodEntry = this.findRangeForDimension(inputDimensionEntryForMethodEntry);

    return !!inputDimensionRangeEntryForMethodEntry // Just using range equality but uncomment the following lines for name/range-name equality
      // && configDimensionMethods[0].input_dimensions[0].name == inputDimensionEntryForMethodEntry.name 
      // && configDimensionMethods[0].input_dimensions[0].range.name == inputDimensionRangeEntryForMethodEntry.name 
      && rangeKindEqual(configDimensionMethods[0].input_dimensions[0].range.kind, inputDimensionRangeEntryForMethodEntry.kind)
  }

  private matchesMethodEntryOutputDimension(dimension: DimensionEntry, method: MethodEntry) {
    const methodOutputDimension = this.existingDimensions.find(dimensionEntry => compareUint8Arrays(dimensionEntry.dimension_eh, method.output_dimension_eh));
    if(!methodOutputDimension) return false;

    const methodOutputDimensionRange = this.findRangeForDimension(methodOutputDimension);
    const existingDimensionRange = this.findRangeForDimension(dimension);
    if(!methodOutputDimensionRange || !existingDimensionRange) return false;

    return methodOutputDimension.name == dimension.name 
      && methodOutputDimensionRange.name == existingDimensionRange.name 
      && rangeKindEqual(methodOutputDimensionRange.kind, existingDimensionRange.kind)
  }
  
  private filterExistingDimensionsByInboundClash(configDimension: PossibleDuplicateInboundDimension): Array<DimensionEntry> {
    if(!configDimension.range?.name || !this.existingDimensions) return [];
    
    return this.existingDimensions.filter((existingDimension) => {
      if(this.matchesName(configDimension, existingDimension)) return true;
      if(this.matchesRange(configDimension, existingDimension)) return true;
      if(!existingDimension.computed) return false;

      // Find linked methods for output dimension comparison
      const existingDimensionLinkedMethods = this.existingMethods.filter(method => this.matchesMethodEntryOutputDimension(existingDimension, method));
      const configDimensionLinkedMethods = this.configMethods.filter(method => matchesConfigMethodOutputDimension(configDimension, method));
      if(this.matchesOperation(existingDimensionLinkedMethods, configDimensionLinkedMethods)) return true;
      if(this.matchesInputDimension(existingDimensionLinkedMethods, configDimensionLinkedMethods)) return true;
      return false;
    })
  } 

  static elementDefinitions = {
    "nh-button": NHButton,
    "nh-card": NHCard,
    "nh-dialog": NHDialog,
  }

  static styles: CSSResult[] = [
    super.styles as CSSResult,
    css`
      :host {
        color: var(--nh-theme-fg-muted);
        display: flex;
        flex: 1;
        justify-content: center;
        align-items: center;

      .content{
        width: 100%;
      }
    `
  ]
}