import {
  AdminWebsocket,
  AppAuthenticationToken,
  AppWebsocket,
} from "@holochain/client";
import {
  getCellId
} from "./cellUtils"

export function getAppPort() {
  return import.meta.env.VITE_AGENT === "2" ? import.meta.env.VITE_HC_PORT_2 : import.meta.env.VITE_HC_PORT
}

export function getAdminPort() {
  return import.meta.env.VITE_AGENT === "2" ? import.meta.env.VITE_ADMIN_PORT_2 : import.meta.env.VITE_ADMIN_PORT
}

export async function getAdminWebsocket() {
  return await AdminWebsocket.connect({ url: new URL(`ws://localhost:${getAdminPort()}`)})
}

export async function getAppWebsocket(token?: AppAuthenticationToken) {
  return await AppWebsocket.connect({ token, url: new URL(`ws://localhost:${getAppPort()}`)})
}

export async function connectHolochainApp(installed_app_id: string) {
  const adminWebsocket = await getAdminWebsocket();
  const tokenResponse = await adminWebsocket.issueAppAuthenticationToken({installed_app_id});

  const appWebsocket = await getAppWebsocket(tokenResponse.token);
  const appInfo = await appWebsocket.appInfo();
  const installedCells = appInfo.cell_info;
  await Promise.all(
    Object.values(installedCells).flat().map(cellInfo => {
      console.log('cellInfo :>> ', cellInfo);
      try {
        if(cellInfo['provisioned']?.name == 'sensemaker') return
        adminWebsocket.authorizeSigningCredentials(getCellId(cellInfo)!);
      } catch (error) {
        console.log('error :>> ', error);
      }
    })
  );

  return {
    adminWebsocket,
    appWebsocket,
    appInfo
  }
}
