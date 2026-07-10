import { SUPPORTED_SPEC_VERSION, type LinkSpec } from "./types";

/**
 * Narrow unknown JSON to a LinkSpec, throwing a clear error if the minimum
 * shape isn't there. We only assert the fields cbuilder relies on — the spec
 * may carry more. Forward-compatible: a higher `version` is not an error here
 * (see specVersionSupported), only missing structure is.
 */
export function assertLinkSpec(data: unknown): asserts data is LinkSpec {
  const spec = data as Partial<LinkSpec> | null;
  const fail = (why: string): never => {
    throw new Error(`link-spec.json inválido: ${why}.`);
  };

  if (!spec || typeof spec !== "object") fail("no es un objeto");
  if (typeof spec!.version !== "number") fail("falta 'version'");
  if (typeof spec!.base !== "string" || spec!.base === "") fail("falta 'base'");

  const tracking = spec!.tracking;
  if (!tracking || typeof tracking !== "object") fail("falta 'tracking'");
  if (typeof tracking!.codeFormat !== "string") fail("falta 'tracking.codeFormat'");
  if (!Array.isArray(tracking!.reservedRefs)) fail("falta 'tracking.reservedRefs'");
  if (!tracking!.links || typeof tracking!.links !== "object") fail("falta 'tracking.links'");

  if (!spec!.profiles || typeof spec!.profiles !== "object") fail("falta 'profiles'");
  if (!spec!.focusLetters || typeof spec!.focusLetters !== "object") fail("falta 'focusLetters'");
}

/** True when cbuilder fully understands this spec version. */
export function specVersionSupported(spec: LinkSpec): boolean {
  return spec.version <= SUPPORTED_SPEC_VERSION;
}
