import { DnaHash } from "@holochain/client";
import { createContext } from "@lit/context";
import { MatrixStore } from "./matrix-store";
import { AppletGui, AppletInstanceInfo } from "./types";
import { StoreSubscriber } from "lit-svelte-stores";

export const matrixContext = createContext<MatrixStore>("hc_zome_we/matrix_context");
export const weGroupContext = createContext<DnaHash>("hc_zome_we/we_group_id_context")

// Used for the dashboard pages
export const currentAppletEhContext = createContext<string | null>("current/applet");
export const resourceDefContext = createContext<object|undefined>("current/resource_def")
export const appletInstanceInfosContext = createContext<StoreSubscriber<{EntryHashB64: AppletInstanceInfo & {gui: AppletGui}} | undefined>>("current/applet_instances")