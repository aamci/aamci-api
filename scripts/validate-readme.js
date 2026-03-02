#!/usr/bin/env node
/**
 * validate-readme.js
 *
 * Vérifie que chaque module listé dans package.json est documenté
 * dans la section <!-- STACK:START --> ... <!-- STACK:END --> du README.md.
 *
 * Usage  : node scripts/validate-readme.js
 * Exit 1 : si un ou plusieurs modules sont absents du README.
 *
 * Pour exclure un module de la vérification (meta-packages, stubs TS, etc.),
 * ajoutez-le dans le Set SKIP ci-dessous.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT        = path.resolve(__dirname, '..');
const README_PATH = path.join(ROOT, 'README.md');
const PKG_PATH    = path.join(ROOT, 'package.json');

// ─── Packages ignorés (stubs TypeScript, implicites NestJS, etc.) ─────────────
const SKIP = new Set([
  // Dépendances implicites de NestJS — non à documenter
  'reflect-metadata',
  'rxjs',
  // Stubs TypeScript — implicites par le package qu'ils typent
  '@types/node',
  '@types/react',
  '@types/react-dom',
  '@types/jest',
  '@types/express',
  '@types/nodemailer',
  '@types/cookie-parser',
  '@types/passport-facebook',
  '@types/passport-google-oauth20',
  '@types/stripe',
]);

// ─── Lecture des fichiers ──────────────────────────────────────────────────────
if (!fs.existsSync(README_PATH)) {
  console.error('❌  README.md introuvable dans', ROOT);
  process.exit(1);
}
if (!fs.existsSync(PKG_PATH)) {
  console.error('❌  package.json introuvable dans', ROOT);
  process.exit(1);
}

const readme = fs.readFileSync(README_PATH, 'utf8');
const pkg    = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'));

// ─── Extraction de la section STACK ──────────────────────────────────────────
const stackMatch = readme.match(/<!--\s*STACK:START\s*-->([\s\S]*?)<!--\s*STACK:END\s*-->/);
if (!stackMatch) {
  console.error('❌  Section <!-- STACK:START --> ... <!-- STACK:END --> introuvable dans README.md');
  console.error('   Ajoutez cette balise pour délimiter la table Stack technique.');
  process.exit(1);
}

// ─── Parsing de la table Markdown ────────────────────────────────────────────
const tableLines = stackMatch[1]
  .split('\n')
  .filter(l =>
    l.includes('|') &&
    !l.match(/^\s*\|\s*[-:]+\s*\|/) &&   // séparateur
    !l.match(/^\s*\|\s*Module\s*\|/i)     // en-tête
  );

const documentedModules = new Set(
  tableLines
    .map(line => line.split('|').map(c => c.trim()).filter(Boolean)[0] ?? '')
    .filter(Boolean)
);

// ─── Collecte de tous les packages du projet ──────────────────────────────────
const allPackages = {
  ...pkg.dependencies,
  ...pkg.devDependencies,
};

// ─── Comparaison ──────────────────────────────────────────────────────────────
const missing = [];
for (const [name, version] of Object.entries(allPackages)) {
  if (SKIP.has(name)) continue;
  if (!documentedModules.has(name)) {
    missing.push({ name, version });
  }
}

// ─── Résultat ─────────────────────────────────────────────────────────────────
const total   = Object.keys(allPackages).filter(k => !SKIP.has(k)).length;
const checked = documentedModules.size;

if (missing.length > 0) {
  console.error(`\n❌  ${missing.length} module(s) absent(s) de la section STACK du README.md :\n`);
  for (const { name, version } of missing) {
    const v = version.replace(/^[\^~]/, '');
    console.error(`   | ${name.padEnd(45)} | ${v.padEnd(10)} | Production | <description> |`);
  }
  console.error(`
📝  Ajoutez ces lignes dans la table <!-- STACK:START --> du README.md.
    Si un module ne mérite pas d'être documenté, ajoutez-le dans SKIP
    dans scripts/validate-readme.js.\n`);
  process.exit(1);
}

console.log(`✅  README.md synchronisé — ${checked}/${total} modules documentés.`);
