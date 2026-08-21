import { beforeEach, describe, expect, it } from "vitest";
import { tokenStorage } from "./tokenStorage";

const tokens = { access_token: "access-1", refresh_token: "refresh-1" };

describe("tokenStorage", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("reports no session when storage is empty", () => {
    expect(tokenStorage.hasSession()).toBe(false);
    expect(tokenStorage.getAccessToken()).toBeNull();
  });

  it("persists to localStorage when 'remember me' is chosen", () => {
    tokenStorage.save(tokens, { remember: true });

    expect(localStorage.getItem("access_token")).toBe("access-1");
    expect(sessionStorage.getItem("access_token")).toBeNull();
    expect(tokenStorage.hasSession()).toBe(true);
  });

  it("persists to sessionStorage when 'remember me' is not chosen", () => {
    tokenStorage.save(tokens, { remember: false });

    expect(sessionStorage.getItem("refresh_token")).toBe("refresh-1");
    expect(localStorage.getItem("refresh_token")).toBeNull();
    expect(tokenStorage.getRefreshToken()).toBe("refresh-1");
  });

  it("does not leave the previous session behind when the choice changes", () => {
    tokenStorage.save(tokens, { remember: true });
    tokenStorage.save({ access_token: "a2", refresh_token: "r2" }, { remember: false });

    expect(localStorage.getItem("access_token")).toBeNull();
    expect(tokenStorage.getAccessToken()).toBe("a2");
  });

  it("keeps the original storage when refreshed tokens are written", () => {
    tokenStorage.save(tokens, { remember: false });
    tokenStorage.update({ access_token: "access-2", refresh_token: "refresh-2" });

    expect(sessionStorage.getItem("access_token")).toBe("access-2");
    expect(localStorage.getItem("access_token")).toBeNull();
  });

  it("ignores a refresh when there is no session to update", () => {
    tokenStorage.update(tokens);

    expect(tokenStorage.hasSession()).toBe(false);
  });

  it("clears both storages on sign-out", () => {
    localStorage.setItem("access_token", "stale");
    tokenStorage.save(tokens, { remember: false });

    tokenStorage.clear();

    expect(tokenStorage.hasSession()).toBe(false);
    expect(localStorage.getItem("access_token")).toBeNull();
    expect(sessionStorage.getItem("access_token")).toBeNull();
  });
});
