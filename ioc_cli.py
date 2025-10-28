#!/usr/bin/env python3

import sys
import argparse
import json
import csv
from pathlib import Path
from core.graph import Graph
from core.differential import DifferentialTester


def cmd_analyze(args):
    # Analyze a CSV file with automatic optimization.
    print(f"Analyzing: {args.file}")
    print("=" * 60)
    
    # Read CSV data
    data = []
    with open(args.file, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Convert numeric fields
            for key in row:
                try:
                    row[key] = float(row[key])
                except (ValueError, TypeError):
                    pass
            data.append(row)
    
    print(f"Loaded {len(data)} rows")
    
    # Build analysis pipeline
    graph = Graph()
    if args.debug:
        graph.enable_debug_mode(capture_provenance=True)
    
    input_data = graph.input("data", list)
    
    # Apply filters if specified
    current = input_data
    if args.filter:
        # Parse filter expression: "field>value" or "field==value"
        for filter_expr in args.filter:
            if '>' in filter_expr:
                field, value = filter_expr.split('>')
                value = float(value)
                current = graph.filter(current, 
                    lambda x, f=field, v=value: x.get(f, 0) > v)
            elif '==' in filter_expr:
                field, value = filter_expr.split('==')
                current = graph.filter(current,
                    lambda x, f=field, v=value: str(x.get(f, '')) == v)
    
    # Apply transformations
    if args.map:
        # Simple map expression: "field*2" or "field+10"
        for map_expr in args.map:
            if '*' in map_expr:
                field, factor = map_expr.split('*')
                factor = float(factor)
                current = graph.map(current,
                    lambda x, f=field, m=factor: {**x, f: x.get(f, 0) * m})
            elif '+' in map_expr:
                field, addend = map_expr.split('+')
                addend = float(addend)
                current = graph.map(current,
                    lambda x, f=field, a=addend: {**x, f: x.get(f, 0) + a})
    
    # Group by if specified
    if args.group_by:
        current = graph.group_by(current, lambda x, f=args.group_by: x.get(f))
    
    # Sort if specified
    if args.sort:
        reverse = args.sort.startswith('-')
        field = args.sort.lstrip('-')
        current = graph.sort(current, 
            key=lambda x, f=field: x.get(f, 0),
            reverse=reverse)
    
    # Limit results
    if args.limit:
        current = graph.map(current, lambda x: x)  # Identity to apply limit later
    
    graph.output(current)
    
    # Show execution plan
    if args.explain:
        print("\nExecution Plan:")
        print(graph.explain(verbose=args.debug))
        print()
    
    # Run differential test
    if args.test:
        print("\nRunning Differential Test:")
        tester = DifferentialTester(graph)
        result = tester.test_with_optimizations({"data": data})
        print(tester.format_report(result))
        print()
    
    # Execute
    print("\nExecuting pipeline...")
    compiled = graph.compile(auto_optimize=not args.no_optimize)
    result = compiled(data=data)
    
    # Apply limit in post-processing (not in graph for simplicity)
    if args.limit and isinstance(result, list):
        result = result[:args.limit]
    
    # Output results
    print(f"\nResults ({len(result) if isinstance(result, list) else 'N/A'} items):")
    print("-" * 60)
    
    if args.output:
        # Write to file
        with open(args.output, 'w') as f:
            json.dump(result, f, indent=2)
        print(f"Written to: {args.output}")
    else:
        # Print to stdout
        if isinstance(result, list):
            for i, item in enumerate(result[:10], 1):  # Show first 10
                print(f"{i}. {item}")
            if len(result) > 10:
                print(f"... ({len(result) - 10} more items)")
        else:
            print(json.dumps(result, indent=2))


def cmd_benchmark(args):
    # Benchmark different execution strategies.
    print("Benchmark Mode")
    print("=" * 60)
    
    # Generate synthetic data
    size = args.size
    print(f"Generating {size} records...")
    
    data = [{"id": i, "value": i * 2, "category": chr(65 + (i % 26))} 
            for i in range(size)]
    
    # Build a complex pipeline
    graph = Graph()
    
    input_data = graph.input("data", list)
    filtered1 = graph.filter(input_data, lambda x: x["value"] > 100)
    filtered2 = graph.filter(filtered1, lambda x: x["value"] < 10000)
    mapped = graph.map(filtered2, lambda x: {**x, "value": x["value"] * 1.1})
    grouped = graph.group_by(mapped, lambda x: x["category"])
    
    graph.output(grouped)
    
    # Show plan
    print("\nExecution Plan:")
    print(graph.explain())
    
    # Benchmark
    print("\nBenchmarking...")
    tester = DifferentialTester(graph)
    result = tester.test_with_optimizations({"data": data})
    
    print("\n" + tester.format_report(result))


def cmd_explain(args):
    # Show execution plan for a saved pipeline.
    print("Explain Mode")
    print("=" * 60)
    
    # This would load a saved graph, but for now show a demo
    graph = Graph()
    graph.enable_debug_mode(capture_provenance=True)
    
    data = graph.input("data", list)
    filtered = graph.filter(data, lambda x: x > 10)
    mapped = graph.map(filtered, lambda x: x * 2)
    sorted_data = graph.sort(mapped, reverse=True)
    
    graph.output(sorted_data)
    
    # Optimize
    if not args.no_optimize:
        graph.optimize()
    
    # Show detailed plan
    print(graph.explain(verbose=True))
    
    # Show graph structure
    print("\n" + graph.visualize())


def cmd_interactive(args):
    # Interactive mode for building pipelines.
    print("IOC Interactive Mode")
    print("=" * 60)
    print("Type 'help' for commands, 'exit' to quit")
    print()
    
    graph = Graph()
    graph.enable_debug_mode(capture_provenance=True)
    
    # Start with input
    current_node = graph.input("data", list)
    print("Started with: input('data')")
    
    while True:
        try:
            cmd = input("ioc> ").strip()
            
            if not cmd:
                continue
            
            if cmd == 'exit':
                break
            
            if cmd == 'help':
                print("""
Available commands:
  filter <expr>     - Filter data (e.g., filter x > 10)
  map <expr>        - Transform data (e.g., map x * 2)
  sort              - Sort data
  distinct          - Remove duplicates
  explain           - Show execution plan
  visualize         - Show graph structure
  execute           - Run the pipeline
  reset             - Start over
  exit              - Quit
""")
                continue
            
            if cmd == 'explain':
                print(graph.explain(verbose=True))
                continue
            
            if cmd == 'visualize':
                print(graph.visualize())
                continue
            
            if cmd == 'reset':
                graph = Graph()
                graph.enable_debug_mode(capture_provenance=True)
                current_node = graph.input("data", list)
                print("Reset to: input('data')")
                continue
            
            if cmd.startswith('filter '):
                expr = cmd[7:].strip()
                # Simple parsing for "x > value" or "x < value"
                if '>' in expr:
                    _, value = expr.split('>')
                    value = float(value.strip())
                    current_node = graph.filter(current_node, lambda x, v=value: x > v)
                    print(f"Added: filter(x > {value})")
                elif '<' in expr:
                    _, value = expr.split('<')
                    value = float(value.strip())
                    current_node = graph.filter(current_node, lambda x, v=value: x < v)
                    print(f"Added: filter(x < {value})")
                continue
            
            if cmd.startswith('map '):
                expr = cmd[4:].strip()
                # Simple parsing for "x * value" or "x + value"
                if '*' in expr:
                    _, value = expr.split('*')
                    value = float(value.strip())
                    current_node = graph.map(current_node, lambda x, v=value: x * v)
                    print(f"Added: map(x * {value})")
                elif '+' in expr:
                    _, value = expr.split('+')
                    value = float(value.strip())
                    current_node = graph.map(current_node, lambda x, v=value: x + v)
                    print(f"Added: map(x + {value})")
                continue
            
            if cmd == 'sort':
                current_node = graph.sort(current_node)
                print("Added: sort()")
                continue
            
            if cmd == 'distinct':
                current_node = graph.distinct(current_node)
                print("Added: distinct()")
                continue
            
            if cmd == 'execute':
                graph.output(current_node)
                
                # Get sample data
                sample_data = list(range(100))
                print(f"\nExecuting with sample data: {sample_data[:10]}...")
                
                compiled = graph.compile()
                result = compiled(data=sample_data)
                
                print(f"\nResult ({len(result) if isinstance(result, list) else 'N/A'} items):")
                if isinstance(result, list):
                    print(result[:20])
                    if len(result) > 20:
                        print(f"... ({len(result) - 20} more)")
                else:
                    print(result)
                continue
            
            print(f"Unknown command: {cmd}")
            print("Type 'help' for available commands")
        
        except KeyboardInterrupt:
            print("\nUse 'exit' to quit")
        except Exception as e:
            print(f"Error: {e}")


def main():
    # Main CLI entry point.
    parser = argparse.ArgumentParser(
        description="IOC - Intent-Oriented Computing CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Analyze CSV with filters
  ioc analyze data.csv --filter "age>18" --filter "score>50"
  
  # Benchmark performance
  ioc benchmark --size 10000
  
  # Interactive mode
  ioc interactive
  
  # Show execution plan
  ioc explain --debug
"""
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Analyze command
    analyze_parser = subparsers.add_parser('analyze', help='Analyze data files')
    analyze_parser.add_argument('file', help='Input CSV file')
    analyze_parser.add_argument('--filter', action='append', help='Filter expression')
    analyze_parser.add_argument('--map', action='append', help='Map expression')
    analyze_parser.add_argument('--group-by', help='Group by field')
    analyze_parser.add_argument('--sort', help='Sort by field (prefix - for descending)')
    analyze_parser.add_argument('--limit', type=int, help='Limit results')
    analyze_parser.add_argument('--output', '-o', help='Output file (JSON)')
    analyze_parser.add_argument('--explain', action='store_true', help='Show execution plan')
    analyze_parser.add_argument('--test', action='store_true', help='Run differential test')
    analyze_parser.add_argument('--debug', action='store_true', help='Enable debug mode')
    analyze_parser.add_argument('--no-optimize', action='store_true', help='Disable optimization')
    analyze_parser.set_defaults(func=cmd_analyze)
    
    # Benchmark command
    bench_parser = subparsers.add_parser('benchmark', help='Benchmark performance')
    bench_parser.add_argument('--size', type=int, default=1000, help='Dataset size')
    bench_parser.set_defaults(func=cmd_benchmark)
    
    # Explain command
    explain_parser = subparsers.add_parser('explain', help='Explain execution plan')
    explain_parser.add_argument('--debug', action='store_true', help='Verbose output')
    explain_parser.add_argument('--no-optimize', action='store_true', help='Show unoptimized plan')
    explain_parser.set_defaults(func=cmd_explain)
    
    # Interactive command
    interactive_parser = subparsers.add_parser('interactive', help='Interactive mode')
    interactive_parser.set_defaults(func=cmd_interactive)
    
    # Parse and execute
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return 1
    
    try:
        args.func(args)
        return 0
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        if '--debug' in sys.argv:
            import traceback
            traceback.print_exc()
        return 1


if __name__ == '__main__':
    sys.exit(main())
