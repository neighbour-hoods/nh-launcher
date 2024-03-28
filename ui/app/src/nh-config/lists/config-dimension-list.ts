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

type SelectableDimension = ConfigDimension & {selected?: boolean};

// Helpers for reaching into table DOM and adding/removing selected state
function showRowSelected(row: HTMLElement) {
  row.style.outline = "2px solid #5DC389";
  row.style.borderRadius = "8px";
  (row.querySelector('.select') as HTMLElement)!.style.backgroundColor = "#5DC389";
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

  @property() configDimensions!: Array<SelectableDimension>;

  @property() configDimensionClashes: typeof this.configDimensions = [];

  @property() existingDimensions!: Array<Dimension & { dimension_eh: EntryHash }>;
  @property() existingRanges!: Array<Range & { range_eh: EntryHash }>;

  @property() configMethods!: Array<ConfigMethod>;

  protected updated(changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
    if(changedProperties.has('configDimensions') && !!this.configDimensions && !!this.configMethods) {  
      try {
        const tableRecords = this.configDimensions
          .reverse()
          .map((dimension: SelectableDimension) => {
            dimension.selected = true; // By default select all dimensions for creation
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
              ['select']: true,
            }
          });
        this.tableStore.records = tableRecords;

        if(this.configDimensionClashes.length == 0 && typeof this.existingDimensions !== 'undefined' && typeof this.existingRanges !== 'undefined' && this.existingDimensions.length > 0 && this.existingRanges.length > 0) {
          this.configDimensionClashes = this.configDimensions.filter((dimension) => this.inboundDimensionClashesWithExistingDimension(dimension))
        }
        this.requestUpdate()
      } catch (error) {
        console.log('Error mapping dimensions and ranges to table values: ', error)
      }
    }

    if(changedProperties.has('configDimensions') && !!this._table?.renderRoot?.children?.[1]) { // Actual html table element
      const table = this._table?.renderRoot?.children?.[1];
      const rows = [...table.querySelectorAll('tr')].slice(1);
      rows.forEach(showRowSelected)
    }

    if(changedProperties.has('configDimensionClashes') && typeof changedProperties.get('configDimensionClashes') !== 'undefined') {  
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

  private inboundDimensionClashesWithExistingDimension(configDimension: SelectableDimension): boolean {
    if(!configDimension.range?.name || !this.existingDimensions) return false;
    
    return this.existingDimensions.some((existingDimension) => this.existingDimensionRangeMatchesConfigDimensionRange(existingDimension, configDimension))
  } 

  private handleRowSelection(e: CustomEvent) {
    try {
      if(!this.configDimensions) throw new Error('Do not have config dimensions loaded')
      const row = (e.target as HTMLElement).closest("tr") as HTMLElement;
      const dimensionOfRow = rowDimensionName(row);
      const rows = [...((e.target as HTMLElement).closest("table") as HTMLElement).querySelectorAll("tr")].slice(1);
      
      const rowIndex = rows
        .map(rowDimensionName)
        .findIndex((rowDimensionName: string) => rowDimensionName == dimensionOfRow);
      const dimensionToSelect = this.configDimensions[rowIndex] as SelectableDimension;
      if (!dimensionToSelect) throw new Error('Could not select config dimension');
      dimensionToSelect.selected = !(dimensionToSelect.selected as boolean) as boolean

      ((e.target as NHCheckbox).value)
        ?  showRowSelected(row)
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

        'info': new FieldDefinition<DimensionTableRecord>({heading: '',
        decorator: (value) => html`<nh-tooltip class="tooltip-info">
          <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M2 12C2 6.47715 6.47715 2 12 2C17.5229 2 22 6.47715 22 12C22 17.5229 17.5229 22 12 22C6.47715 22 2 17.5229 2 12ZM4 12C4 16.4183 7.58172 20 12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12ZM12.7071 15.2929C13.0976 15.6834 13.0976 16.3166 12.7071 16.7071C12.3166 17.0976 11.6834 17.0976 11.2929 16.7071C10.9024 16.3166 10.9024 15.6834 11.2929 15.2929C11.6834 14.9024 12.3166 14.9024 12.7071 15.2929ZM11 8C11 7.44771 11.4477 7 12 7C12.5523 7 13 7.44772 13 8V13C13 13.5523 12.5523 14 12 14C11.4477 14 11 13.5523 11 13V8Z" fill="currentColor"/>
          </svg></nh-tooltip>`})
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
        
        'info': new FieldDefinition<DimensionTableRecord>({heading: '',
        decorator: (value) => html`
          <nh-tooltip
            class="tooltip-info left super-extend"
            .variant=${"warning"}
            .text=${"Are you sure you want to add this dimension? There is already a configured dimensions with the same NAME/RANGE. If you wish to use it, check its box."}
          >
          <svg slot="hoverable" style="cursor:pointer;" width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
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

        --table-dimensions-input-select-width: 2rem;
        --table-dimensions-output-select-width: 2rem;
        --table-dimensions-input-info-width: 2rem;
        --table-dimensions-output-info-width: 2rem;
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