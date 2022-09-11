import { DataLogging } from "./data-logging";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LogEntry } from ".";
import {
  MICROBIT_HAL_LOG_TIMESTAMP_MILLISECONDS,
  MICROBIT_HAL_LOG_TIMESTAMP_NONE,
  MICROBIT_HAL_LOG_TIMESTAMP_SECONDS,
} from "./constants";

describe("DataLogging", () => {
  let time = 0;
  let log: LogEntry[] = [];
  let serial: string[] = [];
  const currentTime = () => time++;
  const onLogOutput = (entry: LogEntry) => log.push(entry);
  const onLogDelete = () => (log.length = 0);
  const onSerialOutput = (text: string) => serial.push(text);
  let onChange = vi.fn();
  let logging = new DataLogging(
    currentTime,
    onLogOutput,
    onSerialOutput,
    onLogDelete,
    onChange
  );

  afterEach(() => {
    time = 0;
    log = [];
    serial = [];
    onChange = vi.fn();
    logging = new DataLogging(
      currentTime,
      onLogOutput,
      onSerialOutput,
      onLogDelete,
      onChange
    );
  });

  it("works in a basic scenario", () => {
    logging.setMirroring(true);
    logging.beginRow();
    logging.logData("a", "1");
    logging.logData("b", "2");
    logging.endRow();
    logging.beginRow();
    logging.logData("a", "3");
    logging.logData("b", "4");
    logging.endRow();

    expect(log).toEqual([
      {
        headings: ["a", "b"],
        data: ["1", "2"],
      },
      {
        data: ["3", "4"],
      },
    ]);
    // Mirroring is enabled:
    expect(serial).toEqual(["a,b\r\n", "1,2\r\n", "3,4\r\n"]);
  });

  it("can add headings on the fly", () => {
    logging.beginRow();
    logging.logData("a", "1");
    logging.endRow();
    logging.beginRow();
    logging.logData("b", "4");
    logging.endRow();

    expect(log).toEqual([
      {
        headings: ["a"],
        data: ["1"],
      },
      {
        headings: ["a", "b"],
        data: ["", "4"],
      },
    ]);

    expect(serial).toEqual([]);
  });

  it("uses timestamp", () => {
    logging.setTimestamp(MICROBIT_HAL_LOG_TIMESTAMP_MILLISECONDS);
    logging.beginRow();
    logging.logData("a", "1");
    logging.endRow();
    logging.beginRow();
    logging.logData("a", "2");
    logging.endRow();

    expect(log).toEqual([
      {
        headings: ["Time (milliseconds)", "a"],
        data: ["0", "1"],
      },
      {
        data: ["1", "2"],
      },
    ]);
  });

  it("allows change of timestamp before logged output", () => {
    logging.setTimestamp(MICROBIT_HAL_LOG_TIMESTAMP_MILLISECONDS);
    logging.beginRow();
    logging.logData("a", "1");
    logging.setTimestamp(MICROBIT_HAL_LOG_TIMESTAMP_SECONDS);
    logging.endRow();

    expect(log).toEqual([
      {
        headings: ["Time (seconds)", "a"],
        data: ["0.00", "1"],
      },
    ]);
  });

  it("allows change of timestamp after logged output (but appends)", () => {
    logging.setTimestamp(MICROBIT_HAL_LOG_TIMESTAMP_MILLISECONDS);
    logging.beginRow();
    logging.logData("a", "1");
    logging.endRow();
    logging.setTimestamp(MICROBIT_HAL_LOG_TIMESTAMP_SECONDS);
    logging.beginRow();
    logging.logData("a", "2");
    logging.endRow();

    expect(log).toEqual([
      {
        headings: ["Time (milliseconds)", "a"],
        data: ["0", "1"],
      },
      {
        headings: ["Time (milliseconds)", "a", "Time (seconds)"],
        data: ["", "2", "0.00"],
      },
    ]);
  });

  it("allows change of timestamp to none after logged output", () => {
    logging.setTimestamp(MICROBIT_HAL_LOG_TIMESTAMP_MILLISECONDS);
    logging.beginRow();
    logging.logData("a", "1");
    logging.endRow();
    logging.setTimestamp(MICROBIT_HAL_LOG_TIMESTAMP_NONE);
    logging.beginRow();
    logging.logData("a", "2");
    logging.endRow();

    expect(log).toEqual([
      {
        headings: ["Time (milliseconds)", "a"],
        data: ["0", "1"],
      },
      {
        data: ["", "2"],
      },
    ]);
  });

  it("allows header only change", () => {
    // MicroPython uses this to implement log.set_labels.
    logging.beginRow();
    logging.logData("a", "");
    logging.endRow();
    logging.beginRow();
    logging.logData("b", "");
    logging.endRow();

    expect(log).toEqual([
      {
        headings: ["a"],
      },
      {
        headings: ["a", "b"],
      },
    ]);
  });

  it("fills up the log", () => {
    const big = "1".repeat(1024);
    let limit = 0;
    for (; limit < 1000; ++limit) {
      logging.beginRow();
      logging.logData("a", big);
      if (logging.endRow()) {
        break;
      }
    }
    expect(limit).toEqual(115);
    expect(onChange.mock.lastCall![0]).toEqual({
      dataLogging: {
        type: "dataLogging",
        logFull: true,
      },
    });
    logging.delete();
    expect(onChange.mock.lastCall![0]).toEqual({
      dataLogging: {
        type: "dataLogging",
        logFull: false,
      },
    });
  });

  it("deletes the log resetting mirroring but remembering timestamp", () => {
    logging.setTimestamp(MICROBIT_HAL_LOG_TIMESTAMP_SECONDS);
    logging.setMirroring(true);
    logging.beginRow();
    logging.logData("a", "1");
    logging.endRow();

    logging.delete();

    expect(log).toEqual([]);

    serial.length = 0;
    logging.beginRow();
    logging.logData("b", "2");
    logging.endRow();
    expect(log).toEqual([
      {
        headings: ["Time (seconds)", "b"], // No "a" remembered
        data: ["0.00", "2"],
      },
    ]);
    expect(serial).toEqual([]);
  });

  it("dispose resets timestamp if nothing written", () => {
    logging.setTimestamp(MICROBIT_HAL_LOG_TIMESTAMP_SECONDS);
    logging.boardStopped();
    logging.initialize();

    logging.beginRow();
    logging.logData("b", "2");
    logging.endRow();
    expect(log).toEqual([
      {
        headings: ["b"],
        data: ["2"],
      },
    ]);
  });

  it("dispose keeps timestamp if header written", () => {
    logging.setTimestamp(MICROBIT_HAL_LOG_TIMESTAMP_SECONDS);
    logging.beginRow();
    logging.logData("b", "");
    logging.endRow();

    logging.boardStopped();
    logging.initialize();

    logging.beginRow();
    logging.logData("b", "2");
    logging.endRow();
    expect(log).toEqual([
      {
        headings: ["Time (seconds)", "b"],
      },
      {
        data: ["0.00", "2"],
      },
    ]);
  });
});
