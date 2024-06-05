import { EntryHash } from '@holochain/client';
import { RangeKind, RangeValue } from "./range";
import { Assessment } from './assessment';
import {
  CallbackFn,
  NHDelegateReceiverConstructor,
  UnsubscribeFn
} from "./delegate"
import { EntryRecord } from '@holochain-open-dev/utils';

/**
 * The minimal interface needed for an assessment control.
 *
 * We can create objects that conform to this interface and provide a limited set
 * of functions which can be used to act on assessments instead of passing in the
 * AppAgentClient which would give the assessment controls complete access to all
 * the sensemaker data.
 */
export interface InputAssessmentControlDelegate {
  getLatestAssessmentForUser(): Promise<Assessment | undefined> // get the latest assessment value the user created (or none if never assessed or invalidated)
  subscribe(_:CallbackFn): UnsubscribeFn // subscribe to when the current assessment changes
  createAssessment(value: RangeValue): Promise<EntryRecord<Assessment>> // create an assessment
  invalidateAssessment(): void // invalidate assessment [ignore for now, we only support creating new assessments]
}

/**
 * The minimal interface needed to render computed assessments
 *
 * This allows passing in a delegate that allows fetching and subscribing to
 * assessment changes without exposing the sensemaker store AppAgentClient.
 */
export interface OutputAssessmentControlDelegate {
  getLatestAssessment(): Promise<Assessment | undefined> // get the latest computed assessment value (regardless of user, for computed dimensions)
  subscribe(_:CallbackFn): UnsubscribeFn // subscribe to when the current computed dimension changes
}

/**
 * Can either be 'input' or 'output'
 */
export type AssessmentControlKind = 'input' | 'output';

/**
 * Defines an Assessment Widget in an Applet config
 */
export type AssessmentControlRenderer = {
  name: string,         // Likely appended to the App name in the dashboard configuration screen
  rangeKind: RangeKind,         // Output components must support a range of [-INF, INF] unless it is used with an AVG.
  component: NHDelegateReceiverConstructor<InputAssessmentControlDelegate> | NHDelegateReceiverConstructor<OutputAssessmentControlDelegate>, // Intersection of HTML Element and the delegate interface for
  kind: AssessmentControlKind
}

/**
 * Defines the different assessment control renderers by name
 */
export type AssessmentControlRenderers = Record<string, AssessmentControlRenderer>

/**
 * Defines the shape of the data sent to the sensemaker to register a an assessment control
 */
export interface AssessmentControlRegistrationInput {
  appletId: string, // Applet id
  controlKey: string,  // keyof an AssessmentWidgetConfigDict
  name: string,
  rangeKind: RangeKind,
  kind: AssessmentControlKind
}

/**
 * Shape of object used to update the assessment control registration
 */
export type AssessmentWidgetRegistrationUpdateInput = {
  assessmentRegistrationEh: EntryHash,
  assessmentRegistrationUpdate: AssessmentControlRegistrationInput
}

/**
 * Maps dimensions to assessment controls
 */
export type AssessmentWidgetConfig = {
  dimensionEh: EntryHash,
  /**
   * This is specifically for when components are separated out into their own
   * DHT entry (or sequence of DHT entries to allow extra large codebases to
   * be stored).
   */
  assessmentControlRegistrationEh: EntryHash
} | {
  dimensionEh: EntryHash,
  /**
   * This is whatever the id for the Applet is.
   */
  appletId: string,
  /**
   * This is the name of the component as exposed by the applet interface
   */
  componentName: string
}

/**
 * Used to configure the assessment tray,
 */
export interface AssessmentControlConfig {
  /**
   * This is the control that allows making an assessment and displaying the
   * user's chosen selection if the user can select one of many options.
   */
  inputAssessmentControl: AssessmentWidgetConfig,
  /**
   * This is the control that displays the computed result, for the case where
   * output and input and separate, as in the Todo applet.
   */
  outputAssessmentControl: AssessmentWidgetConfig
}

/**
 * A named assessment tray config
 */
export interface AssessmentTrayConfig {
  name: string,
  assessmentControlConfigs: AssessmentControlConfig[]
}