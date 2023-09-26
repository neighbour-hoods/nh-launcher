import '@webcomponents/scoped-custom-element-registry';
import { describe, test, expect as viExpect } from 'vitest';
import { fixture, html as testHtml, expect } from '@open-wc/testing';
import { html, TemplateResult } from 'lit';
import { ResourceView } from '@neighbourhoods/nh-launcher-applet';
import { vi } from 'vitest';
import { AppAgentCallZomeRequest } from '@holochain/client';

const ROLE_NAME = 'todo';
const ZOME_NAME = 'todos';
const FUNCTION_NAME = 'get_todo';

class TodoView extends ResourceView {
  roleName = ROLE_NAME;
  zomeName = ZOME_NAME;
  functionName = FUNCTION_NAME;

  renderPending() {
    return html` <div class="loading-state">Loading...</div> `;
  }
  renderComplete(resource: object): TemplateResult {
    return html` <div class="resolved-state">${JSON.stringify(resource)}</div> `;
  }
  renderError(e: unknown): TemplateResult {
    return html` <div class="error-state"></div> `;
  }
}
customElements.define('todo-view', TodoView);

describe('ResourceView', () => {
  describe('Given a TodoView component that extends ResourceView', () => {
    test(`It renders the loading state when the resolver hasn't resolved.`, async () => {
      const mockResourceResolver = vi.fn(
        (_request: AppAgentCallZomeRequest) => new Promise(() => {}),
      );
      const harness = await fixture(testHtml`
        <div>
            <todo-view
                .resourceResolver=${mockResourceResolver}
            ></todo-view>
        </div>`);

      const children = harness.querySelectorAll('todo-view');
      expect(children.length).to.equal(1);
      expect(children[0].shadowRoot?.querySelector('div')?.className).to.equal('loading-state');
    });
    test(`It renders the complete state when the resolver has resolved.`, async () => {
      const todoItem = {
        description: 'A todo item',
        completed: false,
      };
      const mockResourceResolver = vi.fn(
        (_request: AppAgentCallZomeRequest) => Promise.resolve(todoItem)
      );
      const harness = await fixture(testHtml`
        <div>
            <todo-view
                .resourceResolver=${mockResourceResolver}
            ></todo-view>
        </div>`);

      const children = harness.querySelectorAll('todo-view');
      expect(children.length).to.equal(1);
      expect(children[0].shadowRoot?.querySelector('div')?.className).to.equal('resolved-state');
    });
    test.skip(`It renders the error state when the resolver rejects.`, async () => {
      const mockResourceResolver = vi.fn(
        (_request: AppAgentCallZomeRequest) => Promise.reject(Error("error fetching resource"))
      );

      const harness = await fixture(testHtml`
        <div>
            <todo-view
                .resourceResolver=${mockResourceResolver}
            ></todo-view>
        </div>`);

      const children = harness.querySelectorAll('todo-view');
      expect(children.length).to.equal(1);
      expect(children[0].shadowRoot?.querySelector('div')?.className).to.equal('error-state');
    });
    test(`It calls the parameterized callback with the correct function parameters.`, async () => {
      const mockResourceResolver = vi.fn(
        (_request: AppAgentCallZomeRequest) => new Promise(() => {}),
      );
      const resourceEh = Uint8Array.from([1, 2, 3, 4]);
      const _harness = await fixture(testHtml`
        <div>
            <todo-view
              .resourceEh=${resourceEh}  
              .resourceResolver=${mockResourceResolver}
            ></todo-view>
        </div>`);

      // Check if the `mockResourceResolver` has been called with the expected arguments
      viExpect(mockResourceResolver).toHaveBeenCalledWith({
        role_name: ROLE_NAME,
        zome_name: ZOME_NAME,
        fn_name: FUNCTION_NAME,
        payload: resourceEh,
      });
    });
  });
});
