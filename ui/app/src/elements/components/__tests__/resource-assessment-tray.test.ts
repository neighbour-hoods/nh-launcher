import '@webcomponents/scoped-custom-element-registry';

import { describe, test } from 'vitest';
import { fixture, html as testHtml, expect, oneEvent } from '@open-wc/testing';
import { html } from 'lit';
import { AssessmentWidgetConfig, CreateAssessmentWidget, DisplayAssessmentWidget, ResourceAssessmentTray } from '@neighbourhoods/nh-launcher-applet';
import { EntryHashB64, encodeHashToBase64 } from '@holochain/client';
import { Assessment, RangeValueFloat } from '@neighbourhoods/client';

class ImportanceAssessmentWidget extends CreateAssessmentWidget {
  render() {
    return html`<div @click=${() => this.dispatchCreateAssessment({
        value: { Float: 1 },
        dimension_eh: this.dimensionEh,
        resource_eh: this.resourceEh,
        resource_def_eh: this.resourceDefEh,
        maybe_input_dataset: null,
      })} class="create-assessment-div">Click to create Assessment</div>`;
  }
}

class TotalImportanceWidget extends DisplayAssessmentWidget {
  render() {
    return html`<div class="display-assessment-div">${(this.assessment!.value as RangeValueFloat).Float}</div>`;
  }
}

const inputDimensionEh = (Uint8Array.from([1, 2, 3, 4]));
const outputDimensionEh = Uint8Array.from([1, 2, 3, 5]);
const resourceEh = Uint8Array.from([1, 2, 3, 6]);
const resourceDefEh = Uint8Array.from([1, 2, 3, 7]);
const outputAssessment: Assessment = {
  value: { Float: 1 },
  dimension_eh: outputDimensionEh,
  resource_eh: resourceEh,
  resource_def_eh: resourceDefEh,
  maybe_input_dataset: null,
  author: Uint8Array.from([1, 2, 3, 8]),
  timestamp: 1234,
};

customElements.define('resource-assessment-tray', ResourceAssessmentTray);
customElements.define('importance-assessment-widget', ImportanceAssessmentWidget);

describe('ResourceAssessmentTray', () => {
  describe('Given a ResourceAssessmentTray that takes in one pair of input/output dimension widgets', () => {
    const outputAssessments = new Map<EntryHashB64, Assessment>();
    outputAssessments.set(encodeHashToBase64(outputDimensionEh), outputAssessment);
    const assessmentWidgetTrayConfig = new Map<EntryHashB64, AssessmentWidgetConfig>();
    assessmentWidgetTrayConfig.set(encodeHashToBase64(inputDimensionEh), {
      inputAssessmentWidget: {
        dimensionEh: inputDimensionEh,
        widget: {
          name: 'importance-assessment-widget', 
          range: { Float: { min: 0, max: 1 } }, 
          component: ImportanceAssessmentWidget
        },
      },
      outputAssessmentWidget: {
        dimensionEh: outputDimensionEh,
        widget: {
          name: 'total-importance-widget', 
          range: { Float: { min: 0, max: 1000 } }, 
          component: TotalImportanceWidget
        }
      },
    });
    const trayHtml = testHtml`
    <div>
      <div class="harness-class"></div>
      <resource-assessment-tray
        .assessmentWidgetTrayConfig=${assessmentWidgetTrayConfig}
        .resourceEh=${resourceEh}
        .resourceDefEh=${resourceDefEh}
        .outputAssessments=${outputAssessments}
      ></resource-assessment-tray>
    </div>`

    test(`It renders the two widgets that get passed in as parameters.`, async () => {
      const harness = await fixture(trayHtml);
      console.log("harness class length", harness.getElementsByClassName("harness-class").length)

      const children = harness.querySelectorAll('resource-assessment-tray');
      expect(children[0].shadowRoot?.querySelectorAll('importance-assessment-widget').length).to.equal(1);
      expect(children[0].shadowRoot?.querySelectorAll('total-importance-widget').length).to.equal(1);
    });

    test(`It receives a create-assessment event from the CreateAssessmentWidget with the correct payload.`, async () => {
      const harness = await fixture(trayHtml);

      const resourceAssessmentTray = harness.querySelectorAll('resource-assessment-tray')[0];
      const importanceAssessmentWidget = resourceAssessmentTray.shadowRoot?.querySelectorAll('importance-assessment-widget')[0]!;
      const createAssessmentDiv = importanceAssessmentWidget.shadowRoot?.querySelectorAll('div')[0]!;

      const listener = oneEvent(resourceAssessmentTray, 'create-assessment');
      createAssessmentDiv.click();
      const event = await listener;
      const expectedInput = {
        value: { Float: 1 },
        dimension_eh: inputDimensionEh,
        resource_eh: resourceEh,
        resource_def_eh: resourceDefEh,
        maybe_input_dataset: null,
      }
      expect(event.detail).to.deep.equal(expectedInput);
    });
  });
});
