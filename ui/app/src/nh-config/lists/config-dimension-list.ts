import { html, css, PropertyValueMap, CSSResult, TemplateResult } from "lit";
import { property, query, state } from "lit/decorators.js";

import { ConfigDimension, ConfigMethod, Dimension, RangeKind, Range } from "@neighbourhoods/client";

import { NHButton, NHCard, NHCheckbox, NHComponent, NHTooltip } from "@neighbourhoods/design-system-components";
import { capitalize } from "../../elements/components/helpers/functions";
import { FieldDefinition, FieldDefinitions, Table, TableStore } from "@adaburrows/table-web-component";
import { rangeKindEqual } from "../../utils";
import { EntryHash } from "@holochain/client";
import { compareUint8Arrays } from "@neighbourhoods/app-loader";

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

type DimensionEntry = Dimension & { dimension_eh: EntryHash };
type RangeEntry = Range & { range_eh: EntryHash };

type InboundDimension = ConfigDimension & {selected?: boolean };
type PossibleDuplicateInboundDimension = InboundDimension & {isDuplicate?: boolean, duplicateOf?: Array<DimensionEntry>};
type DuplicateInboundDimension = PossibleDuplicateInboundDimension & { isDuplicate: true, existing_dimension_ehs: EntryHash[]};

enum PartialOverlapField {
  Name,
  Range,
  Operation,
  InputDimension,
}

enum Overlap {
  CompleteInput,
  CompleteOutput,
  Partial,
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
function matchesMethodInputDimension(dimension: InboundDimension, method: ConfigMethod) {
  return method.input_dimensions.some(d => dimension.name == d.name && (dimension.range.name == d.range.name) && rangeKindEqual(dimension.range.kind, d.range.kind))
}
function matchesMethodOutputDimension(dimension: InboundDimension, method: ConfigMethod) {
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

  @property() configMethods!: Array<ConfigMethod>;

  protected updated(changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
    // Logic for detecting inbound config dimensions that  are duplicates of existing dimension entries
    if(changedProperties.has('configDimensions') && !!this.configDimensions && !!this.configMethods) {  
      try {
        if(this.inboundDimensionDuplicates.length == 0 && typeof this.existingDimensions !== 'undefined' && typeof this.existingRanges !== 'undefined' && this.existingDimensions.length > 0 && this.existingRanges.length > 0) {

          // Add duplicates of existing dimensions to an array in local state
          this.inboundDimensionDuplicates = this.configDimensions.filter((inboundDimension: PossibleDuplicateInboundDimension | DuplicateInboundDimension) => {
            // Find the existing dimension entries for the possible duplicate
            const existingDimensionClashes: Array<DimensionEntry> = this.filterExistingDimensionsByInboundClash(inboundDimension);

            this.categorizeDimensionsByInboundClashType(inboundDimension, existingDimensionClashes);

            if(existingDimensionClashes.length > 0) {
              // If they exist, concretize the type of this inboundDimension as DuplicateInboundDimension by adding relevant properties
              inboundDimension.isDuplicate = true;
              inboundDimension.duplicateOf = existingDimensionClashes;
              
              // TODO: add method to find overlapping fields,
              // and assign the correct enum types to the inbound dimension here so that we can give different options to the user
              (inboundDimension as DuplicateInboundDimension).existing_dimension_ehs = [];
              inboundDimension.duplicateOf.forEach(existingDimension => (inboundDimension as DuplicateInboundDimension)!.existing_dimension_ehs.push(existingDimension.dimension_eh));
              return true
            }
            return false
          })
        }

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
        dimensionToSelect.duplicateOf?.forEach((_, idx) => {
          const rowToDeselect = allRows[selectedRowIndex + (idx + 1)];
          this.uncheckRow(rowToDeselect)
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
      : this.configMethods.filter(method => matchesMethodOutputDimension(dimension, method))

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

  render() : TemplateResult {
    return html`
      <div class="content">
        ${JSON.stringify(this.inboundDimensionDuplicates, null, 2)}
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

    return foundRange?.name == newDimension.range.name
      || rangeKindEqual(newDimension.range.kind, foundRange!.kind)
  }

  private categorizeDimensionsByInboundClashType(configDimension: PossibleDuplicateInboundDimension, existingDimensions: Array<DimensionEntry>): void {
    existingDimensions.forEach(existingDimension => {
      const overlapDetails = getOverlapType(existingDimension)
      console.log('existingDimension :>> ',  existingDimension, configDimension,);
    })

    function getOverlapType(existingDimension: DimensionEntry) : { type: Overlap, fields?: PartialOverlapField[] } {
      
      return {
        type: Overlap.CompleteInput,
      }
    }
  } 

  // Helpers for determining dimension overlap:
  private matchesCompletely(configDimension: PossibleDuplicateInboundDimension, existingDimension: DimensionEntry): boolean {
    return existingDimension.name == configDimension.name && this.existingDimensionRangeMatchesConfigDimensionRange(existingDimension, configDimension)
  }
  private justMatchesName(configDimension: PossibleDuplicateInboundDimension, existingDimension: DimensionEntry): boolean {
    return existingDimension.name == configDimension.name && !this.existingDimensionRangeMatchesConfigDimensionRange(existingDimension, configDimension)
  }
  private justMatchesRange(configDimension: PossibleDuplicateInboundDimension, existingDimension: DimensionEntry): boolean {
    return this.existingDimensionRangeMatchesConfigDimensionRange(existingDimension, configDimension) && !(existingDimension.name == configDimension.name)
  }

  private filterExistingDimensionsByInboundClash(configDimension: PossibleDuplicateInboundDimension): Array<DimensionEntry> {
    if(!configDimension.range?.name || !this.existingDimensions) return [];
    return this.existingDimensions.filter((existingDimension) => {
      return this.justMatchesName(configDimension, existingDimension) || this.justMatchesRange(configDimension, existingDimension) || this.matchesCompletely(configDimension, existingDimension)
    })
  } 

  static elementDefinitions = {
    "nh-button": NHButton,
    "nh-card": NHCard,
    'wc-table': ExtendedTable,
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