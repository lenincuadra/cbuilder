import type { RegistryStore } from "@/core/registry/types";
import { LocalStorageRegistryStore } from "./localStorageStore";

let store: RegistryStore | null = null;

/**
 * Single entry point to the registry store. Swap the implementation here
 * (e.g. a SupabaseRegistryStore) without touching core/ or ui/.
 * Browser-only: the local implementation reads window.localStorage.
 */
export function getRegistryStore(): RegistryStore {
  if (typeof window === "undefined") {
    throw new Error("The registry store is only available in the browser.");
  }
  if (!store) {
    store = new LocalStorageRegistryStore(window.localStorage);
  }
  return store;
}
