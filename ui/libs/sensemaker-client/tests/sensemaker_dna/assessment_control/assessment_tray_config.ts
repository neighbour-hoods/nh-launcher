import { EntryRecord } from '@holochain-open-dev/utils';
import { EntryHash } from "@holochain/client";
import {
  pause,
  runScenario,
  Scenario,
  createConductor,
  addAllAgentsToAllConductors,
  cleanAllConductors,
} from "@holochain/tryorama";
import { AssessmentTrayConfig } from "#client";
import { setUpAliceandBob } from "../../utils";

import pkg from "tape-promise/tape";
const { test } = pkg;

export default () => {
  test("Test setting and getting assessment tray config block", async (t) => {
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
      } = await setUpAliceandBob();

      const callZomeAlice = async (
        zome_name,
        fn_name,
        payload,
        is_ss = true
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
      const callZomeBob = async (
        zome_name,
        fn_name,
        payload,
        is_ss = true
      ) => {
        return await bob.callZome({
          cap_secret: null,
          cell_id: is_ss ? ss_cell_id_bob : provider_cell_id_bob,
          zome_name,
          fn_name,
          payload,
          provenance: bob_agent_key,
        });
      };
      try {
        const pauseDuration = 1000
        await scenario.shareAllAgents();
        await pause(pauseDuration*2);

        // :SHONK: use provider DNA method to get some entry hash for Resource Def anchors
        const dummyEntryHash: EntryHash = await callZomeAlice(
          "test_provider",
          "create_post",
          { title: 'dummy', content: 'test' },
          false,
        );
        
        // Test 0: Given no created tray configs When Alice gets tray config with a dummy hash Then it returns null
        let getEmpty: AssessmentTrayConfig = await callZomeAlice(
          "assessment_tray",
          "get_assessment_tray_config",
          dummyEntryHash
        );
        t.equal(getEmpty, null, "Get assessment tray config when there is none at that eh returns null")


        // Test 1: Given we have created a config with two assessment control configs:
        const testControlConfig1 = {
          inputAssessmentControl: {
            dimensionEh: dummyEntryHash,
            appletId: dummyEntryHash,
            componentName: 'test-component',
          },
          outputAssessmentControl: {
            dimensionEh: dummyEntryHash,
            appletId: dummyEntryHash,
            componentName: 'test-component',
          },
        };
        const testControlConfig2 = {
          inputAssessmentControl: {
            dimensionEh: dummyEntryHash,
            appletId: dummyEntryHash,
            componentName: 'test-component',
          },
          outputAssessmentControl: {
            dimensionEh: dummyEntryHash,
            appletId: dummyEntryHash,
            componentName: 'test-component',
          },
        };

        const create1 = await callZomeAlice(
          "assessment_tray",
          "set_assessment_tray_config",
          {
            name: 'test config',
            assessmentControlConfigs: [testControlConfig1, testControlConfig2],
          }
        );
        t.ok(create1, "creating a new tray config succeeds");
        await pause(pauseDuration);

        const entryRecordCreate1 = new EntryRecord<AssessmentTrayConfig>(create1);
        // When Alice gets tray config with that entry hash
        const read1 = await callZomeBob(
          "assessment_tray",
          "get_assessment_tray_config",
          entryRecordCreate1.entryHash
        );
        const entryRecordRead1 = new EntryRecord<AssessmentTrayConfig>(read1);

        // Then the same config is returned with control configs in the same order
        t.ok(entryRecordRead1.entry, "Tray config retrievable by other agent");
        t.equal(entryRecordRead1.entry.name, "test config", "retrieved tray config name is the same");
        t.deepEqual(entryRecordRead1.entry.assessmentControlConfigs, [testControlConfig1, testControlConfig2], "retrieved tray config blocks are the same, have same order");


        // Test 2: Given config so far created by Alice
        // When Bob creates a config
        // Then 'permission denied' error, only the CA can create
        try {
          let _config: AssessmentTrayConfig = await callZomeBob(
            "assessment_tray",
            "set_assessment_tray_config",
            {
              name: 'test config',
              assessmentControlConfigs: [testControlConfig1, testControlConfig2],
            }
          );
        } catch (e) {
          //@ts-ignore
          console.info(e.message)
          //@ts-ignore
          t.ok(e.message.match("only the community activator can create this entry"), "only network CA can configure assessment trays; more complex permission structures planned in future");
        }


        // Test 3: Given config so far created by Alice and a dummy entry hash for our Resource Def and no default set
        // When we get the default for that entry hash
        const getDefault1 = await callZomeAlice(
          "assessment_tray",
          "get_default_assessment_tray_config_for_resource_def",
          dummyEntryHash,
        );
        // Then we get null
        t.equal(getDefault1, null, "Getting a default tray config when there is none set returns null");
        await pause(pauseDuration);


        // Test 4: Given config so far created by Alice and a dummy entry hash for our Resource Def and no default set
        // When we set the default for that entry hash
        const setDefault1 = await callZomeAlice(
          "assessment_tray",
          "set_default_assessment_tray_config_for_resource_def",
          {
            resourceDefEh: dummyEntryHash,
            assessmentTrayEh: entryRecordCreate1.entryHash,
          }
        );
        // Then we can set the default
        t.ok(setDefault1, "setting a default tray config succeeds");
        await pause(pauseDuration);


        // Test 5: Given config so far created by Alice and a dummy entry hash for our Resource Def and the default for that was set to our tray entry hash
        // When we get the default for that entry hash
        const getDefault2 = await callZomeAlice(
          "assessment_tray",
          "get_default_assessment_tray_config_for_resource_def",
          dummyEntryHash,
        );
        const entrygetDefault2 = new EntryRecord<AssessmentTrayConfig>(getDefault2);

        // Then we get back the tray config created by Alice in Test 1, with the same order of control configs.
        t.equal(entrygetDefault2.entry.name, "test config", "Getting a default tray config when it was set to the test entry returns the test entry");
        t.deepEqual(entrygetDefault2.entry.assessmentControlConfigs, [testControlConfig1, testControlConfig2], "retrieved tray config blocks are the same, have same order");


        // Test 6: Given we already set the default
        // and then we create a new dummy resource def entry hash, a new tray config with a new name and new control configs
        const dummyEntryHash2: EntryHash = await callZomeAlice(
          "test_provider",
          "create_post",
          { title: 'dummy again', content: 'test 2' },
          false,
        );
        const testControlConfig3 = {
          inputAssessmentControl: {
            dimensionEh: dummyEntryHash2,
            appletId: dummyEntryHash2,
            componentName: 'another-test-component',
          },
          outputAssessmentControl: {
            dimensionEh: dummyEntryHash2,
            appletId: dummyEntryHash2,
            componentName: 'another-test-component',
          },
        };
        const testControlConfig4 = {
          inputAssessmentControl: {
            dimensionEh: dummyEntryHash2,
            appletId: dummyEntryHash2,
            componentName: 'another-test-component',
          },
          outputAssessmentControl: {
            dimensionEh: dummyEntryHash2,
            appletId: dummyEntryHash2,
            componentName: 'another-test-component',
          },
        };

        const create2 = await callZomeAlice(
          "assessment_tray",
          "set_assessment_tray_config",
          {
            name: 'test config 2',
            assessmentControlConfigs: [testControlConfig3, testControlConfig4],
          }
        );
        t.ok(create2, "Creating another new tray config succeeds");
        await pause(pauseDuration);

        const entryRecordCreate2 = new EntryRecord<AssessmentTrayConfig>(create2);

        // When we set the default for our previous resource def entry hash to the new tray config's entry hash
        const setDefault2 = await callZomeAlice(
          "assessment_tray",
          "set_default_assessment_tray_config_for_resource_def",
          {
            resourceDefEh: dummyEntryHash, // keep this the same
            assessmentTrayEh: entryRecordCreate2.entryHash,
          }
        );
        // Then we can set the default
        t.ok(setDefault2, "setting this new entry as default tray config succeeds");

        // And when we get the default
        const getDefault3 = await callZomeAlice(
          "assessment_tray",
          "get_default_assessment_tray_config_for_resource_def",
          dummyEntryHash,
        );
        const entrygetDefault3 = new EntryRecord<AssessmentTrayConfig>(getDefault3);

        // Then a new one was set with the correct details and order of control configs 
        t.equal(entrygetDefault3.entry.name, "test config 2", "Getting a default tray config when it was set to the second test entry returns the second test entry");
        t.deepEqual(entrygetDefault3.entry.assessmentControlConfigs, [testControlConfig3, testControlConfig4], "retrieved tray config blocks are the same, have same order");

      } catch (e) {
        console.error(e);
        t.ok(null);
      }
      await cleanup();
    });
  });
};
