import { EntryHash } from "@holochain/client";
import {
  AppBlockDelegate,
  ResourceBlockDelegate,
  InputAssessmentControlDelegate,
  OutputAssessmentControlDelegate,
  Assessment
} from "../"
import { LitElement } from "lit"
import { property } from "lit/decorators.js"

class DelegateReceiverClass<D> extends LitElement {
  private _nhDelegate: D | undefined;

  @property()
  public set nhDelegate(delegate: D) {
    // console.log("Got delegate", delegate)
    // console.log("Had delegate", this._nhDelegate)
    this._nhDelegate = delegate;
    setTimeout(this.loadData.bind(this), 1)
  }
  public get nhDelegate() {
    return this._nhDelegate!
  }

  public async loadData() {}
}

export class AppBlock extends DelegateReceiverClass<AppBlockDelegate> {}

export class RenderBlock extends DelegateReceiverClass<ResourceBlockDelegate> {
  @property() resourceHash!: EntryHash | undefined;

  public async loadData() {
    this.resourceHash = this.nhDelegate.resourceEntryHash
  }
}

export class InputAssessmentControl extends DelegateReceiverClass<InputAssessmentControlDelegate> {
  @property()
  assessment: Assessment | undefined

  public async loadData() {
    this.assessment = await this.nhDelegate.getLatestAssessmentForUser();
    this.nhDelegate.subscribe((assessment) => {
      this.assessment = assessment
    })
  }
}

export class OutputAssessmentControl extends DelegateReceiverClass<OutputAssessmentControlDelegate> {
  @property()
  assessment: Assessment | undefined

  public async loadData() {
    this.assessment = await this.nhDelegate.getLatestAssessment()
    this.nhDelegate.subscribe((assessment) => {
      this.assessment = assessment
    })
  }
}
