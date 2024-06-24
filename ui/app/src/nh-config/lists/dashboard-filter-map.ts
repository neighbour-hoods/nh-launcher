import {
  Assessment,
  AssessmentControlConfig,
  AssessmentControlRenderer,
  CulturalContext,
  Dimension,
  InputAssessmentControlDelegate,
  Method,
  OutputAssessmentControlDelegate,
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
import { compareUint8Arrays, createInputAssessmentControlDelegate, InputAssessmentRenderer } from '../../../../libs/app-loader';
import { appletInstanceInfosContext } from '../../context';
import NHComponent from '@neighbourhoods/design-system-components/ancestors/base';
import { AssessmentTrayConfig } from '@neighbourhoods/client';
import { decode } from '@msgpack/msgpack';

type DecoratorProps = {
  renderer: AssessmentControlRenderer,
  delegate: OutputAssessmentControlDelegate
}

export class DashboardFilterMap extends NHComponent {
  @consume({ context: sensemakerStoreContext, subscribe: true })
  @property({attribute: false}) _sensemakerStore!: SensemakerStore;

  @consume({ context: appletInstanceInfosContext })
  @property({attribute: false}) _currentAppletInstances;

  @property() loaded: boolean = false;
  @property({ type: AssessmentTableType }) tableType;
  @property({ type: String }) resourceName;
  @property({ type: String }) resourceDefEh;

  @state() assessmentsForResources;

  // Asssessment/Resource renderer dictionary, keyed by Applet EH
  @state() _appletInstanceRenderers : StoreSubscriber<any> = new StoreSubscriber(
    this,
    () =>  derived(this._currentAppletInstances.store, (appletInstanceInfos: any) => {
      //@ts-ignore
      return !!appletInstanceInfos && Object.values(appletInstanceInfos).some(appletInfo => appletInfo!.gui)
      //@ts-ignore
        ? Object.fromEntries((Object.entries(appletInstanceInfos) || [])?.map(([appletEh, appletInfo]) => {
          if(typeof appletInfo?.gui == 'undefined') return;
          return [appletEh, {...(appletInfo as any)?.gui?.resourceRenderers, ...(appletInfo as any).gui.assessmentControls}]
        }).filter(value => !!value) || [])
        : null
    }),
    () => [this.loaded],
  );

  @property() selectedContext;
  @property() selectedContextEhB64!: EntryHashB64;
  @property() resourceDefEntries!: object[];
  
  @state() private _assessmentTrayConfigDefaultsForResourceDefs = {};
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
    await this.fetchAssessmentControlConfigs();
    await this.fetchMethods();
    this.partitionDimensionEntries();
    const rawAssessments = await this._sensemakerStore.getAssessmentsForResources({resource_def_ehs: [this.resourceDefEh.resource_def_eh]})
    this.assessmentsForResources = rawAssessments 
    if(typeof this.assessmentsForResources == "object") {
      this.assessmentsForResources = Object.values(rawAssessments).flatMap(assessments => assessments)
        .filter(assessment => (this.resourceDefEh && this.resourceDefEh !== "none")
            ? compareUint8Arrays(this.resourceDefEh, (assessment as any).resource_def_eh)
            : assessment
        ) 
    }
  }

  async updated(changedProps) {
    if (
      !!this.resourceDefEntries && !!this._dimensionEntries && (changedProps.has('_objectiveDimensionNames') // all fetching complete by this point, continue to filter/map assessments
      || changedProps.has('resourceDefEh')
      || changedProps.has('assessmentsForResources')
    ) // ResourceDef or assessments have changed, need to refilter
    ) {
      this.fieldDefs = this.generateContextFieldDefs();
      this.filterMapRawAssessmentsToTableRecords();
    }
  }

  filterMapRawAssessmentsToTableRecords() {
    // Keyed by resource, (not resource-def)
    const assessmentsDict : Record<EntryHashB64, Assessment[]> = this.assessmentsForResources
      .reduce((acc, assessment) => {
        acc[encodeHashToBase64(assessment.resource_eh)]
          ? acc[encodeHashToBase64(assessment.resource_eh)].push(assessment)
          : acc[encodeHashToBase64(assessment.resource_eh)] = [assessment];
        return acc
      } , {});
    console.log('assessmentsDict :>> ', assessmentsDict);
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

    return filteredByDimension;
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

  getControlForAssessment(assessment: Assessment) : InputAssessmentControlDelegate | void {
    try {
      return createInputAssessmentControlDelegate(this._sensemakerStore, assessment.dimension_eh, assessment.resource_def_eh, assessment.resource_eh, assessment)
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
        if(compareUint8Arrays(assessment.dimension_eh, dimensionEntry.entryHash) && this._assessmentTrayConfigDefaultsForResourceDefs[encodeHashToBase64(assessment.resource_def_eh)]) {
          // Assume that validation on client/zome has enforced XOR on input/output dimensions and use dimension EH comparison to find widget control
          console.log('this._assessmentTrayConfigDefaultsForResourceDefs :>> ', this._assessmentTrayConfigDefaultsForResourceDefs);
          const controls = this._assessmentTrayConfigDefaultsForResourceDefs[encodeHashToBase64(assessment.resource_def_eh)]?.assessmentControlConfigs.find(widgetConfig => compareUint8Arrays(dimensionEntry.entryHash, widgetConfig.inputAssessmentControl.dimensionEh))
          if(!controls) throw new Error('Could not find a widget control in the widget config block that matches your assessment dimension');

          const inputControlName = controls.inputAssessmentControl.componentName;
          const controlRenderer = (Object.values(linkedResourceDefRenderers) as AssessmentControlRenderer[]).find((renderer: AssessmentControlRenderer) => renderer.name == inputControlName);
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
              msg: "Your controls have not all been configured correctly -  go to the *Assessment Trays* screen to configure them!",
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
    // console.log('this.filteredTableRecords :>> ', this.filteredTableRecords);
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

  async fetchAssessmentControlConfigs() {
    if (!this._sensemakerStore || !this.resourceDefEntries) return;
    try {
      const configs = {} as {EntryHashB64: AssessmentControlConfig[]};
      serializeAsyncActions<Array<AssessmentControlConfig>>([...this.resourceDefEntries.map(
        (resourceDef: any) => {
          return async () => {
            const maybeTray = await this._sensemakerStore.getDefaultAssessmentTrayForResourceDef(resourceDef.resource_def_eh);
            if(!maybeTray) return;
            const entryRecord = new EntryRecord<AssessmentTrayConfig>(maybeTray);
            return Promise.resolve(this._assessmentTrayConfigDefaultsForResourceDefs[encodeHashToBase64(resourceDef.resource_def_eh) as EntryHashB64] = decode(entryRecord.record.record.entry['Present'].entry))}
        }
      ), async() => Promise.resolve(console.log('fetched default assessment trays for resource defs :>> ',  this._assessmentTrayConfigDefaultsForResourceDefs) as any)])
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
