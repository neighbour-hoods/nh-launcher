import {
  ActionHash,
  AgentPubKey,
  AppAgentClient,
  AppSignal,
  encodeHashToBase64,
  EntryHash,
  EntryHashB64,
  Record as HolochainRecord,
  RoleName
} from '@holochain/client';
import { SensemakerService } from './sensemakerService';
import {
  AppletConfig,
  AppletConfigInput,
  Assessment,
  ComputeContextInput,
  CreateAssessmentInput,
  CulturalContext,
  Dimension,
  GetAssessmentsForResourceInput,
  Method,
  Range,
  ResourceDef,
  RunMethodInput,
  SignalPayload,
  AssessmentControlConfig,
  AssessmentControlRegistrationInput,
  GetMethodsForDimensionQueryParams,
  AssessmentTrayConfig,
} from './index';
import { derived, Readable, Writable, writable } from 'svelte/store';
import { compareUint8Arrays, getLatestAssessment, Option, serializeAsyncActions } from './utils';
import { createContext } from '@lit/context';
import { get } from "svelte/store";
import { EntryRecord } from '@holochain-open-dev/utils';

interface ContextResults {
  [culturalContextName: string]: EntryHash[],
}

export class SensemakerStore {
  _contextResults: Writable<ContextResults> = writable({});

  ranges: Writable<Map<EntryHashB64, EntryRecord<Range>>> = writable(new Map<EntryHashB64, EntryRecord<Range>>());
  dimensions: Writable<Map<EntryHashB64, EntryRecord<Dimension>>> = writable(new Map<EntryHashB64, EntryRecord<Dimension>>());
  methods: Writable<Map<EntryHashB64, EntryRecord<Method>>> = writable(new Map<EntryHashB64, EntryRecord<Method>>());
  resourceDefinitions: Writable<Map<EntryHashB64, EntryRecord<ResourceDef>>> = writable(new Map<EntryHashB64, EntryRecord<ResourceDef>>());
  contexts: Writable<Map<string, Map<EntryHashB64, CulturalContext>>> = writable(new Map<string, Map<EntryHashB64, CulturalContext>>());

  _resourceAssessments: Writable<{ [entryHash: string]: Array<Assessment> }> = writable({});

  _activeMethod: Writable<{
    [resourceDefEh: string]: EntryHashB64 // mapping from resourceDefEh to active methodEh
  }> = writable({});

  /** Static info */
  public myAgentPubKey: AgentPubKey;
  protected service: SensemakerService;

  constructor(public client: AppAgentClient, public roleName: RoleName, public zomeName = 'sensemaker')
  {
    client.on("signal", (signal: AppSignal) => {
      // console.log("received signal in sensemaker store: ", signal)
      const payload = (signal.payload as SignalPayload);

      switch (payload.type) {
        case "NewAssessment":
          const assessment = payload.assessment;
          this._resourceAssessments.update(resourceAssessments => {
            const maybePrevAssessments = resourceAssessments[encodeHashToBase64(assessment.resource_eh)];
            const prevAssessments = maybePrevAssessments ? maybePrevAssessments : [];
            resourceAssessments[encodeHashToBase64(assessment.resource_eh)] = [...prevAssessments, assessment]
            return resourceAssessments;
          })
          break;
      }
    });

    this.service = new SensemakerService(client, roleName);
    this.myAgentPubKey = this.service.myPubKey();
  }

  // if provided a list of resource ehs, filter the assessments to only those resources, and return that object, otherwise return the whole thing.
  resourceAssessments(resource_ehs?: Array<EntryHashB64>) {
    return derived(this._resourceAssessments, resourceAssessments => {
      if(resource_ehs) {
        const filteredResourceAssessments = resource_ehs.reduce((resourceSubsetAssessment, resource_eh) => {
          if (resourceAssessments.hasOwnProperty(resource_eh)) {
            resourceSubsetAssessment[resource_eh] = resourceAssessments[resource_eh];
          }
          return resourceSubsetAssessment;
        }, {});
        return filteredResourceAssessments;
      }
      else {
        return resourceAssessments;
      }
    })
  }

  contextResults() {
    return derived(this._contextResults, contextResults => contextResults)
  }

  activeMethod() {
    return derived(this._activeMethod, activeMethod => activeMethod)
  }

  isAssessedByMeAlongDimension(resource_eh: EntryHashB64, dimension_eh: EntryHashB64) {
    return derived(this._resourceAssessments, resourceAssessments => {
      const assessments = resourceAssessments[resource_eh];
      if (assessments) {
        return assessments.some(assessment => encodeHashToBase64(assessment.author) === encodeHashToBase64(this.myAgentPubKey) && encodeHashToBase64(assessment.dimension_eh) === dimension_eh);
      }
      else {
        return false;
      }
    })
  }

  myLatestAssessmentAlongDimension(resource_eh: EntryHashB64, dimension_eh: EntryHashB64): Readable<Assessment | null> {
    return derived(this._resourceAssessments, resourceAssessments => {
      const assessments = resourceAssessments[resource_eh];
      if (!assessments) {
        return null;
      }
      const myAssessments = assessments.filter(assessment => encodeHashToBase64(assessment.author) === encodeHashToBase64(this.myAgentPubKey));
      if (myAssessments.length > 0) {
        return getLatestAssessment(myAssessments, dimension_eh);
      }
      else {
        return null;
      }
    })
  }

  async getAllAgents() {
    return await this.service.getAllAgents();
  }

  async createRange(range: Range): Promise<EntryRecord<Range>> {
    const rangeRecord = await this.service.createRange(range);
    const entryRecord = new EntryRecord<Range>(rangeRecord);
    this.ranges.update(ranges => {
      ranges.set(encodeHashToBase64(entryRecord.entryHash), entryRecord);
      return ranges;
    });
    return entryRecord;
  }

  async getRange(rangeEh: EntryHash): Promise<EntryRecord<Range>> {
    const range = get(this.ranges).get(encodeHashToBase64(rangeEh));
    if(range) {
      return range;
    }
    else {
      const rangeRecord = await this.service.getRange(rangeEh)
      const entryRecord = new EntryRecord<Range>(rangeRecord);
      this.ranges.update(ranges => {
        ranges.set(encodeHashToBase64(entryRecord.entryHash), entryRecord);
        return ranges;
      });
      return entryRecord;
    }
  }

  async getRanges(): Promise<Array<EntryRecord<Range>>> {
    const rangeRecords = await this.service.getRanges();
    const entryRecords = rangeRecords.map(rangeRecord => new EntryRecord<Range>(rangeRecord));
    this.ranges.update(ranges => {
      entryRecords.forEach(entryRecord => {
        ranges.set(encodeHashToBase64(entryRecord.entryHash), entryRecord);
      });
      return ranges;
    });
    return entryRecords;
  }

  async createOutputDimensionAndMethodAtomically(input: {outputDimension: Dimension, partialMethod: Partial<Method>}): Promise<{outputDimension: EntryRecord<Dimension>, method: EntryRecord<Method>}> {
    const [dimensionRecord, methodRecord] = await this.service.createOutputDimensionAndMethodAtomically(input);

    const dimensionEntryRecord = new EntryRecord<Dimension>(dimensionRecord);
    this.dimensions.update(dimensions => {
      dimensions.set(encodeHashToBase64(dimensionEntryRecord.entryHash), dimensionEntryRecord);
      return dimensions;
    });

    const methodEntryRecord = new EntryRecord<Method>(methodRecord);
    this.methods.update(methods => {
      methods.set(encodeHashToBase64(methodEntryRecord.entryHash), methodEntryRecord);
      return methods;
    });

    return { outputDimension: dimensionEntryRecord, method: methodEntryRecord };
  }

  // TODO: update applet config update to key by applet name
  async createDimension(dimension: Dimension): Promise<EntryRecord<Dimension>> {
    const dimensionRecord = await this.service.createDimension(dimension);
    const entryRecord = new EntryRecord<Dimension>(dimensionRecord);
    this.dimensions.update(dimensions => {
      dimensions.set(encodeHashToBase64(entryRecord.entryHash), entryRecord);
      return dimensions;
    });
    return entryRecord;
  }

  async getDimension(dimensionEh: EntryHash): Promise<EntryRecord<Dimension>> {
    const dimension = get(this.dimensions).get(encodeHashToBase64(dimensionEh));
    if(dimension) {
      return dimension;
    }
    else {
      const dimensionRecord = await this.service.getDimension(dimensionEh)
      const entryRecord = new EntryRecord<Dimension>(dimensionRecord);
      this.dimensions.update(dimensions => {
        dimensions.set(encodeHashToBase64(entryRecord.entryHash), entryRecord);
        return dimensions;
      });
      return entryRecord;
    }
  }

  async getDimensions(): Promise<Array<EntryRecord<Dimension>>> {
    const dimensionRecords = await this.service.getDimensions();
    const entryRecords = dimensionRecords.map(dimensionRecord => new EntryRecord<Dimension>(dimensionRecord));
    this.dimensions.update(dimensions => {
      entryRecords.forEach(entryRecord => {
        dimensions.set(encodeHashToBase64(entryRecord.entryHash), entryRecord);
      });
      return dimensions;
    });
    return entryRecords;
  }

  async createResourceDef(resourceDef: ResourceDef): Promise<EntryRecord<ResourceDef>> {
    const resourceDefRecord = await this.service.createResourceDef(resourceDef);
    const entryRecord = new EntryRecord<ResourceDef>(resourceDefRecord);
    this.resourceDefinitions.update(resourceDefs => {
      resourceDefs.set(encodeHashToBase64(entryRecord.entryHash), entryRecord);
      return resourceDefs;
    });
    return entryRecord;
  }

  async getResourceDef(resourceDefEh: EntryHash): Promise<EntryRecord<ResourceDef>> {
    const resourceDef = get(this.resourceDefinitions).get(encodeHashToBase64(resourceDefEh));
    if(resourceDef) {
      return resourceDef;
    }
    else {
      const resourceDefRecord = await this.service.getResourceDef(resourceDefEh)
      const entryRecord = new EntryRecord<ResourceDef>(resourceDefRecord);
      this.resourceDefinitions.update(resourceDefs => {
        resourceDefs.set(encodeHashToBase64(entryRecord.entryHash), entryRecord);
        return resourceDefs;
      });
      return entryRecord;
    }
  }

  async getResourceDefs(): Promise<Array<EntryRecord<ResourceDef>>> {
      const resourceDefRecords : HolochainRecord[] = await this.service.getResourceDefs();
      const entryRecords = resourceDefRecords.map((record: HolochainRecord) => new EntryRecord<ResourceDef>(record));
      this.resourceDefinitions.update(resourceDefinitions => {
        entryRecords.forEach(entryRecord => {
          resourceDefinitions.set(encodeHashToBase64(entryRecord.entryHash), entryRecord);
        });
        return resourceDefinitions;
      });
      return entryRecords
  }

  async createAssessment(assessment: CreateAssessmentInput): Promise<EntryRecord<Assessment>> {
    const assessmentRecord = await this.service.createAssessment(assessment);
    const entryRecord = new EntryRecord<Assessment>(assessmentRecord);
    this._resourceAssessments.update(resourceAssessments => {
      const maybePrevAssessments = resourceAssessments[encodeHashToBase64(assessment.resource_eh)];
      const prevAssessments = maybePrevAssessments ? maybePrevAssessments : [];
      resourceAssessments[encodeHashToBase64(assessment.resource_eh)] = [...prevAssessments, entryRecord.entry]
      return resourceAssessments;
    })
    return entryRecord;
  }

  async getAssessment(assessmentEh: EntryHash): Promise<EntryRecord<Assessment>> {
    const record = await this.service.getAssessment(assessmentEh)
    return new EntryRecord<Assessment>(record)
  }

  async getAssessmentsForResources(getAssessmentsInput: GetAssessmentsForResourceInput): Promise<Record<EntryHashB64, Array<Assessment>>> {
    const resourceAssessments = await this.service.getAssessmentsForResources(getAssessmentsInput);
    // trying to update the store object properly so there is a detected difference between previous and new
    this._resourceAssessments.update(resourceAssessmentsPrev => {
      let resourceAssessmentsNew = {...resourceAssessmentsPrev, ...resourceAssessments};
      return resourceAssessmentsNew;
    });
    return resourceAssessments;
  }

  async getMyAssessmentsForResources(getAssessmentsInput: GetAssessmentsForResourceInput): Promise<Record<EntryHashB64, Array<Assessment>>> {
    const resourceAssessments: Record<string, Assessment[]> = await this.getAssessmentsForResources(getAssessmentsInput);
    const deconstructed = Object.entries(resourceAssessments);

    return Object.fromEntries(deconstructed.map(([resourceEh, assessments]: ([string, Assessment[]])) => {
      const myAssessments = assessments.filter(assessment => compareUint8Arrays(assessment.author, this.myAgentPubKey))
      return [resourceEh, myAssessments]
    })) as Record<string, Assessment[]>
  }

  async createMethod(method: Method): Promise<EntryRecord<Method>> {
    const methodRecord = await this.service.createMethod(method);
    const entryRecord = new EntryRecord<Method>(methodRecord);
    this.methods.update((methods) => {
      methods.set(encodeHashToBase64(entryRecord.entryHash), entryRecord);
      return methods;
    });
    return entryRecord;
  }

  async getMethod(methodEh: EntryHash): Promise<EntryRecord<Method>> {
    const method = get(this.methods).get(encodeHashToBase64(methodEh));
    if (method) {
      return method;
    }
    else {
      const methodRecord = await this.service.getMethod(methodEh)
      const entryRecord = new EntryRecord<Method>(methodRecord);
      this.methods.update((methods) => {
        methods.set(encodeHashToBase64(entryRecord.entryHash), entryRecord);
        return methods;
      });
      return entryRecord;
    }
  }
  async getMethods(): Promise<Array<EntryRecord<Method>>> {
      const methodRecords : HolochainRecord[] = await this.service.getMethods();
      const entryRecords = methodRecords.map((record: HolochainRecord) => new EntryRecord<Method>(record));
      this.methods.update(methods => {
        entryRecords.forEach(entryRecord => {
          methods.set(encodeHashToBase64(entryRecord.entryHash), entryRecord);
        });
        return methods;
      });
      return entryRecords;
  }
  async getMethodsForDimension(queryParams: GetMethodsForDimensionQueryParams): Promise<Array<EntryRecord<Method>>> {
    // TODO: get from memory first?
      const methodRecords : HolochainRecord[] = await this.service.getMethodsForDimensionEntryHash(queryParams);
      const entryRecords = methodRecords.map((record: HolochainRecord) => new EntryRecord<Method>(record));

      return entryRecords;
  }

  async runMethod(runMethodInput: RunMethodInput): Promise<EntryRecord<Assessment>> {
    let result = await this.service.runMethod(runMethodInput);
    let assessment = new EntryRecord<Assessment>(result);
    this._resourceAssessments.update(resourceAssessments => {
      const maybePrevAssessments = resourceAssessments[encodeHashToBase64(assessment.entry.resource_eh)];
      const prevAssessments = maybePrevAssessments ? maybePrevAssessments : [];
      resourceAssessments[encodeHashToBase64(runMethodInput.resource_eh)] = [...prevAssessments, assessment.entry]
      return resourceAssessments;
    })
    return assessment
  }

  async createCulturalContext(culturalContext: CulturalContext, appletName: string): Promise<EntryHash> {
    const contextRecord = await this.service.createCulturalContext(culturalContext);
    const entryRecord = new EntryRecord<CulturalContext>(contextRecord);
    this.contexts.update(contexts => {
      const appletContexts = contexts.get(appletName);
      if (appletContexts) {
        appletContexts.set(encodeHashToBase64(entryRecord.entryHash), entryRecord.entry);
        contexts.set(appletName, appletContexts);
      }
      else {
        contexts.set(appletName, new Map<EntryHashB64, CulturalContext>([[encodeHashToBase64(entryRecord.entryHash), entryRecord.entry]]));
      }
      return contexts;
    });
    return entryRecord.entryHash;
  }

  async getCulturalContext(culturalContextEh: EntryHash): Promise<EntryRecord<CulturalContext>> {
    // :TODO: if we want cultural contexts to be bound to applets, it should be part of the cultural context entry.
    const record = await this.service.getCulturalContext(culturalContextEh);
    return new EntryRecord<CulturalContext>(record)
  }

  async computeContext(contextName: string, computeContextInput: ComputeContextInput): Promise<Array<EntryHash>> {
    const contextResult = await this.service.computeContext(computeContextInput);
    this._contextResults.update(contextResults => {
      contextResults[contextName] = contextResult;
      return contextResults;
    });
    return contextResult;
  }

  async getAssessmentTrayConfig(assessmentTrayEh: EntryHash): Promise<EntryRecord<AssessmentTrayConfig> | null> {
    const record = await this.service.getAssessmentTrayConfig(assessmentTrayEh);
    if(!record) return null;
    return new EntryRecord<AssessmentTrayConfig>(record)
  }

  async getAssessmentTrayConfigs(): Promise<Array<EntryRecord<AssessmentTrayConfig>>> {
    const records = await this.service.getAssessmentTrayConfigs();
    return records.map(record => new EntryRecord<AssessmentTrayConfig>(record))
  }

  async setAssessmentTrayConfig(assessmentTrayConfig: AssessmentTrayConfig): Promise<EntryRecord<AssessmentTrayConfig>> {
    const record = await this.service.setAssessmentTrayConfig(assessmentTrayConfig);
    return new EntryRecord<AssessmentTrayConfig>(record)
  }

  async updateAssessmentTrayConfig(originalActionHash: ActionHash, updatedAssessmentTrayConfig: AssessmentTrayConfig): Promise<EntryRecord<AssessmentTrayConfig> | null> {
    const newEntryHash = await this.service.updateAssessmentTrayConfig(originalActionHash, updatedAssessmentTrayConfig);
    if(!newEntryHash) return null; // TODO: decide if this should actually just return an eH and break with the entry record return convention established elsewhere
    return this.getAssessmentTrayConfig(newEntryHash)
  }

  async getDefaultAssessmentTrayForResourceDef(resourceDefEh: EntryHash): Promise<EntryRecord<AssessmentTrayConfig> | null> {
    const record = await this.service.getDefaultAssessmentTrayForResourceDef(resourceDefEh);
    if(!record) return null;
    return new EntryRecord<AssessmentTrayConfig>(record)
  }

  async setDefaultAssessmentTrayForResourceDef(resourceDefEh: EntryHash, assessmentTrayEh: EntryHash): Promise<EntryHash> {
    return this.service.setDefaultAssessmentTrayForResourceDef(resourceDefEh, assessmentTrayEh)
  }

  async updateAppletConfig(appletConfig: AppletConfig): Promise<AppletConfig> {
    // update all the primitives in their respective store
    for (const rangeEh of Object.values(appletConfig.ranges)) {
      await this.getRange(rangeEh);
    }
    for (const dimensionEh of Object.values(appletConfig.dimensions)) {
      await this.getDimension(dimensionEh);
    }
    for (const resourceDefEh of Object.values(appletConfig.resource_defs)) {
      await this.getResourceDef(resourceDefEh);
      // initialize the active method to the first method for each resource def
      this.updateActiveMethod(
        encodeHashToBase64(resourceDefEh),
        Array.from(get(this.methods).keys())[0]
      );
    }
    for (const contextEh of Object.values(appletConfig.cultural_contexts)) {
      const entryRecord = await this.getCulturalContext(contextEh);
      this.contexts.update((contexts) => {
        const appletContexts = contexts.get(appletConfig.name);
        if (appletContexts) {
          appletContexts.set(encodeHashToBase64(entryRecord.entryHash), entryRecord.entry);
          contexts.set(appletConfig.name, appletContexts);
        } else {
          contexts.set(
            appletConfig.name,
            new Map<EntryHashB64, CulturalContext>([
              [encodeHashToBase64(entryRecord.entryHash), entryRecord.entry],
            ])
          );
        }
        return contexts;
      });
    }
    return appletConfig;
  }

  async registerAssessmentControl(assessmentControlRegistration: AssessmentControlRegistrationInput): Promise<AssessmentControlRegistrationInput> {
    const result = await this.service.registerAssessmentControl(assessmentControlRegistration);
    return new EntryRecord<AssessmentControlRegistrationInput>(result).entry
  }

  async getRegisteredAssessmentControls(): Promise<Record<EntryHashB64, AssessmentControlRegistrationInput>> {
    const result : HolochainRecord[] = await this.service.getRegisteredAssessmentControls();
    return result.reduce((record, value) => {
      const entryRecord = new EntryRecord<AssessmentControlRegistrationInput>(value);
      const key: EntryHashB64 = encodeHashToBase64(entryRecord.entryHash);
      const registration: AssessmentControlRegistrationInput = entryRecord.entry;

      record[key] = registration;
      return record
    }, {} as Record<EntryHashB64, AssessmentControlRegistrationInput>)
  }

  async checkIfAppletConfigExists(appletName: string): Promise<Option<AppletConfig>> {
    const maybeAppletConfig = await this.service.checkIfAppletConfigExists(appletName);
    if (maybeAppletConfig) {
      await this.updateAppletConfig(maybeAppletConfig);
    }
    return maybeAppletConfig;
  }

  async registerApplet(appletConfigInput: AppletConfigInput): Promise<AppletConfig> {
    const appletConfig = await this.service.registerApplet(appletConfigInput);
    return await this.updateAppletConfig(appletConfig);
  }

  updateActiveMethod(resourceDefEh: EntryHashB64, methodEh: EntryHashB64) {
    this._activeMethod.update((activeMethods) => {
      activeMethods[resourceDefEh] = methodEh;
      return activeMethods;
    });
  }
}

export const sensemakerStoreContext = createContext<SensemakerStore>(
  'sensemaker-store-context'
);
