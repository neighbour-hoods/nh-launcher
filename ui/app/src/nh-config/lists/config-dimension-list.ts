import { html, css, PropertyValueMap, CSSResult } from "lit";
import { property, query, state } from "lit/decorators.js";

import { ConfigDimension, ConfigMethod, RangeKind } from "@neighbourhoods/client";

import { NHButton, NHCard, NHCheckbox, NHComponent } from "@neighbourhoods/design-system-components";
import { capitalize } from "../../elements/components/helpers/functions";
import { FieldDefinition, FieldDefinitions, Table, TableStore } from "@adaburrows/table-web-component";

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
  }
}

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

export default class ConfigDimensionList extends NHComponent {
  @property() dimensionType: "input" | "output" = "input";
  
  @state() tableStore!: TableStore<DimensionTableRecord>;

  @query('wc-table') _table!: Table;

  @property() configDimensions!: Array<ConfigDimension & {selected?: boolean}>;

  @property() configMethods!: Array<ConfigMethod>;

  protected updated(changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
    if(changedProperties.has('configDimensions') && !!this.configDimensions && !!this.configMethods) {  
      try {
        const tableRecords = this.configDimensions
          .reverse()
          .map((dimension: ConfigDimension & {selected?: boolean}) => {
            dimension.selected = true; // By default select all dimensions for creation
            const range = dimension.range
            const linkedMethods = this.dimensionType == 'input'
              ? this.configMethods.filter(method => method.input_dimensions.some(d => dimension.name == d.name && dimension.range.name == d.range.name))
              : this.configMethods.filter(method => method.output_dimension.name == dimension.name && method.output_dimension.range.name == dimension.range.name)
            // TODO: test deepequal for above, rather than just names.

            const [[rangeType, rangeValues]] : any = Object.entries(range?.kind as RangeKind);
            const method = linkedMethods[0];
            return {
              ['dimension-name']: capitalize(dimension.name),
              ['range-type']: rangeType,
              ['range-min']: rangeValues?.min,
              ['range-max']: rangeValues?.max,
              // For output dimensions
              // ['input-dimension-name']: (inputDimension as any)?.name || '',
              ['method-operation']: typeof method?.program == 'object' ? Object.keys(method.program)[0] : '',
              ['select']: true,
            }
          });
        this.tableStore.records = tableRecords;
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
  }
  
  handleRowSelection(e: CustomEvent) {
    try {
      if(!this.configDimensions) throw new Error('Do not have config dimensions loaded')
      const row = (e.target as HTMLElement).closest("tr") as HTMLElement;
      const dimensionOfRow = rowDimensionName(row);
      const rows = [...((e.target as HTMLElement).closest("table") as HTMLElement).querySelectorAll("tr")].slice(1);
      
      const rowIndex = rows
        .map(rowDimensionName)
        .findIndex((rowDimensionName: string) => rowDimensionName == dimensionOfRow);
      const dimensionToSelect = this.configDimensions[rowIndex] as ConfigDimension & {selected?: boolean};
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
      }
      : {
        'dimension-name': new FieldDefinition<DimensionTableRecord>({heading: 'Name'}),
        // 'input-dimension-name': new FieldDefinition<DimensionTableRecord>({heading: 'Input Dimension'}),
        'range-type': new FieldDefinition<DimensionTableRecord>({heading: 'Type'}),
        'method-operation': new FieldDefinition<DimensionTableRecord>({heading: 'Operation'}),
        'range-min': new FieldDefinition<DimensionTableRecord>({heading: 'Min'}),
        'range-max': new FieldDefinition<DimensionTableRecord>({heading: 'Max'}),
        'select': new FieldDefinition<DimensionTableRecord>({heading: 'Select',
        decorator: (value) => html`<nh-checkbox class="checkbox-only" @change=${(e) => this.handleRowSelection(e)} .label=${""} .value=${!!value}></nh-checkbox>`})
      }

    this.tableStore = new TableStore<DimensionTableRecord>({
      tableId: 'dimensions-' + this.dimensionType,
      fieldDefs,
      showHeader: true,
      records: []
    });
  }
  
  render() {
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