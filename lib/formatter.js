import { spawn } from "child_process";
import chalk from "chalk";

export function runTests(args = [], options = {}) {
  const showDebug = args.includes("--show-debug") || options.showDebug;
  const testArgs = args.filter((arg) => arg !== "--show-debug");

  const test = spawn("npx", ["supabase", "test", "db", "--debug", ...testArgs], {
    shell: true,
    stdio: ["inherit", "pipe", "pipe"],
  });

  let passCount = 0;
  let failCount = 0;
  let totalTests = 0;

  test.stdout.on("data", (data) => {
    const lines = data.toString().split("\n");

    lines.forEach((line) => {
      if (!line.trim()) return;

      // Filter debug lines unless --show-debug is set
      if (!showDebug) {
        if (
          line.match(/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2} PG (Send|Recv):/) ||
          line.includes("Supabase CLI") ||
          line.includes("Using profile:") ||
          line.includes("open supabase") ||
          line.match(/PG (Send|Recv):/) ||
          line.includes("ProtocolVersion") ||
          line.includes("AuthMechanism") ||
          line.includes("ParameterStatus") ||
          line.includes("BackendKeyData") ||
          line.includes("ReadyForQuery")
        ) {
          return;
        }
      }

      // Detect test file
      if (line.includes(".sql") && (line.includes("..") || line.includes("/"))) {
        const currentFile = line.trim().replace(/\s*\.\.\s*$/, "");
        console.log(chalk.cyan.bold(`\n📝 ${currentFile}`));
        console.log(chalk.gray("─".repeat(60)));
        return;
      }

      // Detect test plan
      const planMatch = line.match(/^(\d+)\.\.(\d+)/);
      if (planMatch) {
        totalTests = parseInt(planMatch[2]);
        return;
      }

      // Parse test results
      const okMatch = line.match(/^ok\s+(\d+)\s*-?\s*(.*)$/);
      const notOkMatch = line.match(/^not ok\s+(\d+)\s*-?\s*(.*)$/);

      if (okMatch) {
        passCount++;
        const testName = okMatch[2] || `Test ${okMatch[1]}`;
        console.log(chalk.green(`  ✓ ${testName}`));
        return;
      }

      if (notOkMatch) {
        failCount++;
        const testName = notOkMatch[2] || `Test ${notOkMatch[1]}`;
        console.log(chalk.red(`  ✗ ${testName}`));
        return;
      }

      // Error details
      if (line.startsWith("#")) {
        const errorLine = line.substring(1).trim();
        if (
          !errorLine.includes("NOTICE:") &&
          !errorLine.includes("DETAIL:") &&
          errorLine.length > 0
        ) {
          console.log(chalk.yellow(`    ${errorLine}`));
        }
        return;
      }

      // Failed test messages
      if (line.includes("Failed test")) {
        const match = line.match(/Failed test[s]?:\s+(.+)/);
        if (match) {
          console.log(chalk.red(`  Failed tests: ${match[1]}`));
        }
        return;
      }

      // Summary
      if (line.includes("Test Summary Report")) {
        console.log(chalk.gray("\n" + "─".repeat(60)));
        console.log(chalk.cyan.bold("Test Summary Report"));
        console.log(chalk.gray("─".repeat(60)));
        return;
      }

      // Result
      if (line.match(/^Result:/)) {
        console.log(chalk.gray("─".repeat(60)));
        const totalRun = passCount + failCount;

        if (failCount === 0) {
          console.log(
            chalk.green.bold(`\n✓ All tests passed! (${passCount}/${totalTests})`)
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

      // Other summary lines
      if (
        line.includes("Dubious") ||
        line.includes("Parse errors") ||
        line.includes("Non-zero exit status") ||
        line.match(/^Files=\d+/)
      ) {
        console.log(chalk.yellow(`  ${line.trim()}`));
        return;
      }
    });
  });

  test.stderr.on("data", (data) => {
    const output = data.toString();
    const lines = output.split("\n");

    lines.forEach((line) => {
      if (!showDebug) {
        if (
          line.includes("NOTICE:") ||
          line.includes("DETAIL:") ||
          line.includes("Connecting to local database")
        ) {
          return;
        }
      }

      if (line.trim()) {
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
    if (code !== 0) {
      console.log(chalk.red.bold(`\n❌ Tests failed with exit code ${code}\n`));
    } else {
      console.log(chalk.green.bold(`\n✅ All tests completed successfully!\n`));
    }
    process.exit(code);
  });

  return test;
}