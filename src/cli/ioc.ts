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

function printUsage() {
  console.log(
    `
IOC - Intent-Oriented Computing Language

Usage:
  ioc run <file.ioc> [--input <json>] [--debug] [--unsafe]  Run an .ioc program
  ioc compile <file.ioc> [--output <js>]                    Compile to JavaScript
  ioc validate <file.ioc>                                   Validate syntax and safety
  ioc help                                                  Show this help message

Flags:
  --debug    Show execution plan before running
  --unsafe   Skip security validation (use only with trusted .ioc files)

Examples:
  ioc run pipeline.ioc --input '[1,2,3,4,5]'
  ioc run pipeline.ioc --input '[1,2,3,4,5]' --debug
  ioc run untrusted.ioc --input '[1,2,3]'  (validates security by default)
  ioc compile app.ioc --output app.js
  ioc validate my-program.ioc
  `.trim()
  );
}

function readFile(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error: any) {
    console.error(`Error reading file: ${error.message}`);
    process.exit(1);
  }
}

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

function runCommand(filePath: string, inputJson?: string, debug = false, unsafe = false) {
  const source = readFile(filePath);
  const { graph } = parseIOC(source);

  // Validate security unless --unsafe flag is set
  if (!unsafe) {
    const validation = graph.validate();
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
      const unsafe = args.includes('--unsafe');
      runCommand(filePath, inputJson, debug, unsafe);
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
