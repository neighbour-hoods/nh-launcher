import { contextProvided } from "@lit-labs/context";
import { property, state } from "lit/decorators.js";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { LitElement, html, css } from "lit";
import { sensemakerStoreContext } from "../sensemakerStore";
import { SensemakerStore } from "../sensemakerStore";
import { getLatestAssessment } from "../utils";
import { EntryHash, encodeHashToBase64, decodeHashFromBase64 } from "@holochain/client";
import { StoreSubscriber } from "lit-svelte-stores";
import { get } from "svelte/store";

export class SensemakeResource extends ScopedElementsMixin(LitElement) {
    @contextProvided({ context: sensemakerStoreContext, subscribe: true })
    @state()
    public  sensemakerStore!: SensemakerStore

    @property()
    resourceEh!: EntryHash

    @property()
    resourceDefEh!: EntryHash

    resourceAssessments = new StoreSubscriber(this, () => this.sensemakerStore.resourceAssessments());
    activeMethod = new StoreSubscriber(this, () => this.sensemakerStore.activeMethod());

    render() {
        const activeMethodEh = this.activeMethod.value[encodeHashToBase64(this.resourceDefEh)]
        const { inputDimensionEh, outputDimensionEh } = get(this.sensemakerStore.methodDimensionMapping())[activeMethodEh];
        const assessDimensionWidgetType = (get(this.sensemakerStore.widgetRegistry()))[encodeHashToBase64(inputDimensionEh)].assess
        const displayDimensionWidgetType = (get(this.sensemakerStore.widgetRegistry()))[encodeHashToBase64(inputDimensionEh)].display
        const assessDimensionWidget = new assessDimensionWidgetType();
        const displayDimensionWidget = new displayDimensionWidgetType();
        assessDimensionWidget.resourceEh = this.resourceEh;
        assessDimensionWidget.resourceDefEh = this.resourceDefEh
        assessDimensionWidget.dimensionEh = get(this.sensemakerStore.methodDimensionMapping())[activeMethodEh].inputDimensionEh;
        assessDimensionWidget.methodEh = decodeHashFromBase64(activeMethodEh);
        assessDimensionWidget.sensemakerStore = this.sensemakerStore;

        const byMe = get(this.sensemakerStore.isAssessedByMeAlongDimension(encodeHashToBase64(this.resourceEh), encodeHashToBase64(inputDimensionEh)))
        assessDimensionWidget.isAssessedByMe = byMe;

        displayDimensionWidget.assessment = getLatestAssessment(
            this.resourceAssessments.value[encodeHashToBase64(this.resourceEh)] ? this.resourceAssessments.value[encodeHashToBase64(this.resourceEh)] : [], 
            encodeHashToBase64(outputDimensionEh)
        );
        return html`
            <div class="sensemake-resource">
                <slot></slot>
                ${displayDimensionWidget.render()}
                ${assessDimensionWidget.render()}
            </div>
        `
    }
    static styles = css`
          .sensemake-resource {
            display: flex;
            flex-direction: row;
          }
        `;
    static get scopedElements() {
        return {
        }
    }
}