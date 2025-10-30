const fs = require('fs');
const path = require('path');

describe('agent_instructions.md validation', () => {
  let content;
  
  beforeAll(() => {
    const filePath = path.join(__dirname, '..', 'agent_instructions.md');
    content = fs.readFileSync(filePath, 'utf-8');
  });

  describe('Document Structure', () => {
    test('file should exist and be readable', () => {
      expect(content).toBeDefined();
      expect(content.length).toBeGreaterThan(0);
    });

    test('should have main title', () => {
      expect(content).toMatch(/^#\s+.+/m);
    });

    test('should contain output format section', () => {
      expect(content).toMatch(/<output_format>/);
      expect(content).toMatch(/<\/output_format>/);
    });

    test('should contain capability instructions section', () => {
      expect(content).toMatch(/<capability_instructions>/);
      expect(content).toMatch(/<\/capability_instructions>/);
    });

    test('should have token budget specification', () => {
      expect(content).toMatch(/<budget:token_budget>\d+<\/budget:token_budget>/);
    });
  });

  describe('Code Blocks Validation', () => {
    test('all code blocks should be properly closed', () => {
      const openBlocks = (content.match(/```/g) || []).length;
      expect(openBlocks % 2).toBe(0);
    });

    test('should contain shell script examples', () => {
      expect(content).toMatch(/```(?:shell|bash|sh)/);
    });

    test('should contain diff examples', () => {
      expect(content).toMatch(/```diff/);
    });

    test('code blocks should have language identifiers where appropriate', () => {
      const codeBlockStarts = content.match(/```\w+/g) || [];
      expect(codeBlockStarts.length).toBeGreaterThan(5);
    });

    test('heredoc examples should be properly formatted', () => {
      const heredocPattern = /<<'?[A-Z_]+'?/;
      if (content.match(heredocPattern)) {
        expect(content).toMatch(/EOF|BLOCK|END/);
      }
    });
  });

  describe('Capability Tags', () => {
    test('should define run-scripts capability', () => {
      expect(content).toMatch(/run-scripts/i);
      expect(content).toMatch(/<run-scripts>/);
      expect(content).toMatch(/<\/run-scripts>/);
    });

    test('should define edit-scripts capability', () => {
      expect(content).toMatch(/edit-scripts/i);
      expect(content).toMatch(/<edit-scripts>/);
      expect(content).toMatch(/<\/edit-scripts>/);
    });

    test('capability tags should be properly nested', () => {
      const openTags = (content.match(/<(run-scripts|edit-scripts)>/g) || []).length;
      const closeTags = (content.match(/<\/(run-scripts|edit-scripts)>/g) || []).length;
      expect(openTags).toBe(closeTags);
    });
  });

  describe('Instructions Completeness', () => {
    test('should include shell script instructions', () => {
      expect(content).toMatch(/shell.*script/i);
      expect(content).toMatch(/bash/i);
    });

    test('should include sed usage guidelines', () => {
      expect(content).toMatch(/sed/i);
      expect(content).toMatch(/sed -i/);
    });

    test('should mention prohibited commands', () => {
      expect(content).toMatch(/prohibited/i);
      expect(content).toMatch(/\bmv\b/);
    });

    test('should include escaping guidelines', () => {
      expect(content).toMatch(/escap/i);
      expect(content).toMatch(/forward slash/i);
    });

    test('should mention line-numbered edits', () => {
      expect(content).toMatch(/line.*number/i);
      expect(content).toMatch(/cat -n/);
    });

    test('should include idempotence guidelines', () => {
      expect(content).toMatch(/idempotent/i);
    });

    test('should mention anchoring patterns', () => {
      expect(content).toMatch(/anchor/i);
      expect(content).toMatch(/\^\.\*\$/);
    });
  });

  describe('Examples Section', () => {
    test('should contain practical examples', () => {
      expect(content).toMatch(/example/i);
      const exampleMatches = content.match(/example/gi) || [];
      expect(exampleMatches.length).toBeGreaterThan(5);
    });

    test('should include single-line replacement examples', () => {
      expect(content).toMatch(/single.*line.*replacement/i);
    });

    test('should include block replacement examples', () => {
      expect(content).toMatch(/block.*replacement/i);
    });

    test('should show sed delimiter variations', () => {
      expect(content).toMatch(/sed.*[@|#]/);
    });

    test('examples should include file paths', () => {
      const exampleSection = content.match(/## PRACTICAL EXAMPLES[\s\S]*$/);
      if (exampleSection) {
        expect(exampleSection[0]).toMatch(/src\/[\w\/\.]+/);
      }
    });
  });

  describe('XML/HTML Tag Validity', () => {
    test('all XML tags should be properly closed', () => {
      const tagPattern = /<([a-z_:]+)>/gi;
      const tags = content.match(tagPattern) || [];
      
      tags.forEach(tag => {
        const tagName = tag.match(/<([a-z_:]+)>/i)[1];
        const closeTag = `</${tagName}>`;
        expect(content).toMatch(new RegExp(closeTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      });
    });

    test('should not have mismatched angle brackets', () => {
      const openBrackets = (content.match(/</g) || []).length;
      const closeBrackets = (content.match(/>/g) || []).length;
      expect(openBrackets).toBe(closeBrackets);
    });
  });

  describe('Formatting Consistency', () => {
    test('should use consistent heading levels', () => {
      const headings = content.match(/^#+\s+.+$/gm) || [];
      expect(headings.length).toBeGreaterThan(10);
      
      headings.forEach(heading => {
        expect(heading).toMatch(/^#{1,6}\s+\S/);
      });
    });

    test('should have consistent list formatting', () => {
      const listItems = content.match(/^[\s]*[-*]\s+/gm) || [];
      if (listItems.length > 0) {
        listItems.forEach(item => {
          expect(item).toMatch(/^[\s]*[-*]\s+\S/);
        });
      }
    });

    test('should have proper spacing around sections', () => {
      const sections = content.match(/^##\s+.+$/gm) || [];
      sections.forEach(section => {
        expect(section.trim()).toBe(section);
      });
    });
  });

  describe('Command Safety Guidelines', () => {
    test('should warn about destructive commands', () => {
      expect(content).toMatch(/destructive|dangerous|caution|warning|important/i);
    });

    test('should mention git command restrictions', () => {
      expect(content).toMatch(/git/i);
      expect(content).toMatch(/not.*git|git.*not|avoid.*git/i);
    });

    test('should specify allowed tools', () => {
      expect(content).toMatch(/allowed|permitted/i);
      expect(content).toMatch(/sed|echo|cat|mkdir/);
    });

    test('should mention mv command prohibition', () => {
      expect(content).toMatch(/\bmv\b/);
      expect(content).toMatch(/not.*execute|disabled|prohibited/i);
    });
  });

  describe('Best Practices Section', () => {
    test('should include project-specific best practices', () => {
      expect(content).toMatch(/best.*practice/i);
      expect(content).toMatch(/project.*specific/i);
    });

    test('should mention file discovery patterns', () => {
      expect(content).toMatch(/\bfd\b/);
      expect(content).toMatch(/file.*discover/i);
    });

    test('should include path handling guidelines', () => {
      expect(content).toMatch(/path/i);
      expect(content).toMatch(/relative/i);
      expect(content).toMatch(/repository.*root/i);
    });

    test('should mention avoiding assumptions', () => {
      expect(content).toMatch(/assume|assumption/i);
      expect(content).toMatch(/never.*assume|avoid.*assum/i);
    });
  });

  describe('Technical Accuracy', () => {
    test('sed commands should use correct syntax', () => {
      const sedCommands = content.match(/sed\s+-[a-zA-Z]+\s+/g) || [];
      sedCommands.forEach(cmd => {
        expect(cmd).toMatch(/sed\s+-[iEer]+\s+/);
      });
    });

    test('file paths should be relative', () => {
      const absolutePaths = content.match(/\/home\/|\/usr\/|\/etc\//g) || [];
      expect(absolutePaths.length).toBeLessThan(5);
    });

    test('regex patterns should be properly escaped in examples', () => {
      const regexExamples = content.match(/sed.*'s[/@#|].*/g) || [];
      if (regexExamples.length > 0) {
        expect(regexExamples.some(ex => ex.includes('\\'))).toBe(true);
      }
    });

    test('should use proper shell script shebang', () => {
      expect(content).toMatch(/#!/);
      expect(content).toMatch(/#!\/usr\/bin\/env bash|#!\/bin\/bash/);
    });
  });

  describe('Escaping Guidelines', () => {
    test('should explain forward slash escaping', () => {
      expect(content).toMatch(/forward.*slash/i);
      expect(content).toMatch(/escape.*\//);
    });

    test('should explain backslash escaping', () => {
      expect(content).toMatch(/backslash/i);
      expect(content).toMatch(/\\\\/);
    });

    test('should mention regex special characters', () => {
      expect(content).toMatch(/special.*character/i);
      expect(content).toMatch(/\[\.\*\+\?\]/);
    });

    test('should explain dollar sign escaping', () => {
      expect(content).toMatch(/dollar/i);
      expect(content).toMatch(/\\\$/);
    });

    test('should mention alternate delimiters', () => {
      expect(content).toMatch(/alternate.*delimiter|delimiter.*alternate/i);
      expect(content).toMatch(/[@#|]/);
    });
  });

  describe('Reference Snippets', () => {
    test('should have reference snippets section', () => {
      expect(content).toMatch(/reference.*snippet/i);
    });

    test('reference snippets should include replace examples', () => {
      const refSection = content.match(/## REFERENCE SNIPPETS[\s\S]*?(?=##|$)/);
      if (refSection) {
        expect(refSection[0]).toMatch(/replace/i);
      }
    });

    test('reference snippets should include insert examples', () => {
      const refSection = content.match(/## REFERENCE SNIPPETS[\s\S]*?(?=##|$)/);
      if (refSection) {
        expect(refSection[0]).toMatch(/insert/i);
      }
    });
  });

  describe('Content Readability', () => {
    test('should not have lines exceeding reasonable length', () => {
      const lines = content.split('\n');
      const longLines = lines.filter(line => 
        !line.trim().startsWith('```') && 
        !line.trim().startsWith('http') &&
        line.length > 120
      );
      expect(longLines.length).toBeLessThan(lines.length * 0.1);
    });

    test('should use consistent terminology', () => {
      expect(content).toMatch(/script/i);
      expect(content).toMatch(/command/i);
      expect(content).toMatch(/file/i);
      expect(content).toMatch(/edit/i);
    });

    test('should have clear section boundaries', () => {
      const sectionBreaks = content.match(/^---+$/gm) || [];
      expect(sectionBreaks.length).toBeGreaterThan(3);
    });
  });

  describe('Edge Cases and Warnings', () => {
    test('should address multi-line edit concerns', () => {
      expect(content).toMatch(/multi.*line/i);
      expect(content).toMatch(/NEVER.*single.*sed.*multiple.*lines/i);
    });

    test('should mention heredoc best practices', () => {
      expect(content).toMatch(/heredoc/i);
      expect(content).toMatch(/single.*quot.*heredoc|heredoc.*single.*quot/i);
    });

    test('should warn about shell interpolation', () => {
      expect(content).toMatch(/interpolation/i);
      expect(content).toMatch(/avoid.*interpolation|interpolation.*avoid/);
    });

    test('should address file size considerations', () => {
      expect(content).toMatch(/file.*size|large.*file/i);
      expect(content).toMatch(/head|tail|sed/);
    });
  });

  describe('Git Integration', () => {
    test('should mention git diff restrictions', () => {
      expect(content).toMatch(/git.*diff/i);
      expect(content).toMatch(/two.*dot.*syntax/i);
    });

    test('should specify allowed git commands', () => {
      expect(content).toMatch(/git.*status|git.*log|git.*diff/i);
    });

    test('should warn against git operations that modify', () => {
      expect(content).toMatch(/git.*not.*change|not.*git.*change/i);
    });
  });

  describe('Python and Node.js Integration', () => {
    test('should mention python usage', () => {
      expect(content).toMatch(/python/i);
    });

    test('should mention node.js usage', () => {
      expect(content).toMatch(/node/i);
    });

    test('should show package installation examples', () => {
      expect(content).toMatch(/pip.*install|npm.*install/i);
    });

    test('should demonstrate advanced analysis capabilities', () => {
      expect(content).toMatch(/advanced.*analysis|complex.*script/i);
    });
  });

  describe('File Operations', () => {
    test('should explain directory creation', () => {
      expect(content).toMatch(/mkdir/i);
      expect(content).toMatch(/mkdir -p/);
    });

    test('should show new file creation patterns', () => {
      expect(content).toMatch(/create.*new.*file/i);
      expect(content).toMatch(/cat.*>.*<<.*EOF/);
    });

    test('should demonstrate file reading techniques', () => {
      expect(content).toMatch(/cat -n/);
      expect(content).toMatch(/head|tail|sed/);
    });
  });

  describe('Tool-Specific Guidance', () => {
    test('should include ast-grep usage', () => {
      expect(content).toMatch(/ast-grep/i);
    });

    test('should include ripgrep (rg) usage', () => {
      expect(content).toMatch(/\brg\b/);
      expect(content).toMatch(/ripgrep/i);
    });

    test('should include fd-find usage', () => {
      expect(content).toMatch(/\bfd\b/);
      expect(content).toMatch(/fd-find/i);
    });

    test('should mention jq for JSON processing', () => {
      expect(content).toMatch(/\bjq\b/);
    });
  });

  describe('Pattern Anchoring', () => {
    test('should emphasize anchoring importance', () => {
      expect(content).toMatch(/anchor/i);
      const anchorMatches = content.match(/anchor/gi) || [];
      expect(anchorMatches.length).toBeGreaterThan(3);
    });

    test('should show caret and dollar anchors', () => {
      expect(content).toMatch(/\^/);
      expect(content).toMatch(/\$/);
    });

    test('should demonstrate line number anchoring', () => {
      expect(content).toMatch(/line.*number.*anchor/i);
    });
  });

  describe('Documentation Completeness', () => {
    test('document should be comprehensive', () => {
      const wordCount = content.split(/\s+/).length;
      expect(wordCount).toBeGreaterThan(2000);
    });

    test('should have multiple subsections', () => {
      const subsections = content.match(/^###\s+.+$/gm) || [];
      expect(subsections.length).toBeGreaterThan(5);
    });

    test('should contain sufficient examples', () => {
      const exampleBlocks = content.match(/```[\s\S]*?```/g) || [];
      expect(exampleBlocks.length).toBeGreaterThan(10);
    });
  });

  describe('Consistency Checks', () => {
    test('tag names should be consistent', () => {
      const runScriptsVariants = [
        ...new Set([
          ...(content.match(/run[-_]script/gi) || [])
        ])
      ];
      expect(runScriptsVariants.every(v => v.toLowerCase() === 'run-script' || v.toLowerCase() === 'run-scripts')).toBe(true);
    });

    test('should use consistent formatting for commands', () => {
      const codeInlinePattern = /`[^`]+`/g;
      const inlineCode = content.match(codeInlinePattern) || [];
      expect(inlineCode.length).toBeGreaterThan(50);
    });

    test('should maintain consistent indentation in examples', () => {
      const indentedLines = content.match(/^  +\S/gm) || [];
      if (indentedLines.length > 0) {
        indentedLines.forEach(line => {
          const spaces = line.match(/^( +)/)[1].length;
          expect(spaces % 2).toBe(0);
        });
      }
    });
  });
});