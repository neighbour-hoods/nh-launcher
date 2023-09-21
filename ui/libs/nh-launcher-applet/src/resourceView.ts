import { LitElement } from "lit"
import { Task } from "@lit-labs/task"
import { property } from "lit/decorators.js";
import { RoleName, ZomeName, FunctionName, EntryHash, AppAgentCallZomeRequest } from "@holochain/client"

// NOTE: should this be moved into our design systems components?
export class ResourceView extends LitElement {
  roleName!: RoleName
  zomeName!: ZomeName
  functionName!: FunctionName

  @property()
  resourceEh!: EntryHash

  @property()
  resourceResolver!: (request: AppAgentCallZomeRequest) => Promise<any>

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

}
