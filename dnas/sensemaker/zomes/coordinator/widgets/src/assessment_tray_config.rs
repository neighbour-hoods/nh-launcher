use hdk::prelude::*;
use nh_sensemaker_zome_lib::*;
use nh_zome_sensemaker_widgets_integrity::*;

#[hdk_extern]
fn get_assessment_tray_config(assessment_tray_eh: EntryHash) -> ExternResult<Option<Record>> {
    let maybe_tray = get(assessment_tray_eh, GetOptions::default())?;
    Ok(maybe_tray)
}

#[derive(Debug, Clone, Serialize, Deserialize, SerializedBytes)]
#[serde(rename_all = "camelCase")]
pub struct AssessmentWidgetTrayConfigInput {
    pub name: String,
    pub assessment_widget_blocks: Vec<AssessmentWidgetBlockConfig>,
}

impl TryFrom<AssessmentWidgetTrayConfigInput> for AssessmentWidgetTrayConfig {
    type Error = WasmError;
    fn try_from(value: AssessmentWidgetTrayConfigInput) -> Result<Self, Self::Error> {
        let registration = AssessmentWidgetTrayConfig {
            name: value.name,
            assessment_widget_blocks: value.assessment_widget_blocks,
        };
        Ok(registration)
    }
}

#[hdk_extern]
fn set_assessment_tray_config(tray_config_input: AssessmentWidgetTrayConfigInput) -> ExternResult<Record> {
    let input: AssessmentWidgetTrayConfig = tray_config_input.clone().try_into()?;
    let action_hash = create_entry(&EntryTypes::AssessmentWidgetTrayConfig(input.clone()))?;

    let eh = hash_entry(EntryTypes::AssessmentWidgetTrayConfig(input.clone()))?;

    create_link(
        tray_configs_typed_path()?.path_entry_hash()?,
        eh.clone(),
        LinkTypes::AssessmentTrayConfig,
        (),
    )?;

    let record = get(action_hash.clone(), GetOptions::default())?
        .ok_or(wasm_error!(WasmErrorInner::Guest("AssessmentWidgetTrayConfig could not be retrieved after creation".into())))?;

    Ok(record)
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