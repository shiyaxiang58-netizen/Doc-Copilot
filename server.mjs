import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const require = createRequire(import.meta.url);
const contexts = new Map();
const MAX_BODY_BYTES = 18 * 1024 * 1024;

await loadEnv();

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '127.0.0.1';
const AI_BASE_URL = (process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
const AI_API_KEY = process.env.AI_API_KEY || '';
const AI_MODEL = process.env.AI_MODEL || '';
const MAX_SOURCE_CHARS = Number(process.env.MAX_SOURCE_CHARS || 60000);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon'
};

async function loadEnv() {
  try {
    const raw = await readFile(join(ROOT, '.env'), 'utf8');
    raw.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const index = trimmed.indexOf('=');
      if (index < 1) return;
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim().replace(/^(['"])(.*)\1$/, '$2');
      if (!(key in process.env)) process.env[key] = value;
    });
  } catch (_) { /* .env is optional. */ }
}

function json(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
  });
  res.end(JSON.stringify(payload));
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new HttpError(413, '资料过大，请减少文件数量或大小。');
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch (_) { throw new HttpError(400, '请求内容不是有效的 JSON。'); }
}

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function cleanText(value = '') {
  return String(value).replace(/\u0000/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

function stripHtml(html) {
  return cleanText(html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<\/(p|div|article|section|h[1-6]|li|tr)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code))));
}

async function extractPdf(base64) {
  try {
    if (!globalThis.DOMMatrix) {
      globalThis.DOMMatrix = class DOMMatrix {
        constructor() { this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0; }
      };
    }
    const modulePath = require.resolve('pdfjs-dist/legacy/build/pdf.mjs');
    const { getDocument } = await import(pathToFileURL(modulePath).href);
    const bytes = new Uint8Array(Buffer.from(base64, 'base64'));
    const pdf = await getDocument({ data: bytes, useSystemFonts: true }).promise;
    const pages = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(`[第 ${pageNumber} 页]\n${content.items.map((item) => item.str).join(' ')}`);
    }
    return { text: cleanText(pages.join('\n\n')), meta: `${pdf.numPages} 页` };
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') throw new HttpError(500, '缺少 PDF 解析依赖，请先运行 npm install。');
    throw new HttpError(422, `无法读取这个 PDF：${error.message}`);
  }
}

function isPrivateAddress(address) {
  const normalized = address.replace(/^::ffff:/, '');
  if (normalized === '::1' || normalized === '0.0.0.0' || normalized === '127.0.0.1') return true;
  if (normalized.startsWith('10.') || normalized.startsWith('192.168.') || normalized.startsWith('169.254.')) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(normalized)) return true;
  if (normalized.includes(':') && (/^(fc|fd|fe8|fe9|fea|feb)/i.test(normalized.replace(/:/g, '')))) return true;
  return false;
}

async function assertPublicUrl(parsed) {
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new HttpError(400, '只支持 HTTP 或 HTTPS 网页。');
  if (parsed.username || parsed.password) throw new HttpError(400, '网页地址不能包含账号信息。');
  const host = parsed.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.local')) throw new HttpError(400, '不能读取本机或内网地址。');
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => []);
  if (!addresses.length) throw new HttpError(422, '无法解析这个网页地址。');
  if (addresses.some(({ address }) => isPrivateAddress(address))) throw new HttpError(400, '不能读取本机或内网地址。');
}

async function extractWeb(url) {
  let parsed;
  try { parsed = new URL(url); } catch (_) { throw new HttpError(400, '网页地址无效。'); }
  await assertPublicUrl(parsed);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    let response;
    for (let redirects = 0; redirects <= 4; redirects += 1) {
      response = await fetch(parsed, { signal: controller.signal, headers: { 'User-Agent': 'DocCopilot/1.0' }, redirect: 'manual' });
      if (![301, 302, 303, 307, 308].includes(response.status)) break;
      const location = response.headers.get('location');
      if (!location) throw new HttpError(422, '网页跳转地址无效。');
      parsed = new URL(location, parsed);
      await assertPublicUrl(parsed);
      if (redirects === 4) throw new HttpError(422, '网页跳转次数过多。');
    }
    if (!response.ok) throw new HttpError(422, `网页读取失败（${response.status}）。`);
    const type = response.headers.get('content-type') || '';
    if (!type.includes('text/html') && !type.includes('text/plain')) throw new HttpError(422, '这个链接不是可读取的网页文字。');
    const html = await response.text();
    return cleanText(type.includes('html') ? stripHtml(html) : html);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(422, error.name === 'AbortError' ? '网页读取超时。' : `网页读取失败：${error.message}`);
  } finally { clearTimeout(timer); }
}

async function prepareSources(sources) {
  if (!Array.isArray(sources) || !sources.length) throw new HttpError(400, '请至少添加一份资料。');
  const prepared = [];
  for (let index = 0; index < sources.length; index += 1) {
    const source = sources[index];
    let text = '';
    let meta = source.meta || '';
    if (source.type === 'pdf') {
      if (!source.dataBase64) throw new HttpError(400, `PDF“${source.name}”缺少文件内容。`);
      const extracted = await extractPdf(source.dataBase64);
      text = extracted.text; meta = extracted.meta;
    } else if (source.type === 'web') {
      text = await extractWeb(source.url || source.meta);
    } else {
      text = cleanText(source.text || '');
    }
    if (text.length < 20) throw new HttpError(422, `资料“${source.name || index + 1}”没有足够的可分析文字。`);
    prepared.push({ index, type: source.type, name: source.name || `资料 ${index + 1}`, meta, text });
  }
  return prepared;
}

function buildContext(sources) {
  let remaining = MAX_SOURCE_CHARS;
  return sources.map((source) => {
    const allowance = Math.max(1200, Math.floor(remaining / Math.max(1, sources.length - source.index)));
    const text = source.text.slice(0, allowance);
    remaining -= text.length;
    return `\n===== 资料 ${source.index + 1}：${source.name}（${source.type}）=====\n${text}`;
  }).join('\n');
}

async function callAI(messages, options = {}) {
  if (!AI_API_KEY || !AI_MODEL) throw new HttpError(503, 'AI 服务尚未配置。请在 .env 中填写 AI_API_KEY 和 AI_MODEL。');
  const body = { model: AI_MODEL, messages, temperature: options.temperature ?? 0.25 };
  if (options.json) body.response_format = { type: 'json_object' };
  const send = async () => {
    try {
      return await fetch(`${AI_BASE_URL}/chat/completions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${AI_API_KEY}` },
        body: JSON.stringify(body)
      });
    } catch (error) { throw new HttpError(502, `无法连接 AI 服务：${error.message}`); }
  };
  let response = await send();
  if (response.status === 400 && options.json && body.response_format) {
    delete body.response_format;
    response = await send();
  }
  const raw = await response.text();
  let payload;
  try { payload = JSON.parse(raw); } catch (_) { throw new HttpError(502, 'AI 服务返回了无法识别的内容。'); }
  if (!response.ok) throw new HttpError(response.status === 401 ? 401 : 502, payload.error?.message || 'AI 服务调用失败。');
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new HttpError(502, 'AI 没有返回分析结果。');
  return content;
}

function parseAIJson(text) {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  try { return JSON.parse(cleaned); }
  catch (_) {
    const start = cleaned.indexOf('{'); const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try { return JSON.parse(cleaned.slice(start, end + 1)); } catch (_) { /* handled below */ }
    }
    throw new HttpError(502, 'AI 返回的结构化结果不完整，请重试。');
  }
}

const analysisSystemPrompt = `你是 Doc Copilot，一名严谨的中文资料分析助手。你的任务是把多份资料变成可理解、可复习、可行动的学习成果。
只依据提供的资料，不编造事实。引用 quote 必须尽量逐字来自对应资料。输出严格 JSON，不要 Markdown。
JSON 结构：
{
  "description":"一句话描述资料主题",
  "summaryVersions":{"default":"80-140字综合总结","concise":"40字内","detailed":"160-240字","practical":"强调具体用法的80-140字"},
  "points":[{"title":"要点标题","text":"解释","sourceIndex":0,"quote":"支持该观点的原文短句"}],
  "logic":[{"title":"阶段标题","subtitle":"简短说明"}],
  "knowledge":[{"title":"知识分支","items":["概念1","概念2","概念3"]}],
  "quizzes":[
    {"type":"choice","level":"理解题","question":"题目","options":["A选项","B选项","C选项"],"correctIndex":1,"explanation":"答案解释","sourceIndex":0,"quote":"依据"},
    {"type":"short","level":"思考题","question":"开放题","answerGuide":"评分要点","sourceIndex":0,"quote":"依据"}
  ],
  "actions":[{"title":"具体行动","meta":"预计时间 · 分类"}]
}
要求：points 5 条；logic 4 条；knowledge 4 组；quizzes 至少 3 道且同时包含选择题和简答题；actions 5 条。sourceIndex 从 0 开始且不能越界。`;

function excerptAround(text, quote) {
  const normalizedQuote = cleanText(quote).slice(0, 220);
  let index = normalizedQuote ? text.indexOf(normalizedQuote) : -1;
  if (index < 0 && normalizedQuote.length > 20) index = text.indexOf(normalizedQuote.slice(0, 20));
  if (index < 0) return { before: text.slice(0, 120), highlight: normalizedQuote || text.slice(120, 260), after: text.slice(260, 380) };
  return { before: text.slice(Math.max(0, index - 120), index), highlight: text.slice(index, index + normalizedQuote.length), after: text.slice(index + normalizedQuote.length, index + normalizedQuote.length + 120) };
}

function normalizeAnalysis(raw, prepared) {
  const colors = ['violet', 'blue', 'orange', 'green'];
  const sourceRecords = prepared.map((source, index) => ({ id: `source-${index}`, type: source.type, name: source.name, meta: source.meta || `${source.text.length} 字`, snippets: [] }));
  const addCitation = (item, prefix, index) => {
    const sourceIndex = Math.min(Math.max(Number(item.sourceIndex) || 0, 0), prepared.length - 1);
    const source = prepared[sourceIndex];
    const snippetId = `${prefix}-${index}`;
    const excerpt = excerptAround(source.text, item.quote);
    sourceRecords[sourceIndex].snippets.push({ id: snippetId, location: source.type === 'pdf' ? '相关页段' : `资料段落 ${sourceRecords[sourceIndex].snippets.length + 1}`, ...excerpt });
    return { sourceId: sourceRecords[sourceIndex].id, snippetId };
  };
  const points = (raw.points || []).slice(0, 5).map((item, index) => ({ id: `p${index + 1}`, title: cleanText(item.title), text: cleanText(item.text), ...addCitation(item, 'point', index) }));
  const quizzes = (raw.quizzes || []).slice(0, 6).map((item, index) => {
    const citation = addCitation(item, 'quiz', index);
    if (item.type === 'short') return { id: `quiz-${index + 1}`, type: 'short', level: item.level || '思考题', question: cleanText(item.question), answerGuide: cleanText(item.answerGuide), ...citation };
    const options = (item.options || []).slice(0, 4).map((text, optionIndex) => ({ id: String.fromCharCode(97 + optionIndex), text: cleanText(text) }));
    return { id: `quiz-${index + 1}`, type: 'choice', level: item.level || '理解题', question: cleanText(item.question), options, correct: options[Math.min(Number(item.correctIndex) || 0, options.length - 1)]?.id || 'a', explanation: cleanText(item.explanation), ...citation };
  });
  sourceRecords.forEach((source, index) => {
    if (!source.snippets.length) source.snippets.push({ id: `source-overview-${index}`, location: '资料开头', ...excerptAround(prepared[index].text, '') });
  });
  if (!cleanText(raw.summaryVersions?.default) || points.length < 3 || quizzes.length < 2) {
    throw new HttpError(502, 'AI 返回的分析结果缺少必要内容，请重试。');
  }
  return {
    description: cleanText(raw.description), sources: sourceRecords,
    analysis: {
      activeVersion: 'default', previousVersion: null,
      summaryVersions: {
        default: cleanText(raw.summaryVersions?.default), concise: cleanText(raw.summaryVersions?.concise),
        detailed: cleanText(raw.summaryVersions?.detailed), practical: cleanText(raw.summaryVersions?.practical)
      },
      points,
      logic: (raw.logic || []).slice(0, 4).map((item, index) => ({ step: String(index + 1).padStart(2, '0'), title: cleanText(item.title), subtitle: cleanText(item.subtitle) })),
      knowledge: (raw.knowledge || []).slice(0, 4).map((item, index) => ({ title: cleanText(item.title), items: (item.items || []).slice(0, 4).map(cleanText), color: colors[index] })),
      quizzes,
      actions: (raw.actions || []).slice(0, 6).map((item, index) => ({ id: `action-${index + 1}`, title: cleanText(item.title), meta: cleanText(item.meta) }))
    }
  };
}

async function analyze(body) {
  const prepared = await prepareSources(body.sources);
  const contextText = buildContext(prepared);
  const content = await callAI([
    { role: 'system', content: analysisSystemPrompt },
    { role: 'user', content: `任务名称：${cleanText(body.title)}\n请分析以下资料：\n${contextText}` }
  ], { json: true });
  const normalized = normalizeAnalysis(parseAIJson(content), prepared);
  const contextId = randomUUID();
  const expiry = Date.now() - 6 * 60 * 60 * 1000;
  for (const [id, item] of contexts) if (item.createdAt < expiry) contexts.delete(id);
  contexts.set(contextId, { title: cleanText(body.title), prepared, contextText, createdAt: Date.now() });
  return { ...normalized, contextId, model: AI_MODEL };
}

async function chat(body) {
  const context = contexts.get(body.contextId);
  if (!context) throw new HttpError(409, '本次资料上下文已失效，请重新分析任务。');
  const history = Array.isArray(body.history) ? body.history.slice(-8) : [];
  const messages = [
    { role: 'system', content: '你是资料问答助手。只依据资料回答；无法确认时直接说明。回答简洁、具体，并在结尾写“依据：资料N”。' },
    { role: 'user', content: `资料：\n${context.contextText}` },
    ...history.map((item) => ({ role: item.role === 'assistant' ? 'assistant' : 'user', content: cleanText(item.text) })),
    { role: 'user', content: cleanText(body.question) }
  ];
  return { answer: cleanText(await callAI(messages, { temperature: 0.2 })) };
}

async function grade(body) {
  const context = contexts.get(body.contextId);
  if (!context) throw new HttpError(409, '资料上下文已失效，请重新分析任务。');
  const content = await callAI([
    { role: 'system', content: '你是耐心的学习教练。依据题目、参考要点和资料，为回答给出60-120字中文点评：先肯定有效部分，再指出一个可改进点。不要虚构。' },
    { role: 'user', content: `题目：${cleanText(body.question)}\n参考要点：${cleanText(body.answerGuide)}\n学习者回答：${cleanText(body.answer)}\n资料：${context.contextText.slice(0, 12000)}` }
  ]);
  return { feedback: cleanText(content) };
}

async function regenerate(body) {
  const context = contexts.get(body.contextId);
  if (!context) throw new HttpError(409, '资料上下文已失效，请重新分析任务。');
  const styles = { concise: '40字以内，只保留最核心结论', detailed: '160到240字，补充解释和关键依据', practical: '80到140字，强调马上可以采取的做法' };
  const content = await callAI([
    { role: 'system', content: '你是中文资料总结助手。只输出重新生成后的总结正文，不要标题或 Markdown。只依据资料。' },
    { role: 'user', content: `要求：${styles[body.style] || styles.concise}\n资料：${context.contextText}` }
  ]);
  return { summary: cleanText(content) };
}

async function serveStatic(req, res, pathname) {
  const relative = pathname === '/' ? 'index.html' : decodeURIComponent(pathname).replace(/^\/+/, '');
  const candidate = resolve(ROOT, normalize(relative));
  const rootPath = resolve(ROOT);
  if (candidate !== rootPath && !candidate.startsWith(`${rootPath}${sep}`)) return json(res, 403, { error: '禁止访问。' });
  try {
    const info = await stat(candidate);
    if (!info.isFile()) throw new Error('not file');
    const content = await readFile(candidate);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[extname(candidate).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(content);
  } catch (_) { json(res, 404, { error: '页面不存在。' }); }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'OPTIONS') return json(res, 204, {});
  try {
    if (req.method === 'GET' && url.pathname === '/api/health') return json(res, 200, { ok: true, configured: Boolean(AI_API_KEY && AI_MODEL), model: AI_MODEL || null });
    if (req.method === 'POST' && url.pathname === '/api/analyze') return json(res, 200, await analyze(await readJson(req)));
    if (req.method === 'POST' && url.pathname === '/api/chat') return json(res, 200, await chat(await readJson(req)));
    if (req.method === 'POST' && url.pathname === '/api/grade') return json(res, 200, await grade(await readJson(req)));
    if (req.method === 'POST' && url.pathname === '/api/regenerate') return json(res, 200, await regenerate(await readJson(req)));
    if (req.method === 'GET') return serveStatic(req, res, url.pathname);
    return json(res, 404, { error: '接口不存在。' });
  } catch (error) {
    if (!error.status || (error.status >= 500 && error.status !== 503)) console.error(error);
    return json(res, error.status || 500, { error: error.status ? error.message : '服务暂时不可用，请稍后重试。' });
  }
});

export { server };

server.listen(PORT, HOST, () => {
  console.log(`Doc Copilot 已启动：http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  console.log(AI_API_KEY && AI_MODEL ? `AI 已配置：${AI_MODEL}` : 'AI 尚未配置：请复制 .env.example 为 .env 并填写密钥和模型。');
});
