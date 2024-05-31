import { css, CSSResult, html, TemplateResult } from "lit";
import {property, query, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { NHComponent } from "./ancestors/base";
import "./button-group";
import NHButtonGroup from "./button-group";

export default class NHCard extends NHComponent {
  @property()
  title!: string;
  @property()
  heading!: string;
  @property()
  subheading!: string;
  @property()
  hasContextMenu: boolean = false;
  @property()
  hasPrimaryAction: boolean = false;
  @property()
  theme: string = "dark";
  @property()
  textSize: string = "md";
  @property()
  footerAlign: "l" | "r" | "c" = "c";

  @state() contextMenuVisible: boolean = false;

  toggleContextMenu () {  
    this.contextMenuVisible = !this.contextMenuVisible;
    (this.renderRoot.querySelector(".context-menu") as HTMLElement).dataset.open = 'true';
  }
  
  @query(".context-menu-dots")
  _contextMenu : any;

  render() : TemplateResult {
    return html`
      <div
        class="container${classMap({
          light: this.theme == "light",
          dark: this.theme == "dark",
          'text-sm': this.textSize == "sm",
          'footer-left': this.footerAlign === 'l',
          'footer-right': this.footerAlign === 'r',
          'footer-center': this.footerAlign === 'c',
        })}"
      >
      ${this.hasContextMenu
        ? html`<div class="context-menu" data-open=${this.contextMenuVisible}>
                <div class="context-menu-dots" @click=${() => {this.toggleContextMenu()}} >
                  <div class="menu-dot"></div>
                  <div class="menu-dot"></div>
                  <div class="menu-dot"></div>
                </div>
                <nh-button-group role="navigation" .direction=${"vertical "}>
                  <slot slot="buttons" name="context-menu"></slot>
                </nh-button-group>
              </div>`
        : null }

        <slot name="header">
          ${this.title ? html`<h2 class="title">${this.title}</h2>` : null}
          ${this.heading ? html`<h1>${this.heading}</h1>` : null}
          ${this.subheading ? html`<h3>${this.subheading}</h3>` : null}
        </slot>
        <div
          class="content${classMap({
            noheading: !this.heading,
          })}"
        >
          <slot></slot>
        </div>
        <slot name="footer"></slot>
      </div>
    `;
  }


  static elementDefinitions = {
    'nh-button-group': NHButtonGroup,
  }


  static styles: CSSResult[] = [
    css`

    /* Layout */
    :root {
      display: flex;
    }
    
    .container {
      min-width: 264px;
      color: var(--nh-theme-fg-default);
      border-radius: calc(1px * var(--nh-radii-xl));
      padding: calc(1px * var(--nh-spacing-xl));
      position: relative;
    }
    
    /* Variants created from host class name */
    :host(.nested-card) .container {
      min-width: calc(264px - calc(2px * var(--nh-spacing-3xl)));
    }
    :host(.squarish) {
      max-width: calc(200px);
    }
    :host(.tight) .container {
      min-width: 200px;
    }
    :host(.responsive) .container {
      max-width: initial;
      min-width: initial;
      display:flex;
      width: fit-content;
      box-sizing: border-box;
      padding: 15%;
    }
    
    .content {
      margin: 0 auto;
    }

    .container.light {
      background-color: var(--nh-theme-bg-detail);
    }

    .container.dark {
      background-color: var(--nh-theme-bg-surface);
    }

    :host(.button) .container {
      background-color: var(--nh-theme-bg-canvas);
    }

    :host(.button) .container:hover {
      background-color: var(--nh-theme-bg-element);
      cursor: pointer;
    }

    :host(.transparent) .container {
      background-color: transparent;
    }

    /* Context Menu */
    div.context-menu {
      overflow: inherit;
      position: absolute;
      right: -20px;
      top: 0px;
      display: flex;
      justify-content: center;
      align-items: center;
      background: transparent;
      border: 1px solid transparent;
    }
    .context-menu nh-button-group {
      transition: opacity 0.3s ease-in-out;
      border: 1px solid transparent;
      position: relative;
      left: -30px;
      top: 42px;
      outline: 1px solid var(--nh-theme-accent-disabled);
    
    }
    .context-menu[data-open=true] nh-button-group {
      border-radius: calc(1px * var(--nh-radii-md));
    }
    .context-menu[data-open=false] nh-button-group {
      visibility: hidden;
      opacity: 0;
      transition: opacity 0.3s ease-in-out;
    }
    .context-menu-dots {
      cursor: pointer;
      display: flex;
      width: 32px;
      height: 16px;
      position: absolute;
      right: 1.5rem;
      top: 0.5rem;
      justify-content: center;
      align-items: center;
      border-radius: calc(1px * var(--nh-radii-lg));
      padding: 4px;
    }

    .context-menu[data-open=true] .context-menu-dots {
      background: var(--nh-theme-accent-disabled);
    }

    .context-menu-dots:hover {
      background: var(--nh-theme-bg-detail);
    }

    .menu-dot {
      width: 5px;
      height: 5px;
      margin: 2px;
      border-radius: 100%;
      background: var(--nh-menu-subtitle);
    }
    
    .context-menu-dots:hover .menu-dot {
      background: var(--nh-theme-bg-canvas);
    }

    /* Headings */
    
    h1,
    *::slotted(*) {
      margin: 0;
      font-family: var(--nh-font-families-body);
    }
    h1 {
      font-weight: var(--nh-font-weights-body-regular);
      margin-bottom: calc(1px * var(--nh-spacing-xl));
    }
    h2.title {
      flex-grow: 1;
      flex-shrink: 1;
      flex-basis: auto;
      margin-top: 0;
      margin-left: 3px;
      margin-right: 1.5rem;

      font-size: calc(1px * var(--nh-font-size-sm));
      letter-spacing: calc(2 * var(--nh-letter-spacing-buttons)); 
      font-family: var(--nh-font-families-headlines);
      text-transform: uppercase;
      line-height: calc(var(--nh-line-heights-headlines-lg));
    }
    .text-sm h1 {
      font-size: calc(1px * var(--nh-font-size-lg));
      margin-bottom: calc(1px * var(--nh-spacing-sm));
      line-height: var(--nh-line-heights-headlines-default);
      font-weight: 500;
    }

    h3 {
      margin-top: -1rem;
      font-size: calc(1px * var(--nh-font-size-md));
      color: var(--nh-theme-fg-default);
      padding-left: 4px;
      line-height: var(--nh-line-heights-headlines-default);
      font-weight: var(--nh-font-weights-body-regular);
    }
    
    /* Content */
    
    .text-sm ::slotted(*) {
      color: var(--nh-theme-fg-subtle);
      line-height: var(--nh-line-heights-headlines-default);
      font-weight: var(--nh-font-weights-body-regular);
      font-size: calc(1px * var(--nh-font-size-sm));
    }
    .content.noheading {
      padding: 0;
    }

    /* Context Menu */
    
    .dots-context-menu {
      position: absolute;
      display: flex;
      top: calc(1px * var(--nh-spacing-xl));
      right: calc(1px * var(--nh-spacing-xl));
      height: 7px;
    }
    .menu-dot {
      width: 5px;
      height: 5px;
      margin: 2px;
      border-radius: 100%;
      background: var(--nh-theme-bg-detail);
    }
    
    /* Footer */
    
    ::slotted([slot=footer]) {
      margin: auto 0;
      padding-top: calc(1px * var(--nh-spacing-lg));
      display: flex;
    }
    .footer-left ::slotted([slot=footer]) {
      justify-content: flex-start;
    }
    .footer-center ::slotted([slot=footer]) {
      justify-content: center;
    }
    .footer-right ::slotted([slot=footer]) {
      justify-content: flex-end;
    }
  `,
];
}
