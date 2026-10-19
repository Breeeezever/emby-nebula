// 3.7.2 标准版 → Assets 分文件版构建脚本（对标 D:/DownLoad/EmbyNebula）
// 用法：node tools/build.mjs
// 输入：D:/Obsidian Library/Markdown/Attachments/CF Worker Emby V3 7 2.js（单文件压缩版，3.7.2 标准版）
// 输出：public/login.html、public/app.html、worker.js（Assets 版后端，UI 改经 [assets] 鉴权发放）
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { parse } = require('C:/Users/W1909/AppData/Roaming/npm/node_modules/terser/node_modules/acorn');

const SRC = 'D:/Obsidian Library/Markdown/Attachments/CF Worker Emby V3 7 4.js';
const OUT = 'D:/DownLoad/EmbyNebula';
const src = fs.readFileSync(SRC, 'utf8');

const ast = parse(src, { ecmaVersion: 'latest', sourceType: 'module' });
const decls = new Map(); // name -> declarator node
(function walk(n) {
  if (!n || typeof n !== 'object') return;
  if (n.type === 'VariableDeclarator' && n.id.type === 'Identifier') decls.set(n.id.name, n);
  for (const k in n) if (k !== 'type' && k !== 'start' && k !== 'end') {
    const v = n[k];
    if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') walk(v);
  }
})(ast);

const need = ['LOGIN_UI', 'HTML_UI'];
for (const name of need) if (!decls.has(name)) throw new Error('未找到声明: ' + name);

// 1. 渲染 UI：执行 export 之前的全部顶层声明（纯常量/函数定义），取出 LOGIN_UI/HTML_UI 字节级结果
const exportIdx = src.indexOf('export default{');
if (exportIdx === -1) throw new Error('export default 未找到');
const prelude = src.slice(0, exportIdx);
const scope = new Function(prelude + '\n;return { LOGIN_UI, HTML_UI };')();
const ui = { LOGIN_UI: scope.LOGIN_UI, HTML_UI: scope.HTML_UI };
for (const name of need) console.log(name, 'bytes:', Buffer.byteLength(ui[name]));

// 2. 找内联测速页字符串（含「下载测速」标题的 DOCTYPE 字面量）
let speedHtml = null;
(function walk2(n) {
  if (!n || typeof n !== 'object') return;
  if (n.type === 'Literal' && typeof n.value === 'string' && n.value.startsWith('<!DOCTYPE') && n.value.includes('下载测速')) speedHtml = n.value;
  for (const k in n) if (k !== 'type' && k !== 'start' && k !== 'end') {
    const v = n[k];
    if (Array.isArray(v)) v.forEach(walk2); else if (v && typeof v === 'object') walk2(v);
  }
})(ast);
if (!speedHtml) throw new Error('内联测速页未找到');
console.log('speedtest bytes:', Buffer.byteLength(speedHtml));

fs.mkdirSync(path.join(OUT, 'public'), { recursive: true });
fs.writeFileSync(path.join(OUT, 'public/login.html'), ui.LOGIN_UI, 'utf8');
fs.writeFileSync(path.join(OUT, 'public/app.html'), ui.HTML_UI, 'utf8');
fs.writeFileSync(path.join(OUT, 'public/speedtest.html'), speedHtml, 'utf8');

// 3. 组装 Assets 版 worker.js
let worker = src;
// 3a. 删除 LOGIN_UI / HTML_UI 声明（含尾部逗号），消除约 470KB 死重
const ranges = need.map(n => {
  const d = decls.get(n);
  const hasComma = src[d.end] === ',';
  return { start: d.start, end: hasComma ? d.end + 1 : d.end, preComma: !hasComma };
}).sort((a, b) => b.start - a.start);
for (const r of ranges) worker = worker.slice(0, r.start) + worker.slice(r.end);

// 3b. UI 响应改为静态资产发放
const nRep = {};
worker = worker
  .replaceAll('new Response(LOGIN_UI,{headers:{"Content-Type":"text/html;charset=UTF-8"}})', () => (nRep.login = (nRep.login || 0) + 1, 'serveUiAsset(env,"/login.html")'))
  .replaceAll('new Response(HTML_UI,{headers:{"Content-Type":"text/html;charset=UTF-8"}})', () => (nRep.panel = (nRep.panel || 0) + 1, 'serveUiAsset(env,"/app.html")'));
console.log('login 路由替换:', nRep.login, '| panel 路由替换:', nRep.panel);
if (!nRep.login || !nRep.panel) throw new Error('UI 路由替换不完整');
if (worker.includes('LOGIN_UI') || worker.includes('HTML_UI')) throw new Error('仍残留 UI 常量引用');

// 3c. 注入静态资产服务 helper（export default 之前）
const helper = `
// ==========================================
// 0. 静态 UI 资产服务（[assets] 绑定 + run_worker_first：页面请求经 Worker 鉴权后按需发放）
// ==========================================
async function serveUiAsset(env, assetPath) {
  if (!env.ASSETS) return new Response('未配置 [assets] 静态绑定：请使用 wrangler 部署（wrangler.toml 内 [assets] binding = "ASSETS"）', { status: 500 });
  try {
    const res = await env.ASSETS.fetch(new URL('https://assets.internal' + assetPath));
    if (res && res.status < 400) return res;
    return new Response('UI 资产缺失: ' + assetPath, { status: 404 });
  } catch (e) {
    return new Response('UI 资产读取失败: ' + e.message, { status: 500 });
  }
}
export default{`;
const idx = worker.indexOf('export default{');
if (idx === -1) throw new Error('export default 未找到');
worker = worker.slice(0, idx) + helper + worker.slice(idx + 'export default{'.length);

const header = '// VERSION: 3.7.2（标准版 / Assets 分文件版）\n// 由 tools/build.mjs 从单文件版 3.7.2 自动生成：UI（login/app/speedtest）抽至 public/，\n// 后端经 [assets] 绑定鉴权发放；功能与单文件版完全一致。勿直接手改本文件。\n';
worker = header + worker;
fs.writeFileSync(path.join(OUT, 'worker.js'), worker, 'utf8');
console.log('worker.js bytes:', Buffer.byteLength(worker));
console.log('done');
