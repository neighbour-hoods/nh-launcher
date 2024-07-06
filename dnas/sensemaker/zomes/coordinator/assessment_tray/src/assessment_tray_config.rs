use hdk::prelude::*;
use nh_sensemaker_zome_lib::entry_from_record;
use nh_zome_assessment_tray_integrity::*;

// Util for recursively finding latest update for an entry hash. Returns None for a Delete action
fn get_latest_assessment_tray(entry_hash: EntryHash) -> ExternResult<Option<Record>> {
    let details = get_details(entry_hash.clone(), GetOptions::default())?
        .ok_or(wasm_error!(WasmErrorInner::Guest("Could not find Details for that EntryHash".into())))?;

    match details {
        Details::Record(_) => unreachable!(), // Would mean our entry hash was an action hash
        Details::Entry(entry_details) => match entry_details.updates.last() {
            Some(update) => {
                let record_for_update_action = get::<ActionHash>(update.clone().hashed.hash,GetOptions::default());
                let Ok(Some(record)) = record_for_update_action else {
                    return Err(wasm_error!(WasmErrorInner::Guest("Could not find Details for that update to the EntryHash".into())))
                };
                let entry = entry_from_record::<AssessmentTrayConfig>(record)?;
                let hash = hash_entry(&entry)?;
                get_latest_assessment_tray(hash)
            },
            None => match entry_details.deletes.last() {
                Some(_delete) => Ok(None),
                _ => get_assessment_tray_config(entry_hash),
            },
        },
    }
}

#[hdk_extern]
fn get_assessment_tray_config(assessment_tray_eh: EntryHash) -> ExternResult<Option<Record>> {
    let maybe_tray = get(assessment_tray_eh, GetOptions::default())?;
    if let Some(record) = maybe_tray.clone() {
        if let Some(entry_type) = record.signed_action().hashed.content.entry_type() {
            let result: ExternResult<Option<Record>> = match entry_type {
                EntryType::App(entry_type) => {
                    let entry_index : u8 = entry_type.zome_index.into();
                    if entry_index == 1 { // 1 is the index for AssessmentTrayConfig
                        Ok(maybe_tray)
                    } else {
                        Ok(None)
                    }
                },
                _ => Err(wasm_error!(WasmErrorInner::Guest(String::from("This entry hash does not match an Assessment Config Tray entry"))))
            };
            result
        } else {
            Ok(None)
        }
    } else {
        Ok(None)
    }
}

#[hdk_extern]
fn get_assessment_tray_configs(_:()) -> ExternResult<Vec<Record>> {
    let links = get_links(
        tray_configs_typed_path()?.path_entry_hash()?,
        LinkTypes::AssessmentTrayConfig,
        None,
    )?;
    match links.last() {
        Some(_link) => {
            let collected_get_results: ExternResult<Vec<Option<Record>>> = links.into_iter().map(|link| {
                let entry_hash = link.target.into_entry_hash()
                    .ok_or_else(|| wasm_error!(WasmErrorInner::Guest(String::from("Invalid link target"))))?;

                    get_latest_assessment_tray(entry_hash)
            }).collect();

            // Handle the Result and then filter_map to remove None values
            collected_get_results.map(|maybe_records| {
                maybe_records.into_iter().filter_map(|maybe_record| maybe_record).collect::<Vec<Record>>()
            })
        }
        None => Ok(vec![])
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, SerializedBytes)]
#[serde(rename_all = "camelCase")]
pub struct AssessmentTrayConfigInput {
    pub name: String,
    pub assessment_control_configs: Vec<AssessmentControlConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize, SerializedBytes)]
#[serde(rename_all = "camelCase")]
pub struct AssessmentTrayConfigUpdateInput {
    pub original_action_hash: ActionHash,
    pub updated_assessment_tray_config: AssessmentTrayConfigInput,
}

impl TryFrom<AssessmentTrayConfigInput> for AssessmentTrayConfig {
    type Error = WasmError;
    fn try_from(value: AssessmentTrayConfigInput) -> Result<Self, Self::Error> {
        let registration = AssessmentTrayConfig {
            name: value.name,
            assessment_control_configs: value.assessment_control_configs,
        };
        Ok(registration)
    }
}

#[hdk_extern]
fn set_assessment_tray_config(tray_config_input: AssessmentTrayConfigInput) -> ExternResult<Record> {
    let input: AssessmentTrayConfig = tray_config_input.clone().try_into()?;
    let action_hash = create_entry(&EntryTypes::AssessmentTrayConfig(input.clone()))?;

    let eh = hash_entry(EntryTypes::AssessmentTrayConfig(input.clone()))?;

    create_link(
        tray_configs_typed_path()?.path_entry_hash()?,
        eh.clone(),
        LinkTypes::AssessmentTrayConfig,
        (),
    )?;

    let record = get(action_hash.clone(), GetOptions::default())?
        .ok_or(wasm_error!(WasmErrorInner::Guest("AssessmentTrayConfig could not be retrieved after creation".into())))?;

    Ok(record)
}

#[hdk_extern]
fn update_assessment_tray_config(input: AssessmentTrayConfigUpdateInput) -> ExternResult<EntryHash> {
    let updated_tray: AssessmentTrayConfig = input.updated_assessment_tray_config.clone().try_into()?;
    let _action_hash =update_entry(input.original_action_hash, updated_tray);

    let eh = hash_entry(EntryTypes::AssessmentTrayConfig(input.updated_assessment_tray_config.clone().try_into()?))?;

    Ok(eh)
}

#[hdk_extern]
fn get_default_assessment_tray_config_for_resource_def(resource_def_eh: EntryHash) -> ExternResult<Option<Record>> {
    let links = get_links(
        resource_def_eh,
        LinkTypes::ResourceDefDefaultAssessmentTrayConfig,
        None,
    )?;

    let default_link = links.iter().next();
    if let Some(link) = default_link {
        let link_target_eh = link.clone().target.into_entry_hash();

        if let Some(eh) = link_target_eh {
            let maybe_record = get_assessment_tray_config(eh)?;

            if let Some(record) = maybe_record {
                return Ok(record.into())
            } else {
                return Ok(None)
            }
        } else {
            return Ok(None)
        }
    } else {
        return Ok(None)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, SerializedBytes)]
#[serde(rename_all = "camelCase")]
pub struct SetAssessmentTrayDefaultInput {
    pub resource_def_eh: EntryHash,
    pub assessment_tray_eh: EntryHash,
}

#[hdk_extern]
fn set_default_assessment_tray_config_for_resource_def(SetAssessmentTrayDefaultInput {resource_def_eh, assessment_tray_eh}: SetAssessmentTrayDefaultInput) -> ExternResult<EntryHash> {
    let links = get_links(
        resource_def_eh.clone(),
        LinkTypes::ResourceDefDefaultAssessmentTrayConfig,
        None,
    )?;

    links.into_iter().for_each(|l| {
        let _delete_link_result = delete_link(l.create_link_hash.clone());
    });

    let _link_action_hash = create_link(
        resource_def_eh,
        assessment_tray_eh.clone(),
        LinkTypes::ResourceDefDefaultAssessmentTrayConfig,
        (),
    )?;

    Ok(assessment_tray_eh)
}

fn tray_configs_typed_path() -> ExternResult<TypedPath> {
    Path::from("assessment_tray_config").typed(LinkTypes::AssessmentTrayConfig)
}