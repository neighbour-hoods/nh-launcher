import { html, css, TemplateResult, PropertyValueMap, CSSResult } from 'lit';
import { consume } from '@lit/context';
import { appletInstanceInfosContext } from '../../context';

import NHResourceDefList from  '../lists/resource-def-list';
import NHAlert from '@neighbourhoods/design-system-components/alert';
import NHAssessmentContainer from '@neighbourhoods/design-system-components/widgets/assessment-container';
import NHButton from '@neighbourhoods/design-system-components/button';
import NHButtonGroup from '@neighbourhoods/design-system-components/button-group';
import NHCard from '@neighbourhoods/design-system-components/card';
import NHDialog from '@neighbourhoods/design-system-components/dialog';
import NHDropdownAccordion from '@neighbourhoods/design-system-components/dropdown-accordion';
import NHForm from '@neighbourhoods/design-system-components/form/form';
import NHPageHeaderCard from '@neighbourhoods/design-system-components/page-header-card';
import NHResourceAssessmentTray from '@neighbourhoods/design-system-components/widgets/resource-assessment-tray';
import NHSpinner from '@neighbourhoods/design-system-components/spinner';
import NHTooltip from '@neighbourhoods/design-system-components/tooltip';
import NHComponent from '@neighbourhoods/design-system-components/ancestors/base';
import NHTextInput from '@neighbourhoods/design-system-components/input/text';
import { b64images } from "@neighbourhoods/design-system-styles";

import { property, query } from 'lit/decorators.js';
import {
  SensemakerStore,
} from '@neighbourhoods/client';
import { InputAssessmentRenderer } from '@neighbourhoods/app-loader';

export default class NHAssessmentControlConfig extends NHComponent {
  @property() loaded!: boolean;

  sensemakerStore!: SensemakerStore;


  render(): TemplateResult {
    return html`
      <div class="container">
        <nh-page-header-card .heading=${'Assessment Tray Defaults'}>
          <nh-button
            slot="secondary-action"
            .variant=${'neutral'}
            .size=${'icon'}
            .iconImageB64=${b64images.icons.backCaret}
            @click=${() => this.onClickBackButton()}
          >
          </nh-button>
        </nh-page-header-card>
        <resource-def-list .sensemakerStore=${this.sensemakerStore}>
        </resource-def-list>
      </div>
    `
  }

  static elementDefinitions = {
    'nh-button': NHButton,
    'nh-button-group': NHButtonGroup,
    'nh-card': NHCard,
    'nh-form': NHForm,
    'nh-dialog': NHDialog,
    'nh-page-header-card': NHPageHeaderCard,
    'nh-tooltip': NHTooltip,
    'nh-dropdown-accordion': NHDropdownAccordion,
    'nh-spinner': NHSpinner,
    'nh-alert': NHAlert,
    'nh-text-input': NHTextInput,
    'assessment-tray': NHResourceAssessmentTray,
    'resource-def-list': NHResourceDefList,
    'input-assessment-renderer': InputAssessmentRenderer,
    'assessment-container': NHAssessmentContainer,
  };

  private onClickBackButton() {
    this.dispatchEvent(new CustomEvent('return-home', { bubbles: true, composed: true }));
  }

  static styles: CSSResult[] = [
    ...super.styles as CSSResult[],
    css`
      /* Layout */
      :host {
        width: 100%;
        height: 100%;
      }

      div.container {
        width: 100%;
        display: flex;
        color: var(--nh-theme-fg-default);
        gap: calc(1px * var(--nh-spacing-sm));
        flex-direction: column;  
        padding: calc(1px * var(--nh-spacing-xl));
        box-sizing: border-box;
      }

      nh-page-header-card {
        grid-column: 1 / -1;
      }

      .description {
        text-align: center;
      }
  `];
}
