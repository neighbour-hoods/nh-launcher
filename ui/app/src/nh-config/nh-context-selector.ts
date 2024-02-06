import { EntryHash, decodeHashFromBase64, encodeHashToBase64 } from '@holochain/client';
import { html, css } from 'lit';
import { StoreSubscriber } from 'lit-svelte-stores';
import { property, state } from 'lit/decorators.js';
import { AppletConfig, ComputeContextInput, SensemakerStore, sensemakerStoreContext } from '@neighbourhoods/client';
import { consume } from '@lit/context';
import { NHButton, NHButtonGroup, NHComponent } from '@neighbourhoods/design-system-components';
import { matrixContext } from '../context';
import { MatrixStore } from '../matrix-store';
import { get } from 'svelte/store';

export default class NHContextSelector extends NHComponent {
  @consume({ context: matrixContext, subscribe: true })
  @property({attribute: false})
  matrixStore!: MatrixStore;
  
  @consume({ context: sensemakerStoreContext, subscribe: true })
  @property({attribute: false})
  sensemakerStore!: SensemakerStore;

  @state() selectedContextEhB64: string = "";
  @state() config!: AppletConfig;
  
  @property() resourceAssessments = new StoreSubscriber(this, () => this.sensemakerStore.resourceAssessments());
    
  async updated(changedProperties: any) {
    const maybe_config = await this.sensemakerStore.checkIfAppletConfigExists('applet@we-ddd12a84bb4dab6c57a3c18f4abee04e2f62d8da-Todos');
    if(maybe_config) {
      this.config = maybe_config
    }
    if(changedProperties.has("selectedContextEhB64")) {
      if(!this.selectedContextEhB64 
        || this.selectedContextEhB64 === 'none'
        || typeof this.config == 'undefined'
        || typeof this.resourceAssessments?.value == 'undefined') return;

        const resourceEhs : EntryHash[] = Object.keys(this.resourceAssessments.value).flat().map(b64eh => decodeHashFromBase64(b64eh));
        const input : ComputeContextInput = { resource_ehs: resourceEhs, context_eh: decodeHashFromBase64(this.selectedContextEhB64), can_publish_result: false};
        await this.sensemakerStore.computeContext(this.selectedContextEhB64, input);
        
        const results = get(this.sensemakerStore.contextResults())
        const selectedContextEhB64Name = Object.entries(this.config.cultural_contexts).filter(([contextName, contextHash]) => encodeHashToBase64(contextHash) == this.selectedContextEhB64)[0];
        debugger;
        this.dispatchContextSelected(selectedContextEhB64Name[0], results)
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

    static get elementDefinitions() {
    return {
      'nh-button': NHButton,
      'nh-button-group': NHButtonGroup,
    };
  }
  static styles = css`
    :host {
      display: grid;
      flex-basis: 100%;
    }
  `
}
