/*
 * Helper library containing adapters for fire-once `MatixStore` methods which are
 * not bound to any internally persisted `Readable` objects.
 *
 * This enables components to use the `StoreSubscriber` interface for triggering
 * side-effects upon view instantiation and subscribing to the results of those
 * asynchronous calls.
 *
 * Once `MatrixStore` has been refactored and additional attention given to its
 * handling of side-effects and internal consistency guarantees, these helpers
 * should be removed.
 * There will be other considerations involved in deciding which parts of
 * `MatrixStore` should always run zome calls vs which should potentially read
 * from & update local caches (eg. peer syncing); so each case below will likely
 * behave in a situation-dependent way.
 */

import { get, readable, Readable } from 'svelte/store';

import { DnaHash } from '@holochain/client';
import { DnaHashMap } from '@holochain-open-dev/utils';
import type {
  MatrixStore,
} from './matrix-store';
import type { NeighbourhoodInfo } from '@neighbourhoods/client';
import {
  Applet,
  WeGroupData,
  AppletInstanceInfo,
  NewAppletInstanceInfo,
} from './types';

// TODO: these adaptors shouldn't exist, and they are hacky, we should modify the matrixStore to do the right thing

export function provideMatrix(matrixStore: MatrixStore) {
  return readable(new DnaHashMap<[WeGroupData, AppletInstanceInfo[]]>(), set => {
    matrixStore.fetchMatrix().then(m => set(get(m)))
  })
}

export function provideAllApplets(matrixStore: MatrixStore, weGroupId: DnaHash) {
  return readable([] as [Uint8Array, Applet, Uint8Array[]][], set => {
    matrixStore.fetchAllApplets(weGroupId).then(m => set(get(m)))
  })
}

export function provideWeGroupInfo(matrixStore: MatrixStore, weGroupId: DnaHash) {
  return readable(null as NeighbourhoodInfo | null, set => {
    matrixStore.fetchWeGroupInfo(weGroupId).then(m => set(get(m)))
  })
}

export function provideNewAppletInstancesForGroup(matrixStore: MatrixStore, groupId: DnaHash) {
  return readable([] as NewAppletInstanceInfo[], set => {
    matrixStore.fetchNewAppletInstancesForGroup(groupId)
      .then(get)
      .then(set)
  })
}
