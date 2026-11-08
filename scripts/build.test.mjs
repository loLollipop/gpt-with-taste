import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {compile, loadRecipe, TARGETS, TEXT_KEYS} from '../src/build.mjs';
import {run} from './build.mjs';
import {run as install} from './install.mjs';
import {pluginBundle, MARKET_ROOT} from '../src/codex-plugin.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
async function fixture(t) {
  const scratch = path.join(repo, '.tmp/build-test');
  await fs.mkdir(scratch, {recursive: true});
  const root = await fs.mkdtemp(path.join(scratch, 'case-'));
  t.after(() => fs.rm(root, {recursive: true, force: true}));
  for (const dir of ['recipe', 'adapters', 'src'])
    await fs.cp(path.join(repo, dir), path.join(root, dir), {recursive: true});
  await fs.copyFile(path.join(repo, 'LICENSE'), path.join(root, 'LICENSE'));
  return root;
}
const content = (map, file) => map.get(file).toString();

test('author package is complete, host-neutral and position-specific', async () => {
  const {meta, texts} = await loadRecipe(repo);
  assert.equal(meta.version, '0.1.0');
  assert.deepEqual(Object.keys(texts), TEXT_KEYS);
  for (const text of Object.values(texts)) {
    assert.doesNotMatch(text, /current Codex|@variant/);
    assert.match(text, /user's (?:latest language|chosen persona|explicit persona)/);
  }
  assert.match(texts.main, /# GPT with Taste — Main/);
  assert.match(texts.main, /Delegate without losing the source/);
  assert.match(texts.sub, /parent owns cross-task coordination/);
  assert.match(texts.sub, /leaf status/);
  assert.doesNotMatch(texts.independent, /parent|assigned to you|delegated agent|you are a subagent/i);
  assert.match(texts.independent, /actual controller/);
  for (const key of ['main', 'sub', 'independent']) {
    // Texts are appended to a harness's own instructions; they must not claim to replace them.
    assert.match(texts[key], /add to the instructions your harness/);
    assert.match(texts[key], /falsifiable/);
    assert.match(texts[key], /reference|source material/);
  }
  for (const key of ['main', 'sub']) {
    assert.match(texts[key], /Fidelity first, taste second/);
    assert.match(texts[key], /entry points, data meaning, and conditions/);
  }
  // Anti-defensive behavior covers verdicts, precautions, code, and offers, not only prose.
  assert.match(texts.main, /Own the call, not your cover/);
  for (const key of ['main', 'sub', 'independent']) {
    assert.match(texts[key], /verdict/);
    assert.match(texts[key], /generic checklists?/i);
    assert.match(texts[key], /silent fallbacks/);
  }
  // Requirements persist across the conversation instead of being dropped on a follow-up.
  assert.match(texts.main, /stays in force until completed, superseded, or rescinded/);
  assert.match(texts.userSteer, /requirements the user stated earlier in force/);
  // Documents keep their own genre instead of chat-style verdict-first bleeding into them.
  assert.match(texts.main, /paper, chapter, or report/);
  assert.match(texts.independent, /follows its own genre/);
  assert.match(texts.userSteer, /follow its genre and structure instead/);
  // Delivery defaults ordinary details instead of making the user enumerate them.
  assert.match(texts.main, /never to have the user spell out ordinary details/);
});

test('recipe stays lean and free of case-specific rules', async () => {
  const {texts} = await loadRecipe(repo);
  const words = text => (text.match(/[A-Za-z]+(?:[-'][A-Za-z]+)*/g) ?? []).length;
  assert.ok(words(texts.main) <= 1450, `main has ${words(texts.main)} words`);
  assert.ok(words(texts.sub) <= 900, `sub has ${words(texts.sub)} words`);
  assert.ok(words(texts.independent) <= 700, `independent has ${words(texts.independent)} words`);
  for (const text of Object.values(texts))
    assert.doesNotMatch(text, /SHA-256|BLEU|matrix-multiplication|exhibition|BUTTON_GUIDE|ISO 24495/);
});

test('self-review belongs to delivery and Steers stay focused on the actual result', async () => {
  const {texts} = await loadRecipe(repo);
  for (const key of ['main', 'sub']) {
    assert.match(texts[key], /Running is not done/);
    assert.match(texts[key], /This self-review is part of the work, not ceremony/);
    assert.match(texts[key], /inputs, empty or missing data, and error returns/);
  }
  for (const key of ['userSteer', 'subSteer', 'agentSteer']) {
    const words = texts[key].match(/[A-Za-z]+(?:[-'][A-Za-z]+)*/g) ?? [];
    assert.ok(words.length <= 100, `${key} should remain a short event reminder`);
    assert.match(texts[key], /actual (?:diff or artifact|artifact)/);
    assert.match(texts[key], /reuse valid evidence/i);
    assert.match(texts[key], /source/);
  }
  assert.match(texts.userSteer, /verification proportional to the change and its consequences/);
  assert.match(texts.subSteer, /Keep checks proportional/);
  assert.match(texts.agentSteer, /Distinguish progress or a mailbox wake from a completed assignment/);
});

test('author sources use LF so embedded JSON is portable across checkouts', async () => {
  const {texts} = await loadRecipe(repo);
  for (const [key, text] of Object.entries(texts)) assert.doesNotMatch(text, /\r/, key);
});

test('compile is deterministic and each generated file has a source manifest', async () => {
  const first = await compile(repo), second = await compile(repo, [...TARGETS].reverse());
  assert.deepEqual(first, second);
  assert.deepEqual([...first.keys()], [...first.keys()].sort());
  for (const target of TARGETS) {
    const manifestPath = `dist/${target}/build-manifest.json`;
    const manifest = JSON.parse(content(first, manifestPath));
    assert.equal(manifest.recipe.manifest, 'recipe/manifest.json');
    assert.deepEqual(Object.keys(manifest.sources), TEXT_KEYS);
    assert.deepEqual(manifest.files, [...first.keys()].filter(file => file.startsWith(`dist/${target}/`) ||
      (target === 'codex' && file.startsWith('prompts/'))));
    for (const file of manifest.files) assert.ok(first.has(file), file);
  }
  for (const name of ['main', 'sub', 'user-steer', 'sub-steer', 'agent-steer'])
    assert.equal(first.get(`prompts/${name}.md`), first.get(`dist/codex/${name}.md`));
});

test('check detects manual and source drift, remains read-only and respects selected targets', async t => {
  const root = await fixture(t);
  await run([], root);
  await run(['--check'], root);
  const source = path.join(root, 'recipe/main.md'), before = await fs.readFile(source);
  const output = path.join(root, 'dist/codex/main.md');
  const projected = path.join(root, 'prompts/main.md');
  await fs.appendFile(output, '\nMANUAL DRIFT\n');
  await assert.rejects(run(['--check'], root), /dist\/codex\/main\.md/);
  assert.deepEqual(await fs.readFile(source), before);
  assert.match(await fs.readFile(output, 'utf8'), /MANUAL DRIFT/);
  await run([], root);
  await run(['--check'], root);
  await fs.appendFile(source, '\nSOURCE CHANGE\n');
  await assert.rejects(run(['--check'], root), /prompts\/main\.md/);
  await assert.rejects(run(['--check'], root), /dist\/codex\/main\.md/);
  await fs.appendFile(source, '\nMORE\n');
  await run(['--target', 'codex'], root);
  await run(['--check', '--target', 'codex'], root);
  for (const file of [output, projected])
    assert.match(await fs.readFile(file, 'utf8'), /SOURCE CHANGE/);
});

test('one source edit reaches every Codex output and only its Markdown projection of that text', async t => {
  const root = await fixture(t);
  const before = await compile(root);
  await fs.appendFile(path.join(root, 'recipe/main.md'), '\nONE SOURCE CHANGE\n');
  const after = await compile(root);
  const changed = [...after.keys()].filter(file =>
    !Buffer.from(after.get(file)).equals(Buffer.from(before.get(file))));
  assert.deepEqual(changed, ['dist/codex/main.md', 'prompts/main.md']);
  for (const file of changed) assert.match(content(after, file), /ONE SOURCE CHANGE/);
  for (const file of after.keys()) assert.ok(
    changed.includes(file) || Buffer.from(after.get(file)).equals(Buffer.from(before.get(file))), file);
});

test('a selected target loads only its own adapter; invalid targets and unsafe paths fail', async t => {
  const root = await fixture(t);
  await compile(root, ['codex']);
  await assert.rejects(compile(root, ['unknown']), /Unknown build target/);
  await assert.rejects(run(['--target'], root), /requires an id/);
  await assert.rejects(run(['--typo'], root), /Unknown argument/);
  const unsafe = await fixture(t);
  await fs.writeFile(path.join(unsafe, 'adapters/codex/build.mjs'),
    'export async function render() { return new Map([["../escape.md", "escape"]]); }');
  await assert.rejects(compile(unsafe, ['codex']), /invalid or reserved output path/);
});

test('generated compatibility prompts install, check and restore through the existing installer and plugin bundle', async t => {
  const root = await fixture(t);
  await run(['--target', 'codex'], root);
  for (const dir of ['hooks', 'plugin']) await fs.cp(path.join(repo, dir), path.join(root, dir), {recursive: true});
  const bundle = await pluginBundle(root);
  for (const name of ['user', 'sub', 'agent']) assert.deepEqual(
    bundle.get(`${MARKET_ROOT}/plugins/gpt-with-taste/prompts/${name}-steer.md`),
    await fs.readFile(path.join(root, `prompts/${name}-steer.md`)));
  const home = path.join(root, 'isolated-home');
  const services = {sourceIdentity: async () => ({kind: 'unknown'})};
  const call = args => install(['--home', home, ...args], root, services);
  await call(['--skip-update-check']);
  assert.deepEqual(await fs.readFile(path.join(home, 'prompts/gpt-with-taste/main.md')),
    await fs.readFile(path.join(root, 'prompts/main.md')));
  await call(['--check']);
  await call(['--restore']);
  await assert.rejects(fs.access(path.join(home, 'config.toml')), {code: 'ENOENT'});
});

const authorTrace = /<!--\s*Generated from recipe\/|recipe\/manifest\.json|adapters\/[\w-]+\/build\.mjs|Edit recipe\/|node scripts\/build\.mjs|source gpt-with-taste 0\.1\.0/;
const assertCleanContext = value => assert.doesNotMatch(JSON.stringify(value) ?? '', authorTrace);

function assertBehaviorExports(files, {meta, texts}) {
  for (const target of TARGETS)
    for (const key of TEXT_KEYS)
      assert.equal(content(files, `dist/${target}/${meta.texts[key]}`), texts[key]);
  for (const name of ['main', 'sub', 'user-steer', 'sub-steer', 'agent-steer']) {
    const key = TEXT_KEYS.find(key => meta.texts[key] === `${name}.md`);
    assert.equal(content(files, `prompts/${name}.md`), texts[key]);
  }
}

test('model-facing exports contain only complete behavior; provenance stays in sidecars', async () => {
  const recipe = await loadRecipe(repo), files = await compile(repo);
  assertBehaviorExports(files, recipe);
  for (const [file, bytes] of files)
    if (file.endsWith('.md')) assertCleanContext(bytes.toString());
  for (const target of TARGETS) assert.match(content(files, `dist/${target}/build-manifest.json`), /recipe\/manifest\.json/);
});

test('behavior sources are exported verbatim, including whitespace and literal user comments', async t => {
  const root = await fixture(t), {meta} = await loadRecipe(root), texts = {};
  for (const key of TEXT_KEYS) {
    texts[key] = ` \t\r\n# User-owned ${key}\r\n\r\nKeep this literal: <!-- Generated from my example. -->\r\n  tail\t \r\n\r\n`;
    await fs.writeFile(path.join(root, 'recipe', meta.texts[key]), texts[key]);
  }
  assert.deepEqual((await loadRecipe(root)).texts, texts);
  assertBehaviorExports(await compile(root), {meta, texts});
});

test('generated hook callbacks keep author metadata out of model context', async t => {
  const root = await fixture(t), {texts} = await loadRecipe(root);
  await run([], root);
  const wrapped = (key, tag = 'gpt-with-taste') => `<${tag}>\n${texts[key].trim()}\n</${tag}>`;

  const {handleHook} = await import('../hooks/steer.mjs');
  for (const [event, route, key] of [
    [{hook_event_name: 'UserPromptSubmit'}, 'user', 'userSteer'],
    [{hook_event_name: 'SubagentStart', agent_id: 'child'}, 'sub', 'subSteer'],
    [{hook_event_name: 'PostToolUse', tool_name: 'wait_agent',
      tool_response: {timed_out: false, status: {child: {completed: 'done'}}}}, 'agent', 'agentSteer'],
  ]) {
    const output = handleHook(event, path.join(root, 'prompts'));
    assert.equal(output.hookSpecificOutput.additionalContext, wrapped(key, `gpt-with-taste-${route}-steer`));
    assertCleanContext(output);
  }
});
