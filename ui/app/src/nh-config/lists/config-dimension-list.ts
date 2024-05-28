import { html, css, PropertyValueMap, CSSResult, TemplateResult } from "lit";
import { property, query, queryAll, state } from "lit/decorators.js";

import { ConfigDimension, ConfigMethod,  Dimension, RangeKind, Range, Method } from "@neighbourhoods/client";

import { NHButton, NHCard, NHCheckbox, NHComponent, NHDialog, NHTooltip } from "@neighbourhoods/design-system-components";
import { capitalize } from "../../elements/components/helpers/functions";
import { FieldDefinition, FieldDefinitions, Table, TableStore } from "@adaburrows/table-web-component";
import { dimensionIncludesControlRange, rangeKindEqual } from "../../utils";
import { EntryHash, encodeHashToBase64 } from "@holochain/client";
import { compareUint8Arrays } from "@neighbourhoods/app-loader";
import { repeat } from "lit/directives/repeat.js";

type InputDimensionTableRecord = {
  ['dimension-name']: string,
  ['range-type']: string,
  ['range-min']: number,
  ['range-max']: number,
  ['selected']: boolean, // Is this row selected, due to be created?
  ['duplicated']: boolean, // Is this an existing dimension with a duplicate inbound dimension?
}

type OutputDimensionTableRecord = InputDimensionTableRecord & {
  ['input-dimension-name']: string,
  ['method-operation'] : string,
}

type DimensionTableRecord = InputDimensionTableRecord & OutputDimensionTableRecord;

type DimensionEntry = Dimension & { dimension_eh: EntryHash, overlap?: { type: Overlap, fields?: PartialOverlapField[] } };
type RangeEntry = Range & { range_eh: EntryHash };
type MethodEntry = Method & { method_eh: EntryHash };

type InboundDimension = ConfigDimension & {selected?: boolean };
type PossibleDuplicateInboundDimension = InboundDimension & {isDuplicate?: boolean, duplicateOf?: Array<DimensionEntry>};
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

class ExtendedTable extends Table { // Allows custom elements to be rendered within table-web-component
  static elementDefinitions = {
    "nh-checkbox": NHCheckbox,
    "nh-tooltip": NHTooltip,
    "nh-button": NHButton,
  }
}

// Helpers for reaching into table DOM and adding/removing selected state
function showRowSelected(row: HTMLElement, isDuplicated: boolean) {
  row.classList.add(isDuplicated ? "duplicated" : "duplicate")
  
    // TODO: The above does not work, figure out how to add this to wc-table without so much hackery
    // row.style.outline = "2px solid rgb(93, 195, 137)";
    // row.style.borderRadius = isClash ? "16px" : "8px";
    // row.style.position = isClash ? "relative" : "initial";
    // row.style.top = isClash ? "-.25rem" : "initial";
    // row.style.left = isClash ? ".5rem" : "initial";
    // const selectCell = (row.querySelector('.select') as HTMLElement);
    // const nameCell = (row.querySelector('.dimension-name') as HTMLElement);
    // selectCell!.style.backgroundColor = "rgb(93, 195, 137)";
    // if(isClash) { // Style differently so that association with 
    //   row!.style.outlineOffset = "-8px";
    //   nameCell.style.width = "8rem";
    //   row.querySelectorAll("td").forEach(cell => {
    //     cell.style.backgroundColor = "transparent";
    //     cell.style.paddingRight = "24px";
    //   })
    // }
}

function showRowSelectedWarning(row: HTMLElement) {
  row.classList.add("warning-outline")
  // row.style.outline = "2px solid #ffcf74";
  // row.style.borderRadius = "8px";
  // (row.querySelector('.selected') as HTMLElement)!.style.backgroundColor = "#ffcf74";
}
function showRowNotSelected(row: HTMLElement) {

  row.classList.add("no-outline");
  // row.style.outline = "";
  // row.style.borderRadius = "";
  // (row.querySelector('.selected') as HTMLElement)!.style.backgroundColor = "transparent";
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
  
  @state() tableStore!: TableStore<DimensionTableRecord>;

  @query('wc-table') _table!: Table;

  @property() configDimensions!: Array<PossibleDuplicateInboundDimension>;

  @property() inboundDimensionDuplicates: Array<PossibleDuplicateInboundDimension | DuplicateInboundDimension> = [];

  @property() existingDimensions!: Array<DimensionEntry>;
  @property() existingRanges!: Array<RangeEntry>;
  @property() existingMethods!: Array<MethodEntry>;

  @property() configMethods!: Array<ConfigMethod>;

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
return //temp
        const newTableRecords = [] as any;
        this.configDimensions.forEach((inboundDimension: PossibleDuplicateInboundDimension)=> {
          newTableRecords.push(inboundDimension as PossibleDuplicateInboundDimension); // First add the inbound dimension
          if(!inboundDimension?.duplicateOf) return;
          // The remainder will be of type DuplicateInboundDimension

          const range = inboundDimension.range;
          // Iterate through the duplicated and add them as rows beneath,
          // and add a property 'duplicated' to indicate they already exist
          for(let duplicated of inboundDimension.duplicateOf) {
            newTableRecords.push({...(duplicated as DimensionEntry), range, duplicated: true, selected: true } as Partial<DimensionTableRecord>)
          }
        })
        
        // Update the table records so we have the duplicated underneath the inbound duplicates
        this.tableStore.records = (newTableRecords.length > 0 ? newTableRecords : this.configDimensions)
          .map((r) => this.toTableRecord(r));

        this.requestUpdate('inboundDimensionDuplicates')
      } catch (error) {
        console.log('Error mapping dimensions and ranges to table values: ', error)
      }
    }
    // Logic for dom manipulation of rows based on selected and incoming/outgoing state as determined above
    if(changedProperties.has('inboundDimensionDuplicates') 
        && this.inboundDimensionDuplicates.length > 0 
        && (this.configDimensions
              .some((inboundDimension: PossibleDuplicateInboundDimension) => inboundDimension?.isDuplicate))
      ) {  
      const table = this._table?.renderRoot?.children?.[1];
      if(typeof table == 'undefined') return
      const rows = [...table.querySelectorAll('tr')].slice(1); // Omit the header row
      rows.forEach((row, idx) => {
        if(this.tableStore.records[idx]['duplicated']) {
          row.dataset.duplicated = "true" 
        }

        this.tableStore.records[idx]['selected']
          ? showRowSelected(row, !!row.dataset.duplicated)
          : showRowSelectedWarning(row)    
      })
    }
  }

  private handleRowSelection(e: CustomEvent) {
    try {
      if(!this.configDimensions) throw new Error('Do not have config dimensions loaded');

      const { row, allRows, inboundRows } = this.getRowRefs(e.target as HTMLElement);
  
      const selectedRowIndex = allRows.findIndex(r => r == row);
      const configDimensionsRowIndex = inboundRows.findIndex(r => r == row); // Get this specific row's index as it would be in this.configDimensions

      const dimensionToSelect = this.configDimensions[configDimensionsRowIndex] as PossibleDuplicateInboundDimension;
      if (!dimensionToSelect) throw new Error('Could not find selected config dimension');

      // Update local state of selected config dimensions
      const currentRowState: boolean = !!(dimensionToSelect.selected);
      dimensionToSelect.selected = !currentRowState as boolean;

      if(dimensionToSelect?.isDuplicate) {
        // Deselect each original dimension entry row for which this config row is a duplicate
        dimensionToSelect.duplicateOf?.forEach((dup, idx) => {
          const rowToDeselect = allRows[selectedRowIndex + (idx + 1)];
          this.uncheckRow(rowToDeselect)
          dup.useExisting = false;
        })
        // Event will be handled by adding this to a list of dimensions to create in the parent component's state
        this.dispatchEvent(new CustomEvent("config-dimension-selected", { detail: { dimension: dimensionToSelect }, bubbles: true, composed: true }));
      }

      const rowIsChecked: boolean = !!((e.target as NHCheckbox).value);
      if(rowIsChecked) {
        showRowSelected(row, !!dimensionToSelect.isDuplicate)
      } else showRowNotSelected(row)

    } catch (error) {
      console.error('Could not perform row selection logic: ', error)
    } 
  }

  async connectedCallback() {
    super.connectedCallback();
    
    const fieldDefs = this.getFieldDefs(); 

    this.tableStore = new TableStore<DimensionTableRecord>({
      tableId: 'dimensions-' + this.dimensionType,
      fieldDefs,
      showHeader: true,
      records: []
    });
  }

  // Map to field values and update selected state of in memory config dimensions
  private toTableRecord = (dimension: PossibleDuplicateInboundDimension & {duplicated?: boolean}) => {
    dimension.selected = !!(typeof dimension?.duplicateOf == 'undefined'); // By default select all dimensions which are not duplicates of existing dimension entries

    const range = dimension.range
    const linkedMethods = this.dimensionType == 'input'
      ? this.configMethods.filter(method => matchesMethodInputDimension(dimension, method))
      : this.configMethods.filter(method => matchesConfigMethodOutputDimension(dimension, method))

    const method = linkedMethods[0];
    const inputDimension: InboundDimension | '' = (this.dimensionType == 'output' && method.input_dimensions[0]) || ''
    const [[rangeType, rangeValues]] = Object.entries(range?.kind as RangeKind);
    return {
      ['dimension-name']: capitalize(dimension.name),
      ['range-type']: rangeType,
      ['range-min']: rangeValues?.min,
      ['range-max']: rangeValues?.max,
      // For output dimensions
      ['input-dimension-name']: (inputDimension as InboundDimension)?.name || inputDimension,
      ['method-operation']: typeof method?.program == 'object' ? Object.keys(method.program)[0] : '',
      ['selected']: dimension.selected,
      ['duplicated']: dimension.duplicated,
    }
  }

  private getFieldDefs() : FieldDefinitions<DimensionTableRecord> {
    return this.dimensionType == "input"
      ? {
        'dimension-name': new FieldDefinition<DimensionTableRecord>({heading: 'Name'}),
        'range-type': new FieldDefinition<DimensionTableRecord>({heading: 'Type'}),
        'range-min': new FieldDefinition<DimensionTableRecord>({heading: 'Min'}),
        'range-max': new FieldDefinition<DimensionTableRecord>({heading: 'Max'}),
        'selected': new FieldDefinition<DimensionTableRecord>({heading: 'Select',
          decorator: (value) => html`<nh-checkbox class="checkbox-only" @change=${(e) => this.handleRowSelection(e)} .label=${""} .value=${!!value}></nh-checkbox>`}),
        
        'duplicated': new FieldDefinition<DimensionTableRecord>({heading: '', decorator: this.clashInfoDecorator })
      }
      : {
        'dimension-name': new FieldDefinition<DimensionTableRecord>({heading: 'Name'}),
        'input-dimension-name': new FieldDefinition<DimensionTableRecord>({heading: 'Input Dimension'}),
        'range-type': new FieldDefinition<DimensionTableRecord>({heading: 'Type'}),
        'method-operation': new FieldDefinition<DimensionTableRecord>({heading: 'Operation'}),
        'range-min': new FieldDefinition<DimensionTableRecord>({heading: 'Min'}),
        'range-max': new FieldDefinition<DimensionTableRecord>({heading: 'Max'}),
        'selected': new FieldDefinition<DimensionTableRecord>({heading: 'Select',
          decorator: (value) => html`<nh-checkbox class="checkbox-only" @change=${(e) => this.handleRowSelection(e)} .label=${""} .value=${!!value}></nh-checkbox>`}),
        
        'duplicated': new FieldDefinition<DimensionTableRecord>({heading: '', decorator: this.clashInfoDecorator })
      }
  }

  renderOverlappingDimensionFieldAction(duplicateOf, idx, inboundDimension) : TemplateResult {
    if(duplicateOf.overlap.type.match("complete")) return html`` // NOTE: the best way of currently test the UI with partial overlaps is to comment out this line.
    return html`ACTION: <br />${  
      (() => {switch (true) {
        case duplicateOf.overlap.fields.includes(PartialOverlapField.Name):
          return html`
            <button @click=${() => (this._changeDimensionNameDialogs)[idx].showDialog()}>${(this._changeDimensionNameDialogs)[idx]?.dataset?.hasUpdated ? "Updated" : "Rename"}</button><br />
          `
        case duplicateOf.overlap.fields.includes(PartialOverlapField.Operation) || duplicateOf.overlap.fields.includes(PartialOverlapField.Range):
          return html`<select @change=${(e) => {
            this.dispatchEvent(new CustomEvent((e.target.value == "inbound" ? "config-dimension-selected" : "config-dimension-deselected"),
              { detail: { dimension: inboundDimension }, bubbles: true, composed: true }
            ))
          }}>
            <option value="existing">Choose Existing</option>
            <option value="inbound">Choose Inbound</option>
          </select><br /><br />`
        case duplicateOf.overlap.fields.includes(PartialOverlapField.InputDimension):
          return html`Select input dimension with overlapping range: <br />
            <select @change=${(e) => {
              debugger;
              this.dispatchEvent(new CustomEvent((e.target.value == "inbound" ? "config-dimension-selected" : "config-dimension-deselected"),
                { 
                  detail: { dimension: inboundDimension }, bubbles: true, composed: true
                }
              ))
            }}>
            ${
              html`${
                this.existingDimensions
                  .filter(dim => {
                    if(dim.computed) return false;
                    const range: Range | null = this.findRangeForDimension(dim);
                    if(!range) return false;

                    return dimensionIncludesControlRange(range.kind, inboundDimension.range.kind)
                  })
                  .map(dim => html`<option value=${dim.name}>${dim.name}</option>`)
              }`
            }
            </select><br /><br />
          `
      }})()
    }`
  }

  renderOverlappingDimension(inboundDimension, idx) : TemplateResult {
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
              inboundDimension.name = dialogInput.value;
              this.dispatchEvent(new CustomEvent(("config-dimension-selected"),
                { 
                  detail: { dimension: {...inboundDimension, name: dialogInput.value} }, bubbles: true, composed: true
                }
              ))
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

  renderOverlaps() : TemplateResult {
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
    //   <div class="title-bar">
    //     <h1>${capitalize(this.dimensionType)} Dimensions</h1>
    //     <slot class="action" name="action-button"></slot>
    //   </div>  
    //   ${this.tableStore.records && this.tableStore.records.length > 0
    //     ? html`<wc-table .tableStore=${this.tableStore}></wc-table>`
    //     : 'No dimensions present'
    //   }
  }

  private uncheckRow(row: HTMLElement) {
    if(!row) return;
    row.classList.add("no-outline");
    row.classList.remove("success-outline");
    row.classList.remove("warning-outline");

    const cb = row.querySelector("td.selected nh-checkbox") as NHCheckbox
    if(!cb) return;
    cb.value = false;
    cb.disabled = true;
  }

  private getRowRefs(target: HTMLElement) {
    const row = target.closest("tr") as HTMLElement;
    const allRows = [...(target.closest("table") as HTMLElement).querySelectorAll("tr")]
      .slice(1) // Excluding the header rows;

    const inboundRows = allRows
      .filter(row => row.dataset.duplicated !== "true") // Which are not existing dimension entries

    return { row, allRows, inboundRows }
  }

  private clashInfoDecorator(duplicated: boolean) : TemplateResult {
    return !duplicated ? html`` : html`
      <nh-tooltip
        class="tooltip-info left super-extend"
        .variant=${"warning"}
        .text=${"One of your applet's dimensions duplicates this existing dimension! If you wish to create it anyway, check its box above and will be created."}
      >
      <svg slot="hoverable" style="cursor:pointer; margin-top: 12px;" width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path fill-rule="evenodd" clip-rule="evenodd" d="M2 12C2 6.47715 6.47715 2 12 2C17.5229 2 22 6.47715 22 12C22 17.5229 17.5229 22 12 22C6.47715 22 2 17.5229 2 12ZM4 12C4 16.4183 7.58172 20 12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12ZM12.7071 15.2929C13.0976 15.6834 13.0976 16.3166 12.7071 16.7071C12.3166 17.0976 11.6834 17.0976 11.2929 16.7071C10.9024 16.3166 10.9024 15.6834 11.2929 15.2929C11.6834 14.9024 12.3166 14.9024 12.7071 15.2929ZM11 8C11 7.44771 11.4477 7 12 7C12.5523 7 13 7.44772 13 8V13C13 13.5523 12.5523 14 12 14C11.4477 14 11 13.5523 11 13V8Z" fill="currentColor"/>
      </svg>
    </nh-tooltip>`
  }

  // Helpers for filtering/matching dimensions with methods
  private findRangeForDimension(dimension: DimensionEntry): Range | null {
    if(!this.existingRanges || this.existingRanges?.length === 0) return null;
    return this.existingRanges.find(range => compareUint8Arrays(range.range_eh, dimension.range_eh)) as RangeEntry || null
  }

  private existingDimensionRangeMatchesConfigDimensionRange(existingDimension: DimensionEntry, newDimension: InboundDimension) {
    const foundRange = this.findRangeForDimension(existingDimension);
    // TODO: determine if this kind of range comparison is sufficient.
    return foundRange?.name == newDimension.range.name
      && rangeKindEqual(newDimension.range.kind, foundRange!.kind)
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
      if(overlapFields.includes(PartialOverlapField.Name) && overlapFields.includes(PartialOverlapField.Operation) && overlapFields.includes(PartialOverlapField.Range) && overlapFields.includes(PartialOverlapField.Operation)) {
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
      // console.log('existingMethods :>> ', this.existingMethods);
      // console.log('existingDimensionLinkedMethods :>> ', existingDimensionLinkedMethods);
      // console.log('configDimensionLinkedMethods :>> ', configDimensionLinkedMethods);
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
    return this.existingDimensionRangeMatchesConfigDimensionRange(existingDimension, configDimension)
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
    'wc-table': ExtendedTable,
    "nh-dialog": NHDialog,
  }

  static styles: CSSResult[] = [
    super.styles as CSSResult,
    css`
      .title-bar {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        line-height: 1rem;
        height: 1rem;
        padding-left: .5rem;
      }

      h1 {
        display: flex;
        font-size: calc(1px * var(--nh-font-size-2xl));
        margin-right: calc(1px * var(--nh-spacing-xl));
      }

      .action {
        display: flex;
        flex: 1;
      }

      /* Select/deselected row styles */

      .duplicated, .duplicate {
        outline: 2px solid rgb(93, 195, 137);
      }

      .duplicated {
        outline-offset: 16px;
        border-radius: 16px;
        position: relative;
        left: .5rem;
        top: -0.25rem
      }
      
      .duplicate {
        border-radius: 8px;
      }

      .warning-outline {
        outline-color: #ffcf74;
        border-radius: 8px;
      }

      .warning-outline td.selected {
        background-color: #ffcf74;
      }

      .duplicated td.dimension-name {
        width: 8rem;
      }
      .duplicated td {
        background-color: transparent;
        padding-right: 24px;
      }
      .duplicated td.selected {
        background-color: rgb(93, 195, 137);
      }

      .no-outline {
        outline: none;
      }
      .no-outline td.selected {
        background-color: transparent;
      }

      :host {
        color: var(--nh-theme-fg-muted);
        display: flex;
        flex: 1;
        justify-content: center;
        align-items: center;

        /** Global Table **/
        --table-dimensions-input-background-color: var(--nh-theme-bg-surface); 
        --table-dimensions-output-background-color: var(--nh-theme-bg-surface); 
        --table-dimensions-input-row-odd-background-color: var(--nh-theme-bg-element); 
        --table-dimensions-output-row-odd-background-color: var(--nh-theme-bg-element); 
        --table-dimensions-input-row-even-background-color: var(--nh-theme-bg-element); 
        --table-dimensions-output-row-even-background-color: var(--nh-theme-bg-element); 

        --table-dimensions-input-selected-width: 48px;
        --table-dimensions-output-selected-width: 48px;
        --table-dimensions-input-selected-min-width: 48px;
        --table-dimensions-output-selected-min-width: 48px;
        --table-dimensions-input-selected-max-width: 48px;
        --table-dimensions-output-selected-max-width: 48px;
        
        
        --table-dimensions-output-input-dimension-name-min-width: 3rem;
        --table-dimensions-output-input-dimension-name-width: 3rem;
        --table-dimensions-output-input-dimension-name-max-width: 3rem;
        --table-dimensions-output-method-operation-min-width: 3rem;
        --table-dimensions-output-method-operation-width: 3rem;
        --table-dimensions-output-method-operation-max-width: 3rem;
        
        --table-dimensions-input-dimension-name-min-width: 32vw;
        --table-dimensions-input-dimension-name-width: 32vw;
        --table-dimensions-input-dimension-name-max-width: 32vw;
        --table-dimensions-output-dimension-name-min-width: 32vw;
        --table-dimensions-output-dimension-name-width: 32vw;
        --table-dimensions-output-dimension-name-max-width: 32vw;

        --table-dimensions-input-range-type-width: 2.5rem;
        --table-dimensions-output-range-type-width: 2.5rem; 
        --table-dimensions-input-range-type-min-width: 2.5rem;
        --table-dimensions-output-range-type-min-width: 2.5rem;
        --table-dimensions-input-range-type-max-width: 2.5rem;
        --table-dimensions-output-range-type-max-width: 2.5rem;

        --table-dimensions-input-range-min-min-width: 2.5rem;
        --table-dimensions-input-range-min-max-width: 2.5rem;
        --table-dimensions-input-range-min-width: 2.5rem;
        --table-dimensions-output-range-min-min-width: 2.5rem;
        --table-dimensions-output-range-min-max-width: 2.5rem;
        --table-dimensions-output-range-min-width: 2.5rem;

        --table-dimensions-input-range-max-min-width: 2.5rem;
        --table-dimensions-input-range-max-max-width: 2.5rem;
        --table-dimensions-input-range-max-width: 2.5rem;
        --table-dimensions-output-range-max-min-width: 4rem;
        --table-dimensions-output-range-max-max-width: 4rem;
        --table-dimensions-output-range-max-width: 4rem;

        --table-dimensions-input-info-width: 0.5rem;
        --table-dimensions-output-info-width: 0.5rem;
        --table-dimensions-input-info-min-width: 0.5rem;
        --table-dimensions-output-info-min-width: 0.5rem;
        --table-dimensions-input-info-max-width: 0.5rem;
        --table-dimensions-output-info-max-width: 0.5rem;

        --table-dimensions-input-duplicated-width: 0.25rem;
        --table-dimensions-output-duplicated-width: 0.25rem;
        --table-dimensions-input-duplicated-min-width: 0.25rem;
        --table-dimensions-output-duplicated-min-width: 0.25rem;
        --table-dimensions-input-duplicated-max-width: 0.25rem;
        --table-dimensions-output-duplicated-max-width: 0.25rem;

        --table-dimensions-input-cell-height: 58px;
        --table-dimensions-output-cell-height: 58px;

        --table-dimensions-input-element-padding: 4px;
        --table-dimensions-output-element-padding: 4px;
        --table-dimensions-input-border-spacing: calc(1px * var(--nh-spacing-sm));
        --table-dimensions-output-border-spacing: calc(1px * var(--nh-spacing-sm));

        --table-dimensions-input-height: 100%;
        --table-dimensions-output-height: 100%;
        --table-dimensions-input-overflow-x: auto;
        --table-dimensions-output-overflow-x: auto;
        --table-dimensions-input-overflow-y: auto;
        --table-dimensions-output-overflow-y: auto;

        /* Border radius */
        --cell-radius: 5px;
        --table-dimensions-input-header-first-heading-border-radius: var(--cell-radius);
        --table-dimensions-output-header-first-heading-border-radius: var(--cell-radius);
        --table-dimensions-input-header-last-heading-border-radius: var(--cell-radius);
        --table-dimensions-output-header-last-heading-border-radius: var(--cell-radius);
        --table-dimensions-input-header-heading-border-radius: var(--cell-radius);
        --table-dimensions-output-header-heading-border-radius: var(--cell-radius);
        --table-dimensions-input-body-first-cell-border-radius: var(--cell-radius);
        --table-dimensions-output-body-first-cell-border-radius: var(--cell-radius);
        --table-dimensions-input-body-last-cell-border-radius: var(--cell-radius);
        --table-dimensions-output-body-last-cell-border-radius: var(--cell-radius);
        --table-dimensions-input-body-cell-border-radius: var(--cell-radius);
        --table-dimensions-output-body-cell-border-radius: var(--cell-radius);
      }
  
      .content{
        width: 100%;
      }
    `
  ]
}