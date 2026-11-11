/**
 * Tests from MicroPython's suite that we don't run, keyed by path under its
 * tests directory, with the reason.
 *
 * Tests that print SKIP because the port lacks a feature skip themselves and
 * don't need listing.
 */

const noIo = "No io module";
const noFStrings = "f-strings are not enabled";
const noReverseOps = "Reverse operator methods are not enabled";
const noWarnings = "Expects a warning, and warnings are not enabled";
const singlePrecision = "Needs double precision floats";
const needsTestData = "Reads data files from MicroPython's tests directory";

export const skip: Record<string, string> = {
  "basics/builtin_help.py": "help() prints micro:bit specific text",
  "basics/bytes_compare3.py": noWarnings,
  "basics/class_reverse_op.py": noReverseOps,
  "basics/exception_chain.py": noWarnings,
  "basics/io_buffered_writer.py": noIo,
  "basics/io_bytesio_cow.py": noIo,
  "basics/io_bytesio_ext.py": noIo,
  "basics/io_bytesio_ext2.py": noIo,
  "basics/io_iobase.py": noIo,
  "basics/io_stringio1.py": noIo,
  "basics/io_stringio_with.py": noIo,
  "basics/io_write_ext.py": noIo,
  "basics/string_fstring.py": noFStrings,
  "basics/string_fstring_debug.py": noFStrings,
  "float/complex_reverse_op.py": noReverseOps,
  "float/float2int_doubleprec_intbig.py": singlePrecision,
  "float/float_divmod.py": singlePrecision,
  "float/float_parse_doubleprec.py": singlePrecision,
  "unicode/file1.py": needsTestData,
  "unicode/file2.py": needsTestData,
};
