import { describe, expect, it } from "vitest";
import {
  enNavigationSpaceProgressMessages,
  esNavigationSpaceProgressMessages,
} from "./navigation-space-progress";

function placeholders(message: string): string[] {
  return [...message.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]).sort();
}

describe("navigation, space and progress message fragment", () => {
  it("keeps Spanish and English keys in exact parity", () => {
    expect(Object.keys(enNavigationSpaceProgressMessages).sort()).toEqual(
      Object.keys(esNavigationSpaceProgressMessages).sort(),
    );
  });

  it("keeps interpolation placeholders aligned and every value non-empty", () => {
    for (const key of Object.keys(esNavigationSpaceProgressMessages) as Array<keyof typeof esNavigationSpaceProgressMessages>) {
      expect(esNavigationSpaceProgressMessages[key].trim()).not.toBe("");
      expect(enNavigationSpaceProgressMessages[key].trim()).not.toBe("");
      expect(placeholders(enNavigationSpaceProgressMessages[key])).toEqual(placeholders(esNavigationSpaceProgressMessages[key]));
    }
  });
});
