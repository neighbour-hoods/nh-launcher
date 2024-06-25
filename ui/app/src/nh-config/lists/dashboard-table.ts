import { html, css, TemplateResult } from 'lit';
import { property, query, state } from 'lit/decorators.js';

import {
  FieldDefinitions,
  FieldDefinition,
  TableStore,
  Table,
} from '@adaburrows/table-web-component';

import NHSkeleton from '@neighbourhoods/design-system-components/skeleton';
import NHComponent from '@neighbourhoods/design-system-components/ancestors/base';

import { AgentPubKeyB64, encodeHashToBase64 } from '@holochain/client';
import { AssessmentTableRecord, AssessmentTableType } from '../types';
import { generateHeaderHTML } from '../../elements/components/helpers/functions';
import { InputAssessmentRenderer, OutputAssessmentRenderer, ResourceBlockRenderer, compareUint8Arrays } from '../../../../libs/app-loader';
import { appletInstanceInfosContext } from '../../context';
import { consume } from '@lit/context';
import { WithProfile } from '../../elements/components/profile/with-profile';

export const tableId = 'assessmentsForResource';

class BlockRendererTable extends Table {
  static elementDefinitions = {
    'output-assessment-renderer': OutputAssessmentRenderer,
    'input-assessment-renderer': InputAssessmentRenderer,
    'resource-block-renderer': ResourceBlockRenderer,
    'with-profile': WithProfile,
  }

  static styles = css`
    input-assessment-renderer {
      display:flex;
      justify-content: center;
      cursor: pointer;
    }
  `
}

export class DashboardTable extends NHComponent {
  @consume({ context: appletInstanceInfosContext })
  @property({attribute: false}) _currentAppletInstances;
  
  @property() tableStore!: TableStore<AssessmentTableRecord>;
  @property({ type: Array }) assessments: AssessmentTableRecord[] = [];
  @property() resourceDefEntries!: object[];

  @property() resourceName!: string;
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
    if (changedProps.has('assessments') || changedProps.has('resourceName')) {
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
          const linkedResourceEntry = this.resourceDefEntries.find(resourceEntry => compareUint8Arrays(resourceEntry.resource_def_eh, resource.resource_def_eh))
          if(!linkedResourceEntry) throw new Error('No entry found for this ResourceDef');
          const linkedAppletInstance = this._currentAppletInstances?.value[encodeHashToBase64(linkedResourceEntry.applet_eh)]
          const delegate = linkedAppletInstance?.curriedResourceBlockDelegate(resource.resource_eh);
          
          return html`<div style="width: 100%; display: grid;place-content: start center; height: 100%; justify-items: center;">
            <resource-block-renderer .component=${resource.renderer} .nhDelegate=${delegate}></resource-block-renderer>
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
          ? html`<nh-skeleton style="max-width: 100vw" type=${"dashboard-basic-grid"}></nh-skeleton>` : null
        }`
      : html`<nh-skeleton type=${"dashboard-table-full"}></nh-skeleton>`;
  }

  static elementDefinitions = {
    'wc-table': BlockRendererTable,
    'nh-skeleton': NHSkeleton,
  };

  static styles = css`
    .identicon {
      margin: 0 auto;
    }
    :host {
      /** Global Table **/
      color: var(--nh-theme-fg-default);
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
  `;
}