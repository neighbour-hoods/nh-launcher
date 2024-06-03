import {
  Assessment,
  AssessmentWidgetBlockConfig,
  AssessmentWidgetRenderer,
  CulturalContext,
  Dimension,
  InputAssessmentWidgetDelegate,
  Method,
  OutputAssessmentWidgetDelegate,
  ResourceDef,
  SensemakerStore,
  sensemakerStoreContext,
  serializeAsyncActions,
} from '@neighbourhoods/client';
import { PropertyValueMap, css, html } from 'lit';
import { property, state } from 'lit/decorators.js';
import { EntryHash, encodeHashToBase64, EntryHashB64 } from '@holochain/client';
import { consume } from '@lit/context';
import { StoreSubscriber } from 'lit-svelte-stores';
import { DashboardTable } from './dashboard-table';
import { FieldDefinition } from '@adaburrows/table-web-component';
import { AssessmentTableRecord, AssessmentTableType } from '../types';
import { EntryRecord } from '@holochain-open-dev/utils';
import { cleanResourceNameForUI, generateHeaderHTML } from '../../elements/components/helpers/functions';
import { derived } from 'svelte/store';
import { compareUint8Arrays, createInputAssessmentWidgetDelegate, InputAssessmentRenderer } from '../../../../libs/app-loader';
import { appletInstanceInfosContext } from '../../context';
import NHComponent from '@neighbourhoods/design-system-components/ancestors/base';

type DecoratorProps = {
  renderer: AssessmentWidgetRenderer,
  delegate: OutputAssessmentWidgetDelegate
}

export class DashboardFilterMap extends NHComponent {
  @consume({ context: sensemakerStoreContext, subscribe: true })
  @property({attribute: false}) _sensemakerStore!: SensemakerStore;

  @consume({ context: appletInstanceInfosContext })
  @property({attribute: false}) _currentAppletInstances;

  @property() _rawAssessments = new StoreSubscriber(
    this,
    () =>  derived(this._sensemakerStore.resourceAssessments(), (assessments) => {
      // Might want to mutate this in some way before returning
      return assessments
    }),
    () => [this._sensemakerStore],
  );

  @property() loaded: boolean = false;
  @property({ type: AssessmentTableType }) tableType;
  @property({ type: String }) resourceName;
  @property({ type: String }) resourceDefEh;

  // Asssessment/Resource renderer dictionary, keyed by Applet EH
  @state() _appletInstanceRenderers : StoreSubscriber<any> = new StoreSubscriber(
    this,
    () =>  derived(this._currentAppletInstances.store, (appletInstanceInfos: any) => {
      //@ts-ignore
      return !!appletInstanceInfos && Object.values(appletInstanceInfos).some(appletInfo => appletInfo!.gui)
      //@ts-ignore
        ? Object.fromEntries((Object.entries(appletInstanceInfos) || [])?.map(([appletEh, appletInfo]) => {
          if(typeof appletInfo?.gui == 'undefined') return;
          return [appletEh, {...(appletInfo as any)?.gui?.resourceRenderers, ...(appletInfo as any).gui.assessmentWidgets}]
        }).filter(value => !!value) || [])
        : null
    }),
    () => [this.loaded],
  );

  @property() selectedContext;
  @property() selectedContextEhB64!: EntryHashB64;
  @property() resourceDefEntries!: object[];
  
  @state() private _widgetConfigBlocksForResourceDef: {EntryHashB64: AssessmentWidgetBlockConfig[]} | {} = {};
  @state() private _dimensionEntries!: EntryRecord<Dimension>[];
  @state() private _methodEntries!: Method[];
  @state() private _objectiveDimensionNames: string[] = [];
  @state() private _subjectiveDimensionNames: string[] = [];
  @state() private _contextEntry!: CulturalContext;

  // To be fed as props to the dashboard table component
  @property() fieldDefs;
  @property() filteredTableRecords: AssessmentTableRecord[] = [];

  async firstUpdated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>) {
    await this.fetchSelectedDimensionEntries();
    await this.fetchWidgetConfigBlocks();
    await this.fetchMethods();
    this.partitionDimensionEntries();
  }

  async updated(changedProps) {
    if (
      !!this.resourceDefEntries && !!this._dimensionEntries && (changedProps.has('_objectiveDimensionNames') // all fetching complete by this point, continue to filter/map assessments
      || changedProps.has('resourceDefEh')) // ResourceDef has changed, need to refilter
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
      !this.resourceDefEh || this.resourceDefEh == 'none'
        ? Object.values(assessments).flat()
        : this.filterByResourceDefEh(assessments.flat(), this.resourceDefEh)
    ) as Assessment[];

    // By objective/subjective dimension names
    let filteredByDimension;

    if (this.tableType === AssessmentTableType.Context) {
      filteredByDimension = this.filterByDimensionNames(
        filteredByResourceDef,
        this._objectiveDimensionNames,
      );
    } else {
      filteredByDimension = this.filterByDimensionNames(
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
      // tripleFiltered = this.filterByDimensionEh(
      //   filteredByDimension,
      //   encodeHashToBase64(this._contextEntry.thresholds[0].dimension_eh),
      // );
      // // TODO: cache each context's results and extract this all to a method
      // tripleFiltered = tripleFiltered.filter(assessment => {
      //   if(!this.contextEhsB64?.length) return false;
      //   const matchingContextEntryDefHash = this.contextEhsB64.find((eHB64) => encodeHashToBase64(assessment.resource_eh) === eHB64)
      //   if(matchingContextEntryDefHash) {
      //     // Filter out the oldest objective dimension values (so we have the latest average)
      //     const results = tripleFiltered.filter(assessment => encodeHashToBase64(assessment.resource_eh) === matchingContextEntryDefHash)
      //     const latestAssessmentFromResults = results.sort((a, b) => b.timestamp > a.timestamp).slice(-1)
      //     return latestAssessmentFromResults[0] == assessment
      //   }
      // })
    }
// console.log('tripleFiltered || filteredByMethodType :>> ', tripleFiltered || filteredByMethodType);
    return tripleFiltered || filteredByDimension;
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

  filterByDimensionNames(resourceAssessments: Assessment[], filteringDimensions: string[]): Assessment[] {
    return resourceAssessments.filter((assessment: Assessment) => {
      return filteringDimensions.some(dimension => {
        const foundEntry = this._dimensionEntries.find(eR => eR.entry.name == dimension);
        return foundEntry && compareUint8Arrays(foundEntry.entryHash, assessment.dimension_eh)
      })
    });
  }

  getControlForAssessment(assessment: Assessment) : InputAssessmentWidgetDelegate | void {
    try {
      return createInputAssessmentWidgetDelegate(this._sensemakerStore, assessment.dimension_eh, assessment.resource_def_eh, assessment.resource_eh, assessment)
    } catch (error) {
      console.error('Error creating delegate: ', error)
    }
  };

  // Mapping
  mapAssessmentToAssessmentTableRecord(assessment: Assessment): AssessmentTableRecord {
    const linkedResourceDef = this.resourceDefEntries.find((rd: any) => compareUint8Arrays(assessment.resource_def_eh, rd.resource_def_eh)) as ResourceDef & {resource_def_eh: EntryHash};
    if(!linkedResourceDef) throw new Error('No ResourceDef record for this assessment');
    if(this._appletInstanceRenderers.value == null) throw new Error('No applet instance infos found');
    
    const linkedResourceDefApplet = this._currentAppletInstances.value[encodeHashToBase64(linkedResourceDef.applet_eh)];
    const linkedResourceDefRenderers = this._appletInstanceRenderers.value[encodeHashToBase64(linkedResourceDef.applet_eh)];

    if(!linkedResourceDefRenderers || !linkedResourceDefRenderers) {
      throw new Error('No renderers/applet instance info found for this ResourceDef');
    };
    
    // Base record with basic fields
    const baseRecord = {
      neighbour: encodeHashToBase64(assessment.author),
      resource: {
        renderer: linkedResourceDefRenderers[linkedResourceDef.resource_name],
        resource_def_eh: assessment.resource_def_eh,
        resource_eh: assessment.resource_eh,
      },
    } as AssessmentTableRecord;

    const delegate = this.getControlForAssessment(assessment);
    const gui = linkedResourceDefApplet?.gui;
    if (!delegate || !gui || !this._dimensionEntries) return baseRecord; // We are unable to return renedered assessments, but return the base record so data exists in the table
    
    try {
      for (let dimensionEntry of this._dimensionEntries) {
        if(dimensionEntry.entry.computed) continue; // Exclude objective dimensions
        if(compareUint8Arrays(assessment.dimension_eh, dimensionEntry.entryHash) && this._widgetConfigBlocksForResourceDef[encodeHashToBase64(assessment.resource_def_eh)]) {
          // Assume that validation on client/zome has enforced XOR on input/output dimensions and use dimension EH comparison to find widget control
          const controls = this._widgetConfigBlocksForResourceDef[encodeHashToBase64(assessment.resource_def_eh)].find(widgetConfig => compareUint8Arrays(dimensionEntry.entryHash, widgetConfig.inputAssessmentWidget.dimensionEh))
          if(!controls) throw new Error('Could not find a widget control in the widget config block that matches your assessment dimension');

          const inputControlName = controls.inputAssessmentWidget.componentName;
          const controlRenderer = (Object.values(linkedResourceDefRenderers) as AssessmentWidgetRenderer[]).find((renderer: AssessmentWidgetRenderer) => renderer.name == inputControlName);
          if(!controlRenderer) throw new Error('Could not find a renderer for the widget config block that matches your assessment dimension');

          baseRecord[dimensionEntry.entry.name] = {
            delegate,
            renderer: controlRenderer.component
          }
        } else {
          baseRecord[dimensionEntry.entry.name] = {};
        }
      }
    } catch (error) {
        this.dispatchEvent(
          new CustomEvent("trigger-alert", {
            detail: { 
              title: "Some Controls Not Configured",
              msg: "Your controls have not all been configured correctly -  go to the *Assessments* screen to configure them!",
              type: "danger",
              closable: true,
            },
            bubbles: true,
            composed: true,
          })
        );
    }
    return baseRecord;
  }

  generateContextFieldDefs(): { [x: string]: FieldDefinition<AssessmentTableRecord> } {
    const dimensions = this._dimensionEntries.map(eR => eR.entry);
    const contextFieldEntries = Object.values(dimensions).filter(
      ({name}: {name: string}) =>
        this.tableType === AssessmentTableType.Resource
          ? this._subjectiveDimensionNames.includes(name)
          : this._objectiveDimensionNames.includes(name)
    );
    
    switch (this.tableType) {
      case AssessmentTableType.Resource:
        const fieldEntriesResource = contextFieldEntries.map(
          ({name}: {name: string}) => ({
            [name]: new FieldDefinition<AssessmentTableRecord>({
              heading: generateHeaderHTML('Assessment', cleanResourceNameForUI(name)),
              decorator: (value : DecoratorProps) => {
                if(typeof value?.renderer == 'undefined' || typeof value?.delegate == 'undefined') return null;
                return html`
                  <input-assessment-renderer
                    .component=${value.renderer}
                    .nhDelegate=${value.delegate}
                  ></input-assessment-renderer>
                `
              }
            }),
          }),
        );
        return fieldEntriesResource.reduce((fields, field) => ({ ...fields, ...field }), {});
      case AssessmentTableType.Context:
        const fieldEntriesContext = contextFieldEntries.map(
          ({name}: {name: string}) => ({
            [name]: new FieldDefinition<AssessmentTableRecord>({
              heading: generateHeaderHTML('Dimension', cleanResourceNameForUI(name)),
              decorator: (value: any) => {
                return value[0]
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
    return html`
      <dashboard-table
        .resourceName=${this.resourceName}
        .resourceDefEntries=${this.resourceDefEntries}
        .assessments=${this.filteredTableRecords}
        .tableType=${this.tableType}
        .contextFieldDefs=${this.fieldDefs}
      ></dashboard-table>
    `;
  }
  
  static elementDefinitions = { 
    'dashboard-table': DashboardTable,
    'input-assessment-renderer': InputAssessmentRenderer,
  }

  static styles = [
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

  async fetchWidgetConfigBlocks() {
    if (!this._sensemakerStore || !this.resourceDefEntries) return;
    try {
      const configs = {} as {EntryHashB64: AssessmentWidgetBlockConfig[]};
      serializeAsyncActions<Array<AssessmentWidgetBlockConfig>>([...this.resourceDefEntries.map(
        (resourceDef: any) => {
          return async () => { return Promise.resolve(this._widgetConfigBlocksForResourceDef[encodeHashToBase64(resourceDef.resource_def_eh) as EntryHashB64] = await this._sensemakerStore.getAssessmentWidgetTrayConfig(resourceDef.resource_def_eh))}
        }
      ), async() => Promise.resolve(console.log('fetched widget config blocks for resource defs :>> ',  this._widgetConfigBlocksForResourceDef) as any)])

    } catch (error) {
      console.error(error);
    }
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
      this._dimensionEntries = entryRecords;
    } catch (error) {
      console.log('Error fetching dimension details: ', error);
    }
  }

  async fetchMethods() {
    try {
      const entryRecords = await this._sensemakerStore.getMethods();
      this._methodEntries = entryRecords.map(eR => eR.entry) as Method[];
    } catch (error) {
      console.log('Error fetching method details: ', error);
    }
  }

  partitionDimensionEntries() {
    if (!this._dimensionEntries) return;
    
    let [subjective, objective] = this._dimensionEntries.map(eR => eR.entry).reduce(
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
