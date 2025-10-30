/**
 * IOC CLI Tool
 *
 * Runs .ioc programs from the command line.
 *
 * Usage:
 *   ioc run <file.ioc> [--input <json>]
 *   ioc compile <file.ioc> [--output <file.js>]
 *   ioc validate <file.ioc>
 */

import * as fs from 'fs';
import * as path from 'path';
import { Lexer } from '../parser/lexer.js';
import { Parser } from '../parser/parser.js';
import { ASTToGraphConverter } from '../parser/ast-to-graph.js';

/**
 * Print the CLI usage banner with command summaries and example invocations to stdout.
 */
function printUsage() {
  console.log(
    `
IOC - Intent-Oriented Computing Language

Usage:
  ioc run <file.ioc> [--input <json>] [--debug]  Run an .ioc program
  ioc compile <file.ioc> [--output <js>]         Compile to JavaScript
  ioc validate <file.ioc>                        Validate syntax and safety
  ioc help                                       Show this help message

Examples:
  ioc run pipeline.ioc --input '[1,2,3,4,5]'
  ioc run pipeline.ioc --input '[1,2,3,4,5]' --debug
  ioc compile app.ioc --output app.js
  ioc validate my-program.ioc
  `.trim()
  );
}

/**
 * Read a file from disk and return its contents as a UTF-8 string.
 *
 * @returns The file contents as a UTF-8 decoded string. On failure logs an error and exits the process with code 1.
 */
function readFile(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error: any) {
    console.error(`Error reading file: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Parses IOC source into an AST and converts it to an internal graph representation.
 *
 * On parse or conversion errors, prints an error message and exits the process with code 1.
 *
 * @returns An object containing the parsed `ast` and the converted `graph`.
 */
function parseIOC(source: string) {
  try {
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const parser = new Parser(tokens);
    const ast = parser.parse();

    const converter = new ASTToGraphConverter();
    const graph = converter.convert(ast);

    return { ast, graph };
  } catch (error: any) {
    console.error(`Parse error: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Read, compile, and execute an IOC program from a file, printing the result.
 *
 * Reads the IOC source at `filePath`, parses and compiles it to an executable function, optionally parses `inputJson` as input data, and runs the compiled program. When `debug` is true, prints a simple execution plan (node id and type) before running. Prints the program result as pretty-printed JSON to stdout. On parse, input JSON, or execution errors, prints an error message to stderr and exits the process with code 1.
 *
 * @param inputJson - Optional JSON string to use as the program input; if present it will be parsed and passed to the compiled program.
 * @param debug - If true, log the program's execution plan (node ids and types) before executing.
 */
function runCommand(filePath: string, inputJson?: string, debug = false) {
  const source = readFile(filePath);
  const { graph } = parseIOC(source);

  // Compile the graph
  const compiledFn = graph.compile();

  // Parse input data
  let inputData;
  if (inputJson) {
    try {
      inputData = JSON.parse(inputJson);
    } catch (error: any) {
      console.error(`Invalid input JSON: ${error.message}`);
      process.exit(1);
    }
  }

  // Execute with optional debugging
  try {
    if (debug) {
      const program = graph.toProgram();

      console.log('Execution plan:');
      for (const node of program.nodes) {
        console.log(`  ${node.id}: ${node.type}`);
      }
      console.log('');
    }

    const result = compiledFn(inputData);
    console.log(JSON.stringify(result, null, 2));
  } catch (error: any) {
    console.error(`Execution error: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Compile an .ioc source file into a JavaScript module that loads the serialized IOC program.
 *
 * If `outputPath` is provided, writes the generated JS to that file and prints the path; otherwise prints the generated code to stdout.
 *
 * @param filePath - Path to the input `.ioc` source file
 * @param outputPath - Optional path to write the generated JavaScript file; when omitted the code is printed to stdout
 */
function compileCommand(filePath: string, outputPath?: string) {
  const source = readFile(filePath);
  const { graph } = parseIOC(source);

  // Serialize to .ioc format
  const iocJson = graph.toIOC();

  // Generate JavaScript wrapper
  const jsCode = `
// Generated from ${path.basename(filePath)}
// Date: ${new Date().toISOString()}

import { loadIOC } from '@ioc/compiler';

const program = ${iocJson};

export const compiledProgram = loadIOC(program);

// Usage: compiledProgram(inputData)
`.trim();

  if (outputPath) {
    fs.writeFileSync(outputPath, jsCode, 'utf-8');
    console.log(outputPath);
  } else {
    console.log(jsCode);
  }
}

/**
 * Validate an IOC program file and report validation results.
 *
 * Reads the IOC source at `filePath`, parses it into a graph, and runs validation.
 * If validation succeeds, prints "Valid" and a per-node summary of each node's id,
 * capability maxComplexity, and terminationGuarantee. If validation fails, prints
 * "Validation failed:" followed by each validation error and exits the process with code 1.
 *
 * @param filePath - Path to the IOC source file to validate
 */
function validateCommand(filePath: string) {
  const source = readFile(filePath);
  const { graph } = parseIOC(source);

  const validation = graph.validate();

  if (validation.valid) {
    console.log('Valid');
    const program = graph.toProgram();
    console.log('');
    for (const node of program.nodes) {
      console.log(
        `${node.id}: ${node.capability.maxComplexity} (${node.capability.terminationGuarantee})`
      );
    }
  } else {
    console.error('Validation failed:');
    for (const error of validation.errors) {
      console.error(`  ${error}`);
    }
    process.exit(1);
  }
}

/**
 * Parse CLI arguments and dispatch the ioc CLI commands.
 *
 * Supports the commands:
 * - `run <file> [--input <json>] [--debug]` — compile and execute the IOC program, optionally with input JSON and debug output.
 * - `compile <file> [--output <path>]` — compile the IOC program and write or print generated JavaScript.
 * - `validate <file>` — validate the IOC program and print validation results.
 *
 * Prints usage and exits with code 0 when help is requested or no arguments are provided.
 * Prints errors, shows usage, and exits with code 1 for missing file path or unknown commands.
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === 'help' || args[0] === '--help' || args[0] === '-h') {
    printUsage();
    process.exit(0);
  }

  const command = args[0];
  const filePath = args[1];

  if (!filePath) {
    console.error('Error: Missing file path');
    printUsage();
    process.exit(1);
  }

  switch (command) {
    case 'run': {
      const inputIndex = args.indexOf('--input');
      const inputJson = inputIndex !== -1 ? args[inputIndex + 1] : undefined;
      const debug = args.includes('--debug');
      runCommand(filePath, inputJson, debug);
      break;
    }

    case 'compile': {
      const outputIndex = args.indexOf('--output');
      const outputPath = outputIndex !== -1 ? args[outputIndex + 1] : undefined;
      compileCommand(filePath, outputPath);
      break;
    }

    case 'validate': {
      validateCommand(filePath);
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      printUsage();
      process.exit(1);
  }
}

main();