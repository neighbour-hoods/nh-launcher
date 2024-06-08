import { html, css, PropertyValueMap } from "lit";
import { property, state } from "lit/decorators.js";

import { EntryHash } from "@holochain/client";
import { AssessmentTrayConfig, SensemakerStore } from "@neighbourhoods/client";

import NHButton from '@neighbourhoods/design-system-components/button';
import NHCard from '@neighbourhoods/design-system-components/card';
import NHComponent from '@neighbourhoods/design-system-components/ancestors/base';

export default class AssessmentTrayConfigList extends NHComponent {  
  @property() sensemakerStore!: SensemakerStore;

  @state() private _assessmentTrayEntries!: Array<AssessmentTrayConfig & { assessment_tray_eh: EntryHash }>;

  async fetchAssessmentTrayEntries() {
    try {
      const entryRecords = await this.sensemakerStore.getAssessmentTrays();
      this._assessmentTrayEntries = entryRecords.map(entryRecord => {
        return {
          ...entryRecord.entry,
          assessment_tray_eh: entryRecord.entryHash
        }
      })
    } catch (error) {
      console.log('Error fetching assessment trays: ', error);
    }
  }

  async firstUpdated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>) {
    if (!!this.sensemakerStore) {
      await this.fetchAssessmentTrayEntries();
    }
  }

  render() {
    return html`
      <div class="content">
        <div class="title-bar">
          <h1>Assessment Trays</h1>
          <slot class="action" name="action-button"></slot>
        </div>  
        ${this._assessmentTrayEntries && this._assessmentTrayEntries.length > 0
          ? html`Hello world`
          : 'No trays have been created'
        }
      </div>
    `;
  }


  static elementDefinitions = {
    "nh-button": NHButton,
    "nh-card": NHCard,
  }

  static get styles() {
    return css`
      .title-bar {
        display: flex;
        justify-content: flex-end;
        align-items: center;
      }

      h1 {
        display: flex;
        margin-right: calc(1px * var(--nh-spacing-xl));
      }

      .action {
        display: flex;
        flex: 1;
      }

      :host {
        display: flex;
        flex: 1;
        justify-content: center;
        align-items: center;
      }
  
      .content{
        width: 100%;
      }
    `;
  }
}