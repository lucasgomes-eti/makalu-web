import { describe, expect, it } from "vitest";
import {
  MIN_PASSWORD_LENGTH,
  hasErrors,
  validateCredentials,
} from "./validateCredentials";

const valid = { email: "owner@makalu.com", password: "supersecret" };

describe("validateCredentials", () => {
  it("accepts a well-formed email and a long enough password", () => {
    expect(validateCredentials(valid)).toEqual({});
    expect(hasErrors(validateCredentials(valid))).toBe(false);
  });

  it.each([
    ["missing @", "ownermakalu.com"],
    ["missing domain dot", "owner@makalu"],
    ["missing local part", "@makalu.com"],
    ["blank", ""],
  ])("rejects an email that is %s", (_case, email) => {
    expect(validateCredentials({ ...valid, email }).email).toBeDefined();
  });

  it("ignores surrounding whitespace on the email", () => {
    expect(validateCredentials({ ...valid, email: "  owner@makalu.com  " }).email)
      .toBeUndefined();
  });

  it(`rejects a password shorter than ${MIN_PASSWORD_LENGTH} characters`, () => {
    const errors = validateCredentials({ ...valid, password: "short" });
    expect(errors.password).toContain(String(MIN_PASSWORD_LENGTH));
  });

  it("accepts a password of exactly the minimum length", () => {
    const password = "a".repeat(MIN_PASSWORD_LENGTH);
    expect(validateCredentials({ ...valid, password }).password).toBeUndefined();
  });

  it("reports both fields at once", () => {
    const errors = validateCredentials({ email: "nope", password: "x" });
    expect(Object.keys(errors)).toEqual(["email", "password"]);
    expect(hasErrors(errors)).toBe(true);
  });
});
