import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));

test('every local asset referenced by index.html exists', () => {
  const html = readFileSync(path.join(root, 'index.html'), 'utf8');
  const references = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((reference) => !reference.startsWith('#') && !reference.includes('://'));

  assert.ok(references.length >= 4);
  for (const reference of references) {
    assert.equal(existsSync(path.join(root, reference)), true, `missing ${reference}`);
  }
});

test('every relative module imported by the vendored Three.js entry exists', () => {
  const entryPath = path.join(root, 'vendor', 'three.module.js');
  const source = readFileSync(entryPath, 'utf8');
  const imports = [...source.matchAll(/from ['"](\.\/.+?)['"]/g)].map((match) => match[1]);

  assert.ok(imports.includes('./three.core.js'));
  for (const reference of imports) {
    assert.equal(existsSync(path.resolve(path.dirname(entryPath), reference)), true, `missing ${reference}`);
  }
  assert.equal(existsSync(path.join(root, 'vendor', 'THREE-LICENSE.txt')), true);
});
