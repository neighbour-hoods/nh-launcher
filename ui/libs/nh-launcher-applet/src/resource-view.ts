import { LitElement, TemplateResult, html } from "lit"
import { Task } from "@lit-labs/task"
import { property } from "lit/decorators.js";
import { RoleName, ZomeName, FunctionName, EntryHash, AppAgentCallZomeRequest } from "@holochain/client"

export type Resource = any

export abstract class ResourceView extends LitElement {
  abstract roleName: RoleName
  abstract zomeName: ZomeName
  abstract functionName: FunctionName

  @property()
  resourceEh!: EntryHash

  @property()
  resourceResolver!: (request: AppAgentCallZomeRequest) => Promise<Resource>

  _fetchResourceTask = new Task(
    this,
    async () => {
      return await this.resourceResolver({
        role_name: this.roleName,
        zome_name: this.zomeName,
        fn_name: this.functionName,
        payload: this.resourceEh,
      })
    },
    () => []
  );

  abstract renderPending(): TemplateResult;
  abstract renderComplete(resource: Resource): TemplateResult;
  abstract renderError(e: unknown): TemplateResult;

  render() {
    return html`
      ${this._fetchResourceTask.render({
        pending: this.renderPending,
        complete: this.renderComplete,
        error: this.renderError,
      })}
    `
  }
}
