import { EntryHash, decodeHashFromBase64, encodeHashToBase64 } from '@holochain/client';
import { html, css, PropertyValueMap } from 'lit';
import { StoreSubscriber } from 'lit-svelte-stores';
import { property, state } from 'lit/decorators.js';
import { AppletConfig, ComputeContextInput, SensemakerStore, sensemakerStoreContext } from '@neighbourhoods/client';
import { consume } from '@lit/context';

import NHButton from '@neighbourhoods/design-system-components/button';
import NHButtonGroup from '@neighbourhoods/design-system-components/button-group';
import NHComponent from '@neighbourhoods/design-system-components/ancestors/base';

import { get } from 'svelte/store';

export default class NHContextSelector extends NHComponent {
  @consume({ context: sensemakerStoreContext, subscribe: true })
  @property({attribute: false})
  sensemakerStore!: SensemakerStore;
  
  @property() selectedContextEhB64: string = "";
  @property() selectedAppletInstanceId: string = "";

  @state() config!: AppletConfig;
  @property() resourceAssessments = new StoreSubscriber(this, () => this.sensemakerStore.resourceAssessments());
    
  protected async firstUpdated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>) {
    if(!this.selectedAppletInstanceId || this.selectedAppletInstanceId == '') return
    const maybe_config = await this.sensemakerStore.checkIfAppletConfigExists(this.selectedAppletInstanceId);
    console.log('this.selectedAppletInstanceId :>> ', this.selectedAppletInstanceId);
    console.log('maybe_config :>> ', maybe_config);
    if(maybe_config) this.config = maybe_config
  }

  async updated(changedProperties: any) {
    if(changedProperties.has("selectedContextEhB64") && typeof this.config !== 'undefined') {
      if(!this.selectedContextEhB64 
        || this.selectedContextEhB64 === 'none'
        || typeof this.resourceAssessments?.value == 'undefined') return;

        const resourceEhs : EntryHash[] = Object.keys(this.resourceAssessments.value).flat().map(b64eh => decodeHashFromBase64(b64eh));
        const input : ComputeContextInput = { resource_ehs: resourceEhs, context_eh: decodeHashFromBase64(this.selectedContextEhB64), can_publish_result: false};
        await this.sensemakerStore.computeContext(this.selectedContextEhB64, input);
        const results = get(this.sensemakerStore.contextResults())
        const selectedContext = Object.entries(this.config.cultural_contexts).filter(([_contextName, contextHash]) => encodeHashToBase64(contextHash) == this.selectedContextEhB64)[0];
        this.dispatchContextSelected(selectedContext[0], results)
      }
  }
  
  render() {    
    return html`
        <nh-button-group
          .direction=${"horizonal"}
          .fixedFirstItem=${true}
          .addItemButton=${true}
        >
          <slot slot="button-fixed" name="button-fixed"></slot>
          <slot slot="buttons" name="buttons"></slot>
        </nh-button-group>
      `
  }
  
  dispatchContextSelected(contextName: string, results: any) {
    this.dispatchEvent(new CustomEvent('context-selected', {
      detail: {contextName, results},
      bubbles: true,
      composed: true
    }));
  }

  static elementDefinitions = {
    'nh-button': NHButton,
    'nh-button-group': NHButtonGroup,
  }
  
  static styles = css`
    :host {
      display: grid;
      flex-basis: 100%;
    }
  `
}
