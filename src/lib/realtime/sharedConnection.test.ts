import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EmitterConnectionOptions } from "./emitterConnection";
import { joinSharedConnection } from "./sharedConnection";

const opened = vi.hoisted(
  () => [] as { options: EmitterConnectionOptions; close: ReturnType<typeof vi.fn> }[],
);
vi.mock("./emitterConnection", () => ({
  openEmitterConnection: (options: EmitterConnectionOptions) => {
    const close = vi.fn();
    opened.push({ options, close });
    return { close };
  },
}));

const options = { getCredentials: vi.fn() };
const listener = () => ({ onMessage: vi.fn(), onLive: vi.fn(), onStatus: vi.fn() });

describe("joinSharedConnection", () => {
  beforeEach(() => {
    opened.length = 0;
  });

  it("opens one connection for several listeners and delivers to all of them", () => {
    const [first, second] = [listener(), listener()];
    const leaveFirst = joinSharedConnection("a", options, first);
    const leaveSecond = joinSharedConnection("a", options, second);

    expect(opened).toHaveLength(1);
    opened[0].options.onMessage({ v: 1 });
    expect(first.onMessage).toHaveBeenCalledWith({ v: 1 });
    expect(second.onMessage).toHaveBeenCalledWith({ v: 1 });

    leaveFirst();
    leaveSecond();
  });

  it("closes the connection only when the last listener leaves", () => {
    const leaveFirst = joinSharedConnection("b", options, listener());
    const leaveSecond = joinSharedConnection("b", options, listener());

    leaveFirst();
    expect(opened[0].close).not.toHaveBeenCalled();
    leaveSecond();
    expect(opened[0].close).toHaveBeenCalledTimes(1);

    const leaveThird = joinSharedConnection("b", options, listener());
    expect(opened).toHaveLength(2);
    leaveThird();
  });

  it("brings a late listener up to date with a connection that is already live", () => {
    const leaveFirst = joinSharedConnection("c", options, listener());
    opened[0].options.onStatus("live");
    const late = listener();

    const leaveLate = joinSharedConnection("c", options, late);

    expect(late.onStatus).toHaveBeenCalledWith("live");
    expect(late.onLive).toHaveBeenCalledTimes(1);
    leaveFirst();
    leaveLate();
  });

  it("keeps separate connections for separate ids", () => {
    const leaveA = joinSharedConnection("d", options, listener());
    const leaveB = joinSharedConnection("e", options, listener());

    expect(opened).toHaveLength(2);
    leaveA();
    leaveB();
  });
});
