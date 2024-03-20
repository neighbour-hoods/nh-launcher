import { html, css, TemplateResult } from 'lit';
import { property, query, state } from 'lit/decorators.js';

import {
  FieldDefinitions,
  FieldDefinition,
  TableStore,
  Table,
} from '@adaburrows/table-web-component';

import { SlAlert, SlSkeleton, SlSpinner } from '@scoped-elements/shoelace';
import { NHComponent } from '@neighbourhoods/design-system-components';
import { AgentPubKeyB64, encodeHashToBase64 } from '@holochain/client';
import { AssessmentTableRecord, AssessmentTableType, assessmentTableId } from '../types';
import { generateHashHTML, generateHeaderHTML } from '../../elements/components/helpers/functions';
import { WithProfile } from '../../elements/components/profile/with-profile';

export const tableId = 'assessmentsForResource';

class BlockRendererTable extends Table {
  static elementDefinitions = {
    'output-assessment-renderer': OutputAssessmentRenderer,
    'input-assessment-renderer': InputAssessmentRenderer,
    'resource-block-renderer': ResourceBlockRenderer,
    'with-profile': WithProfile,
  }
}

export class DashboardTable extends NHComponent {
  @property() tableStore!: TableStore<AssessmentTableRecord>;
  @property({ type: Array })
  assessments: AssessmentTableRecord[] = [];

  @property() resourceName!: string;
  @state() columns: number = 0;
  @state() loading: boolean = true;
  @state() showSkeleton: boolean = false;

  @query('wc-table') _table;

  @property()
  contextFieldDefs!: { [x: string]: FieldDefinition<AssessmentTableRecord> };
  @property()
  tableType!: AssessmentTableType;

  async updateTable() {
    this.tableStore.fieldDefs = this.generateFieldDefs(this.resourceName, this.contextFieldDefs);

    // Check if we have the necessary data to create the table
    if (!this.assessments || !this.tableStore.fieldDefs) {
      console.warn('No data or field definitions to create table.');
      return;
    }
    
    // The following line removes records in the table that have no assessment value for the context field definitions generate by generateFieldDefs
    if(this.contextFieldDefs && Object.entries(this.contextFieldDefs).length ) {
      this.tableStore.records = this.assessments.filter(assessment => Object.keys(this.contextFieldDefs).some(contextField => assessment[contextField] !== "")) as AssessmentTableRecord[];
      this.showSkeleton = false;
    } 

    if(!this.loading && this.tableStore.records.length == 0 && this.assessments.length == 0) {
      this.dispatchEvent(
        new CustomEvent("trigger-alert", {
          detail: { 
            title: "No Assessments Found",
            msg: "Go to your applets to start making assessments.",
            type: "success",
            closable: true,
          },
          bubbles: true,
          composed: true,
        })
        );
        this.showSkeleton = true;
    }
    if(typeof this.contextFieldDefs == 'object') this.columns = Object.values(this.contextFieldDefs).length + 2
  }
  
  async connectedCallback() {
    super.connectedCallback();

    let fieldDefs = this.generateFieldDefs(this.resourceName, this.contextFieldDefs);
    this.tableStore = new TableStore({
      tableId,
      fieldDefs,
      colGroups: [{ span: 2, class: 'fixedcols' }],
      showHeader: true,
      records: [] as AssessmentTableRecord[]
    });
  }

  async updated(changedProps) {
    if (changedProps.has('assessments') || changedProps.has('contextFieldDefs') || changedProps.has('resourceName')) {
      await this.updateTable();
      await this.updateComplete;
      await this._table?.updateComplete;
      this.loading = false;
    }
  }

  generateFieldDefs(
    resourceName: string,
    contextFieldDefs: { [x: string]: FieldDefinition<AssessmentTableRecord> },
  ): FieldDefinitions<AssessmentTableRecord> {
    const fixedFieldDefs = {
      resource: new FieldDefinition<AssessmentTableRecord>({
        heading: generateHeaderHTML('Resource', resourceName),
        decorator: (resource: any) => {
          console.log('resource :>> ', resource);
          return html`<div style="width: 100%; display: grid;place-content: start center; height: 100%; justify-items: center;">
            ${generateHashHTML(resource.eh)}
          </div>`},
      }),
      neighbour: new FieldDefinition<AssessmentTableRecord>({
        heading: generateHeaderHTML('Neighbour', 'Member'),
        decorator: (agentPublicKeyB64: AgentPubKeyB64) => {
          return html` <div style="width: 100%; display: flex; flex-direction: column; align-items: start; height: 100%; justify-items: center;" >
            <with-profile class="identicon" .agentHash=${agentPublicKeyB64} .component=${"identicon"}></with-profile>
          </div>`}},
      ),
    };
    return {
      ...fixedFieldDefs,
      ...contextFieldDefs,
    };
  }

  render(): TemplateResult {
    return !this.loading && this.contextFieldDefs
      ? html`<wc-table .tableStore=${this.tableStore}></wc-table>
      ${!this.loading && this.showSkeleton
        ? html`
        <div class="skeleton-main-container">
              ${Array.from(Array(24)).map(
                () => html`<sl-skeleton effect="sheen" class="skeleton-part"></sl-skeleton>`,
              )}
        </div>`
        : null
      }`
      : html`<div class="skeleton-main-container" data-columns=${this.columns}>
      ${Array.from(Array(this.columns)).map(
        () => html`<sl-skeleton effect="pulse" class="skeleton-part-header"></sl-skeleton>`,
      )}
      ${Array.from(Array(this.columns * 5)).map(
        () => html`<sl-skeleton effect="pulse" class="skeleton-part"></sl-skeleton>`,
      )}
    </div>`;
  }

  static elementDefinitions = {
    'wc-table': BlockRendererTable,
    'sl-alert': SlAlert,
    'sl-skeleton': SlSkeleton,
  };

  static styles = css`
    .identicon {
      margin: 0 auto;
    }
    :host {
      /** Global Table **/
      color: var(--nh-theme-fg-default);
      --table-assessmentsForResource-height: 100%;
      --table-assessmentsForResource-overflow-x: auto;
      --table-assessmentsForResource-overflow-y: auto;
      --table-assessmentsForResource-max-height: calc(
        100vh - 101px - calc(1px * var(--nh-spacing-lg))
      );

      --table-assessmentsForResource-border-spacing: calc(1px * var(--nh-spacing-sm));
      --cell-radius: calc(1px * var(--nh-radii-base));

      --table-assessmentsForResource-display: block;
      --table-vertical-align: middle;
      --border-color: #7d7087;
      --menuSubTitle: #a89cb0;
      --column-min-width: calc(1rem * var(--nh-spacing-sm));
      --column-max-width: calc(1rem * var(--nh-spacing-md));

      /** Header Cells **/
      --table-assessmentsForResource-heading-background-color: var(--nh-theme-bg-surface);
      --header-cell-border-width: 1px;
      --header-title-margin-y: 6px;
      --table-assessmentsForResource-importance-heading-vertical-align: bottom;

      /* Border color, width */
      --table-assessmentsForResource-header-first-heading-border-color: var(--border-color);
      --table-assessmentsForResource-header-last-heading-border-color: var(--border-color);
      --table-assessmentsForResource-header-heading-border-color: var(--border-color);
      --table-assessmentsForResource-header-first-heading-border-width: var(
        --header-cell-border-width
      );
      --table-assessmentsForResource-header-last-heading-border-width: var(
        --header-cell-border-width
      );
      --table-assessmentsForResource-header-heading-border-width: var(--header-cell-border-width);
      /* Border radius */
      --table-assessmentsForResource-header-first-heading-border-radius: var(--cell-radius);
      --table-assessmentsForResource-header-last-heading-border-radius: var(--cell-radius);
      --table-assessmentsForResource-header-heading-border-radius: var(--cell-radius);
      --table-assessmentsForResource-body-first-cell-border-radius: var(--cell-radius);
      --table-assessmentsForResource-body-last-cell-border-radius: var(--cell-radius);
      --table-assessmentsForResource-body-cell-border-radius: var(--cell-radius);

      /** Global Cells **/
      /* Hashes */
      --table-assessmentsForResource-body-cell-background-color: var(--nh-theme-bg-surface);
      --cell-hash-border-radius: calc(1px * var(--nh-radii-sm));
      --cell-hash-padding: calc(1px * var(--nh-spacing-sm));
      --cell-hash-font-size: calc(1px * var(--nh-font-size-sm));

      /* Values */
      --cell-value-font-size: calc(1px * var(--nh-font-size-md));

      /** First Two Columns **/
      --table-assessmentsForResource-resource-width: var(--column-max-width);
      --table-assessmentsForResource-neighbour-width: var(--column-max-width);
      --table-assessmentsForResource-resource-vertical-align: middle;
      --table-assessmentsForResource-neighbour-vertical-align: middle;

      --table-assessmentsForResource-row-even-background-color: var(---nh-theme-bg-surface);
      --table-assessmentsForResource-row-odd-background-color: var(---nh-theme-bg-surface);
      --table-assessmentsForResource-resource-row-even-background-color: var(
        --nh-colors-eggplant-800
      ) !important;
      --table-assessmentsForResource-resource-heading-background-color: var(
        --nh-colors-eggplant-800
      ) !important;
      --table-assessmentsForResource-neighbour-heading-background-color: var(
        --nh-colors-eggplant-800
      ) !important;
      --table-assessmentsForResource-row-even-background-color: var(--nh-theme-bg-surface);
      --table-assessmentsForResource-row-odd-background-color: var(--nh-theme-bg-surface);
    }
    .alert-wrapper {
      height: 100%;
      display: grid;
      place-content: center;
      align-content: start;
      padding: 4rem calc(1px * var(--nh-spacing-lg));
    }
    .alert::part(base) {
      height: 8rem;
      width: 100%;
    }

    .skeleton-main-container {
      width: 100%;
      display: grid;
      grid-template-columns: minmax(26.5%, 255px) minmax(26.5%, 255px) repeat(2, minmax(24.5%, 175px));
      gap: calc(1px * var(--nh-spacing-sm));
      margin: calc(1px * var(--nh-spacing-sm));
      grid-template-rows: 86px repeat(8, 4rem);
    }
    .skeleton-main-container[data-columns="3"] {
      grid-template-columns: 204px 204px repeat(1, 140px);
    }
    .skeleton-main-container[data-columns="4"] {
      grid-template-columns: 204px 204px repeat(2, 140px);
    }
    .skeleton-main-container[data-columns="5"] {
      grid-template-columns: 204px 204px repeat(3, 140px);
    }
    .skeleton-main-container[data-columns="6"] {
      grid-template-columns: 204px 204px repeat(4, 140px);
    }
    .skeleton-part-header {
      --color: rgb(37, 31, 40);
      --sheen-color: rgb(37, 31, 40);
    }
    .skeleton-part {
      --color: var(--nh-theme-bg-surface);
      --sheen-color: var(--nh-theme-bg-surface);
    }
    .skeleton-part-header::part(indicator), .skeleton-part::part(indicator) {
      border-radius: calc(1px * var(--nh-radii-base));
      opacity: 1;
    }
    .skeleton-part-header::part(indicator) {
      border: 1px solid rgb(125, 112, 135);
    }
  `;
}