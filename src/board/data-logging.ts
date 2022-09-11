import { LogEntry } from ".";
import {
  MICROBIT_HAL_DEVICE_NO_RESOURCES,
  MICROBIT_HAL_DEVICE_OK,
  MICROBIT_HAL_LOG_TIMESTAMP_DAYS,
  MICROBIT_HAL_LOG_TIMESTAMP_HOURS,
  MICROBIT_HAL_LOG_TIMESTAMP_MILLISECONDS,
  MICROBIT_HAL_LOG_TIMESTAMP_MINUTES,
  MICROBIT_HAL_LOG_TIMESTAMP_NONE,
  MICROBIT_HAL_LOG_TIMESTAMP_SECONDS,
} from "./constants";
import { DataLoggingState, State } from "./state";

// Determined via a CODAL program dumping logEnd - dataStart in MicroBitLog.cpp.
// This is only approximate as we don't serialize our state in the same way but
// it's important for the user to see that the log can fill up.
const maxSizeBytes = 118780;

export class DataLogging {
  private mirroring: boolean = false;
  private size: number = 0;
  private timestamp = MICROBIT_HAL_LOG_TIMESTAMP_NONE;
  private timestampOnLastEndRow: number | undefined;
  private headingsChanged: boolean = false;
  private headings: string[] = [];
  private row: string[] | undefined;
  state: DataLoggingState = { type: "dataLogging", logFull: false };

  constructor(
    private currentTimeMillis: () => number,
    private onLogOutput: (data: LogEntry) => void,
    private onSerialOutput: (data: string) => void,
    private onLogDelete: () => void,
    private onChange: (state: Partial<State>) => void
  ) {}

  setMirroring(mirroring: boolean) {
    this.mirroring = mirroring;
  }

  setTimestamp(timestamp: number) {
    this.timestamp = timestamp;
  }

  beginRow() {
    this.row = new Array(this.headings.length);
    this.row.fill("");
    return MICROBIT_HAL_DEVICE_OK;
  }

  endRow() {
    if (!this.row) {
      throw noRowError();
    }
    if (
      this.timestamp !== this.timestampOnLastEndRow &&
      this.timestamp !== MICROBIT_HAL_LOG_TIMESTAMP_NONE
    ) {
      // New timestamp column required. Put it first if there's been no output.
      if (this.size === 0) {
        this.headings = [timestampToHeading(this.timestamp), ...this.headings];
        this.row = ["", ...this.row];
      } else {
        this.logData(timestampToHeading(this.timestamp), "");
      }
    }

    const entry: LogEntry = {};
    if (this.headingsChanged) {
      this.headingsChanged = false;
      entry.headings = [...this.headings];
    }
    const validData = this.row.some((x) => x?.length > 0);
    if (validData) {
      if (this.timestamp !== MICROBIT_HAL_LOG_TIMESTAMP_NONE) {
        this.logData(
          timestampToHeading(this.timestamp),
          formatTimestamp(this.timestamp, this.currentTimeMillis())
        );
      }
      entry.data = this.row;
    }

    if (entry.data || entry.headings) {
      const entrySize = calculateEntrySize(entry);
      if (this.size + entrySize > maxSizeBytes) {
        if (!this.state.logFull) {
          this.state = {
            ...this.state,
            logFull: true,
          };
          this.onChange({
            dataLogging: this.state,
          });
        }
        return MICROBIT_HAL_DEVICE_NO_RESOURCES;
      }
      this.size += entrySize;
      this.output(entry);
    }
    this.timestampOnLastEndRow = this.timestamp;
    this.row = undefined;
    return MICROBIT_HAL_DEVICE_OK;
  }

  logData(key: string, value: string) {
    if (!this.row) {
      throw noRowError();
    }
    const index = this.headings.indexOf(key);
    if (index === -1) {
      this.headings.push(key);
      this.row.push(value);
      this.headingsChanged = true;
    } else {
      this.row[index] = value;
    }

    return MICROBIT_HAL_DEVICE_OK;
  }

  private output(entry: LogEntry) {
    this.onLogOutput(entry);
    if (this.mirroring) {
      if (entry.headings) {
        this.onSerialOutput(entry.headings.join(",") + "\r\n");
      }
      if (entry.data) {
        this.onSerialOutput(entry.data.join(",") + "\r\n");
      }
    }
  }

  initialize() {}

  boardStopped() {
    // We don't delete the log here as it's on flash, but we do reset in-memory state.
    this.resetNonFlashStateExceptTimestamp();
    // Keep the timestamp if we could restore it from a persisted log.
    if (this.size === 0) {
      this.timestamp = MICROBIT_HAL_LOG_TIMESTAMP_NONE;
    }
  }

  delete() {
    this.resetNonFlashStateExceptTimestamp();
    this.headings = [];
    this.timestampOnLastEndRow = undefined;

    this.size = 0;
    if (this.state.logFull) {
      this.state = {
        ...this.state,
        logFull: false,
      };
      this.onChange({
        dataLogging: this.state,
      });
    }

    this.onLogDelete();
  }

  private resetNonFlashStateExceptTimestamp() {
    // headings are considered flash state as MicroBitLog reparses them from flash
    this.mirroring = false;
    this.headingsChanged = false;
    this.row = undefined;
  }
}

function noRowError() {
  return new Error("HAL clients should always start a row");
}

function calculateEntrySize(entry: LogEntry): number {
  // +1s for commas and a newline, approximating the CSV in the flash.
  const headings = entry.headings
    ? entry.headings.reduce((prev, curr) => prev + curr.length + 1, 0) + 1
    : 0;
  const data = entry.data
    ? entry.data.reduce((prev, curr) => prev + curr.length + 1, 0) + 1
    : 0;
  return headings + data;
}

function timestampToHeading(timestamp: number): string {
  return `Time (${timestampToUnitString(timestamp)})`;
}

function timestampToUnitString(timestamp: number): string {
  switch (timestamp) {
    case MICROBIT_HAL_LOG_TIMESTAMP_DAYS:
      return "days";
    case MICROBIT_HAL_LOG_TIMESTAMP_HOURS:
      return "hours";
    case MICROBIT_HAL_LOG_TIMESTAMP_MINUTES:
      return "minutes";
    case MICROBIT_HAL_LOG_TIMESTAMP_SECONDS:
      return "seconds";
    case MICROBIT_HAL_LOG_TIMESTAMP_MILLISECONDS:
      return "milliseconds";
    case MICROBIT_HAL_LOG_TIMESTAMP_NONE:
    // Fall through
    default:
      throw new Error("Not valid");
  }
}

function formatTimestamp(format: number, currentTime: number): string {
  if (format === MICROBIT_HAL_LOG_TIMESTAMP_MILLISECONDS) {
    return currentTime.toString(); // No fractional part.
  }
  return (currentTime / millisInFormat(format)).toFixed(2);
}

function millisInFormat(format: number) {
  switch (format) {
    case MICROBIT_HAL_LOG_TIMESTAMP_MILLISECONDS:
      return 1;
    case MICROBIT_HAL_LOG_TIMESTAMP_SECONDS:
      return 1000;
    case MICROBIT_HAL_LOG_TIMESTAMP_MINUTES:
      return 1000 * 60;
    case MICROBIT_HAL_LOG_TIMESTAMP_HOURS:
      return 1000 * 60 * 60;
    case MICROBIT_HAL_LOG_TIMESTAMP_DAYS:
      return 1000 * 60 * 60 * 24;
    default:
      throw new Error();
  }
}
