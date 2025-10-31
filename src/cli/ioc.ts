#!/usr/bin/env node
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
import { backendSelector } from '../backends/index.js';
import { BackendType } from '../backends/types.js';
import { validateIOCProgram, serializeIOC } from '../dsl/ioc-format.js';
import type { IOCProgram } from '../dsl/ioc-format.js';

/**
 * Print the CLI usage banner with command summaries and example invocations to stdout.
 */
function printUsage() {
  console.log(
    `
IOC - Intent-Oriented Computing Language

Usage:
  ioc run <file.ioc> [--input <json> | --input-file <file>] [--debug] [--unsafe] [--backend <type>]
  ioc compile <file.ioc> [--output <js>] [--backend <type>]
  ioc validate <file.ioc>
  ioc backends
  ioc help

Commands:
  run        Compile and execute an .ioc program
  compile    Compile to JavaScript or other target
  validate   Validate syntax and safety properties
  backends   List available compilation backends
  help       Show this help message

Flags:
  --input <json>       Inline JSON input data
  --input-file <file>  Read input data from a JSON file
  --output <file>      Write compiled output to file
  --debug              Show execution plan before running
  --unsafe             Skip security validation (use only with trusted .ioc files)
  --backend <type>     Compilation backend: javascript, wasm, llvm (default: auto-select)

Backends:
  javascript   Fast compilation, runs anywhere (default)
  wasm         Portable binary format, good performance  
  llvm         Maximum performance via native code (not yet implemented)

Examples:
  ioc run pipeline.ioc --input '[1,2,3,4,5]'
  ioc run grades.ioc --input-file data.json
  ioc run pipeline.ioc --input '[1,2,3,4,5]' --debug
  ioc run pipeline.ioc --input '[1,2,3]' --backend wasm
  ioc run untrusted.ioc --input '[1,2,3]'  (validates security by default)
  ioc compile app.ioc --output app.js --backend wasm
  ioc validate my-program.ioc
  ioc backends
  `.trim()
  );
}

/**
 * Read the file at the given path and return its contents decoded as UTF-8.
 *
 * On read failure, logs an error message to stderr and exits the process with code 1.
 *
 * @returns The file contents as a UTF-8 decoded string
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
 * Parses IOC source into an AST and converts it to an IOCProgram.
 *
 * On parse or conversion errors, prints an error message and exits the process with code 1.
 *
 * @returns An object containing the parsed `ast` and the converted `program`.
 */
function parseIOC(source: string): { ast: any; program: IOCProgram } {
  try {
    // Security: Validate input size before parsing (DoS prevention)
    const MAX_INPUT_SIZE = 1024 * 1024; // 1 MB
    const inputSize = Buffer.byteLength(source, 'utf-8');
    if (inputSize > MAX_INPUT_SIZE) {
      throw new Error(
        `Input file too large: ${inputSize} bytes exceeds maximum of ${MAX_INPUT_SIZE} bytes`
      );
    }

    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const parser = new Parser(tokens);
    const ast = parser.parse();

    const converter = new ASTToGraphConverter();
    const program = converter.convert(ast);

    return { ast, program };
  } catch (error: any) {
    console.error(`Parse error: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Read, compile, and execute an IOC program from a file and print its result.
 *
 * Reads the IOC source at `filePath`, parses and compiles it, optionally parses `inputJson` as input, and executes the compiled program. If `debug` is true, prints a simple execution plan (node id and type) before running. Prints the program result as pretty-printed JSON to stdout. On parse, input JSON, or execution errors, prints an error to stderr and exits the process with code 1.
 *
 * @param inputJson - Optional JSON string to use as the program input; if provided it will be parsed and passed to the compiled program.
 * @param debug - If true, log the program's execution plan (node ids and types) before executing.
 * @param unsafe - If true, skip security validation (use only with trusted .ioc files).
 * @param backend - Optional backend type (javascript, wasm, llvm) to use for compilation.
 */
async function runCommand(
  filePath: string,
  inputJson?: string,
  debug = false,
  unsafe = false,
  backend?: string
) {
  const source = readFile(filePath);
  const { program } = parseIOC(source);

  // Validate security unless --unsafe flag is set
  if (!unsafe) {
    const validation = validateIOCProgram(program);
    if (!validation.valid) {
      console.error('Security validation failed:');
      for (const error of validation.errors) {
        console.error(`  ${error}`);
      }
      console.error('');
      console.error('Use --unsafe flag to skip validation (not recommended for untrusted files)');
      process.exit(1);
    }
  }

  // Compile the program
  let compiledFn: Function;

  try {
    const result = await backendSelector.compile(program, {
      backend: backend as BackendType | undefined,
    });
    compiledFn = result.execute;

    if (debug) {
      console.log(`Using backend: ${result.backend}`);
      console.log(`Compilation time: ${result.compilationTime.toFixed(2)}ms`);
      console.log(`Code size: ${result.codeSize} bytes`);
      console.log('');
    }
  } catch (error: any) {
    console.error(`Backend compilation error: ${error.message}`);
    process.exit(1);
  }

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
 * @param backend - Optional backend type (javascript, wasm, llvm) to use for compilation.
 */
async function compileCommand(filePath: string, outputPath?: string, backend?: string) {
  const source = readFile(filePath);
  const { program } = parseIOC(source);

  if (backend) {
    // Use multi-backend compilation
    try {
      const result = await backendSelector.compile(program, {
        backend: backend as BackendType,
      });

      console.log(`Backend: ${result.backend}`);
      console.log(`Compilation time: ${result.compilationTime.toFixed(2)}ms`);
      console.log(`Code size: ${result.codeSize} bytes`);

      if (result.metadata.jsCode && outputPath) {
        fs.writeFileSync(outputPath, result.metadata.jsCode, 'utf-8');
        console.log(`Output: ${outputPath}`);
      }
    } catch (error: any) {
      console.error(`Backend compilation error: ${error.message}`);
      process.exit(1);
    }
  } else {
    // Default: Serialize to .ioc format
    const iocJson = serializeIOC(program);

    // Generate JavaScript wrapper
    const jsCode = `
// Generated from ${path.basename(filePath)}
// Date: ${new Date().toISOString()}

import { deserializeIOC, backendSelector } from '@ioc/compiler';

const program = deserializeIOC(${JSON.stringify(iocJson)});

export async function execute(input) {
  const result = await backendSelector.compile(program);
  return result.execute(input);
}

// Usage: execute(inputData)
`.trim();

    if (outputPath) {
      fs.writeFileSync(outputPath, jsCode, 'utf-8');
      console.log(outputPath);
    } else {
      console.log(jsCode);
    }
  }
}

/**
 * List available compilation backends
 */
async function backendsCommand() {
  console.log('Available Compilation Backends:\n');

  const available = await backendSelector.getAvailableBackends();

  for (const type of available) {
    const backend = backendSelector.getBackendInfo(type);
    if (backend) {
      console.log(`  ${type}`);
      console.log(`    Name: ${backend.name}`);
      console.log(`    Performance Score: ${backend.estimatePerformanceScore()}/10`);
      console.log('');
    }
  }

  if (available.length === 0) {
    console.log('  No backends available!');
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
  const { program } = parseIOC(source);

  const validation = validateIOCProgram(program);

  if (validation.valid) {
    console.log('Valid');
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
 * Parse command-line arguments and dispatch the IOC CLI commands.
 *
 * Supports the following commands:
 * - `run <file> [--input <json>] [--debug] [--backend <type>]` — compile and execute the IOC program
 * - `compile <file> [--output <path>] [--backend <type>]` — compile the IOC program and write or print generated JavaScript
 * - `validate <file>` — validate the IOC program and print validation results
 * - `backends` — list available compilation backends
 *
 * When no arguments or a help flag is provided, prints usage and exits with code 0.
 * For a missing file path or an unknown command, prints an error, shows usage, and exits with code 1.
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === 'help' || args[0] === '--help' || args[0] === '-h') {
    printUsage();
    process.exit(0);
  }

  const command = args[0];

  // Special case: 'backends' command doesn't require a file path
  if (command === 'backends') {
    await backendsCommand();
    return;
  }

  const filePath = args[1];

  if (!filePath) {
    console.error('Error: Missing file path');
    printUsage();
    process.exit(1);
  }

  switch (command) {
    case 'run': {
      let inputJson: string | undefined;

      // Check for --input flag (inline JSON)
      const inputIndex = args.indexOf('--input');
      if (inputIndex !== -1) {
        inputJson = args[inputIndex + 1];
      }

      // Check for --input-file flag (read from file)
      const inputFileIndex = args.indexOf('--input-file');
      if (inputFileIndex !== -1) {
        const inputFilePath = args[inputFileIndex + 1];
        if (inputFilePath) {
          try {
            inputJson = readFile(inputFilePath);
          } catch (error: any) {
            console.error(`Error reading input file: ${error.message}`);
            process.exit(1);
          }
        }
      }

      const debug = args.includes('--debug');
      const unsafe = args.includes('--unsafe');
      const backendIndex = args.indexOf('--backend');
      const backend = backendIndex !== -1 ? args[backendIndex + 1] : undefined;
      await runCommand(filePath, inputJson, debug, unsafe, backend);
      break;
    }

    case 'compile': {
      const outputIndex = args.indexOf('--output');
      const outputPath = outputIndex !== -1 ? args[outputIndex + 1] : undefined;
      const backendIndex = args.indexOf('--backend');
      const backend = backendIndex !== -1 ? args[backendIndex + 1] : undefined;
      await compileCommand(filePath, outputPath, backend);
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

main().catch((error) => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});
