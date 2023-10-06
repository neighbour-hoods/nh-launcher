import './polyfills'
import { LitElement, html } from "lit"
import { html as staticHtml, unsafeStatic } from "lit/static-html.js"
import { property } from "lit/decorators.js";
import { EntryHash, EntryHashB64, encodeHashToBase64 } from "@holochain/client"
import { Assessment, RangeKind } from "@neighbourhoods/client";
import { CreateAssessmentWidget } from "./create-assessment-widget";
import { DisplayAssessmentWidget } from "./display-assessment-widget";

export interface WidgetBundle<WidgetComponent extends LitElement> {
  name: string,
  range: RangeKind,
  component: new () => WidgetComponent,
}

export interface AssessmentWidgetConfig {
  inputAssessmentWidget: {
    dimensionEh: EntryHash,
    widget: WidgetBundle<CreateAssessmentWidget>,
  },
  outputAssessmentWidget: {
    dimensionEh: EntryHash,
    widget: WidgetBundle<DisplayAssessmentWidget>,
  },
}

export type AssessmentWidgetTrayConfig = Map<EntryHashB64, AssessmentWidgetConfig>

export class ResourceAssessmentTray extends LitElement {
  @property()
  assessmentWidgetTrayConfig!: AssessmentWidgetTrayConfig

  @property()
  resourceEh!: EntryHash

  @property()
  resourceDefEh!: EntryHash

  @property()
  outputAssessments!: Map<EntryHashB64, Assessment>

  registry?: CustomElementRegistry

  override createRenderRoot() {
    this.registry = new CustomElementRegistry()

    const renderRoot = this.attachShadow({
      mode: 'open',
      customElements: this.registry,
    });

    return renderRoot;
  }

  registerScopedComponents() {
    this.assessmentWidgetTrayConfig.forEach(({inputAssessmentWidget, outputAssessmentWidget}) => {
      this.registry!.define(inputAssessmentWidget.widget.name, inputAssessmentWidget.widget.component);
      this.registry!.define(outputAssessmentWidget.widget.name, outputAssessmentWidget.widget.component);
    })
  }

  render() {
    this.registerScopedComponents();

    const widgets = staticHtml`
      ${
        Array.from(this.assessmentWidgetTrayConfig.values()).map(({inputAssessmentWidget, outputAssessmentWidget}) => {
          const outputHtml = staticHtml`
              <${unsafeStatic(inputAssessmentWidget.widget.name)}
                .${unsafeStatic('dimensionEh')}=${inputAssessmentWidget.dimensionEh}
                .${unsafeStatic('resourceEh')}=${this.resourceEh}
                .${unsafeStatic('resourceDefEh')}=${this.resourceDefEh}
              ></${unsafeStatic(inputAssessmentWidget.widget.name)}>
              <${unsafeStatic(outputAssessmentWidget.widget.name)}
                .${unsafeStatic('assessment')}=${this.outputAssessments.get(encodeHashToBase64(outputAssessmentWidget.dimensionEh))}
              ></${unsafeStatic(outputAssessmentWidget.widget.name)}>
          `
          return outputHtml
        })
      }
    `
    return html`
    <div class="widget-wrapper">
      ${widgets}
    </div>
    `
  }
}
