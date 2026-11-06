// Adapted from nb-codex-main/src/toml-overlay.mjs (MIT).
// Copyright (c) 2026 X-T-E-R. See ../LICENSE.
// This slice manages two top-level keys: the legacy single-line
// model_instructions_file and the developer_instructions string block.
function fail(message) { throw new Error(message); }
export const INSTRUCTIONS_KEY = 'model_instructions_file';
export const DEVELOPER_KEY = 'developer_instructions';
const BOM = String.fromCharCode(0xfeff);
function isEscaped(value, index) {
  let slashes = 0;
  for (let cursor = index - 1; cursor >= 0 && value[cursor] === '\\'; cursor -= 1) slashes += 1;
  return slashes % 2 === 1;
}
function lexLine(raw, activeMultiline) {
  if (activeMultiline) {
    const closeAt = raw.indexOf(activeMultiline);
    return { code: '', depthDelta: 0, multiline: closeAt >= 0 ? null : activeMultiline, wasMultiline: true };
  }
  let quote = null;
  let code = '';
  let depthDelta = 0;
  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];
    const triple = raw.slice(index, index + 3);
    if (!quote && (triple === '\"\"\"' || triple === "'''")) {
      const closeAt = raw.indexOf(triple, index + 3);
      if (closeAt < 0) return { code, depthDelta, multiline: triple, wasMultiline: false };
      code += raw.slice(index, closeAt + 3);
      index = closeAt + 2;
      continue;
    }
    if (!quote && char === '#') break;
    if (!quote && (char === '"' || char === "'")) quote = char;
    else if (quote === char && (quote === "'" || !isEscaped(raw, index))) quote = null;
    if (!quote) {
      if (char === '[' || char === '{') depthDelta += 1;
      if (char === ']' || char === '}') depthDelta -= 1;
    }
    code += char;
  }
  return { code, depthDelta, multiline: null, wasMultiline: false };
}
function findEquals(value) {
  let quote = null;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (!quote && (char === '"' || char === "'")) quote = char;
    else if (quote === char && (quote === "'" || !isEscaped(value, index))) quote = null;
    else if (!quote && char === '=') return index;
  }
  return -1;
}
function tokenRange(raw, equals) {
  let start = equals + 1;
  while (start < raw.length && /\s/.test(raw[start])) start += 1;
  const quote = raw[start];
  if (quote === '"' || quote === "'") {
    for (let index = start + 1; index < raw.length; index += 1) {
      if (raw[index] === quote && (quote === "'" || !isEscaped(raw, index))) return { start, end: index + 1 };
    }
    return { start, end: raw.length };
  }
  let end = start;
  while (end < raw.length && !/\s|#/.test(raw[end])) end += 1;
  return { start, end };
}
const keyPattern = key => new RegExp(`^(?:${key}|"${key}"|'${key}')$`);
function singleLineString(raw, equals, key) {
  const range = tokenRange(raw, equals);
  const token = raw.slice(range.start, range.end);
  const tail = raw.slice(range.end).trim();
  if (!['"', "'"].includes(token[0]) || token.length < 2 || token.at(-1) !== token[0] || (tail && !tail.startsWith('#'))) {
    fail(`${key} must be a single-line string`);
  }
  return range;
}
// Find the root assignment of `key`. Its lines run from `index` through `last`,
// the line that closes a multiline string value. `start`/`end` are the columns
// of a single-line string token.
export function scanToml(text, key = INSTRUCTIONS_KEY) {
  if (text.includes('\0')) fail('config.toml contains a NUL byte');
  const newline = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.match(/[^\n]*\n|[^\n]+$/g) ?? [];
  const hasBom = Boolean(lines.length && lines[0].startsWith(BOM));
  if (hasBom) lines[0] = lines[0].slice(1);
  const multilineAllowed = key === DEVELOPER_KEY;
  const assignments = [];
  let open = null;
  let atRoot = true;
  let multiline = null;
  let continuationDepth = 0;
  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index].replace(/\r?\n$/, '');
    const lexical = lexLine(raw, multiline);
    multiline = lexical.multiline;
    if (lexical.wasMultiline) {
      if (open && !multiline) { open.last = index; open = null; }
      continue;
    }
    const code = lexical.code.trim();
    if (!code) continue;
    if (continuationDepth > 0) {
      continuationDepth += lexical.depthDelta;
      if (continuationDepth < 0) fail(`unbalanced TOML delimiter at line ${index + 1}`);
      continue;
    }
    if (code.startsWith('[')) {
      atRoot = false;
      continue;
    }
    const equals = findEquals(lexical.code);
    if (equals < 0) fail(`unsupported TOML statement at line ${index + 1}`);
    const keyText = lexical.code.slice(0, equals).trim();
    if (atRoot && keyPattern(key).test(keyText)) {
      const value = lexical.code.slice(equals + 1).trim();
      const isMultiline = Boolean(lexical.multiline) || value.startsWith('"""') || value.startsWith("'''");
      if (!multilineAllowed && isMultiline) fail(`${key} must be a single-line string`);
      const assignment = { index, last: index, raw };
      if (isMultiline) {
        if (lexical.multiline) open = assignment;
        else if (raw.slice(raw.indexOf(value) + value.length).trim().replace(/^#.*/, '')) fail(`${key} must be a string`);
      } else Object.assign(assignment, singleLineString(raw, equals, key));
      assignments.push(assignment);
    } else if (atRoot && keyText.includes(key)) {
      fail(`ambiguous ${key} key`);
    }
    continuationDepth = Math.max(0, lexical.depthDelta);
  }
  if (multiline || continuationDepth !== 0) fail('unterminated TOML string, array or inline table');
  if (assignments.length > 1) fail(`duplicate ${key} key`);
  return { lines, newline, hasBom, assignment: assignments[0] ?? null };
}
const render = doc => (doc.hasBom ? BOM : '') + doc.lines.join('');
// The exact text of a managed assignment, including any multiline body.
export function keyBlock(text, key = INSTRUCTIONS_KEY) {
  const doc = scanToml(text, key);
  return doc.assignment ? doc.lines.slice(doc.assignment.index, doc.assignment.last + 1).join('') : null;
}
export const keyLine = text => keyBlock(text, INSTRUCTIONS_KEY);
export function sameInstructionLine(line, recorded) {
  // A line separator belongs to the surrounding document, not the managed key.
  return line === recorded || (typeof line === 'string' && typeof recorded === 'string' &&
    line.replace(/\r?\n$/, '') === recorded.replace(/\r?\n$/, ''));
}
// Replace, insert, or remove (block === null) one managed root assignment.
export function replaceBlock(text, key, block) {
  const doc = scanToml(text, key);
  const a = doc.assignment;
  if (!a) {
    if (block === null) return text;
    const body = block.replace(/\r?\n$/, '');
    doc.lines.unshift(body + doc.newline);
    return render(doc);
  }
  const count = a.last - a.index + 1;
  if (block === null) {
    doc.lines.splice(a.index, count);
    return render(doc);
  }
  // Preserve an original EOF assignment exactly unless later content needs a separator.
  const ending = doc.lines[a.last].match(/\r?\n$/)?.[0] ?? '';
  const later = a.last < doc.lines.length - 1;
  const separator = later && !/\n$/.test(block) ? ending || doc.newline : '';
  doc.lines.splice(a.index, count, block + separator);
  return render(doc);
}
export function setInstructions(text, absolutePath) {
  const doc = scanToml(text, INSTRUCTIONS_KEY);
  const value = JSON.stringify(absolutePath.replaceAll('\\', '/'));
  if (!doc.assignment) return replaceBlock(text, INSTRUCTIONS_KEY, `${INSTRUCTIONS_KEY} = ${value}`);
  const a = doc.assignment;
  const ending = doc.lines[a.index].slice(a.raw.length);
  doc.lines[a.index] = `${a.raw.slice(0, a.start)}${value}${a.raw.slice(a.end)}${ending}`;
  return render(doc);
}
export function restoreInstructions(text, oldLine) {
  if (!scanToml(text, INSTRUCTIONS_KEY).assignment) fail('managed config key is missing; restore refused');
  return replaceBlock(text, INSTRUCTIONS_KEY, oldLine);
}
// A TOML literal multiline string keeps the instruction text byte-for-byte.
export function developerBlock(instructions, newline = '\n') {
  if (instructions.includes("'''")) fail("developer instructions cannot contain ''' in a TOML literal string");
  const body = instructions.replace(/\r\n/g, '\n').replace(/\n*$/, '\n').replace(/\n/g, newline);
  return `${DEVELOPER_KEY} = '''${newline}${body}'''${newline}`;
}
export const newlineOf = text => (text.includes('\r\n') ? '\r\n' : '\n');
