import {
  DnaSource,
  Record,
  ActionHash,
  EntryHash,
  AppEntryDef,
  encodeHashToBase64,
} from "@holochain/client";
import { cleanAllConductors, pause, runScenario } from "@holochain/tryorama";
import { decode } from "@msgpack/msgpack";
import pkg from "tape-promise/tape";
import { AppletConfig } from "#client";
import { setUpAliceandBob } from "../../utils";
const { test } = pkg;

let app_entry_def: AppEntryDef = {
  entry_index: 0,
  zome_index: 0,
  visibility: { Public: null },
};
export default () =>
  test("test Sensemaker config in DNA Property", async (t) => {
    await runScenario(async (scenario) => {
      const {
        alice,
        bob,
        cleanup,
        alice_agent_key,
        bob_agent_key,
        ss_cell_id_alice,
        ss_cell_id_bob,
        provider_cell_id_alice,
        provider_cell_id_bob,
      } = await setUpAliceandBob(false, app_entry_def);

      const callZomeAlice = async (
        zome_name,
        fn_name,
        payload,
        is_ss = false
      ) => {
        return await alice.callZome({
          cap_secret: null,
          cell_id: is_ss ? ss_cell_id_alice : provider_cell_id_alice,
          zome_name,
          fn_name,
          payload,
          provenance: alice_agent_key,
        });
      };
      const pauseDuration = 1000;
      try {
        await scenario.shareAllAgents();
        await pause(pauseDuration);

        // Alice retrieves the initial Config
        const maybe_sm_config = await callZomeAlice(
          "sensemaker",
          "get_latest_sensemaker_config",
          null,
          true
        );
        t.ok(maybe_sm_config);

        let sm_config = decode(
          (maybe_sm_config.entry as any).Present.entry
        ) as any;

        let neighborhood_name: string = sm_config.neighbourhood;
        let wizard_version: string = sm_config.wizard_version;

        t.equal(neighborhood_name, "Rated Agenda");
        t.equal(wizard_version, "v0.1");

        const maybe_applet_config: AppletConfig = await callZomeAlice(
          "sensemaker",
          "check_if_applet_config_exists",
          "sample applet config",
          true
        );
        t.equal(maybe_applet_config, null);

      } catch (e) {
        console.log(e);
        t.ok(null);
      }

      await cleanup();
    });
  });

test("test updating of sensemaker config", async (t) => {
  await runScenario(async (scenario) => {
    const {
      alice,
      bob,
      cleanup,
      alice_agent_key,
      bob_agent_key,
      ss_cell_id_alice,
      ss_cell_id_bob,
      provider_cell_id_alice,
      provider_cell_id_bob,
    } = await setUpAliceandBob(false, app_entry_def);

    const callZomeAlice = async (
      zome_name,
      fn_name,
      payload,
      is_ss = false
    ) => {
      return await alice.callZome({
        cap_secret: null,
        cell_id: is_ss ? ss_cell_id_alice : provider_cell_id_alice,
        zome_name,
        fn_name,
        payload,
        provenance: alice_agent_key,
      });
    };

    try {
      await scenario.shareAllAgents();
      await pause(10000);

      const maybe_sm_config: Record = await callZomeAlice(
        "sensemaker",
        "get_latest_sensemaker_config",
        null,
        true
      );
      t.ok(maybe_sm_config);

      let sm_config_action_hash = maybe_sm_config.signed_action.hashed.hash;

      const sensemaker_config_update = {
        original_action_hash: sm_config_action_hash,
        updated_sensemaker_config: {
          neighbourhood: "Rated Agenda 2",
          wizard_version: "v0.2",
          community_activator: encodeHashToBase64(alice_agent_key),
        },
      };

      const updated_config_ah = await callZomeAlice(
        "sensemaker",
        "update_sensemaker_config",
        sensemaker_config_update,
        true
      );
      console.log(updated_config_ah);
      t.ok(updated_config_ah);

      const maybe_updated_sm_config: Record = await callZomeAlice(
        "sensemaker",
        "get_latest_sensemaker_config",
        null,
        true
      );
      let updated_sm_config_action_hash =
        maybe_updated_sm_config.signed_action.hashed.hash;
      t.ok(maybe_sm_config);
      t.deepEqual(updated_sm_config_action_hash, updated_config_ah);
    } catch (e) {
      console.log(e);
      t.ok(null);
    }

    await cleanup();
  });
});
