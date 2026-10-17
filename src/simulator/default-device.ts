import { findDevice } from "@/shared/devices";
import type { SimulatorState } from "@/shared/types";

/**
 * Puts the default device first, which is the one shown when only one is. The rest of the list
 * stays, so turning on more devices still brings the last set back. A default that no longer
 * exists, such as a deleted custom device, changes nothing.
 */
export function withDefaultDevice(state: SimulatorState, deviceId: string): SimulatorState {
  if (!deviceId || !findDevice(deviceId, state.customDevices)) return state;
  if (state.visibleDeviceIds[0] === deviceId) return state;
  return {
    ...state,
    visibleDeviceIds: [deviceId, ...state.visibleDeviceIds.filter((id) => id !== deviceId)],
  };
}
