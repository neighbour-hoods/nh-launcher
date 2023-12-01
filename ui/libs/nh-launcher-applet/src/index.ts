import { ProfilesStore } from "@holochain-open-dev/profiles";
import {
  AppInfo,
  AppAgentClient,
  EntryHash,
} from "@holochain/client";
import {
  AppletConfigInput,
  Assessment,
  ConcreteAssessDimensionWidget,
  ConcreteDisplayDimensionWidget,
  SensemakerStore,
  Range,
  RangeKind,
  CreateAssessmentInput,
} from "@neighbourhoods/client";

/**
 * An unsubscribe function returned from a subscribe call
 */
export type UnsubscribeFn = () => void;

/**
 * A callback function to be called when updates occur
 */
export type CallbackFn = (_: Assessment | null) => void;

/**
 * Generic constructor type
 */
export type Constructor<T = Object> = new (...args: any[]) => T;

/**
 * Simple interface for allowing a a delegate to be set
 */
export interface NHDelegateReceiver<D> {
  set nhDelegate(delegate: D)
}
export type NHDelegateReceiverComponent<D> = (HTMLElement & NHDelegateReceiver<D>)
export type NHDelegateReceiverConstructor<D> = Constructor<NHDelegateReceiverComponent<D>>

/**
 * The only interface needed for a resource renderer.
 * Technically, if we knew what zome call correpsonded to which reading of a
 * resource, we could create a deletgate that only allowed minimal access.
 */
export interface ResourceBlockDelegate {
  appAgentWebsocket: AppAgentClient
}

/**
 * The interface currently exposed to an application for full screen app blocks
 */
export interface AppBlockDelegate {
  appAgentWebsocket: AppAgentClient
  appletInfo: AppletInfo[]
  sensemakerStore: SensemakerStore
  profilesStore: ProfilesStore
}

/**
 * The minimal interface needed for an assessment widget
 */
export interface InputAssessmentWidgetDelegate {
  getLatestAssessmentForUser(resourceEh: EntryHash, dimensionEh: EntryHash): Assessment | null // get the latest assessment value the user created (or none if never assessed or invalidated)
  subscribe(_:CallbackFn, resourceEh: EntryHash, dimensionEh: EntryHash): UnsubscribeFn // subscribe to when the current assessment changes
  createAssessment(assessment: CreateAssessmentInput): Promise<Assessment> // create an assessment
  invalidateLastAssessment(): void // invalidate the last created assessment [ignore for now, we only support creating new assessments]
}

/**
 * The minimal interface needed to render computed assessments
 */
export interface OutputAssessmentWidgetDelegate {
  getLatestAssessment(resourceEh: EntryHash, dimensionEh: EntryHash): Assessment | null // get the latest computed assessment value (regardless of user, for computed dimensions)
  subscribe(_:CallbackFn, reosurceEh: EntryHash, dimensionEh: EntryHash): UnsubscribeFn // subscribe to when the current computed dimension changes
}

/**
 * Defines an Input Assessment Widget
 */
export type InputAssessmentWidgetDefinition = {
  name: string,         // Likely appended to the App name in the dashboard configuration screen
  range: RangeKind,         // Output components must support a range of [-INF, INF] unless it is used with an AVG.
  component: Constructor<NHDelegateReceiverComponent<InputAssessmentWidgetDelegate>>, // Intersection of HTML Element and the delegate interface for
  kind: 'input'
}

/**
 * Defines an Output Assessment Widget
 */
export type OutputAssessmentWidgetDefinition = {
  name: string,         // Likely appended to the App name in the dashboard configuration screen
  range: RangeKind,         // Output components must support a range of [-INF, INF] unless it is used with an AVG.
  component: Constructor<NHDelegateReceiverComponent<OutputAssessmentWidgetDelegate>>,
  kind: 'output'
}

export type AssessmentWidgetDefinition = InputAssessmentWidgetDefinition | OutputAssessmentWidgetDefinition

export interface NeighbourhoodInfo {
  logoSrc: string;
  name: string;
}
export interface AppletInfo {
  neighbourhoodInfo: NeighbourhoodInfo,
  appInfo: AppInfo,
}
export interface NeighbourhoodApplet {
  appletConfig: AppletConfigInput;
  appletRenderers: Record<string, Constructor<NHDelegateReceiverComponent<AppBlockDelegate>>>;
  resourceRenderers: Record<string, Constructor<NHDelegateReceiverComponent<ResourceBlockDelegate>>>;
  assessmentWidgets: Record<string, AssessmentWidgetDefinition>;
}
