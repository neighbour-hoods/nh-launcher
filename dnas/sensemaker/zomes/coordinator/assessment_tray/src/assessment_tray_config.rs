use hdk::prelude::*;
use nh_zome_assessment_tray_integrity::*;

#[hdk_extern]
fn get_assessment_tray_config(assessment_tray_eh: EntryHash) -> ExternResult<Option<Record>> {
    let maybe_tray = get(assessment_tray_eh, GetOptions::default())?;
    // TODO: ensure we have a tray before returning

    debug!("_+_+_+_+_+_+_+_+_+_ Maybe tray entry: {:#?}", maybe_tray.clone());
    Ok(maybe_tray)
}

#[derive(Debug, Clone, Serialize, Deserialize, SerializedBytes)]
#[serde(rename_all = "camelCase")]
pub struct AssessmentTrayConfigInput {
    pub name: String,
    pub assessment_control_configs: Vec<AssessmentControlConfig>,
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
fn get_default_assessment_tray_config_for_resource_def(resource_def_eh: EntryHash) -> ExternResult<Option<Record>> {
    let links = get_links(
        resource_def_eh,
        LinkTypes::ResourceDefDefaultAssessmentTrayConfig,
        None,
    )?;

    debug!("_+_+_+_+_+_+_+_+_+_ Default tray links: {:#?}", links.clone());

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

    debug!("_+_+_+_+_+_+_+_+_+_ Created default tray link: {:#?}", _link_action_hash);
    Ok(assessment_tray_eh)
}

fn tray_configs_typed_path() -> ExternResult<TypedPath> {
    Path::from("assessment_tray_config").typed(LinkTypes::AssessmentTrayConfig)
}