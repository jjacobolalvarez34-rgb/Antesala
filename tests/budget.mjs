#!/usr/bin/env node
/**
 * pnpm budget: JS inicial (gzip) de cada página prerenderizada contra el
 * presupuesto de ARQUITECTURA.md §8. Correr después de pnpm build.
 * Ignora los scripts noModule (polyfills que los navegadores modernos no bajan).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const LIMIT_KB = 180;
const APP = path.join('.next', 'server', 'app');

function htmlFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) return htmlFiles(p);
    return p.endsWith('.html') ? [p] : [];
  });
}

const cache = new Map();
const gz = (src) => {
  if (!cache.has(src)) cache.set(src, gzipSync(readFileSync(path.join('.next', src.replace(/^\/_next\//, '')))).length);
  return cache.get(src);
};

let worst = { page: '', kb: 0 };
for (const file of htmlFiles(APP)) {
  const html = readFileSync(file, 'utf8');
  const srcs = new Set(
    [...html.matchAll(/<script\b([^>]*)>/g)]
      .map((m) => m[1])
      .filter((attrs) => !/\bnoModule\b/i.test(attrs))
      .map((attrs) => attrs.match(/src="(\/_next\/static\/[^"]+\.js)"/)?.[1])
      .filter(Boolean),
  );
  const kb = [...srcs].reduce((s, src) => s + gz(src), 0) / 1024;
  if (kb > worst.kb) worst = { page: path.relative(APP, file), kb };
}
const ok = worst.kb <= LIMIT_KB;
console.log(`JS inicial máximo: ${worst.kb.toFixed(1)} KB gzip (${worst.page}) · límite ${LIMIT_KB} KB · ${ok ? 'OK' : 'EXCEDIDO'}`);
process.exit(ok ? 0 : 1);
