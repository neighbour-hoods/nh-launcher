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
import { AssessmentWidgetTrayConfig } from "#client";
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

        let getEmpty: AssessmentWidgetTrayConfig = await callZomeAlice(
          "widgets",
          "get_assessment_tray_config",
          dummyEntryHash
        );
        t.equal(getEmpty, null, "Get assessment tray config when there is none at that eh returns null")

        // create a config
        const testWidgetConfig1 = {
          inputAssessmentWidget: {
            dimensionEh: dummyEntryHash,
            appletId: dummyEntryHash,
            componentName: 'test-component',
          },
          outputAssessmentWidget: {
            dimensionEh: dummyEntryHash,
            appletId: dummyEntryHash,
            componentName: 'test-component',
          },
        };
        const testWidgetConfig2 = {
          inputAssessmentWidget: {
            dimensionEh: dummyEntryHash,
            appletId: dummyEntryHash,
            componentName: 'test-component',
          },
          outputAssessmentWidget: {
            dimensionEh: dummyEntryHash,
            appletId: dummyEntryHash,
            componentName: 'test-component',
          },
        };

        const create1 = await callZomeAlice(
          "widgets",
          "set_assessment_tray_config",
          {
            name: 'test config',
            assessmentWidgetBlocks: [testWidgetConfig1, testWidgetConfig2],
          }
        );
        t.ok(create1, "creating a new tray config succeeds");
        await pause(pauseDuration);

        const entryRecordCreate1 = new EntryRecord<AssessmentWidgetTrayConfig>(create1);

        // read config back out & check for correctness
        const read1 = await callZomeBob(
          "widgets",
          "get_assessment_tray_config",
          entryRecordCreate1.entryHash
        );
        const entryRecordRead1 = new EntryRecord<AssessmentWidgetTrayConfig>(read1);
        t.ok(entryRecordRead1.entry, "Tray config retrievable by other agent");
        t.equal(entryRecordRead1.entry.name, "test config", "retrieved tray config name is the same");
        t.deepEqual(entryRecordRead1.entry.assessmentWidgetBlocks, [testWidgetConfig1, testWidgetConfig2], "retrieved tray config blocks are the same, have same order");

        // bob creates config
        // assert 'permission denied' error, only the CA can create
        try {
          let _config: AssessmentWidgetTrayConfig = await callZomeBob(
            "widgets",
            "set_assessment_tray_config",
            {
              name: 'test config',
              assessmentWidgetBlocks: [testWidgetConfig1, testWidgetConfig2],
            }
          );
        } catch (e) {
          //@ts-ignore
          console.info(e.message)
          //@ts-ignore
          t.ok(e.message.match("only the community activator can create this entry"), "only network CA can configure resource widget trays; more complex permission structures planned in future");
        }

        // get default when there is none set
        const getDefault1 = await callZomeAlice(
          "widgets",
          "get_default_assessment_tray_config_for_resource_def",
          dummyEntryHash,
        );
        t.equal(getDefault1, null, "Getting a default tray config when there is none set returns null");
        await pause(pauseDuration);

        // set default
        const setDefault1 = await callZomeAlice(
          "widgets",
          "set_default_assessment_tray_config_for_resource_def",
          {
            resourceDefEh: dummyEntryHash,
            assessmentTrayEh: entryRecordCreate1.entryHash,
          }
        );
        t.ok(setDefault1, "setting a default tray config succeeds");
        await pause(pauseDuration);

        // get default when there is one set
        const getDefault2 = await callZomeAlice(
          "widgets",
          "get_default_assessment_tray_config_for_resource_def",
          dummyEntryHash,
        );
        const entrygetDefault2 = new EntryRecord<AssessmentWidgetTrayConfig>(getDefault2);
        t.equal(entrygetDefault2.entry.name, "test config", "Getting a default tray config when it was set to the test entry returns the test entry");
        t.deepEqual(entrygetDefault2.entry.assessmentWidgetBlocks, [testWidgetConfig1, testWidgetConfig2], "retrieved tray config blocks are the same, have same order");

        // Now create a totally different config and set as default
        const dummyEntryHash2: EntryHash = await callZomeAlice(
          "test_provider",
          "create_post",
          { title: 'dummy again', content: 'test 2' },
          false,
        );
        const testWidgetConfig3 = {
          inputAssessmentWidget: {
            dimensionEh: dummyEntryHash2,
            appletId: dummyEntryHash2,
            componentName: 'another-test-component',
          },
          outputAssessmentWidget: {
            dimensionEh: dummyEntryHash2,
            appletId: dummyEntryHash2,
            componentName: 'another-test-component',
          },
        };
        const testWidgetConfig4 = {
          inputAssessmentWidget: {
            dimensionEh: dummyEntryHash2,
            appletId: dummyEntryHash2,
            componentName: 'another-test-component',
          },
          outputAssessmentWidget: {
            dimensionEh: dummyEntryHash2,
            appletId: dummyEntryHash2,
            componentName: 'another-test-component',
          },
        };

        const create2 = await callZomeAlice(
          "widgets",
          "set_assessment_tray_config",
          {
            name: 'test config 2',
            assessmentWidgetBlocks: [testWidgetConfig3, testWidgetConfig4],
          }
        );
        t.ok(create2, "Creating another new tray config succeeds");
        await pause(pauseDuration);

        const entryRecordCreate2 = new EntryRecord<AssessmentWidgetTrayConfig>(create2);

        // set default again to the new entry
        const setDefault2 = await callZomeAlice(
          "widgets",
          "set_default_assessment_tray_config_for_resource_def",
          {
            resourceDefEh: dummyEntryHash, // keep this the same
            assessmentTrayEh: entryRecordCreate2.entryHash,
          }
        );
        t.ok(setDefault2, "setting this new entry as default tray config succeeds");

        // get default when a new one was set
        const getDefault3 = await callZomeAlice(
          "widgets",
          "get_default_assessment_tray_config_for_resource_def",
          dummyEntryHash,
        );

        const entrygetDefault3 = new EntryRecord<AssessmentWidgetTrayConfig>(getDefault3);
        t.equal(entrygetDefault3.entry.name, "test config 2", "Getting a default tray config when it was set to the second test entry returns the second test entry");
        t.deepEqual(entrygetDefault3.entry.assessmentWidgetBlocks, [testWidgetConfig3, testWidgetConfig4], "retrieved tray config blocks are the same, have same order");

      } catch (e) {
        console.error(e);
        t.ok(null);
      }
      await cleanup();
    });
  });
};
