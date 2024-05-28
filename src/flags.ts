import { Stage, stage as stageFromEnvironment } from "./environment";

/**
 * A union of the flag names (alphabetical order).
 */
export type Flag =
  /**
   * Enables service worker registration.
   *
   * Registers the service worker and enables offline use.
   */
  "sw";

interface FlagMetadata {
  defaultOnStages: Stage[];
  name: Flag;
}

const allFlags: FlagMetadata[] = [{ name: "sw", defaultOnStages: [] }];

type Flags = Record<Flag, boolean>;

const flagsForParams = (stage: Stage, params: URLSearchParams) => {
  const enableFlags = new Set(params.getAll("flag"));
  const allFlagsDefault = enableFlags.has("none")
    ? false
    : enableFlags.has("*")
    ? true
    : undefined;
  return Object.fromEntries(
    allFlags.map((f) => [
      f.name,
      isEnabled(f, stage, allFlagsDefault, enableFlags.has(f.name)),
    ])
  ) as Flags;
};

const isEnabled = (
  f: FlagMetadata,
  stage: Stage,
  allFlagsDefault: boolean | undefined,
  thisFlagOn: boolean
): boolean => {
  if (thisFlagOn) {
    return true;
  }
  if (allFlagsDefault !== undefined) {
    return allFlagsDefault;
  }
  return f.defaultOnStages.includes(stage);
};

export const flags: Flags = (() => {
  const params = new URLSearchParams(window.location.search);
  return flagsForParams(stageFromEnvironment, params);
})();
