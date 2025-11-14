# Supabase Test Formatter

A color-coded formatter for Supabase pgTAP test output.

## Features

- ✅ Color-coded test results (green for pass, red for fail)
- 📝 Clean, readable output format
- 🐛 Debug mode for verbose protocol output
- ⚡ Works with Supabase CLI's test command
- 🎨 Filters out noisy PostgreSQL protocol messages

## Installation

```bash
npm install --save-dev supabase-test-db-formatter
```

## Usage

### Command Line

```bash
# Run all tests
npx supatest

# Run specific test file
npx supatest ./supabase/tests/rls_content_test.sql

# Run with debug output
npx supatest --show-debug ./supabase/tests/rls_content_test.sql
```

### npm Scripts

Add to your `package.json`:

```json
{
  "scripts": {
    "test:db": "supatest",
    "test:db:content": "supatest ./supabase/tests/rls_content_test.sql",
    "test:db:debug": "supatest --show-debug"
  }
}
```

Then run:

```bash
npm run test:db
npm run test:db:content
npm run test:db:debug
```

### Programmatic Usage

```javascript
import { runTests } from "supabase-test-db-formatter";

// Run tests with custom args
runTests(["./supabase/tests/rls_content_test.sql"]);

// Run with options
runTests(["./supabase/tests/rls_content_test.sql"], { showDebug: true });
```

## Options

- `--show-debug`: Show verbose PostgreSQL protocol output

## Requirements

- Node.js >= 14.0.0
- Supabase CLI >= 1.8.1

## Output Example

```
📝 rls_content_test.sql
────────────────────────────────────────────────────────────
  ✓ System admin can view content types
  ✓ Content editor can view content types
  ✗ Content viewer cannot update content types
    Failed test 6: "Content viewer cannot update content types"
    caught: no exception
    wanted: an exception
────────────────────────────────────────────────────────────
Test Summary Report
────────────────────────────────────────────────────────────
  Failed tests: 6

✗ 1 test(s) failed (24/25 passed, 25 planned)
```

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or PR.
