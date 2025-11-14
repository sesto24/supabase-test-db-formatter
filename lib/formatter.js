import { spawn } from "child_process";
import chalk from "chalk";

export function runTests(args = [], options = {}) {
  const showDebug = args.includes("--show-debug") || options.showDebug;
  const testArgs = args.filter((arg) => arg !== "--show-debug");

  const test = spawn(
    "npx",
    ["supabase", "test", "db", "--debug", ...testArgs],
    {
      shell: true,
      stdio: ["inherit", "pipe", "pipe"],
    }
  );

  let currentFile = "";
  let passCount = 0;
  let failCount = 0;
  let totalTests = 0;
  let inErrorBlock = false;
  let errorDetails = [];

  test.stdout.on("data", (data) => {
    const lines = data.toString().split("\n");

    lines.forEach((line) => {
      // Skip empty lines
      if (!line.trim()) return;

      // Detect test file
      if (
        line.includes(".sql") &&
        (line.includes("..") || line.includes("/"))
      ) {
        currentFile = line.trim().replace(/\s*\.\.\s*$/, "");
        console.log(chalk.cyan.bold(`\n📝 ${currentFile}`));
        console.log(chalk.gray("─".repeat(60)));
        return;
      }

      // Detect test plan (e.g., "1..25")
      const planMatch = line.match(/^(\d+)\.\.(\d+)/);
      if (planMatch) {
        testsParsed = parseInt(planMatch[1]);
        totalTests = parseInt(planMatch[2]);
        return;
      }

      // Parse test results - handle both formats
      const okMatch = line.match(/^ok\s+(\d+)\s*-?\s*(.*)$/);
      const notOkMatch = line.match(/^not ok\s+(\d+)\s*-?\s*(.*)$/);

      if (okMatch) {
        passCount++;
        const testName = okMatch[2] || `Test ${okMatch[1]}`;
        console.log(chalk.green(`  ✓ ${testName}`));
        inErrorBlock = false;
        errorDetails = [];
        return;
      }

      if (notOkMatch) {
        failCount++;
        const testName = notOkMatch[2] || `Test ${notOkMatch[1]}`;
        console.log(chalk.red(`  ✗ ${testName}`));
        inErrorBlock = true;
        return;
      }

      // Capture error details
      if (line.startsWith("#")) {
        const errorLine = line.substring(1).trim();
        // Filter out PostgreSQL internal details
        if (
          !errorLine.includes("NOTICE:") &&
          !errorLine.includes("DETAIL:") &&
          errorLine.length > 0
        ) {
          errorDetails.push(errorLine);
          if (inErrorBlock || failCount > 0) {
            console.log(chalk.yellow(`    ${errorLine}`));
          }
        }
        return;
      }

      // Detect "Failed test" messages
      if (line.includes("Failed test")) {
        const match = line.match(/Failed test[s]?:\s+(.+)/);
        if (match) {
          console.log(chalk.red(`  Failed tests: ${match[1]}`));
        }
        return;
      }

      // Detect summary line
      if (line.includes("Test Summary Report")) {
        console.log(chalk.gray("\n" + "─".repeat(60)));
        console.log(chalk.cyan.bold("Test Summary Report"));
        console.log(chalk.gray("─".repeat(60)));
        return;
      }

      // Detect result
      if (line.match(/^Result:/)) {
        console.log(chalk.gray("─".repeat(60)));
        const isPassed = line.includes("PASS");
        const totalRun = passCount + failCount;

        if (isPassed && failCount === 0) {
          console.log(
            chalk.green.bold(
              `\n✓ All tests passed! (${passCount}/${totalTests})`
            )
          );
        } else {
          console.log(
            chalk.red.bold(
              `\n✗ ${failCount} test(s) failed (${passCount}/${totalRun} passed, ${totalTests} planned)`
            )
          );
        }
        return;
      }

      // Show Dubious/Parse errors
      if (
        line.includes("Dubious") ||
        line.includes("Parse errors") ||
        line.includes("Non-zero exit status")
      ) {
        console.log(chalk.yellow(`  ${line.trim()}`));
        return;
      }

      // Show test execution summary
      if (line.match(/^Files=\d+/)) {
        console.log(chalk.gray(`\n${line.trim()}`));
        return;
      }
    });
  });

  test.stderr.on("data", (data) => {
    const output = data.toString();

    // Show errors but filter PostgreSQL notices and debug lines
    const lines = output.split("\n");
    lines.forEach((line) => {
      // Skip debug protocol lines unless --show-debug is passed
      if (!showDebug) {
        // Skip PG Send/Recv debug lines
        if (
          line.match(/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2} PG (Send|Recv):/)
        ) {
          return;
        }
        // Skip Supabase CLI version and profile lines
        if (
          line.includes("Supabase CLI") ||
          line.includes("Using profile:") ||
          line.includes("open supabase") ||
          line.includes("cannot find the file")
        ) {
          return;
        }
        // Skip authentication/connection debug lines
        if (
          line.includes("AuthenticationSASL") ||
          line.includes("ParameterStatus") ||
          line.includes("BackendKeyData") ||
          line.includes("ReadyForQuery")
        ) {
          return;
        }
      }

      if (
        line.trim() &&
        !line.includes("NOTICE:") &&
        !line.includes("DETAIL:") &&
        !line.includes("Connecting to local database")
      ) {
        // Highlight RLS policy violations
        if (line.includes("violates row-level security policy")) {
          console.log(chalk.red.bold(`\n⚠️  ${line.trim()}`));
        } else if (line.includes("ERROR:")) {
          console.log(chalk.red(`\n${line.trim()}`));
        } else {
          console.error(chalk.yellow(line.trim()));
        }
      }
    });
  });

  test.on("close", (code) => {
    // Final summary
    if (code !== 0) {
      console.log(chalk.red.bold(`\n❌ Tests failed with exit code ${code}\n`));
    } else {
      console.log(chalk.green.bold(`\n✅ All tests completed successfully!\n`));
    }
    process.exit(code);
  });
  return test;
}
