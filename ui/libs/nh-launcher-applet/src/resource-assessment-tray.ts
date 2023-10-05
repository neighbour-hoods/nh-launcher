import './polyfills'
import { LitElement, html } from "lit"
import { property } from "lit/decorators.js";
import { EntryHash } from "@holochain/client"
import { Assessment } from "@neighbourhoods/client";
import { CreateAssessmentWidget } from "./create-assessment-widget";
import { DisplayAssessmentWidget } from "./display-assessment-widget";
import { EntryHashMap } from "@holochain-open-dev/utils";


interface AssessmentWidgetConfig {
  inputAssessmentWidget: {
    dimensionEh: EntryHash,
    widgetEh: new () => CreateAssessmentWidget,
  },
  outputAssessmentWidget: {
    dimensionEh: EntryHash,
    widgetEh: new () => DisplayAssessmentWidget,
  },
}

type AssessmentWidgetTrayConfig = EntryHashMap<AssessmentWidgetConfig>

export class ResourceAssessmentTray extends LitElement {
  @property()
  assessmentWidgetTrayConfig!: AssessmentWidgetTrayConfig

  @property()
  resourceEh!: EntryHash

  @property()
  resourceDefEh!: EntryHash

  @property()
  outputAssessments!: EntryHashMap<Assessment>

  render() {
    return html`
      <div>
        ${
          Object.values(this.assessmentWidgetTrayConfig).map(({inputAssessmentWidget, outputAssessmentWidget}: AssessmentWidgetConfig) => {
            const inputAssessmentComponent = new inputAssessmentWidget.widgetEh();
            inputAssessmentComponent.dimensionEh = inputAssessmentWidget.dimensionEh;
            inputAssessmentComponent.resourceEh = this.resourceEh;
            inputAssessmentComponent.resourceDefEh = this.resourceDefEh;

            const outputAssessmentComponent = new outputAssessmentWidget.widgetEh();
            outputAssessmentComponent.assessment = this.outputAssessments.get(outputAssessmentWidget.dimensionEh);

            return html`
              <div>
                ${inputAssessmentComponent.render()}
                ${outputAssessmentComponent.render()}
              </div>
            `
          })
        }
      </div>
    `
  }
}
