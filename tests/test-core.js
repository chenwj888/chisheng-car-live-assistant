'use strict';

const assert = require('assert');
const Core = require('../static/core.js');

function multiset(items) {
  return items.slice().sort().join('\u0001');
}

function testParse() {
  const parsed = Core.parseScript(Core.SAMPLE_SCRIPT);
  assert.strictEqual(parsed.paragraphs.length, 4, '示例讲稿应有 4 段');
  assert.ok(parsed.sentences.length >= 8, '示例讲稿应拆分出足够句子');
  assert.ok(parsed.sentences.every((s) => s.text.length > 0));
  const stats = Core.getStats(parsed);
  assert.ok(stats.chars > 100);
  assert.strictEqual(stats.paragraphs, 4);
}

function testLineParagraphs() {
  const parsed = Core.parseScript('第一句介绍外观。\n第二句介绍空间。\n第三句介绍动力。');
  assert.strictEqual(parsed.paragraphs.length, 3, '每行一句时应按行分段');
  assert.strictEqual(parsed.sentences.length, 3);
}

function testSequential() {
  const parsed = Core.parseScript(Core.SAMPLE_SCRIPT);
  const queue = Core.buildQueue(parsed, { mode: 'sequential', rewrite: false });
  assert.strictEqual(queue.length, parsed.sentences.length);
  assert.ok(queue.every((item, index) => item.text === parsed.sentences[index].text));
}

function testSentenceShuffle() {
  const parsed = Core.parseScript(Core.SAMPLE_SCRIPT);
  const queue = Core.buildQueue(parsed, { mode: 'sentence', rewrite: false });
  assert.strictEqual(queue.length, parsed.sentences.length);
  assert.strictEqual(
    multiset(queue.map((item) => item.original)),
    multiset(parsed.sentences.map((item) => item.text))
  );
}

function testParagraphShufflePreservesInnerOrder() {
  const parsed = Core.parseScript(Core.SAMPLE_SCRIPT);
  const queue = Core.buildQueue(parsed, { mode: 'paragraph', rewrite: false });
  const groups = new Map();
  queue.forEach((item) => {
    if (!groups.has(item.paragraphIndex)) groups.set(item.paragraphIndex, []);
    groups.get(item.paragraphIndex).push(item.original);
  });
  for (const paragraph of parsed.paragraphs) {
    const expected = paragraph.sentences.map((s) => s.text);
    assert.deepStrictEqual(groups.get(paragraph.index), expected, `第 ${paragraph.index} 段内部顺序应保持`);
  }
}

function testSmartKeepsFirstSentenceOfParagraph() {
  const parsed = Core.parseScript(Core.SAMPLE_SCRIPT);
  const queue = Core.buildQueue(parsed, { mode: 'smart', rewrite: false });
  const groups = new Map();
  queue.forEach((item) => {
    if (!groups.has(item.paragraphIndex)) groups.set(item.paragraphIndex, []);
    groups.get(item.paragraphIndex).push(item.original);
  });
  for (const paragraph of parsed.paragraphs) {
    const first = paragraph.sentences[0].text;
    const actual = groups.get(paragraph.index);
    assert.ok(actual.includes(first), '首句应保留在段内');
    assert.strictEqual(actual[0], first, '首句仍应排在该段第一位');
  }
}

function testRewrite() {
  const text = '这台车外观非常大气，空间宽敞，智能驾驶也很安全。';
  const result = Core.rewriteText(text, {
    strength: 100,
    protectedWords: '',
    rng: () => 0
  });
  assert.ok(result.changes > 0, '应发生至少一处替换');
  assert.strictEqual(result.parts.map((p) => p.text).join(''), result.text);
  assert.ok(result.text.includes('智能驾驶'), '固定搭配应保留');
  assert.ok(!result.text.includes('大气'), '“大气”应被替换');
}

function testProtectedWords() {
  const text = '这款车的外观很大气，空间也很宽敞。';
  const result = Core.rewriteText(text, {
    strength: 100,
    protectedWords: '大气',
    rng: () => 0
  });
  assert.ok(result.text.includes('大气'), '保护词不应被替换');
}

function testNoRewriteAtZero() {
  const text = '外观大气，空间宽敞。';
  const result = Core.rewriteText(text, { strength: 0 });
  assert.strictEqual(result.changes, 0);
  assert.strictEqual(result.text, text);
}

function testQueueRewriteParts() {
  const parsed = Core.parseScript('这台车外观大气。');
  const queue = Core.buildQueue(parsed, { mode: 'sequential', rewrite: true, strength: 100, rng: () => 0 });
  assert.strictEqual(queue.length, 1);
  assert.strictEqual(queue[0].parts.map((p) => p.text).join(''), queue[0].text);
  assert.ok(queue[0].changes >= 1);
}

function testModelCatalog() {
  assert.strictEqual(Core.CAR_BRANDS.length, 2);
  assert.strictEqual(Core.CAR_MODELS.length, 11);
  const names = Core.CAR_MODELS.map((m) => m.name);
  ['雅阁', '奥德赛', '型格', '冠道', '皓影', 'M8', 'E8', '越7', 'M6', 'S7', 'GS4'].forEach((name) => {
    assert.ok(names.includes(name), `车型目录应包含 ${name}`);
  });
  assert.strictEqual(Core.getModelById('accord').brandName, '广汽本田');
  assert.strictEqual(Core.getModelById('yue7').brandName, '广汽传祺');
}

function testSplitByModels() {
  const text = [
    '开场通用：欢迎来到直播间。',
    '',
    '【雅阁】',
    '雅阁外观大气，空间宽敞。',
    '',
    '奥德赛：',
    '奥德赛适合全家出行。',
    '',
    '## 广汽传祺 M8',
    'M8 二排乘坐舒适。',
    '',
    'GS4',
    'GS4 性价比高。'
  ].join('\n');

  const result = Core.splitByModels(text);
  assert.strictEqual(result.hasHeadings, true);
  assert.deepStrictEqual(result.detected, ['accord', 'odyssey', 'm8', 'gs4']);
  assert.ok(result.sections.accord.includes('雅阁外观大气'));
  assert.ok(result.sections.odyssey.includes('全家出行'));
  assert.ok(result.sections.m8.includes('二排乘坐舒适'));
  assert.ok(result.sections.gs4.includes('性价比高'));
  assert.ok(result.sections.common.includes('欢迎来到直播间'));
  assert.ok(!result.sections.accord.includes('【雅阁】'), '标题不应进入朗读正文');
  assert.ok(!result.sections.odyssey.includes('奥德赛：'), '标题不应进入朗读正文');
}

function testModelNameInsideSentenceIsNotHeading() {
  const result = Core.splitByModels('雅阁的空间很大。\n这台奥德赛也很适合家用。');
  assert.strictEqual(result.hasHeadings, false);
  assert.strictEqual(result.detected.length, 0);
  assert.ok(result.sections.common.includes('雅阁的空间很大'));
}

function testLatinModelBoundary() {
  const result = Core.splitByModels('M80 是另一台设备\nXM8 不是车型\nM8\nM8 车型讲解：二排很舒服。');
  assert.deepStrictEqual(result.detected, ['m8']);
  assert.strictEqual(result.sections.m8.trim(), '二排很舒服。');
}

function testRepeatedModelSections() {
  const result = Core.splitByModels('雅阁：第一段。\n\n雅阁：第二段。\n\n奥德赛：奥德赛内容。');
  assert.deepStrictEqual(result.detected, ['accord', 'odyssey']);
  assert.ok(result.sections.accord.includes('第一段'));
  assert.ok(result.sections.accord.includes('第二段'));
}

function testEnumeratedParagraphKeptWhole() {
  const text = '常见异议。第一，外观很大气。第二，空间很宽敞。第三，动力够用。';
  const parsed = Core.parseScript(text);
  assert.strictEqual(parsed.paragraphs.length, 1, '含序号的段落应保持为一段');
  assert.strictEqual(parsed.paragraphs[0].locked, true, '含序号的段落应标记为整段保留');
  const queue = Core.buildQueue(parsed, { mode: 'sentence', rewrite: false, rng: () => 0.5 });
  assert.strictEqual(queue.length, 1, '整段保留后应只生成一个队列项');
  assert.ok(queue[0].text.includes('第一') && queue[0].text.includes('第二') && queue[0].text.includes('第三'));
  assert.strictEqual(queue[0].locked, true);

  const rewritten = Core.buildQueue(parsed, { mode: 'sentence', rewrite: true, strength: 100, rng: () => 0 });
  assert.strictEqual(rewritten.length, 1);
  assert.ok(rewritten[0].changes > 0, '整段保留不应禁止形容词替换');
  assert.strictEqual(rewritten[0].parts.map((part) => part.text).join(''), rewritten[0].text);
}

function testSeparateOrdinalParagraphsMerged() {
  const text = ['第一，外观很大气。', '', '第二，空间很宽敞。', '', '第三，动力够用。'].join('\n');
  const parsed = Core.parseScript(text);
  assert.strictEqual(parsed.paragraphs.length, 1, '连续序号段落应合并为一段');
  assert.strictEqual(parsed.paragraphs[0].locked, true);
  const queue = Core.buildQueue(parsed, { mode: 'sentence', rewrite: false, rng: () => 0.5 });
  assert.strictEqual(queue.length, 1);
  assert.ok(queue[0].text.indexOf('第一') < queue[0].text.indexOf('第二'));
  assert.ok(queue[0].text.indexOf('第二') < queue[0].text.indexOf('第三'));
}

function testOrdinalLookalikeNotLocked() {
  const text = '这是第一次到店。\n\n第一排空间不错。';
  const parsed = Core.parseScript(text);
  assert.strictEqual(parsed.paragraphs.length, 2);
  assert.ok(parsed.paragraphs.every((paragraph) => !paragraph.locked), '第一次/第一排不应触发整段保留');
}

(function run() {
  const tests = [
    testParse,
    testLineParagraphs,
    testSequential,
    testSentenceShuffle,
    testParagraphShufflePreservesInnerOrder,
    testSmartKeepsFirstSentenceOfParagraph,
    testRewrite,
    testProtectedWords,
    testNoRewriteAtZero,
    testQueueRewriteParts,
    testModelCatalog,
    testSplitByModels,
    testModelNameInsideSentenceIsNotHeading,
    testLatinModelBoundary,
    testRepeatedModelSections,
    testEnumeratedParagraphKeptWhole,
    testSeparateOrdinalParagraphsMerged,
    testOrdinalLookalikeNotLocked
  ];
  let passed = 0;
  for (const test of tests) {
    test();
    passed += 1;
    console.log('PASS', test.name);
  }
  console.log(`\n${passed}/${tests.length} tests passed.`);
})();
