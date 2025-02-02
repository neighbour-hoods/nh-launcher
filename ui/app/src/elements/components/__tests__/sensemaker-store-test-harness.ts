import { AssessmentDict } from '../helpers/types';
import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { provide } from '@lit/context';
import { AppletConfig, SensemakerStore } from '@neighbourhoods/client';
import { MockFactory } from '../../__tests__/mock-factory';
import { mockContext } from './helpers';

export const mockAssessments: AssessmentDict = MockFactory.createAssessmentDict();
export const mockAppletConfig : {[appletInstanceId: string] : AppletConfig} = MockFactory.createAppletConfigDict(1);
export const mockAppletConfigs : {[appletInstanceId: string] : AppletConfig} = MockFactory.createAppletConfigDict(2);
export const mockFieldDefsResourceTable = MockFactory.createFieldDefsResourceTable();

@customElement('sensemaker-store-test-harness')
export class TestHarness extends LitElement {
  /**
   * Providing a context at the root element to maintain application state
   */
  @provide({ context: mockContext })
  @property({ attribute: false })
  _sensemakerStore: Partial<SensemakerStore> | undefined = MockFactory.mockStoreResponse('all')

  render() {
    return html`<slot></slot>`;
  }  
}
