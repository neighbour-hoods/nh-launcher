import { AppEntryDef, EntryHash } from "@holochain/client";
interface CoreResourceDef {
    resource_name: string,
    applet_eh: EntryHash,
    base_types: Array<AppEntryDef>,
    role_name: string,
    zome_name: string,
}
export type ResourceDef = CoreResourceDef

export type ConfigResourceDef = CoreResourceDef

export type ResourceDefEh = EntryHash

export type ResourceEh = EntryHash
