import { css, CSSResult, html } from "lit";
import { property, queryAll } from "lit/decorators.js";
import { NHComponentShoelace } from "../ancestors/base";


/**
 * The NHIconContainer is a simple wrapper that helps with writing assessment
 * controls. Each assessment icon can be placed in the default NHIconCountainer
 * slot and this provides the needed animations and event firing for assessments.
 *
 * This currently fires a selected event after two seconds. The event is cancelable
 * during those two seconds.
 *
 * Curently freezes the control after firing so the user can't change the selection,
 * but this also means the parent control needs to respect that and make sure other
 * controls become frozen, too. It would be easier if we just allowed changing this.
 */
export default class NHIconContainer extends NHComponentShoelace {

  _selected: boolean = false;
  _fireTimeout?: ReturnType<typeof setTimeout>;

  @property()
  get selected(): boolean {
    return this._selected
  }
  set selected(selected: boolean) {
    this._selected = selected;
    setTimeout(() => this.selectedChangeHandler(), 1)
  }

  @property()
  frozen: boolean = false;

  @queryAll(".assessment-background")
  _container!: HTMLElement[];

  /**
   * Handles value changing through the setter
   */
  selectedChangeHandler = () => {
    if (this._container.length) {
      const classes = Array.from(this._container[0].classList)
      const animation_index = classes.findIndex((c) => c == "select-animation")
      const select_index = classes.findIndex((c) => c == "selected")
      // Always remove the select-animation class when programmatically setting this value
      if(animation_index > -1) {
        classes.splice(animation_index, 1)
        this._container[0].setAttribute("class", classes.join(" "))
      }
      if (this._selected) {
        if(select_index > -1) {
          // programatic select style is already set
        } else {
          classes.push("selected")
          this._container[0].setAttribute("class", classes.join(" "))
        }
      } else {
        if(select_index > -1) {
          classes.splice(select_index, 1)
          this._container[0].setAttribute("class", classes.join(" "))
        }
      }
    }
  }

  /**
   * Handles user clicks
   */
  selectHandler = (e: Event) => {
    e.preventDefault()
    if(this.frozen) return;

    const classes = Array.from(this._container[0].classList)
    const animation_index = classes.findIndex((c) => c == "select-animation")
    const select_index = classes.findIndex((c) => c == "selected")

    if(this._selected) {
      // Remove animation style if present
      if(animation_index > -1) {
        classes.splice(animation_index, 1)
        this._container[0].setAttribute("class", classes.join(" "))
      }
      // Remove programatic selected style if presesent
      if(select_index > -1) {
        classes.splice(select_index, 1)
        this._container[0].setAttribute("class", classes.join(" "))
      }
    } else {
      if(animation_index > -1) {
        // already has selection animation applied
      } else {
        classes.push("select-animation")
        this._container[0].setAttribute("class", classes.join(" "))

      }
    }
    this._selected = !this._selected;
    if(this._selected) {
      this.fireSelectStarted()
      this._fireTimeout = setTimeout(this.fireSelected, 2000)
    }
    if(this._fireTimeout && !this._selected) {
      clearTimeout(this._fireTimeout)
      this.fireSelectCancelled()
    }
  }

  fireSelectStarted = () => {
    const event = new CustomEvent('select-start', {bubbles: true, composed: true, cancelable: true});
    this.dispatchEvent(event);
  }

  fireSelectCancelled = () => {
    const event = new CustomEvent('select-cancel', {bubbles: true, composed: true, cancelable: true});
    this.dispatchEvent(event);
  }

  fireSelected = () => {
    this.frozen = true;
    const detail = {selected: true};
    const event = new CustomEvent('select', {detail, bubbles: true, composed: true, cancelable: true});
    this.dispatchEvent(event);
  }

  render() {
    return html`
      <div class="assessment-background" @click=${this.selectHandler}>
        <div class="assessment-animation"></div>
        <div class="assessment-icon">
          <slot></slot>
        </div>
      </div>
    `;
  }

  static styles: CSSResult[] = [
    super.styles as CSSResult,
    css`
      :host {
        /*Variables not defined as tokens*/
        --animation-short: 250ms;
        --animation-shortest: 180ms;

        --border-r-medium: 24px;
        --border-r-small: 12px;
        --border-r-tiny: 6px;

        --box-shadow-subtle-small: 0px 0px 2px rgba(0, 0, 0, 0.5);
      }

      .assessment-background {
        border-style: solid;
        border-color: transparent;
        border-radius: var(--border-r-tiny);
        border-width: 1px;
        width: 32px;
        height: 32px;
        cursor: pointer;
        transition: background-color var(--animation-shortest);
        position: relative;
        display: flex;
      }

      .assessment-animation {
        background-color: var(--nh-theme-accent-muted);
        width: 0px;
        height: 32px;
        position: absolute;
        top: 0;
        left: 0;
        border-radius: var(--border-r-tiny);
        border: 0px solid transparent;
      }

      .assessment-icon {
        width: 32px;
        font-size: 24px;
        text-align: center;
        vertical-align: middle;
        margin: 0;
        padding: 0;
        text-anchor: middle;
        position: absolute;
        top: 0px;
        left: 0px;
        filter: drop-shadow(var(--box-shadow-subtle-small));
      }

      .assessment-background:hover {
        border-color: var(--nh-theme-accent-default);
        border-width: 1px;
      }

      .assessment-background.selected {
        background-color: var(--nh-theme-accent-default);
      }

      .assessment-background.selected .assessment-animation {
        animation: send-assessment-ani 100ms forwards ease-out;
      }

      .assessment-background.select-animation {
        background-color: var(--nh-theme-accent-default);
      }
      .assessment-background.select-animation .assessment-animation {
        animation: send-assessment-ani 2000ms forwards ease-out;
      }

      @keyframes send-assessment-ani {
        0% {
          width: 0px;
        }
        100% {
          width: 32px;
        }
      }
    `,
  ];
}
