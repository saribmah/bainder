import { afterEach, describe, expect, it, spyOn } from "bun:test";
import { Profile } from "../profile";
import { ProfileStorage } from "../storage";

const sample: Profile.Entity = {
  userId: "u1",
  readingTheme: "light",
  readingFont: "newsreader",
  defaultHighlightColor: "pink",
  aiCitePages: true,
  aiSuggestFollowups: true,
  aiPersonalizeFromHighlights: false,
  notifyDailyNudge: true,
  notifyWeeklyDigest: true,
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
};

describe("Profile feature", () => {
  afterEach(() => {
    spyOn(ProfileStorage, "get").mockRestore();
    spyOn(ProfileStorage, "insertDefaults").mockRestore();
    spyOn(ProfileStorage, "update").mockRestore();
  });

  it("getMe returns the stored entity when present", async () => {
    spyOn(ProfileStorage, "get").mockResolvedValue(sample);
    const insert = spyOn(ProfileStorage, "insertDefaults");
    const result = await Profile.getMe("u1");
    expect(result).toEqual(sample);
    expect(insert).not.toHaveBeenCalled();
  });

  it("getMe seeds defaults when no row exists", async () => {
    spyOn(ProfileStorage, "get").mockResolvedValue(null);
    spyOn(ProfileStorage, "insertDefaults").mockResolvedValue(sample);
    const result = await Profile.getMe("u1");
    expect(result).toEqual(sample);
    expect(ProfileStorage.insertDefaults).toHaveBeenCalledWith("u1", Profile.defaults);
  });

  it("updateMe seeds then updates", async () => {
    spyOn(ProfileStorage, "get").mockResolvedValue(sample);
    spyOn(ProfileStorage, "update").mockResolvedValue({
      ...sample,
      readingTheme: "night",
    });
    const result = await Profile.updateMe("u1", { readingTheme: "night" });
    expect(result.readingTheme).toBe("night");
    expect(ProfileStorage.update).toHaveBeenCalledWith("u1", { readingTheme: "night" });
  });

  it("updateMe throws NotFoundError when storage returns null", async () => {
    spyOn(ProfileStorage, "get").mockResolvedValue(sample);
    spyOn(ProfileStorage, "update").mockResolvedValue(null);
    await expect(Profile.updateMe("u1", { readingTheme: "night" })).rejects.toMatchObject({
      name: "ProfileNotFoundError",
    });
  });

  it("UpdateInput rejects unknown theme", () => {
    expect(() =>
      Profile.UpdateInput.parse({ readingTheme: "neon" as unknown as string }),
    ).toThrow();
  });

  it("UpdateInput accepts a partial patch", () => {
    expect(Profile.UpdateInput.parse({ aiCitePages: false })).toEqual({ aiCitePages: false });
  });
});
