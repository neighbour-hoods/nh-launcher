import '@webcomponents/scoped-custom-element-registry';
import { describe, test } from 'vitest';
import { fixture, html as testHtml, expect } from '@open-wc/testing';
import { html, TemplateResult } from 'lit';
import { ResourceView } from '@neighbourhoods/nh-launcher-applet';
import { vi } from 'vitest';
import { AppAgentCallZomeRequest } from '@holochain/client';

class TodoView extends ResourceView {
    roleName = 'todo';
    zomeName = 'todos';
    functionName = 'get_todo';

    renderPending() {
    return html` <div class="loading-state">Loading...</div> `;
    }
    renderComplete(resource: object): TemplateResult {
    return html` <div class="resolved-state">${JSON.stringify(resource)}</div> `;
    }

    renderError(e: unknown): TemplateResult {
    return html` <div class="error-state">${JSON.stringify(e)}</div> `;
    }
}
customElements.define('todo-view', TodoView);

describe('ResourceView', () => {
  describe('Given a TodoView component that extends ResourceView', () => {
    test(`It renders the loading state when the resolver hasn't resolved.`, async () => {
      const mockResourceResolver = vi.fn((_request: AppAgentCallZomeRequest) =>
        new Promise(() => {})
      );
      const harness = await fixture(testHtml`
        <div>
            <todo-view
                .resourceResolver=${mockResourceResolver}
            ></todo-view>
        </div>`);

      const children = harness.querySelectorAll('todo-view');
      expect(children.length).to.equal(1);
      expect(children[0].shadowRoot?.querySelector('div')?.className).to.equal("loading-state");
    });
  });
});
