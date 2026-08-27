import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseWithLists } from '../../src/utils/list';

// A raw U+2028 is still a line terminator inside a regular expression literal, and it is
// message content Discord happily carries, so it is built rather than typed.
const LS: string = String.fromCharCode(0x2028);

type Node = {
  type?: string;
  content?: unknown;
  items?: unknown[];
  ordered?: boolean;
  start?: number;
  nested?: boolean;
};
type Item = { text: string; lists: List[] };
type List = { ordered: boolean; start?: number; nested: boolean; items: Item[] };

/** Text of one item, with any list nested inside it left out. */
function textOf(node: unknown): string {
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (typeof node === 'string') return node;
  if (!node || typeof node !== 'object') return '';

  const single = node as Node;
  if (single.type === 'list') return '';
  if (typeof single.content === 'string') return single.content;

  return single.content ? textOf(single.content) : '';
}

/** Every list at this level, each item carrying its text and its own sub-lists. */
function lists(nodes: unknown): List[] {
  const found: List[] = [];

  const visit = (node: unknown): void => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node || typeof node !== 'object') return;

    const single = node as Node;
    if (single.type !== 'list') return;

    found.push({
      ordered: Boolean(single.ordered),
      start: single.start,
      nested: Boolean(single.nested),
      items: (single.items ?? []).map((item) => ({ text: textOf(item), lists: lists(item) })),
    });
  };

  visit(nodes);
  return found;
}

const texts = (list: List): string[] => list.items.map((item) => item.text);

/** Every node of a given type anywhere in the tree. */
function nodesOfType(nodes: unknown, type: string, found: Node[] = []): Node[] {
  if (Array.isArray(nodes)) {
    nodes.forEach((node) => nodesOfType(node, type, found));
    return found;
  }
  if (!nodes || typeof nodes !== 'object') return found;

  const single = nodes as Node;
  if (single.type === type) found.push(single);
  if (single.content) nodesOfType(single.content, type, found);
  if (single.items) nodesOfType(single.items, type, found);

  return found;
}

test('bullets: - and * open lists, + and N) and mid-sentence dashes do not', () => {
  for (const marker of ['-', '*']) {
    const [list, ...rest] = lists(parseWithLists(marker + ' one\n' + marker + ' two\n'));
    assert.equal(rest.length, 0, marker + ' should produce exactly one list');
    assert.deepEqual(texts(list!), ['one', 'two']);
    assert.equal(list!.ordered, false);
  }
  assert.deepEqual(lists(parseWithLists('+ 1 for pizza\n')), [], '+ is not a Discord bullet');
  assert.deepEqual(lists(parseWithLists('1) not a list\n2) still not\n')), [], 'N) is not a Discord marker');
  assert.deepEqual(lists(parseWithLists('a well - placed dash')), [], 'a dash mid-sentence is not a list');
});

test('numbering: a list starts where the author started it and keeps counting past 50', () => {
  const ordered = lists(parseWithLists('3. three\n4. four\n'))[0]!;
  assert.equal(ordered.ordered, true);
  assert.equal(ordered.start, 3, 'the list starts where the author started it');
  assert.deepEqual(texts(ordered), ['three', 'four']);

  const capped = lists(parseWithLists('50. fifty\n51. fifty one\n'))[0]!;
  assert.equal(capped.start, 50);
  assert.deepEqual(texts(capped), ['fifty', 'fifty one'], 'a list keeps counting past 50 once it has started');
  assert.deepEqual(lists(parseWithLists('51. fifty one\n')), [], '51 does not open a list');
});

test('a line shallower than the first must survive', () => {
  const outdented = lists(parseWithLists('  - a\n- b\n'));
  assert.deepEqual(outdented.map(texts), [['a'], ['b']], 'a line shallower than the first must survive');
  assert.deepEqual(
    outdented.map((list) => list.nested),
    [false, false],
    'neither has a parent, so neither nests'
  );
});

test('nesting below an indented first line must survive', () => {
  const belowFloor = lists(parseWithLists('  - a\n- b\n  - c\n  - d\n- e\n'));
  assert.deepEqual(belowFloor.map(texts), [['a'], ['b', 'e']], 'c and d belong to b, not to the top level');
  assert.deepEqual(texts(belowFloor[1]!.items[0]!.lists[0]!), ['c', 'd']);
});

test('U+2028 inside an item must not drop the line', () => {
  const separated = lists(parseWithLists('- a' + LS + 'b\n- c\n'))[0]!;
  assert.deepEqual(texts(separated), ['a' + LS + 'b', 'c'], 'U+2028 inside an item must not drop the line');
});

test('switching between bullets and numbers starts a new list', () => {
  const [first, second, ...others] = lists(parseWithLists('1. a\n- b\n'));
  assert.equal(others.length, 0, 'exactly two lists');
  assert.equal(first!.ordered, true);
  assert.deepEqual(texts(first!), ['a']);
  assert.equal(second!.ordered, false, 'the bullet must not be renumbered as item 2');
  assert.deepEqual(texts(second!), ['b']);
});

test('indentation nests, and a jump of more than one level is only one level down', () => {
  const nested = lists(parseWithLists('- top\n  - child\n- second\n'))[0]!;
  assert.deepEqual(texts(nested), ['top', 'second']);
  assert.deepEqual(texts(nested.items[0]!.lists[0]!), ['child']);
  assert.equal(nested.items[0]!.lists[0]!.nested, true, 'a list inside an item is nested');

  const jumped = lists(parseWithLists('- a\n    - b\n  - c\n'))[0]!;
  assert.deepEqual(texts(jumped), ['a']);
  assert.deepEqual(
    jumped.items[0]!.lists.map(texts),
    [['b', 'c']],
    'a four-space indent is one level down, and the two-space line joins it'
  );
});

test('a blank line ends the list and the heading after it survives', () => {
  const afterBlank = parseWithLists('- item\n\n## Heading after the list\n');
  assert.deepEqual(texts(lists(afterBlank)[0]!), ['item'], 'the list stops at the blank line');
  assert.equal(nodesOfType(afterBlank, 'heading').length, 1, 'the heading after a blank line must survive');
});

test('the block terminator keeps heading and subtext rules firing on the next line', () => {
  assert.equal(nodesOfType(parseWithLists('- a\n# H\n'), 'heading').length, 1, 'a heading straight after a list');
  assert.equal(nodesOfType(parseWithLists('- a\n-# s\n'), 'subtext').length, 1, 'subtext straight after a list');
  assert.equal(
    nodesOfType(parseWithLists('- a\n  - b\n# H\n'), 'heading').length,
    1,
    'a heading straight after a nested list'
  );
});

test('bullets under a marker Discord refuses have no parent and stay primary', () => {
  const orphaned = lists(parseWithLists('1) a heading-ish line\n   - one\n   - two\n     - deeper\n'));
  assert.equal(orphaned[0]!.nested, false, 'bullets with no parent list are primary');
  assert.deepEqual(texts(orphaned[0]!), ['one', 'two']);
  assert.deepEqual(texts(orphaned[0]!.items[1]!.lists[0]!), ['deeper']);
});

test('a stale lookbehind must not change how an item parses', () => {
  const bare = lists(parseWithLists('- # Hi\n'))[0]!;
  const afterQuote = lists(parseWithLists('> q\n- # Hi\n'))[0]!;
  assert.deepEqual(texts(bare), texts(afterQuote), 'a stale lookbehind must not change how an item parses');
});

test('equal indents are siblings, not a staircase', () => {
  assert.deepEqual(
    lists(parseWithLists('- a\n    - b\n    - c\n'))[0]!.items[0]!.lists.map(texts),
    [['b', 'c']],
    'two lines indented the same must land at the same level'
  );
  assert.deepEqual(
    lists(parseWithLists('- a\n      - b\n    - c\n'))[0]!.items[0]!.lists.map(texts),
    [['b', 'c']],
    'a less indented line must not become a child of a more indented one'
  );
});

test('an ordered list cannot open above 50 or below 1 mid-block', () => {
  assert.deepEqual(lists(parseWithLists('- a\n51. b\n')).map(texts), [['a']], '51 does not open a list mid-block');
  assert.deepEqual(lists(parseWithLists('- a\n0. b\n')).map(texts), [['a']], '0 does not open a list mid-block');
});

test('a marker inside item text stays literal and does not overflow the stack', () => {
  assert.deepEqual(texts(lists(parseWithLists('- - -'))[0]!), ['- -'], 'a marker inside an item is literal');
  assert.doesNotThrow(
    () => parseWithLists('- '.repeat(2000)),
    'a 4000 character message, which any user can send, must not overflow the stack'
  );
});

test('every list node carries its type explicitly', () => {
  // Array elements skip SimpleMarkdown's type stamping, so build sets type explicitly. Drop that
  // and every list falls through the renderer's default branch and vanishes.
  for (const node of parseWithLists('1. a\n- b\n')) {
    if ((node as Node).items) assert.equal((node as Node).type, 'list', 'every list node must carry its type');
  }
});
