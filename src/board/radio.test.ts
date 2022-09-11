import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Radio } from "./radio";

const encoder = new TextEncoder();
const msg = encoder.encode("hello");
const altMsg = encoder.encode("goodbye");
const longMsg = encoder.encode(
  "This is a message that is longer than 32 bytes"
);
// Truncated to 32 bytes - 3 bytes for header info.
const longMsgTruncated = encoder.encode("This is a message that is lon");

describe("Radio", () => {
  let time = 0;
  let sentMessages: Uint8Array[] = [];
  const currentTime = () => time++;
  const onSend = (data: Uint8Array) => sentMessages.push(data);
  let onChange = vi.fn();
  let radio = new Radio(onSend, onChange, currentTime);

  afterEach(() => {
    time = 0;
    sentMessages = [];
    onChange = vi.fn();
    radio = new Radio(onSend, onChange, currentTime);
  });

  beforeEach(() => {
    radio.enable({
      maxPayload: 32,
      queue: 3,
      group: 1,
    });
  });

  it("sends messages", () => {
    expect(sentMessages.length).toEqual(0);
    radio.send(msg);
    expect(sentMessages.length).toEqual(1);
  });

  it("handles receiving user messages", () => {
    radio.receive(msg);
    expect(radio.peek()!.join("")).toContain(msg.join(""));
    radio.pop();
    expect(radio.peek()).toBeUndefined();
  });

  it("enables the radio with the correct config", () => {
    expect(radio.state).toEqual({
      type: "radio",
      enabled: true,
      group: 1,
    });
  });

  it("disables the radio", () => {
    radio.boardStopped();
    expect(radio.state).toEqual({
      type: "radio",
      enabled: false,
      group: 0,
    });
  });

  it("receives a message that is too big and truncates it appropriately", () => {
    radio.receive(longMsg);
    expect(radio.peek()!.join("")).not.toContain(longMsg.join(""));
    expect(radio.peek()!.join("")).toContain(longMsgTruncated.join(""));
  });

  it("handles the message queue correctly", () => {
    radio.receive(msg);
    radio.receive(msg);
    radio.receive(altMsg);
    // No more messages can be received based on the queue length set in config.
    radio.receive(msg);
    expect(radio.peek()!.join("")).toContain(msg.join(""));
    radio.pop();
    expect(radio.peek()!.join("")).toContain(msg.join(""));
    radio.pop();
    expect(radio.peek()!.join("")).toContain(altMsg.join(""));
    radio.pop();
    // Confirm that fourth message was not added to the queue.
    expect(radio.peek()).toBeUndefined();
  });

  it("updates the config group without clearing receive queue", () => {
    radio.receive(msg);
    radio.receive(msg);
    radio.receive(altMsg);
    radio.updateConfig({
      maxPayload: 32,
      queue: 3,
      group: 2,
    });
    expect(radio.state).toEqual({
      type: "radio",
      enabled: true,
      group: 2,
    });
    expect(radio.peek()!.join("")).toContain(msg.join(""));
    radio.pop();
    expect(radio.peek()!.join("")).toContain(msg.join(""));
    radio.pop();
    expect(radio.peek()!.join("")).toContain(altMsg.join(""));
  });

  it("throws an error if maxPayload or queue are updated without disabling the radio first", () => {
    expect(() => {
      radio.updateConfig({
        maxPayload: 64,
        queue: 6,
        group: 2,
      });
    }).toThrowError(
      new Error("If queue or payload change then should call disable/enable.")
    );
  });

  it("updates all config fields successfully", () => {
    radio.disable();
    radio.enable({
      maxPayload: 64,
      queue: 6,
      group: 2,
    });
    radio.receive(longMsg);
    // Long message over 32 bytes, but under 64 bytes can now be received in its entirety.
    expect(radio.peek()!.join("")).toContain(longMsg.join(""));
  });
});
