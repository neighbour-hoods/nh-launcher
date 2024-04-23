import NHDropdownAccordion from "./dropdown-accordion";
import { html } from "lit";
import type { Meta, StoryObj } from "@storybook/web-components";

customElements.define('nh-dropdown-accordion', NHDropdownAccordion)

export interface DropdownAccordionProps {
  open: boolean;
  content: string
}

const meta: Meta<DropdownAccordionProps> = {
  title: "NHComponent/DropdownAccordion",
  component: "nh-dropdown-accordion",
  argTypes: {
  },
  render: (args) => html`<nh-dropdown-accordion
    .open=${args.open}
  >
    <div slot="inner-content">
      ${html`${args.content}`}
    </div>
  </nh-dropdown-accordion>`,
};

export default meta;

type Story = StoryObj<DropdownAccordionProps>;

export const Default: Story = {
  args: {
    open: false,
    content: `Hello`
  },
};

export const Open: Story = {
  args: {
    open: true,
    content: `Hello`
  },
};
