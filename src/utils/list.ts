import { rulesExtended, SimpleMarkdown } from 'discord-markdown-parser';
import type { ASTNode, Capture, ParserRule, SingleASTNode, State } from 'simple-markdown';

// Discord takes - and * for a bullet and `N.` for a number. It does not take `N)`, and unlike
// CommonMark it does not take `+`, which stays literal text so that `+ 1 for pizza` and pasted
// diffs keep rendering the way they do now.
const BULLET = '[-*]';
const NUMBER = '\\d{1,9}';

// One list line: indent, marker, at least one space, then the text. Both patterns are built from
// the same two constants, because a line BLOCK accepts and LINE rejects is dropped from the output
// while BLOCK has already taken it out of the source. The text is matched with [^\n] rather than
// . for the same reason: . also excludes U+2028 and U+2029.
const LINE = new RegExp('^( *)(?:(' + BULLET + ')|(' + NUMBER + ')\\.) +([^\\n]*)$');

// A run of consecutive list lines, stopping at a blank line. That is the whole reason this rule
// exists rather than SimpleMarkdown.defaultRules.list: that one follows CommonMark loose lists,
// where a blank line does NOT end the list, so it swallows the next paragraph and any heading in
// it. Discord ends a list at a blank line.
//
// The line terminator is a capture group on purpose. dmp's heading and subtext rules take their
// line-start lookbehind from `state.prevCapture.slice(-1)[0] === '\n'`, the last capture group of
// whatever matched before them. With no group at all that expression is the entire matched block,
// so neither rule could ever fire on the line after a list.
const BLOCK = new RegExp('^(?:(?: *(?:' + BULLET + '|' + NUMBER + '\\.) +[^\\n]*)(\\n|$))+');

// Discord will not open an ordered list outside this range. It keeps counting past 50 once open,
// so this is about where a list starts rather than about every line in it.
const MIN_START = 1;
const MAX_START = 50;

// Two spaces per level is what Discord uses. Tabs never reach us: SimpleMarkdown's preprocess runs
// before any rule and replaces each tab with four spaces, so a tab arrives as two levels.
const INDENT_WIDTH = 2;

type Line = { depth: number; ordered: boolean; start: number; text: string };

function readLines(block: string): Line[] {
  const lines: Line[] = [];

  for (const raw of block.split('\n')) {
    const match = LINE.exec(raw);
    if (!match) continue;

    const [, indent, bullet, digits, text] = match;
    lines.push({
      depth: Math.floor((indent ?? '').length / INDENT_WIDTH),
      ordered: bullet === undefined,
      start: digits ? parseInt(digits, 10) : 1,
      text: text ?? '',
    });
  }

  return lines;
}

/** Whether this line opens a list rather than continuing the one above it. */
const opensList = (line: Line, previous: Line | undefined): boolean =>
  previous === undefined || line.ordered !== previous.ordered || line.depth > previous.depth;

/**
 *
 * Turn indents into levels, so that equally indented lines land at the same level and no level is
 * skipped. A stack is needed rather than a running comparison: clamping each line against the
 * previous line's already-clamped depth reads two different coordinate systems against each other,
 * which turns equal indents into a staircase and inverts decreasing ones.
 * @param lines - The lines to adjust, in place
 */
function levelIndents(lines: Line[]): void {
  let base = lines[0]!.depth;
  for (const line of lines) if (line.depth < base) base = line.depth;

  const open: number[] = [base];

  for (const line of lines) {
    while (open.length > 1 && line.depth < open[open.length - 1]!) open.pop();
    if (line.depth > open[open.length - 1]!) open.push(line.depth);

    line.depth = open.length - 1;
  }
}

/**
 *
 * Turn a run of list lines into one list node, recursing for each deeper level.
 * Stops at the first line that is shallower than this level or that switches between bullets and
 * numbers, because Discord starts a new list at both.
 * @param lines - Every line in the block
 * @param depth - The depth being collected
 * @param from - Index to start at
 * @param parse - SimpleMarkdown's recursive parser, for the text of each item
 * @param state - Parser state to hand to the item parse
 * @param nested - Whether this list sits inside another one
 * @returns The node for this level, and the index the caller should continue from
 */
function build(
  lines: Line[],
  depth: number,
  from: number,
  parse: (source: string, state: State) => SingleASTNode[],
  state: State,
  nested: boolean
): { node: SingleASTNode; next: number } {
  const items: SingleASTNode[][] = [];
  const first = lines[from]!;
  let i = from;

  while (i < lines.length && lines[i]!.depth >= depth) {
    const line = lines[i]!;

    // Deeper than this level, so it belongs to the item above it.
    if (line.depth > depth) {
      const child = build(lines, line.depth, i, parse, state, true);
      items[items.length - 1]!.push(child.node);
      i = child.next;
      continue;
    }

    if (line.ordered !== first.ordered) break;

    // prevCapture is reset because it still holds whatever preceded the whole block, and the rules
    // that use it as lookbehind would otherwise render the same item differently depending on what
    // came before the list. inList stops the item text from re-entering this rule: item text is not
    // the start of a line, and letting it match again left nesting depth unbounded.
    items.push(parse(line.text, { ...state, inline: true, prevCapture: null, inList: true }));
    i++;
  }

  return {
    node: {
      // Set explicitly because SimpleMarkdown only stamps the rule name onto a single returned
      // node, and this rule returns an array. Without it the renderer's default branch swallows
      // the list.
      type: 'list',
      ordered: first.ordered,
      start: first.ordered ? first.start : undefined,
      // Discord fills the bullet at the top level and leaves it hollow below it. The component
      // cannot work this out for itself: it only checks whether its parent element is a list, and
      // every sub-list here sits inside a discord-list-item, so the check never fires.
      nested,
      items,
    } as unknown as SingleASTNode,
    next: i,
  };
}

/**
 *
 * A list rule that follows Discord's rules rather than CommonMark's.
 * SimpleMarkdown ships a list rule, but it refuses to match in inline scope and it treats a blank
 * line as a continuation, so it both never fires here and eats the paragraph after a list when it
 * does.
 */
export const list: ParserRule = {
  // The slot SimpleMarkdown reserves for lists. Nothing in the extended rule set uses it, and it
  // runs after codeBlock and blockQuote, so neither can have a list taken out from under it.
  order: SimpleMarkdown.defaultRules.list.order,

  match(source: string, state: State): Capture | null {
    // Item text is handed back to the parser, and it is not the start of a line.
    if (state.inList) return null;

    // Checking the whole previous match rather than its last group is deliberate: blockQuote's
    // last group is undefined, so the form dmp's heading rule uses would refuse to open a list on
    // the line after a quote.
    const previous = state.prevCapture;
    if (previous !== null && previous !== undefined && !String(previous[0]).endsWith('\n')) return null;

    const captured = BLOCK.exec(source);
    if (!captured) return null;

    // Trim the block at the first line that would open a list Discord refuses. Trimming rather
    // than declining the whole match is what keeps that text on the page: the remainder falls
    // through to the text rule and renders literally, which is what Discord does with it.
    const lines = readLines(captured[0]);
    let kept = 0;
    let previousLine: Line | undefined;

    for (const line of lines) {
      const refused = line.ordered && (line.start < MIN_START || line.start > MAX_START);
      if (opensList(line, previousLine) && refused) break;

      kept++;
      previousLine = line;
    }

    if (kept === 0) return null;
    if (kept < lines.length) captured[0] = captured[0].split('\n').slice(0, kept).join('\n') + '\n';

    return captured;
  },

  parse(capture, parse, state): ASTNode {
    const lines = readLines(capture[0]);
    if (lines.length === 0) return [];

    levelIndents(lines);

    // One node per run, because a block can hold several lists: switching between bullets and
    // numbers starts a new one, and so does a line shallower than the one that opened this run.
    // SimpleMarkdown flattens an array of nodes into its output.
    const nodes: SingleASTNode[] = [];
    let i = 0;

    while (i < lines.length) {
      const built = build(lines, lines[i]!.depth, i, parse, state, false);
      nodes.push(built.node);
      i = built.next;
    }

    return nodes;
  },
};

// Built once. discord-markdown-parser builds its own parsers at module load for the same reason:
// parserFor filters and sorts every rule, and this runs for every message, embed field and reply.
const parser = SimpleMarkdown.parserFor({ ...rulesExtended, list } as never);

/**
 *
 * Parse message content with list support added to the extended rules.
 * `parse` from discord-markdown-parser cannot be used directly because its rule set has no list
 * rule at all, so bullets arrive as plain text.
 * @param content - The message content
 * @returns The parsed nodes
 */
export const parseWithLists = (content: string): SingleASTNode[] =>
  parser(content, { inline: true }) as SingleASTNode[];
