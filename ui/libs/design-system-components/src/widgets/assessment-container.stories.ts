import type { Meta, StoryObj } from '@storybook/web-components';
import NHAssessmentContainer from './assessment-container';
import NHIconContainer from './icon-container';
import { html } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js'
import { NHComponent } from '..';
import { property } from 'lit/decorators.js';

class TestRoot extends NHComponent {
  @property()
  selected: boolean = false

  @property()
  editMode: boolean = false

  @property()
  emoji: string = '🥸'

  @property()
  outputDisplay: string = '0'

  static elementDefinitions = {
    "nh-icon": NHIconContainer,
    'nh-assessment-container': NHAssessmentContainer
  };

  render() {
    return html`
    <nh-assessment-container .selected=${this.selected} .editMode=${this.editMode}>
      <span slot="assessment-control"><nh-icon>${this.emoji}</nh-icon></span>
      <span slot="assessment-output">${unsafeHTML(this.outputDisplay as string)}</span>
    </nh-assessment-container>`
  }
}

customElements.define("nh-assessment-container--test-root", TestRoot);

interface AssessmentWidgetProps {
  selected: Boolean,
  editMode: Boolean,
  emoji: String,
  outputDisplay: String
}

const render = (args: AssessmentWidgetProps) => html`
<nh-assessment-container--test-root .selected=${args.selected} .editMode=${args.editMode} .emoji=${args.emoji} .outputDisplay=${args.outputDisplay}></nh-assessment-container--test-root>
`

const meta: Meta<AssessmentWidgetProps> = {
  title: 'NHComponent/Widgets/AssessmentContainer',
  component: 'nh-assessment-container--test-root',
  argTypes: {
    selected: { control: 'boolean' },
    editMode: { control: 'boolean' },
    emoji: { control: 'text' },
    outputDisplay: { control: 'text' }
  },
  parameters: {
    backgrounds: { default: 'surface' },
  },
};

export default meta;

type Story = StoryObj<AssessmentWidgetProps>;

export const Icon: Story = {
  args: {
    selected: false,
    editMode: false,
    emoji: '🥸',
    outputDisplay: '0',
  },
  render: (args: AssessmentWidgetProps) => html`
  <nh-assessment-container--test-root .selected=${args.selected} .editMode=${args.editMode} .emoji=${args.emoji} .outputDisplay=${args.outputDisplay}></nh-assessment-container--test-root>
  `
};
