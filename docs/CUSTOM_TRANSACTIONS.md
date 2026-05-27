# Custom Transactions Guide

Learn how to extend Hammurabi's Transaction class to add custom metadata fields like user info, location, and other business-specific data.

## Table of Contents

1. [Why Custom Transactions?](#why-custom-transactions)
2. [Creating a Custom Transaction](#creating-a-custom-transaction)
3. [Complete Example: Invoice with User & Location](#complete-example-invoice-with-user--location)
4. [Using Custom Transactions](#using-custom-transactions)
5. [Repository Considerations](#repository-considerations)
6. [Best Practices](#best-practices)

## Why Custom Transactions?

The standard Transaction class provides core accounting functionality:
- Description
- Entries (debits and credits)
- UUID and timestamp
- Immutability

But your business might need additional metadata:
- **Who** created the transaction (user/employee info)
- **Where** it happened (location/branch/warehouse)
- **Custom fields** (invoice number, approval level, cost center, customer ID, etc.)

Custom Transaction subclasses let you add this metadata **without modifying Hammurabi's core code**.

## Creating a Custom Transaction

### Step 1: Create a Subclass

```typescript
import { Transaction, Entry } from "hammurabi";

class CustomTransaction extends Transaction {
  // Your custom fields
  customField1: string;
  customField2: number;

  constructor(
    description: string,
    entries: Entry[],
    customField1: string,
    customField2: number
  ) {
    // CRITICAL: Call super() to initialize base Transaction fields
    super(description, entries);
    
    // Now add custom fields
    this.customField1 = customField1;
    this.customField2 = customField2;
  }
}
```

### Key Points

1. **Always call `super(description, entries)`**: This initializes the base Transaction properties (uuid, timestamp, entries, etc.)
2. **Preserve base fields**: Don't override or modify the base Transaction fields
3. **Add your fields after super()**: Custom fields go after the super call
4. **Transaction is immutable**: The base Transaction is frozen; your custom fields should also be frozen or treated as immutable

## Complete Example: Invoice with User & Location

A practical example showing how to track invoice transactions with user and location information.

### Step 1: Define Domain Objects

```typescript
// User.ts
export class User {
  id: number;
  name: string;
  email: string;
  departmentId: number;

  constructor(id: number, name: string, email: string, departmentId: number) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.departmentId = departmentId;
    // Optionally freeze to prevent modification
    Object.freeze(this);
  }
}

// Location.ts
export class Location {
  id: number;
  name: string;
  address: string;
  country: string;

  constructor(id: number, name: string, address: string, country: string) {
    this.id = id;
    this.name = name;
    this.address = address;
    this.country = country;
    Object.freeze(this);
  }
}
```

### Step 2: Create the Custom Transaction

```typescript
import { Transaction, Entry } from "hammurabi";
import { User } from "./User";
import { Location } from "./Location";

class InvoiceTransaction extends Transaction {
  // Custom metadata
  invoiceNumber: string;
  user: User;
  location: Location;
  customerId: number;
  approvalLevel: "draft" | "pending" | "approved";

  constructor(
    description: string,
    entries: Entry[],
    invoiceNumber: string,
    user: User,
    location: Location,
    customerId: number,
    approvalLevel: "draft" | "pending" | "approved" = "draft"
  ) {
    // IMPORTANT: Always call super first
    super(description, entries);

    // Then set custom fields
    this.invoiceNumber = invoiceNumber;
    this.user = user;
    this.location = location;
    this.customerId = customerId;
    this.approvalLevel = approvalLevel;

    // Optionally freeze to make fully immutable (like base Transaction)
    Object.freeze(this);
  }
}

export default InvoiceTransaction;
```

### Step 3: Use the Custom Transaction

```typescript
import Hammurabi, { Entry } from "hammurabi";
import InvoiceTransaction from "./InvoiceTransaction";
import { User } from "./User";
import { Location } from "./Location";

// Assume Hammurabi is already configured
const ledger = Hammurabi.getLedger();

// Create domain objects
const user = new User(1, "Alice Johnson", "alice@company.com", 5);
const location = new Location(1, "Main Office", "123 Main St", "USA");

// Create entries
const entries = [
  new Entry({ accountId: 101, amount: 5000 }),
  new Entry({ accountId: 201, amount: -5000 })
];

// Create custom transaction with metadata
const invoiceTx = new InvoiceTransaction(
  "Invoice #INV-2024-001 payment received",
  entries,
  "INV-2024-001",
  user,
  location,
  42,  // customerId
  "approved"
);

// Use the second overload of startTransaction to pass the custom transaction
ledger.startTransaction(invoiceTx);

// Commit to database
const saved = await ledger.commit();

console.log(`✓ Saved invoice ${invoiceTx.invoiceNumber}`);
console.log(`  User: ${invoiceTx.user.name}`);
console.log(`  Location: ${invoiceTx.location.name}`);
console.log(`  UUID: ${saved.uuid}`);
```

## Using Custom Transactions

### Syntax: Using the Custom Transaction Overload

Hammurabi has two `startTransaction()` overloads:

```typescript
// Overload 1: Standard (description + entries)
ledger.startTransaction("Transaction description", entries);

// Overload 2: Custom Transaction instance
const customTx = new InvoiceTransaction(...);
ledger.startTransaction(customTx);
```

### Complete Workflow

```typescript
import Hammurabi, { Entry } from "hammurabi";
import InvoiceTransaction from "./InvoiceTransaction";

// 1. Get a ledger
const ledger = Hammurabi.getLedger();

// 2. Prepare entries
const entries = [
  new Entry({ accountId: 101, amount: -1000 }),
  new Entry({ accountId: 401, amount: 1000 })
];

// 3. Create custom transaction with metadata
const tx = new InvoiceTransaction(
  "Invoice payment",
  entries,
  "INV-001",
  currentUser,
  currentLocation,
  customerId,
  "approved"
);

// 4. Start the transaction (uses overload 2)
ledger.startTransaction(tx);

// 5. Commit
await ledger.commit();
```

### Accessing Custom Fields

After creating the transaction, you can access custom fields:

```typescript
const tx = new InvoiceTransaction(...);

// Access base Transaction fields (inherited)
console.log(tx.uuid);
console.log(tx.timestamp);
console.log(tx.description);
console.log(tx.entries);

// Access custom fields
console.log(tx.invoiceNumber);
console.log(tx.user.name);
console.log(tx.location.id);
console.log(tx.customerId);
console.log(tx.approvalLevel);
```

## Repository Considerations

When persisting custom transactions, your repository must handle the additional fields.

### Step 1: Update Your Database Schema

For the InvoiceTransaction example:

```sql
-- transactions table (standard, unchanged)
CREATE TABLE transactions (
  uuid UUID PRIMARY KEY,
  description TEXT NOT NULL,
  timestamp TIMESTAMP NOT NULL
);

-- entries table (standard, unchanged)
CREATE TABLE entries (
  id SERIAL PRIMARY KEY,
  transaction_uuid UUID NOT NULL REFERENCES transactions(uuid),
  account_id INTEGER NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  concept_id INTEGER,
  quantity INTEGER,
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);

-- New: custom fields table
CREATE TABLE invoice_transactions (
  transaction_uuid UUID PRIMARY KEY REFERENCES transactions(uuid),
  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  location_id INTEGER NOT NULL REFERENCES locations(id),
  customer_id INTEGER NOT NULL,
  approval_level VARCHAR(20) NOT NULL,
  FOREIGN KEY (transaction_uuid) REFERENCES transactions(uuid)
);
```

### Step 2: Update Your Repository

```typescript
import { ILedgerRepository, Transaction } from "hammurabi";
import InvoiceTransaction from "./InvoiceTransaction";

export class CustomLedgerRepository implements ILedgerRepository {
  constructor(private db: Database) {}

  async saveTransactional(transaction: Transaction): Promise<Transaction> {
    return this.db.transaction(async (txn) => {
      // Always save base transaction first
      await txn.query(
        `INSERT INTO transactions (uuid, description, timestamp)
         VALUES ($1, $2, $3)`,
        [transaction.uuid, transaction.description, transaction.timestamp]
      );

      // Save entries
      for (const entry of transaction.entries) {
        await txn.query(
          `INSERT INTO entries (transaction_uuid, account_id, amount, concept_id, quantity)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            transaction.uuid,
            entry.accountId,
            entry.amount,
            entry.conceptId,
            entry.quantity
          ]
        );
      }

      // If it's a custom transaction, save custom fields
      if (transaction instanceof InvoiceTransaction) {
        await txn.query(
          `INSERT INTO invoice_transactions (
             transaction_uuid, invoice_number, user_id, location_id, 
             customer_id, approval_level
           )
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            transaction.uuid,
            transaction.invoiceNumber,
            transaction.user.id,
            transaction.location.id,
            transaction.customerId,
            transaction.approvalLevel
          ]
        );
      }

      return transaction;
    });
  }
}
```

### Key Points for Custom Repositories

1. **Always save base Transaction fields**: uuid, description, timestamp, entries
2. **Use instanceof to detect custom types**: `if (transaction instanceof InvoiceTransaction)`
3. **Store custom field references as IDs**: Store `user.id`, `location.id` (not full objects)
4. **Use transactions for atomicity**: Ensure all data (base + custom) is saved together
5. **Handle multiple custom types**: If you have multiple custom transaction types, add type detection:

```typescript
// Polymorphic handling
if (transaction instanceof InvoiceTransaction) {
  await saveInvoiceData(transaction);
} else if (transaction instanceof PurchaseOrderTransaction) {
  await savePurchaseOrderData(transaction);
} else {
  // Standard transaction (just base fields)
}
```

## Best Practices

### 1. Always Call super()

```typescript
// ✓ Correct
class MyTransaction extends Transaction {
  myField: string;

  constructor(description: string, entries: Entry[], myField: string) {
    super(description, entries);  // Call first
    this.myField = myField;        // Then set custom fields
  }
}

// ✗ Wrong - skipping super() breaks base functionality
class BadTransaction extends Transaction {
  constructor(description: string, entries: Entry[]) {
    this.description = description;  // DON'T do this
  }
}
```

### 2. Keep Base Fields Immutable

```typescript
// ✓ Correct - base fields remain immutable
class MyTransaction extends Transaction {
  customField: string;

  constructor(description: string, entries: Entry[], customField: string) {
    super(description, entries);
    this.customField = customField;
    Object.freeze(this);  // Freeze the entire object
  }
}

// ✗ Wrong - trying to modify inherited fields
class BadTransaction extends Transaction {
  constructor(description: string, entries: Entry[]) {
    super(description, entries);
    this.description = "Modified";  // Don't modify base fields
  }
}
```

### 3. Use Type Guards for Repository Logic

```typescript
// ✓ Correct - type-safe handling
async saveTransactional(transaction: Transaction): Promise<Transaction> {
  // Save base always
  await saveBase(transaction);

  // Handle custom types
  if (transaction instanceof InvoiceTransaction) {
    await saveInvoiceFields(transaction);
  } else if (transaction instanceof PurchaseTransaction) {
    await savePurchaseFields(transaction);
  }

  return transaction;
}

// ✗ Wrong - unsafe casting
if ((transaction as any).invoiceNumber) {
  // This bypasses TypeScript's type safety
}
```

### 4. Document Custom Fields

```typescript
/**
 * Invoice-specific transaction with tracking metadata.
 * 
 * Extends the base Transaction with fields for invoice management and auditing.
 */
class InvoiceTransaction extends Transaction {
  /** Invoice reference number (e.g., INV-2024-001) */
  invoiceNumber: string;

  /** User who created or processed this invoice */
  user: User;

  /** Location where the transaction occurred */
  location: Location;

  /** Customer ID from your CRM system */
  customerId: number;

  /** Approval status: draft, pending, or approved */
  approvalLevel: "draft" | "pending" | "approved";

  constructor(...) {
    super(description, entries);
    // ...
  }
}
```

### 5. Keep Custom Fields Relevant

```typescript
// ✓ Good - relevant metadata
class InvoiceTransaction extends Transaction {
  invoiceNumber: string;
  user: User;
  location: Location;
  customerId: number;
}

// ✗ Bad - unrelated fields
class BadTransaction extends Transaction {
  randomCounter: number;
  debugFlag: boolean;
  tempData: any;
}
```

## Examples by Use Case

### Example 1: Purchase Orders

```typescript
class PurchaseOrderTransaction extends Transaction {
  poNumber: string;
  vendorId: number;
  department: string;
  requestedBy: User;

  constructor(
    description: string,
    entries: Entry[],
    poNumber: string,
    vendorId: number,
    department: string,
    requestedBy: User
  ) {
    super(description, entries);
    this.poNumber = poNumber;
    this.vendorId = vendorId;
    this.department = department;
    this.requestedBy = requestedBy;
  }
}
```

### Example 2: Expense Reports

```typescript
class ExpenseTransaction extends Transaction {
  expenseId: string;
  employee: User;
  category: "travel" | "meals" | "supplies" | "other";
  approver: User;
  receipts: string[];  // URLs or file paths

  constructor(
    description: string,
    entries: Entry[],
    expenseId: string,
    employee: User,
    category: "travel" | "meals" | "supplies" | "other",
    approver: User,
    receipts: string[]
  ) {
    super(description, entries);
    this.expenseId = expenseId;
    this.employee = employee;
    this.category = category;
    this.approver = approver;
    this.receipts = receipts;
  }
}
```

### Example 3: Multi-Warehouse Inventory

```typescript
class InventoryTransaction extends Transaction {
  warehouseFrom: Location;
  warehouseTo: Location;
  transferCode: string;
  processedBy: User;

  constructor(
    description: string,
    entries: Entry[],
    warehouseFrom: Location,
    warehouseTo: Location,
    transferCode: string,
    processedBy: User
  ) {
    super(description, entries);
    this.warehouseFrom = warehouseFrom;
    this.warehouseTo = warehouseTo;
    this.transferCode = transferCode;
    this.processedBy = processedBy;
  }
}
```

## Testing Custom Transactions

```typescript
import { describe, it, expect } from "vitest";
import InvoiceTransaction from "./InvoiceTransaction";
import { Entry } from "hammurabi";
import { User } from "./User";
import { Location } from "./Location";

describe("InvoiceTransaction", () => {
  it("should create a transaction with custom fields", () => {
    const entries = [
      new Entry({ accountId: 101, amount: 100 }),
      new Entry({ accountId: 201, amount: -100 })
    ];

    const user = new User(1, "Test User", "test@example.com", 1);
    const location = new Location(1, "Test Office", "123 St", "USA");

    const tx = new InvoiceTransaction(
      "Test invoice",
      entries,
      "INV-001",
      user,
      location,
      1,
      "approved"
    );

    expect(tx.uuid).toBeDefined();
    expect(tx.invoiceNumber).toBe("INV-001");
    expect(tx.user.name).toBe("Test User");
    expect(tx.location.id).toBe(1);
  });

  it("should be immutable after creation", () => {
    const tx = new InvoiceTransaction(
      "Test",
      [new Entry({ accountId: 1, amount: 10 })],
      "INV-001",
      user,
      location,
      1
    );

    expect(() => {
      (tx as any).invoiceNumber = "INV-002";
    }).toThrow();
  });
});
```

## Summary

1. **Extend Transaction** with your custom fields
2. **Always call super()** in your constructor
3. **Preserve base fields** - don't modify them
4. **Use custom transactions** with the overloaded `startTransaction(transaction)`
5. **Update your repository** to save custom fields alongside base transaction data
6. **Use isinstance** checks in your repository for type-safe handling

This approach keeps your custom logic separate from Hammurabi's core while maintaining full type safety and accounting integrity.
