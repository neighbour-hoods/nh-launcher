import type { Meta, StoryObj } from '@storybook/web-components';
import NHIconContainer from './icon-container';
import { html } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js'
import { NHComponent } from '..';
import { property } from 'lit/decorators.js';


class TestRoot extends NHComponent {
  @property()
  selected: boolean = false

  @property()
  slot: string = ''

  @property()
  frozen: boolean = false

  static elementDefinitions = {
    "nh-icon": NHIconContainer
  };

  render() {
    return html`<nh-icon .selected=${this.selected} .frozen=${this.frozen}>${unsafeHTML(this.slot)}</nh-icon>`
  }
}

customElements.define("nh-icon-container--test-root", TestRoot);

interface IconContainerProps {
  selected: Boolean,
  frozen: Boolean,
  slot: String
}

const meta: Meta<IconContainerProps> = {
  title: 'NHComponent/Widgets/IconContainer',
  component: 'nh-icon-container--test-root',
  argTypes: {
    selected: { control: 'boolean' },
    frozen: { control: 'boolean' },
    slot: { control: 'text'}
  },
  parameters: {
    backgrounds: { default: 'surface' },
  },
};

const render = (args: IconContainerProps) => html`<nh-icon-container--test-root .selected=${args.selected} .frozen=${args.frozen} .slot=${args.slot}></nh-icon-container>`

export default meta;

type Story = StoryObj<IconContainerProps>;

export const Icon: Story = {
  args: {
    slot: '🥸'
  },
  render
};

export const FrozenSelected: Story = {
  args: {
    frozen: true,
    selected: true,
    slot: '🍐'
  },
  render
};

export const FrozenUnselected: Story = {
  args: {
    frozen: true,
    selected: false,
    slot: '🍎'
  },
  render
};
