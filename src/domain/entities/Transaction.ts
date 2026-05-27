import Entry from "./Entry.ts";
import { v7 } from "uuid";
import { assertions } from "../../shared/asserts.ts";
export default class Transaction {
  constructor(
    description: string,
    entries: Entry[],
    uuid?: string,
    timestamp?: Date,
  ) {
    this.uuid = uuid ?? v7();
    this.timestamp = timestamp ?? new Date();
    this.description = description;
    this.entries = entries;
    this.validateValues();
  }
  readonly uuid: string;
  readonly timestamp: Date;
  readonly description: string;
  readonly entries: Entry[] = [];

  validateValues() {
    if (!assertions.strings.assertNonEmpty(this.description))
      throw new Error("Transaction description is required");
    if (!assertions.arrays.assertNonEmpty(this.entries))
      throw new Error("Entries are required");
    if(!assertions.arrays.assertInstanceOf(this.entries, Entry))
      throw new Error("Entries must be of type Entry");
    if(!assertions.dates.assertDate(this.timestamp))
      throw new Error("Invalid timestamp");
    if(!assertions.strings.assertNonEmpty(this.uuid))
      throw new Error("UUID is required");
  }
}
