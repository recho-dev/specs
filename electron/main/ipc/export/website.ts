import type { ExportMeta } from '@/types'

export function toSlug(name: string): string {
  return (
    name
      .replace(/\.js$/, '')
      .replace(/([A-Z])/g, (m) => '-' + m.toLowerCase())
      .replace(/[\s_]+/g, '-')
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '') || 'example'
  )
}

export function buildDocsFiles(
  meta: ExportMeta,
  examples: { name: string; code: string }[],
  namespace: string,
): { path: string; content: string }[] {
  if (examples.length === 0) return []

  const files: { path: string; content: string }[] = []

  const configParts = [
    'export default {',
    `  name: ${JSON.stringify(meta.name)},`,
    `  namespace: ${JSON.stringify(namespace)},`,
  ]
  if (meta.displayName) configParts.push(`  displayName: ${JSON.stringify(meta.displayName)},`)
  if (meta.version) configParts.push(`  version: ${JSON.stringify(meta.version)},`)
  if (meta.description) configParts.push(`  description: ${JSON.stringify(meta.description)},`)
  if (meta.github) configParts.push(`  github: ${JSON.stringify(meta.github)},`)
  configParts.push('}', '')
  files.push({ path: 'docs/config.js', content: configParts.join('\n') })

  for (const ex of examples) {
    files.push({ path: `docs/examples/${toSlug(ex.name)}.js`, content: ex.code })
  }

  files.push({ path: 'docs/runtime.js', content: RUNTIME_JS })
  files.push({ path: 'docs/build.js', content: buildScript() })

  return files
}

// ── Browser runtime ───────────────────────────────────────────────────────────

const RUNTIME_JS = `(function () {
  'use strict';

  var editorPane = document.getElementById('editor-pane');
  var ta = document.createElement('textarea');
  editorPane.appendChild(ta);

  var editor = CodeMirror.fromTextArea(ta, {
    mode: 'javascript',
    lineNumbers: false,
    tabSize: 2,
    indentWithTabs: false,
  });
  editor.setValue(CODE);
  setTimeout(function () { editor.refresh(); }, 0);

  var libCache = null;

  function getLib(cb) {
    if (libCache !== null) { cb(libCache); return; }
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '../lib.js');
    xhr.onload = function () { libCache = xhr.responseText; cb(libCache); };
    xhr.onerror = function () { libCache = ''; cb(''); };
    xhr.send();
  }

  function safeJs(s) {
    return s.replace(/<\\/script/gi, '<\\\\/script');
  }

  function transform(code) {
    var ns = 'window.' + NAMESPACE;
    var lines = code.split('\\n');
    var out = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var t = line.trim();
      if (t.slice(0, 7) !== 'import ') { out.push(line); continue; }
      var starAt = t.indexOf('* as ');
      if (starAt !== -1) {
        var rest = t.slice(starAt + 5);
        var w = rest.search(/\\W/);
        out.push('var ' + (w === -1 ? rest : rest.slice(0, w)) + ' = ' + ns + ';');
        continue;
      }
      var lb = t.indexOf('{'), rb = t.indexOf('}');
      if (lb !== -1 && rb !== -1) {
        out.push('var {' + t.slice(lb + 1, rb) + '} = ' + ns + ';');
        continue;
      }
      var toks = t.split(/\\s+/);
      if (toks.length >= 2 && /^\\w+$/.test(toks[1]) && toks[1] !== 'from') {
        out.push('var ' + toks[1] + ' = ' + ns + ';');
        continue;
      }
    }
    return out.join('\\n');
  }

  var runTimer = null;

  function run() {
    getLib(function (lib) {
      var code = transform(editor.getValue());
      var libPart = lib ? '<script>' + safeJs(lib) + '<\\/script>' : '';
      var codePart = '<script>(function(){' + safeJs(code) + '})()</script>';
      var src = '<!doctype html><html><body style="margin:16px"><div id="container"></div>'
        + libPart + codePart + '</body></html>';
      document.getElementById('preview').srcdoc = src;
    });
  }

  run();
  editor.on('change', function () {
    clearTimeout(runTimer);
    runTimer = setTimeout(run, 400);
  });

  var divider = document.getElementById('divider');
  var previewPane = document.getElementById('preview-pane');
  var dragging = false, dragX = 0, dragW = 0;

  divider.addEventListener('mousedown', function (e) {
    dragging = true;
    dragX = e.clientX;
    dragW = editorPane.getBoundingClientRect().width;
    divider.classList.add('active');
    previewPane.style.pointerEvents = 'none';
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });

  document.addEventListener('mousemove', function (e) {
    if (!dragging) return;
    var totalW = editorPane.parentElement.getBoundingClientRect().width - 4;
    var newW = Math.max(160, Math.min(totalW - 160, dragW + (e.clientX - dragX)));
    editorPane.style.flex = 'none';
    editorPane.style.width = newW + 'px';
    previewPane.style.flex = '1';
    previewPane.style.width = '';
    editor.refresh();
  });

  document.addEventListener('mouseup', function () {
    if (!dragging) return;
    dragging = false;
    divider.classList.remove('active');
    previewPane.style.pointerEvents = '';
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  });
})();
`

// ── docs/build.js ─────────────────────────────────────────────────────────────

function buildScript(): string {
  return `import { readFileSync, writeFileSync, copyFileSync, mkdirSync, existsSync, readdirSync } from 'fs'
import { join, basename } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const { default: config } = await import('./config.js')

function toSlug(name) {
  return name.replace(/\\.js$/, '')
    .replace(/([A-Z])/g, m => '-' + m.toLowerCase())
    .replace(/[\\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/, '') || 'example'
}

function toTitle(slug) {
  return slug.replace(/-/g, ' ').replace(/\\b\\w/g, c => c.toUpperCase())
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function safeJson(v) {
  return JSON.stringify(v).replace(/<\\//g, '<\\\\/')
}

const exDir = join(__dirname, 'examples')
const examples = readdirSync(exDir)
  .filter(f => f.endsWith('.js'))
  .sort()
  .map(file => {
    const slug = toSlug(basename(file))
    const code = readFileSync(join(exDir, file), 'utf-8')
    const snapPath = join(__dirname, '..', 'test', 'output', slug + '.html')
    const snapshot = existsSync(snapPath) ? readFileSync(snapPath, 'utf-8') : null
    const thumbPath = join(__dirname, 'static', slug + '.png')
    const hasThumbnail = existsSync(thumbPath)
    return { slug, title: toTitle(slug), code, snapshot, hasThumbnail }
  })

const distDir = join(__dirname, 'dist')
mkdirSync(join(distDir, 'examples'), { recursive: true })

const staticSrc = join(__dirname, 'static')
if (existsSync(staticSrc)) {
  mkdirSync(join(distDir, 'static'), { recursive: true })
  for (const f of readdirSync(staticSrc)) {
    copyFileSync(join(staticSrc, f), join(distDir, 'static', f))
  }
}

copyFileSync(join(__dirname, 'runtime.js'), join(distDir, 'runtime.js'))

const umdSrc = join(__dirname, '..', 'dist', config.name + '.umd.min.js')
if (existsSync(umdSrc)) {
  copyFileSync(umdSrc, join(distDir, 'lib.js'))
} else {
  writeFileSync(join(distDir, 'lib.js'), '/* Run npm run build first. */')
}

writeFileSync(join(distDir, 'index.html'), indexHtml(config, examples))
for (const ex of examples) {
  writeFileSync(join(distDir, 'examples', ex.slug + '.html'), exampleHtml(config, examples, ex))
}
console.log('Built ' + examples.length + ' example(s) -> docs/dist/')

// ── HTML generators ───────────────────────────────────────────────────────────

function indexHtml(config, examples) {
  const name = config.name || 'Library'
  const displayName = config.displayName || name
  const version = config.version || ''
  const desc = config.description || ''
  const github = config.github || ''

  const headerRight = [
    version ? '<span class="ver">' + esc(version) + '</span>' : '',
    github
      ? '<a class="gh" href="' + esc(github) + '" target="_blank" rel="noreferrer">GitHub ★</a>'
      : '',
  ].filter(Boolean).join('')

  const cards = examples.map(ex => {
    const preview = ex.hasThumbnail
      ? '<div class="cp"><img src="./static/' + ex.slug + '.png" alt="' + esc(ex.title) + '"></div>'
      : ex.snapshot
        ? '<div class="cp"><iframe srcdoc="' + esc('<!doctype html><html><body style="margin:0;padding:8px">' + ex.snapshot + '</body></html>') + '" scrolling="no" tabindex="-1"></iframe></div>'
        : '<div class="cp empty"></div>'
    return '<a class="card" href="examples/' + ex.slug + '.html">' + preview + '<div class="cn">' + esc(ex.title) + '</div></a>'
  }).join('')

  const css = [
    '* { box-sizing: border-box; margin: 0; padding: 0 }',
    'html { background: #1e1f2c }',
    'body { font-family: system-ui,-apple-system,sans-serif }',
    'header { background: #d5d4df }',
    '.hi { max-width: 960px; margin: 0 auto; padding: 0 32px; display: flex; align-items: center; height: 52px; gap: 12px }',
    '.logo { font-size: 14px; font-weight: 600; color: #111; text-decoration: none }',
    '.logo:hover { text-decoration: underline }',
    '.hright { margin-left: auto; display: flex; align-items: center; gap: 16px }',
    '.ver { font-size: 13px; font-weight: 500; color: #444 }',
    '.gh { font-size: 13px; font-weight: 500; color: #444; text-decoration: none; white-space: nowrap }',
    '.gh:hover { text-decoration: underline }',
    '.hero { background: #d5d4df; padding: 80px 0 72px }',
    '.hi2 { max-width: 960px; margin: 0 auto; padding: 0 32px }',
    '.hero h1 { font-size: clamp(48px,6vw,80px); font-weight: 800; color: #1a1a1a; letter-spacing: -.03em; line-height: 1.05; margin-bottom: 2px }',
    '.gl { font-size: clamp(48px,6vw,80px); font-weight: 800; color: #8888a0; letter-spacing: -.03em; line-height: 1.05 }',
    '.body { background: #1e1f2c; padding: 52px 0 80px }',
    '.bi { max-width: 960px; margin: 0 auto; padding: 0 32px }',
    '.desc { font-size: 15px; color: #9a9aaa; line-height: 1.65; max-width: 560px; margin-bottom: 44px }',
    'hr { border: none; border-top: 1px solid #2e2f40; margin-bottom: 44px }',
    '.grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(200px,1fr)); gap: 28px 24px }',
    '.card { display: block; text-decoration: none; color: inherit }',
    '.cp { background: #fff; border-radius: 6px; overflow: hidden; aspect-ratio: 8/5; position: relative }',
    '.cp iframe { width: 200%; height: 200%; transform: scale(.5); transform-origin: top left; border: none; pointer-events: none }',
    '.cp img { width: 100%; height: 100%; object-fit: cover; display: block }',
    '.cp.empty { background: #282938 }',
    '.cn { margin-top: 10px; font-size: 13px; color: #aaa; line-height: 1.3 }',
    '.card:hover .cn { text-decoration: underline }',
  ].join(' ')

  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<title>' + esc(displayName) + '</title>',
    '<style>' + css + '</style>',
    '</head>',
    '<body>',
    '<header><div class="hi">',
    '<a class="logo" href="#">' + esc(name) + '</a>',
    headerRight ? '<div class="hright">' + headerRight + '</div>' : '',
    '</div></header>',
    '<div class="hero"><div class="hi2">',
    '<h1>' + esc(displayName) + '</h1>',
    '<div class="gl">Gallery</div>',
    '</div></div>',
    '<div class="body"><div class="bi">',
    desc ? '<p class="desc">' + esc(desc) + '</p>' : '',
    '<hr>',
    '<div class="grid">' + cards + '</div>',
    '</div></div>',
    '</body>',
    '</html>',
  ].join('\\n')
}

function exampleHtml(config, examples, current) {
  const name = config.name || 'Library'
  const displayName = config.displayName || name
  const version = config.version || ''
  const github = config.github || ''

  const headerRight = [
    version ? '<span class="ver">' + esc(version) + '</span>' : '',
    github ? '<a class="gh" href="' + esc(github) + '" target="_blank" rel="noreferrer">GitHub ★</a>' : '',
  ].filter(Boolean).join('')

  const thumbs = examples.map(ex => {
    const active = ex.slug === current.slug ? ' active' : ''
    const preview = ex.hasThumbnail
      ? '<div class="thumb-preview"><img src="../static/' + ex.slug + '.png" alt="' + esc(ex.title) + '"></div>'
      : ex.snapshot
        ? '<div class="thumb-preview"><iframe srcdoc="' + esc('<!doctype html><html><body style="margin:0;padding:6px">' + ex.snapshot + '</body></html>') + '" scrolling="no" tabindex="-1"></iframe></div>'
        : '<div class="thumb-preview empty"></div>'
    return '<a class="thumb-card' + active + '" href="' + ex.slug + '.html">' + preview + '<div class="thumb-label">' + esc(ex.title) + '</div></a>'
  }).join('')

  const css = [
    '* { box-sizing: border-box; margin: 0; padding: 0 }',
    'html, body { height: 100%; overflow: hidden }',
    'body { font-family: system-ui,-apple-system,sans-serif; display: flex; flex-direction: column; font-size: 13px }',
    'header { background: #1a1a1a; flex-shrink: 0; display: flex; align-items: center; height: 48px; padding: 0 20px; gap: 12px }',
    '.logo { font-size: 14px; font-weight: 600; color: #fff; text-decoration: none }',
    '.logo:hover { text-decoration: underline }',
    '.hright { margin-left: auto; display: flex; align-items: center; gap: 16px }',
    '.ver { font-size: 13px; color: #fff }',
    '.gh { font-size: 13px; color: #fff; text-decoration: none; white-space: nowrap }',
    '.gh:hover { text-decoration: underline }',
    '.workspace { flex: 1; display: flex; overflow: hidden }',
    'nav { width: 200px; flex-shrink: 0; border-right: 1px solid #e8e8e8; display: flex; flex-direction: column; overflow: hidden }',
    '.thumb-list { padding: 12px 10px; display: flex; flex-direction: column; gap: 8px; overflow-y: auto; flex: 1 }',
    '.thumb-card { display: block; text-decoration: none; color: inherit; border: 1px solid transparent; border-radius: 6px; overflow: hidden; transition: border-color .15s }',
    '.thumb-card:hover { border-color: #e0e0e0 }',
    '.thumb-card:hover .thumb-label { text-decoration: underline }',
    '.thumb-card.active { border-color: #b8b0f0 }',
    '.thumb-preview { height: 100px; overflow: hidden; position: relative }',
    '.thumb-preview iframe { width: 200%; height: 200%; transform: scale(.5); transform-origin: top left; border: none; pointer-events: none }',
    '.thumb-preview img { width: 100%; height: 100%; object-fit: cover; display: block }',
    '.thumb-preview.empty { background: #f0f0f0 }',
    '.thumb-label { padding: 5px 8px; font-size: 11px; font-weight: 500; color: #555; white-space: nowrap; overflow: hidden; text-overflow: ellipsis }',
    'main { flex: 1; display: flex; min-width: 0 }',
    '.pane { flex: 1; min-width: 0; overflow: hidden; display: flex; flex-direction: column }',
    '#divider { width: 4px; background: #e8e8e8; cursor: col-resize; flex-shrink: 0; transition: background .15s }',
    '#divider:hover, #divider.active { background: #c5bef5 }',
    '.CodeMirror { height: 100% !important; font-size: 13px; line-height: 1.6; font-family: monospace }',
    '.CodeMirror-scroll { padding: 12px 16px !important }',
    '#preview { flex: 1; border: none; background: #fff }',
  ].join(' ')

  const dataScript = '<script>var CODE=' + safeJson(current.code) + ';var NAMESPACE=' + safeJson(config.namespace || '') + ';var NAME=' + safeJson(displayName) + ';<\\/script>'

  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<title>' + esc(current.title) + ' — ' + esc(displayName) + '</title>',
    '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.css">',
    '<style>' + css + '</style>',
    '</head>',
    '<body>',
    '<header>',
    '<a class="logo" href="../index.html">' + esc(name) + '</a>',
    headerRight ? '<div class="hright">' + headerRight + '</div>' : '',
    '</header>',
    '<div class="workspace">',
    '<nav><div class="thumb-list">' + thumbs + '</div></nav>',
    '<main>',
    '<div class="pane" id="editor-pane"></div>',
    '<div id="divider"></div>',
    '<div class="pane" id="preview-pane"><iframe id="preview"></iframe></div>',
    '</main>',
    '</div>',
    dataScript,
    '<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.js"><\\/script>',
    '<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/javascript/javascript.min.js"><\\/script>',
    '<script src="../runtime.js"><\\/script>',
    '</body>',
    '</html>',
  ].join('\\n')
}
`
}
