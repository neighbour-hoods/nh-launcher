import { LitElement } from "lit"
import { property } from "lit/decorators.js";
import { Assessment } from "@neighbourhoods/client";


export abstract class DisplayAssessmentWidget extends LitElement {
  @property()
  assessment!: Assessment
}
