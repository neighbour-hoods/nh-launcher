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
}

type OutputDimensionTableRecord = InputDimensionTableRecord & {
  // ['input-dimension-name'] : string,
  ['method-operation'] : string,
}

type DimensionTableRecord = InputDimensionTableRecord | OutputDimensionTableRecord;

class ExtendedTable extends Table { // Allows nh-checkbox to be rendered
  static elementDefinitions = {
    "nh-checkbox": NHCheckbox,
    "nh-tooltip": NHTooltip,
    "nh-button": NHButton,
  }
}

type SelectableDimension = ConfigDimension & {selected?: boolean, clashes?: Array<Dimension & { dimension_eh: EntryHash }>};

// Helpers for reaching into table DOM and adding/removing selected state
function showRowSelected(row: HTMLElement, isClash: boolean = false) {

  // TODO: separate out into classes and toggle them instead of adding to style object
  row.style.outline = "2px solid #5DC389";
  row.style.borderRadius = isClash ? "16px" : "8px";
  row.style.position = isClash ? "relative" : "initial";
  row.style.top = isClash ? "-.25rem" : "initial";
  row.style.left = isClash ? ".5rem" : "initial";
  const selectCell = (row.querySelector('.select') as HTMLElement);
  const nameCell = (row.querySelector('.dimension-name') as HTMLElement);
  selectCell!.style.backgroundColor = "#5DC389";
  if(isClash) { // Style differently so that association with 
    row!.style.outlineOffset = "-8px";
    nameCell.style.width = "8rem";
    row.querySelectorAll("td").forEach(cell => {
      cell.style.backgroundColor = "transparent";
      cell.style.paddingRight = "24px";
    })
  }

}
function showRowSelectedWarning(row: HTMLElement) {
  row.style.outline = "2px solid #ffcf74";
  row.style.borderRadius = "8px";
  (row.querySelector('.select') as HTMLElement)!.style.backgroundColor = "#ffcf74";
}
function showRowNotSelected(row: HTMLElement) {
  row.style.outline = "";
  row.style.borderRadius = "";
  (row.querySelector('.select') as HTMLElement)!.style.backgroundColor = "transparent";
}
function rowDimensionName(row: HTMLElement) {
  return (row.querySelector('td.dimension-name') as HTMLElement)?.textContent || ""
}

// Helpers for filtering/matching dimensions with methods
function matchesMethodInputDimension(dimension: SelectableDimension, method: ConfigMethod) {
  return method.input_dimensions.some(d => dimension.name == d.name && (dimension.range.name == d.range.name) && rangeKindEqual(dimension.range.kind, d.range.kind))
}
function matchesMethodOutputDimension(dimension: SelectableDimension, method: ConfigMethod) {
  return method.output_dimension.name == dimension.name 
  && method.output_dimension.range.name == dimension.range.name 
  && rangeKindEqual(method.output_dimension.range.kind, dimension.range.kind)
}

export default class ConfigDimensionList extends NHComponent {
  @property() dimensionType: "input" | "output" = "input";
  
  @state() tableStore!: TableStore<DimensionTableRecord>;

  @query('wc-table') _table!: Table;

  @property() configDimensions!: Array<SelectableDimension & {dimension_eh?: EntryHash, clash?: boolean}>;

  @property() configDimensionClashes: Array<SelectableDimension & {dimension_eh?: EntryHash}> = [];

  @property() existingDimensions!: Array<Dimension & { dimension_eh: EntryHash }>;
  @property() existingRanges!: Array<Range & { range_eh: EntryHash }>;

  @property() configMethods!: Array<ConfigMethod>;

  // Map to field values and update selected state of in memory config dimensions
  toTableRecord = (dimension: SelectableDimension & {clash?: boolean}) => {
    dimension.selected = typeof dimension?.clashes == 'undefined' ? false : true; // By default select all dimensions for creation

    const range = dimension.range
    const linkedMethods = this.dimensionType == 'input'
      ? this.configMethods.filter(method => matchesMethodInputDimension(dimension, method))
      : this.configMethods.filter((method) => matchesMethodOutputDimension(dimension, method))

    const method = linkedMethods[0];
    const inputDimension: SelectableDimension | false = this.dimensionType == 'output' && method.input_dimensions[0]
    const [[rangeType, rangeValues]] = Object.entries(range?.kind as RangeKind);
    return {
      ['dimension-name']: capitalize(dimension.name),
      ['range-type']: rangeType,
      ['range-min']: rangeValues?.min,
      ['range-max']: rangeValues?.max,
      // For output dimensions
      ['input-dimension-name']: (inputDimension as SelectableDimension)?.name || '',
      ['method-operation']: typeof method?.program == 'object' ? Object.keys(method.program)[0] : '',
      ['select']: !!dimension.selected,
      ['clash']: !dimension.clash,
    }
  }

  protected updated(changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
    // Logic for detecting clashes between incoming config dimensions and existing config dimensions, 
    // then updating table records with rows for existing dimensions underneath each clashing config dimensions
    if(changedProperties.has('configDimensions') && !!this.configDimensions && !!this.configMethods) {  
      try {
        const newTableRecords = [] as any;

        if(this.configDimensionClashes.length == 0 && typeof this.existingDimensions !== 'undefined' && typeof this.existingRanges !== 'undefined' && this.existingDimensions.length > 0 && this.existingRanges.length > 0) {
          // Add config dimensions that have clashes with existing dimensions to an array in local state
          this.configDimensionClashes = this.configDimensions.filter((configDimension) => {
            // Find the existing dimension entries for those clashing config dimensions
            const existingDimensionClashes : Array<Dimension & { dimension_eh: EntryHash }> = this.filterExistingDimensionsByInboundClash(configDimension);

            // If there exists a filtered list, add that as a property on the config dimension so we can add it below in the table 
            if(existingDimensionClashes.length > 0) {
              configDimension.clashes = existingDimensionClashes
              // As a side effect, add the dimension entry hash to the config dimension, so that we can pair them with the existing entry
              configDimension.clashes.forEach(existingDimensionClash => configDimension.dimension_eh = existingDimensionClash.dimension_eh);
              return true
            }
            return false
          })
          // Now add the properties need to make the clashes their own table records.

        }
        this.configDimensions.forEach((configDimension)=> {
          newTableRecords.push(configDimension as any); // First add the incoming config dimension
          // Iterate through the clashes and add them so they appear underneath, and have a property 'clash' to indicate they already exist
          const range = configDimension.range;
          for(let clashingDimension of configDimension.clashes as Array<Dimension & { dimension_eh: EntryHash,  clashes?: Array<Dimension & { dimension_eh: EntryHash }> }>) {
              newTableRecords.push({...(clashingDimension as any), clash: true, clashes: undefined, range, selected: true } as any)
            }
        })
        // Update the table records so we have clashes underneath incoming config dimensions
        this.tableStore.records = (newTableRecords.length > 0 ? newTableRecords : this.configDimensions) // If not new clashing table records just use all config dimensions
          .reverse()
          .map((r) => this.toTableRecord(r));

        this.requestUpdate('configDimensionClashes')
      } catch (error) {
        console.log('Error mapping dimensions and ranges to table values: ', error)
      }
    }

    // Logic for dom manipulation of rows based on selected and incoming/outgoing state as determined above
    if(changedProperties.has('configDimensionClashes') && this.configDimensionClashes.length > 0 && !(this.configDimensions.some((configDimension: any) => configDimension?.clash))) {  
      const table = this._table?.renderRoot?.children?.[1];
      if(typeof table == 'undefined') return
      const rows = [...table.querySelectorAll('tr')].slice(1); // Omit the header row
      rows.forEach((row, idx) => {this.tableStore.records[idx]['select'] ? showRowSelected(row,  this.tableStore.records[idx]['clash']) : showRowSelectedWarning(row)})
    }
  }
  
  private findRangeForDimension(dimension: Dimension & { dimension_eh: EntryHash }): Range | null {
    if(!this.existingRanges || this.existingRanges?.length === 0) return null;
    return this.existingRanges.find(range => compareUint8Arrays(range.range_eh, dimension.range_eh)) as Range & { range_eh: EntryHash } || null
  }

  private existingDimensionRangeMatchesConfigDimensionRange(existingDimension: Dimension & { dimension_eh: EntryHash }, newDimension: SelectableDimension) {
    const foundRange = this.findRangeForDimension(existingDimension);

    return foundRange?.name == newDimension.range.name
      || rangeKindEqual(newDimension.range.kind, foundRange!.kind)
  }

  private filterExistingDimensionsByInboundClash(configDimension: SelectableDimension): Array<Dimension & { dimension_eh: EntryHash }> {
    if(!configDimension.range?.name || !this.existingDimensions) return [];
    // TODO: alter the following if clashing only by range values and not name needs to be flagged
    return this.existingDimensions.filter((existingDimension) => existingDimension.name == configDimension.name && this.existingDimensionRangeMatchesConfigDimensionRange(existingDimension, configDimension))
  } 

  private handleRowSelection(e: CustomEvent) {
    try {
      if(!this.configDimensions) throw new Error('Do not have config dimensions loaded')
      const row = (e.target as HTMLElement).closest("tr") as HTMLElement;
      const dimensionOfRow = rowDimensionName(row);
      const rows = [...((e.target as HTMLElement).closest("table") as HTMLElement).querySelectorAll("tr")].slice(1);
      // TODO: just use index of row
      const rowIndex = rows
        .map(rowDimensionName)
        .findIndex((rowDimensionName: string) => rowDimensionName == dimensionOfRow);
        console.log('this.tableStore.records[rowIndex] :>> ', this.tableStore.records[rowIndex]);
      const dimensionToSelect = this.configDimensions[rowIndex] as SelectableDimension;
      if (!dimensionToSelect) throw new Error('Could not select config dimension');
      dimensionToSelect.selected = !(dimensionToSelect.selected as boolean) as boolean

      ((e.target as NHCheckbox).value)
        ? showRowSelected(row)
        : showRowNotSelected(row)
      
    } catch (error) {
      console.error('Could not perform row selection logic: ', error)
    } 
  }

  async connectedCallback() {
    super.connectedCallback();
    
    const fieldDefs: FieldDefinitions<DimensionTableRecord> = this.dimensionType == "input"
      ? {
        'dimension-name': new FieldDefinition<DimensionTableRecord>({heading: 'Name'}),
        'range-type': new FieldDefinition<DimensionTableRecord>({heading: 'Type'}),
        'range-min': new FieldDefinition<DimensionTableRecord>({heading: 'Min'}),
        'range-max': new FieldDefinition<DimensionTableRecord>({heading: 'Max'}),
        'select': new FieldDefinition<DimensionTableRecord>({heading: 'Select',
        decorator: (value) => html`<nh-checkbox class="checkbox-only" @change=${(e) => this.handleRowSelection(e)} .label=${""} .value=${!!value}></nh-checkbox>`}),
        
        'clash': new FieldDefinition<DimensionTableRecord>({heading: '',
        decorator: (existsClash) => existsClash ? null : html`
          <nh-tooltip
            class="tooltip-info left super-extend"
            .variant=${"warning"}
            .text=${"Are you sure you want to add this dimension? There is already a configured dimensions with the same NAME/RANGE. If you wish to use it, check its box."}
          >
          <svg slot="hoverable" style="cursor:pointer; margin-top: 12px;" width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M2 12C2 6.47715 6.47715 2 12 2C17.5229 2 22 6.47715 22 12C22 17.5229 17.5229 22 12 22C6.47715 22 2 17.5229 2 12ZM4 12C4 16.4183 7.58172 20 12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12ZM12.7071 15.2929C13.0976 15.6834 13.0976 16.3166 12.7071 16.7071C12.3166 17.0976 11.6834 17.0976 11.2929 16.7071C10.9024 16.3166 10.9024 15.6834 11.2929 15.2929C11.6834 14.9024 12.3166 14.9024 12.7071 15.2929ZM11 8C11 7.44771 11.4477 7 12 7C12.5523 7 13 7.44772 13 8V13C13 13.5523 12.5523 14 12 14C11.4477 14 11 13.5523 11 13V8Z" fill="currentColor"/>
          </svg>
        </nh-tooltip>`})
      }
      : {
        'dimension-name': new FieldDefinition<DimensionTableRecord>({heading: 'Name'}),
        'input-dimension-name': new FieldDefinition<DimensionTableRecord>({heading: 'Input Dimension'}),
        'range-type': new FieldDefinition<DimensionTableRecord>({heading: 'Type'}),
        'method-operation': new FieldDefinition<DimensionTableRecord>({heading: 'Operation'}),
        'range-min': new FieldDefinition<DimensionTableRecord>({heading: 'Min'}),
        'range-max': new FieldDefinition<DimensionTableRecord>({heading: 'Max'}),
        'select': new FieldDefinition<DimensionTableRecord>({heading: 'Select',
        decorator: (value) => html`<nh-checkbox class="checkbox-only" @change=${(e) => this.handleRowSelection(e)} .label=${""} .value=${!!value}></nh-checkbox>`}),
        
        'clash': new FieldDefinition<DimensionTableRecord>({heading: '',
        decorator: (existsClash) => existsClash ? null : html`
          <nh-tooltip
            class="tooltip-info left super-extend"
            .variant=${"warning"}
            .text=${"Are you sure you want to add this dimension? There is already a configured dimensions with the same NAME/RANGE. If you wish to use it, check its box."}
          >
          <svg slot="hoverable" style="cursor:pointer; margin-top: 12px;" width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M2 12C2 6.47715 6.47715 2 12 2C17.5229 2 22 6.47715 22 12C22 17.5229 17.5229 22 12 22C6.47715 22 2 17.5229 2 12ZM4 12C4 16.4183 7.58172 20 12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12ZM12.7071 15.2929C13.0976 15.6834 13.0976 16.3166 12.7071 16.7071C12.3166 17.0976 11.6834 17.0976 11.2929 16.7071C10.9024 16.3166 10.9024 15.6834 11.2929 15.2929C11.6834 14.9024 12.3166 14.9024 12.7071 15.2929ZM11 8C11 7.44771 11.4477 7 12 7C12.5523 7 13 7.44772 13 8V13C13 13.5523 12.5523 14 12 14C11.4477 14 11 13.5523 11 13V8Z" fill="currentColor"/>
          </svg>
        </nh-tooltip>`})
      }

    this.tableStore = new TableStore<DimensionTableRecord>({
      tableId: 'dimensions-' + this.dimensionType,
      fieldDefs,
      showHeader: true,
      records: []
    });
  }
  
  render() : TemplateResult {
    return html`
      <div class="content">
        <div class="title-bar">
          <h1>${capitalize(this.dimensionType)} Dimensions</h1>
          <slot class="action" name="action-button"></slot>
        </div>  
        ${this.tableStore.records && this.tableStore.records.length > 0
          ? html`<wc-table .tableStore=${this.tableStore}></wc-table>`
          : 'No dimensions present'
        }
      </div>
    `;
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

        --table-dimensions-input-select-width: 48px;
        --table-dimensions-output-select-width: 48px;
        --table-dimensions-input-select-min-width: 48px;
        --table-dimensions-output-select-min-width: 48px;
        --table-dimensions-input-select-max-width: 48px;
        --table-dimensions-output-select-max-width: 48px;
        
        
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
        --table-dimensions-output-range-max-min-width: 2.5rem;
        --table-dimensions-output-range-max-max-width: 2.5rem;
        --table-dimensions-output-range-max-width: 2.5rem;

        --table-dimensions-input-info-width: 0.25rem;
        --table-dimensions-output-info-width: 0.25rem;
        --table-dimensions-input-info-min-width: 0.25rem;
        --table-dimensions-output-info-min-width: 0.25rem;
        --table-dimensions-input-info-max-width: 0.25rem;
        --table-dimensions-output-info-max-width: 0.25rem;

        --table-dimensions-input-clash-width: 0.25rem;
        --table-dimensions-output-clash-width: 0.25rem;
        --table-dimensions-input-clash-min-width: 0.25rem;
        --table-dimensions-output-clash-min-width: 0.25rem;
        --table-dimensions-input-clash-max-width: 0.25rem;
        --table-dimensions-output-clash-max-width: 0.25rem;

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