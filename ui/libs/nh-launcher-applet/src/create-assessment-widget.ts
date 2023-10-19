import { LitElement, TemplateResult } from "lit"
import { property } from "lit/decorators.js";
import { EntryHash } from "@holochain/client"
import { Assessment, CreateAssessmentInput } from "@neighbourhoods/client";


const SensemakerEvents = {
  CREATE_ASSESSMENT: 'create-assessment',
}

export abstract class CreateAssessmentWidget extends LitElement {
  @property()
  resourceEh!: EntryHash

  @property()
  resourceDefEh!: EntryHash

  @property()
  dimensionEh!: EntryHash

  @property()
  latestAssessment: Assessment | undefined

  dispatchCreateAssessment(assessmentInput: CreateAssessmentInput) {
    this.dispatchEvent(new CustomEvent(SensemakerEvents.CREATE_ASSESSMENT, {
      detail: assessmentInput,
      bubbles: true,
      composed: true,
    }))
  }
  abstract render(): TemplateResult;
}
