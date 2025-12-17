#!/usr/bin/env node
/**
 * Cross-platform build script for mayara-signalk-wasm
 *
 * Usage: node build.js [--test] [--no-pack] [--local-gui]
 *   --test       Run cargo tests before building
 *   --no-pack    Skip creating npm package (default: creates package)
 *   --local-gui  Use local mayara-gui instead of npm (for development)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const runTests = args.includes('--test');
const skipPack = args.includes('--no-pack');
const useLocalGui = args.includes('--local-gui');

const WASM_TARGET = 'wasm32-wasip1';
const CRATE_NAME = 'mayara_signalk_wasm';

// Paths (relative to this script's directory)
const scriptDir = __dirname;
const publicDest = path.join(scriptDir, 'public');

function run(cmd, options = {}) {
  console.log(`> ${cmd}`);
  try {
    execSync(cmd, { stdio: 'inherit', cwd: options.cwd || scriptDir, ...options });
  } catch (e) {
    console.error(`Command failed: ${cmd}`);
    process.exit(1);
  }
}

/**
 * Recursively copy directory contents
 */
function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.error(`Source directory not found: ${src}`);
    process.exit(1);
  }

  // Remove destination if it exists
  if (fs.existsSync(dest)) {
    fs.rmSync(dest, { recursive: true });
  }

  // Create destination directory
  fs.mkdirSync(dest, { recursive: true });

  // Copy all files and subdirectories
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Download GUI from npm and copy to public/
 */
function setupGuiFromNpm() {
  console.log('Downloading GUI from npm...\n');

  // Install GUI package
  run('npm install @marineyachtradar/mayara-gui@latest');

  // Copy files from package root (no dist/ folder)
  const guiSource = path.join(scriptDir, 'node_modules', '@marineyachtradar', 'mayara-gui');

  // Remove old public dir
  if (fs.existsSync(publicDest)) {
    fs.rmSync(publicDest, { recursive: true });
  }
  fs.mkdirSync(publicDest, { recursive: true });

  // Copy GUI files (exclude package.json, node_modules, etc.)
  const guiPatterns = [
    { ext: '.html' },
    { ext: '.js' },
    { ext: '.css' },
    { ext: '.ico' },
    { ext: '.svg' },
    { dir: 'assets' },
    { dir: 'proto' },
    { dir: 'protobuf' }
  ];

  const entries = fs.readdirSync(guiSource, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(guiSource, entry.name);
    const destPath = path.join(publicDest, entry.name);

    if (entry.isDirectory()) {
      // Copy known directories
      if (guiPatterns.some(p => p.dir === entry.name)) {
        copyDir(srcPath, destPath);
      }
    } else {
      // Copy files matching extensions
      if (guiPatterns.some(p => p.ext && entry.name.endsWith(p.ext))) {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  const fileCount = fs.readdirSync(publicDest, { recursive: true }).length;
  console.log(`Copied ${fileCount} GUI files to public/\n`);
}

/**
 * Copy GUI from local sibling directory (for development)
 */
function setupGuiFromLocal() {
  const localGuiPath = path.join(scriptDir, '..', 'mayara-gui');
  console.log(`Copying GUI from local ${localGuiPath}...\n`);
  copyDir(localGuiPath, publicDest);
  const fileCount = fs.readdirSync(publicDest, { recursive: true }).length;
  console.log(`Copied ${fileCount} files from local mayara-gui/ to public/\n`);
}

function main() {
  console.log('=== Mayara SignalK WASM Build ===\n');

  // Step 1: Run tests (optional)
  if (runTests) {
    console.log('Step 1: Running tests...\n');
    run('cargo test -p mayara-core');
    console.log('\n');
  }

  // Step 2: Get GUI assets
  console.log('Step 2: Setting up GUI assets...\n');
  if (useLocalGui) {
    setupGuiFromLocal();
  } else {
    setupGuiFromNpm();
  }

  // Step 3: Build WASM
  console.log('Step 3: Building WASM...\n');
  run(`cargo build --target ${WASM_TARGET} --release -p mayara-signalk-wasm`);
  console.log('\n');

  // Step 4: Copy WASM file
  console.log('Step 4: Copying WASM file...\n');
  const wasmSource = path.join(scriptDir, 'target', WASM_TARGET, 'release', `${CRATE_NAME}.wasm`);
  const wasmDest = path.join(scriptDir, 'plugin.wasm');

  if (!fs.existsSync(wasmSource)) {
    console.error(`WASM file not found: ${wasmSource}`);
    process.exit(1);
  }
  fs.copyFileSync(wasmSource, wasmDest);
  const size = fs.statSync(wasmDest).size;
  console.log(`Copied plugin.wasm (${(size / 1024).toFixed(1)} KB)\n`);

  // Step 5: Pack (unless --no-pack)
  if (!skipPack) {
    console.log('Step 5: Creating npm package...\n');
    run('npm pack', { cwd: scriptDir });
    console.log('\n');
  }

  console.log('=== Build complete ===');
}

main();
