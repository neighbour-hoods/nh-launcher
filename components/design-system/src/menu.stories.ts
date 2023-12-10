import { literal } from "lit/static-html.js";
import NHMenu, { MenuSection } from "./menu";
import { html } from "lit";
import type { Meta, StoryObj } from "@storybook/web-components";
import { b64images } from "@neighbourhoods/design-system-styles";

customElements.define("nh-menu", NHMenu);

export interface MenuProps {
  menuSectionDetails: MenuSection[];
}

const meta: Meta<MenuProps> = {
  title: "NHComponent/Menu",
  component: "nh-menu",
  argTypes: {},
  render: (args) => html`<nh-menu
    .theme=${"dark"}
    .menuSectionDetails=${args.menuSectionDetails}
  >
  </nh-menu>`,
};

export default meta;

type Story = StoryObj<MenuProps>;

export const Default: Story = {
  args: {
    menuSectionDetails: [
      {
        sectionName: "Sensemaker",
        sectionMembers: [
          {
            label: "0",
            callback: () => {
              console.log("hi!");
            },
          },
          {
            label: "2",
            callback: () => {
              console.log("hi!");
            },
          },
        ],
      },
    ],
  },
};
