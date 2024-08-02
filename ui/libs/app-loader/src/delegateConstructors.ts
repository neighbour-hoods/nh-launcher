import { EntryRecord } from "@holochain-open-dev/utils";
import {
  AppAgentClient,
  AppInfo,
  EntryHash,
} from "@holochain/client";
import {
  AppBlockDelegate,
  Assessment,
  CallbackFn,
  DimensionEh,
  InputAssessmentControlDelegate,
  NeighbourhoodInfo,
  OutputAssessmentControlDelegate,
  RangeValue,
  RangeValueInteger,
  ResourceBlockDelegate,
  ResourceDefEh,
  ResourceEh,
  SensemakerStore,
  UnsubscribeFn
} from "@neighbourhoods/client";

// TODO: refactor this sorting to the Sensemaker store.
function getLatest(assessments: Record<string, Assessment[]>) {
  const sorted = typeof assessments !== 'undefined'
    ? Object.values(assessments)[0].sort((a: Assessment, b: Assessment) => {
        return b.timestamp - a.timestamp;
      })
    : [];
    
    return sorted[0]
}

export class SubscriberManager extends Array<CallbackFn> {
  public subscribe(cb: CallbackFn): UnsubscribeFn {
    this.push(cb);
    return () => {
      const index = this.findIndex(value => value === cb)
      this.splice(index, 1)
    }
  }

  public dispatch(assessment: Assessment | undefined) {
    this.forEach(cb => setTimeout(() => cb(assessment), 0))
  }
}

/**
 * Creates an AppBlockDelegate to be passed into an applet block
 */
export function createAppDelegate(
  appAgentWebsocket: AppAgentClient,
  appInfo: AppInfo,
  neighbourhoodInfo: NeighbourhoodInfo,
  sensemakerStore: SensemakerStore
): AppBlockDelegate {

  const delegate: AppBlockDelegate = {
    appAgentWebsocket,
    appInfo,
    neighbourhoodInfo,
    sensemakerStore
  }

  return delegate;
}

/**
 * Creates an ResourceBlockDelegate to be passed into an resource block
 */
export function createResourceBlockDelegate(
  appAgentWebsocket: AppAgentClient,
  appInfo: AppInfo,
  neighbourhoodInfo: NeighbourhoodInfo,
  resourceEntryHash: EntryHash,
): ResourceBlockDelegate {

  const delegate: ResourceBlockDelegate = {
    appAgentWebsocket,
    appInfo,
    neighbourhoodInfo,
    resourceEntryHash
  }

  return delegate;
}

/**
 * Creates an ResourceBlockDelegate to be passed into an resource block
 */
export function createOutputAssessmentControlDelegate(
  sensemakerStore: SensemakerStore,
  dimensionEh: DimensionEh,
  resourceEh: ResourceEh,
  initialAssessment?: Assessment
): OutputAssessmentControlDelegate {
  const subscribers = new SubscriberManager()

  let assessment: Assessment | undefined = initialAssessment;

  const delegate: OutputAssessmentControlDelegate = {
    /**
     * Get the latest computed assessment for the resource
     *
     */
    async getLatestAssessment(): Promise<Assessment | undefined> {
      let assessments: Record<string, Assessment[]>;
      try {
        assessments = await sensemakerStore.getAssessmentsForResources({
          resource_ehs: [resourceEh],
          dimension_ehs: [dimensionEh],
        });
      } catch (error) {
        console.warn('Could not retrieve assessments for the specified resources and dimensions.');
        return
      }
      return assessment || getLatest(assessments)
    },

    /**
     * Used to subscribe to changes in the assessment value. This delegate can
     * be used as a Svelte Readable, because of this.
     *
     * TODO: need to pipe through changes from the sensemaker store, this does need
     * to be thought out more.
     */
    subscribe(callback: CallbackFn) {
      return subscribers.subscribe(callback)
    }
  }

  return delegate;
}

/**
 * Creates an ResourceBlockDelegate to be passed into an resource block
 */
export function createInputAssessmentControlDelegate(
  sensemakerStore: SensemakerStore,
  dimensionEh: DimensionEh,
  resourceDefEh: ResourceDefEh,
  resourceEh: ResourceEh,
  initialAssessment?: Assessment
): InputAssessmentControlDelegate {
  const subscribers = new SubscriberManager()

  let assessment: Assessment | undefined = initialAssessment;

  const delegate: InputAssessmentControlDelegate = {
    /**
     * Used to render the currently selected value for the user
     *
     */
    async getLatestAssessmentForUser(): Promise<Assessment | undefined> {
      let assessments: Record<string, Assessment[]>;
      try {
        assessments = await sensemakerStore.getMyAssessmentsForResources({
          resource_ehs: [resourceEh],
          dimension_ehs: [dimensionEh],
        });
      } catch (error) {
        console.warn('Could not retrieve assessments for the specified resources and dimensions.');
        return
      }
      return getLatest(assessments as Record<string, Assessment[]>)
    },

    /**
     * Used to subscribe to changes in the assessment value. This delegate can
     * be used as a Svelte Readable, because of this.
     *
     * TODO: need to pipe through changes from the sensemaker store, this does need
     * to be thought out more.
     */
    subscribe(callback: CallbackFn) {
      return subscribers.subscribe(callback)
    },

    /**
     * Create an assessment for the current user
     */
    async createAssessment(value: RangeValue): Promise<EntryRecord<Assessment>> {
      const assessmentEntryRecord = await sensemakerStore.createAssessment({
        value,
        dimension_eh: dimensionEh,
        resource_eh: resourceEh,
        resource_def_eh: resourceDefEh,
        maybe_input_dataset: null
      });
      subscribers.dispatch(assessmentEntryRecord.entry)
      return assessmentEntryRecord;
    },

    /**
     * Invalidate the last assessment
     */
    invalidateAssessment() {
      assessment = undefined
      subscribers.dispatch(assessment)
      console.error("We are still discussing implementing this feature. You last used")
    }
  }

  return delegate;
}

export class FakeInputAssessmentControlDelegate implements InputAssessmentControlDelegate {
  public subscribers;
  public assessment: Assessment | undefined
  public latestAssessment: Assessment | undefined

  constructor() {
    this.subscribers = new SubscriberManager();

  }

  /**
   * Mock assessment value
   */
  async getLatestAssessmentForUser(): Promise<Assessment | undefined> {
    return Promise.resolve(this.latestAssessment);
  }

  /**
   * Mock assessment value
   */
  async getLatestAssessment(): Promise<Assessment | undefined> {
    return Promise.resolve(this.latestAssessment);
  }

  setLatestAssessmentForUser() {
    this.latestAssessment = this.assessment
  }

  subscribe(callback: CallbackFn) {
    return this.subscribers.subscribe(callback)
  }
  //@ts-ignore
  async createAssessment(value: RangeValue): Promise<Partial<EntryRecord<Assessment>>> {
    this.assessment = {
      value
    } as Assessment;

    this.subscribers.dispatch(this.assessment)
    return {entry: this.assessment} as Partial<EntryRecord<Assessment>>;
  }

  invalidateAssessment() {
    this.assessment = undefined
    this.subscribers.dispatch(this.assessment)
    console.error("We are still discussing implementing this feature. You last used")
  }
  
}