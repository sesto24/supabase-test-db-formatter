#!/usr/bin/env node

import { runTests } from "../lib/formatter.js";

const args = process.argv.slice(2);
runTests(args);