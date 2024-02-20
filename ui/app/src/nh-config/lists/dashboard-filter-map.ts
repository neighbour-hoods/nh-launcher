import {
  Assessment,
  CulturalContext,
  Dimension,
  SensemakerStore,
  sensemakerStoreContext,
} from '@neighbourhoods/client';
import { LitElement, PropertyValueMap, css, html } from 'lit';
import { property, state } from 'lit/decorators.js';
import { EntryHash, DnaHash, encodeHashToBase64, EntryHashB64, decodeHashFromBase64 } from '@holochain/client';
import { consume } from '@lit/context';
import { StoreSubscriber } from 'lit-svelte-stores';
import { DashboardTable } from './dashboard-table';
import { FieldDefinition } from '@adaburrows/table-web-component';
import { AssessmentTableRecord, AssessmentTableType, DimensionDict } from '../types';
import { MatrixStore } from '../../matrix-store';
import { matrixContext, weGroupContext } from '../../context';
import { EntryRecord } from '@holochain-open-dev/utils';
import { cleanResourceNameForUI, generateHeaderHTML } from '../../elements/components/helpers/functions';
import { derived } from 'svelte/store';
import { compareUint8Arrays } from '@neighbourhoods/app-loader';

export class DashboardFilterMap extends LitElement {
  @consume({ context: sensemakerStoreContext, subscribe: true })
  @property({attribute: false}) _sensemakerStore!: SensemakerStore;

  @consume({ context: matrixContext, subscribe: true })
  @property({attribute: false}) _matrixStore!: MatrixStore;

  @consume({ context: weGroupContext, subscribe: true })
  @property({attribute: false}) weGroupId!: DnaHash;

  @property()
  _rawAssessments = new StoreSubscriber(
    this,
    () =>  derived(this._sensemakerStore.resourceAssessments(), (assessments) => {
      // Might want to mutate this in some way before returning
      return assessments
    }),
    () => [this._sensemakerStore],
  );

  @property({ type: AssessmentTableType }) tableType;
  @property({ type: String }) resourceName;
  @property({ type: String }) resourceDefEh;
  @property({ type: Object }) selectedAppletResourceDefs;
  @property({ type: String }) selectedContext;
  @state() contextEhsB64!: EntryHashB64[];
  // @state() selectedDimensions!: DimensionDict;
  @state() private _dimensionEntries!: Dimension[];
  @state() private _objectiveDimensionNames: string[] = [];
  @state() private _subjectiveDimensionNames: string[] = [];
  @state() private _contextEntry!: CulturalContext;

  // To be fed as props to the dashboard table component
  @property() fieldDefs;
  @property() filteredTableRecords: AssessmentTableRecord[] = [];

  async connectedCallback() {
    super.connectedCallback();
    
    if(!this._rawAssessments?.value) return
    this.filterMapRawAssessmentsToTableRecords();
  }

  async firstUpdated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
    await this.fetchSelectedDimensionEntries();
    this.partitionDimensionEntries();
    this.fieldDefs = this.generateContextFieldDefs();
    console.log('this._dimensionEntries :>> ', this._dimensionEntries);
  }

  async updated(changedProps) {
    if ((changedProps.has('selectedAppletResourceDefs') || changedProps.has('resourceDefEh')) && this.resourceDefEh) {
      this.filterMapRawAssessmentsToTableRecords();
      this.requestUpdate('selectedDimensions')
    }
    if (changedProps.has('selectedContext')) {
      await this.fetchCurrentContextEntry();
      this.filterMapRawAssessmentsToTableRecords();
    }
    if (changedProps.has('contextEhsB64') && this.tableType == AssessmentTableType.Context) {
      this.filterMapRawAssessmentsToTableRecords();
    }
    if (changedProps.has('selectedDimensions')) {
    }
    if (
      changedProps.has('_subjectiveDimensionNames') &&
      typeof changedProps.get('_objectiveDimensionNames') !== 'undefined'
    ) {
      this.fieldDefs = this.generateContextFieldDefs();
      this.filterMapRawAssessmentsToTableRecords();
    }
  }

  filterMapRawAssessmentsToTableRecords() {
    // Keyed by resource, (not resource-def)
    const assessmentsDict : Record<EntryHashB64, Assessment[]> = this._rawAssessments.value;
    if(typeof assessmentsDict !== 'object' || !(
      Object.values(assessmentsDict) &&
      Object.values(assessmentsDict)?.length !== undefined &&
      this.tableType
      )
    ) return
    
    try {
      this.filteredTableRecords = this.flatFiltered(Object.values(assessmentsDict) as Assessment[][]).map(
        this.mapAssessmentToAssessmentTableRecord.bind(this),
      );
    } catch (error) {
      console.log('Error filtering assessments :>> ', error);
    }
  }

  // Filtering
  flatFiltered(assessments: Assessment[][]): Assessment[] {
    // By ResourceDefEH
    let filteredByResourceDef = (
      this.resourceDefEh == 'none'
        ? Object.values(assessments).flat()
        : this.filterByResourceDefEh(assessments.flat(), this.resourceDefEh)
    ) as Assessment[];

    filteredByResourceDef = this.selectedAppletResourceDefs ? this.filterByAppletResourceDefEhs(filteredByResourceDef, this.selectedAppletResourceDefs)  as Assessment[] : filteredByResourceDef;
    // By objective/subjective dimension names
    let filteredByMethodType;

    if (this.tableType === AssessmentTableType.Resource) {
      filteredByMethodType = this.filterByMethodNames(
        filteredByResourceDef,
        this._objectiveDimensionNames,
      );
    } else {
      // else we are dealing with a Context table, filter accordingly
      filteredByMethodType = this.filterByMethodNames(
        filteredByResourceDef,
        this._subjectiveDimensionNames,
      );
    }

    // By context && context results
    let tripleFiltered;
    if (
      this.tableType === AssessmentTableType.Context &&
      !!this._contextEntry?.thresholds &&
      !!this._dimensionEntries
    ) {
      tripleFiltered = this.filterByDimensionEh(
        filteredByMethodType,
        encodeHashToBase64(this._contextEntry.thresholds[0].dimension_eh),
      );
      // TODO: cache each context's results and extract this all to a method
      tripleFiltered = tripleFiltered.filter(assessment => {
        if(!this.contextEhsB64?.length) return false;
        const matchingContextEntryDefHash = this.contextEhsB64.find((eHB64) => encodeHashToBase64(assessment.resource_eh) === eHB64)
        if(matchingContextEntryDefHash) {
          // Filter out the oldest objective dimension values (so we have the latest average)
          const results = tripleFiltered.filter(assessment => encodeHashToBase64(assessment.resource_eh) === matchingContextEntryDefHash)
          const latestAssessmentFromResults = results.sort((a, b) => b.timestamp > a.timestamp).slice(-1)
          return latestAssessmentFromResults[0] == assessment
        }
      })
    }
// console.log('tripleFiltered || filteredByMethodType :>> ', tripleFiltered || filteredByMethodType);
    return tripleFiltered || filteredByMethodType;
  }

  filterByResourceDefEh(resourceAssessments: Assessment[], filteringHash: EntryHash) {
    return resourceAssessments.filter((assessment: Assessment) => {
      return compareUint8Arrays(assessment.resource_def_eh, filteringHash)
    })
  }

  filterByAppletResourceDefEhs(resourceAssessments: Assessment[], selectedAppletResourceDefEhs: EntryHash[]) {
    if(!selectedAppletResourceDefEhs || typeof selectedAppletResourceDefEhs !== 'object') return;
    const appletResourceDefs = Object.values(selectedAppletResourceDefEhs).map(eh => encodeHashToBase64(eh));
    return resourceAssessments.filter((assessment: Assessment) => appletResourceDefs.includes(encodeHashToBase64(assessment.resource_def_eh)))
  }

  filterByDimensionEh(resourceAssessments: Assessment[], filteringHash: string) {
    return resourceAssessments.filter((assessment: Assessment) => {
      return encodeHashToBase64(assessment.dimension_eh) === filteringHash;
    });
  }

  filterByMethodNames(resourceAssessments: Assessment[], filteringMethods: string[]): Assessment[] {
    return resourceAssessments.filter((assessment: Assessment) => {
      for (let method of filteringMethods) {
        if(!this.selectedDimensions[method]) return true;
        if (
          encodeHashToBase64(this.selectedDimensions[method]) ==
          encodeHashToBase64(assessment.dimension_eh)
        )
          return false;
      }
      return true;
    });
  }

  // Mapping
  mapAssessmentToAssessmentTableRecord(assessment: Assessment): AssessmentTableRecord {
    // Base record with basic fields

    // get the view from the matrix store TODO: replace with resource renderer
    const resourceView = this._matrixStore.getResourceView(this.weGroupId, assessment.resource_def_eh);
    const baseRecord = {
      neighbour: encodeHashToBase64(assessment.author),
      resource: {
        eh: [assessment.resource_eh, resourceView],
        value: [Object.values(assessment.value)[0], assessment],
      },
    } as AssessmentTableRecord;

    if (!this._dimensionEntries) return baseRecord;
    // Iterate over dimensions dictionary and add each dimension as a field to the base record with an empty default value
    for (let dimensionName of Object.keys(this._dimensionEntries)) {
      baseRecord[dimensionName] = '';
    }
    // If dimension_eh in assessment matches a dimensionUint8 in the dictionary
    // populate the corresponding dimension field in the base record with the assessment value
    for (let [dimensionName, dimensionUint8] of Object.entries(this._dimensionEntries)) {
      if (encodeHashToBase64(assessment.dimension_eh) === encodeHashToBase64(dimensionUint8)) {
        baseRecord[dimensionName] = [Object.values(assessment.value)[0], assessment];
      }
    }

    return baseRecord;
  }

  generateContextFieldDefs(): { [x: string]: FieldDefinition<AssessmentTableRecord> } {
    const contextFieldEntries = Object.entries(this._dimensionEntries).filter(
      ([dimensionName, _]: [string, Uint8Array]) =>
        this.tableType === AssessmentTableType.Resource
          ? this._subjectiveDimensionNames.includes(dimensionName)
          : this._objectiveDimensionNames.includes(dimensionName) &&
            this.filteredTableRecords.every(a => a[dimensionName] !== ''),
    );
    switch (this.tableType) {
      case AssessmentTableType.Resource:
        const fieldEntriesResource = contextFieldEntries.map(
          ([dimensionName, _]: [string, Uint8Array]) => ({
            [dimensionName]: new FieldDefinition<AssessmentTableRecord>({
              heading: generateHeaderHTML('Assessment', cleanResourceNameForUI(dimensionName)),
              decorator: (value: any) => {
                return value
                // TODO: Get assessment value from OutputAssessmentWidget
              },
            }),
          }),
        );
        return fieldEntriesResource.reduce((fields, field) => ({ ...fields, ...field }), {});
      case AssessmentTableType.Context:
        const fieldEntriesContext = contextFieldEntries.map(
          ([dimensionName, _]: [string, Uint8Array]) => ({
            [dimensionName]: new FieldDefinition<AssessmentTableRecord>({
              heading: generateHeaderHTML('Dimension', cleanResourceNameForUI(dimensionName)),
              decorator: (value: any) => {
                return value
                // TODO: Get assessment value from OutputAssessmentWidget
              },
            }),
          }),
        );
        return fieldEntriesContext.reduce((field, fields) => ({ ...fields, ...field }), {});
    }
    return {};
  }

  render() {
    console.log('this.filteredTableRecords :>> ', this.filteredTableRecords);
    console.log('this.fieldDefs :>> ', this.fieldDefs);
    return html`
      <dashboard-table
        .resourceName=${this.resourceName}
        .assessments=${this.filteredTableRecords}
        .tableType=${this.tableType}
        .contextFieldDefs=${this.fieldDefs}
      ></dashboard-table>
    `;
  }
  
  static elementDefinitions = { 'dashboard-table': DashboardTable }

  static get styles() {
    return [
      css`
        .widget-wrapper {
          display: flex;
          flex-direction: row;
        }
        .widget-wrapper > * {
          flex: 1;
        }
      `,
    ];
  }

  async fetchCurrentContextEntry() {
    if (this.selectedContext == 'none') return;

    const context: EntryRecord<CulturalContext> = await this._sensemakerStore.getCulturalContext(this.selectedContext);
    try {
      this._contextEntry = context.entry as CulturalContext;
    } catch (error) {
      console.log('No context entry exists for that context entry hash!');
    }
  }

  async fetchSelectedDimensionEntries() {
    try {
      const entryRecords = await this._sensemakerStore.getDimensions();
      this._dimensionEntries = entryRecords.map(eR => eR.entry) as Dimension[];
    } catch (error) {
      console.log('Error fetching dimension details: ', error);
    }
  }

  partitionDimensionEntries() {
    if (!this._dimensionEntries) return;

    let [subjective, objective] = this._dimensionEntries.reduce(
      (partitioned, dimension) => {
        partitioned[dimension.computed ? 1 : 0].push(dimension.name);
        return partitioned;
      },
      [[], []] as any,
    );
    this._objectiveDimensionNames = objective;
    this._subjectiveDimensionNames = subjective;
  }
}
