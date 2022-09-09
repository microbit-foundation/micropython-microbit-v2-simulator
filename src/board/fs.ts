// Size as per C implementation.
const maxSize = 31.5 * 1024;

export class FileSystem {
  // Each entry is an FsFile object. The indexes are used as identifiers.
  // When a file is deleted the entry becomes ['', null] and can be reused.
  private _content: Array<FsFile | null> = [];
  private _size = 0;

  create(name: string) {
    let free_idx = -1;
    for (let idx = 0; idx < this._content.length; ++idx) {
      const entry = this._content[idx];
      if (entry === null) {
        free_idx = idx;
      } else if (entry.name === name) {
        // Truncate existing file and return it.
        entry.truncate();
        return idx;
      }
    }
    if (free_idx < 0) {
      // Add a new file and return it.
      this._content.push(new FsFile(name));
      return this._content.length - 1;
    } else {
      // Reuse existing slot for the new file.
      this._content[free_idx] = new FsFile(name);
      return free_idx;
    }
  }

  find(name: string) {
    for (let idx = 0; idx < this._content.length; ++idx) {
      if (this._content[idx]?.name === name) {
        return idx;
      }
    }
    return -1;
  }

  name(idx: number) {
    const file = this._content[idx];
    return file ? file.name : undefined;
  }

  size(idx: number) {
    const file = this._content[idx];
    if (!file) {
      throw new Error("File must exist");
    }
    return file.size();
  }

  remove(idx: number) {
    const file = this._content[idx];
    if (file) {
      this._size -= file.size();
      this._content[idx] = null;
    }
  }

  readbyte(idx: number, offset: number) {
    const file = this._content[idx];
    return file ? file.readbyte(offset) : -1;
  }

  write(idx: number, data: Uint8Array, force: boolean = false): boolean {
    const file = this._content[idx];
    if (!file) {
      throw new Error("File must exist");
    }
    if (!force && this._size + data.length > maxSize) {
      return false;
    }
    this._size += data.length;
    file.append(data);
    return true;
  }

  clear() {
    for (let idx = 0; idx < this._content.length; ++idx) {
      this.remove(idx);
    }
  }

  toString() {
    return this._content.toString();
  }
}

const EMPTY_ARRAY = new Uint8Array(0);

class FsFile {
  constructor(public name: string, private buffer: Uint8Array = EMPTY_ARRAY) {}
  readbyte(offset: number) {
    if (offset < this.buffer.length) {
      return this.buffer[offset];
    }
    return -1;
  }
  append(data: Uint8Array) {
    const updated = new Uint8Array(this.buffer.length + data.length);
    updated.set(this.buffer);
    updated.set(data, this.buffer.length);
    this.buffer = updated;
  }
  truncate() {
    this.buffer = EMPTY_ARRAY;
  }
  size() {
    return this.buffer.length;
  }
}
