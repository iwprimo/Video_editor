// Edição por prompt usando o Claude Code instalado neste computador.
// O uso sai dos limites da assinatura do Claude (Pro/Max), sem créditos de API.
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const isWin = process.platform === "win32";

// Ambiente sem chaves de API: assim o Claude Code usa o login da assinatura, não créditos
const childEnv = () => {
  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY;
  delete env.ANTHROPIC_AUTH_TOKEN;
  return env;
};

const exists = (f) => {
  try {
    return fs.statSync(f).isFile();
  } catch {
    return false;
  }
};

// No Windows o "claude.cmd" do npm não pode ser executado sem shell; lemos o atalho
// e chamamos direto o programa que ele aponta (evita problemas com aspas e tamanho da linha).
const launcherFor = (file) => {
  if (isWin && /\.(cmd|bat)$/i.test(file)) {
    try {
      const txt = fs.readFileSync(file, "utf8");
      const m = txt.match(/"%~?dp0%?\\([^"]+?\.(?:js|mjs|cjs|exe))"/i);
      if (m) {
        const target = path.join(path.dirname(file), m[1]);
        if (exists(target)) return /\.exe$/i.test(target) ? { cmd: target, pre: [], path: file } : { cmd: process.execPath, pre: [target], path: file };
      }
    } catch {
      /* segue para o modo com shell */
    }
    return { cmd: file, pre: [], path: file, shell: true };
  }
  return { cmd: file, pre: [], path: file };
};

export const findClaude = (custom) => {
  const list = [];
  if (custom?.trim()) list.push(custom.trim().replace(/^"|"$/g, ""));
  const home = os.homedir();
  const which = spawnSync(isWin ? "where" : "which", ["claude"], { encoding: "utf8", windowsHide: true });
  if (which.status === 0) list.push(...which.stdout.split(/\r?\n/).map((s) => s.trim()).filter(Boolean));
  if (isWin) {
    list.push(path.join(home, ".local", "bin", "claude.exe"));
    if (process.env.APPDATA) list.push(path.join(process.env.APPDATA, "npm", "claude.cmd"));
    if (process.env.LOCALAPPDATA) list.push(path.join(process.env.LOCALAPPDATA, "Programs", "claude", "claude.exe"));
  } else {
    list.push(path.join(home, ".local", "bin", "claude"), path.join(home, ".claude", "local", "claude"), "/usr/local/bin/claude", "/opt/homebrew/bin/claude");
  }
  const rank = (f) => (!isWin ? 0 : /\.exe$/i.test(f) ? 0 : /\.(cmd|bat)$/i.test(f) ? 1 : 9);
  const found = [...new Set(list)].filter((f) => exists(f) && rank(f) < 9).sort((a, b) => rank(a) - rank(b));
  return found.length ? launcherFor(found[0]) : null;
};

const run = (launch, args, { input = "", cwd, timeoutMs = 180000 } = {}) =>
  new Promise((resolve) => {
    let out = "";
    let err = "";
    let done = false;
    const finish = (r) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(r);
    };
    let child;
    try {
      // Pelo shell do Windows, argumentos vazios ou com espaços precisam de aspas
      const all = [...launch.pre, ...args];
      const finalArgs = launch.shell ? all.map((a) => `"${String(a).replace(/"/g, '\\"')}"`) : all;
      child = spawn(launch.shell ? `"${launch.cmd}"` : launch.cmd, finalArgs, {
        cwd: cwd ?? os.tmpdir(),
        env: childEnv(),
        windowsHide: true,
        shell: !!launch.shell,
        stdio: ["pipe", "pipe", "pipe"],
      });
    } catch (e) {
      return finish({ code: -1, out, err: String(e?.message ?? e), spawnError: e });
    }
    const timer = setTimeout(() => {
      child.kill();
      finish({ code: -1, out, err, timedOut: true });
    }, timeoutMs);
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", (e) => finish({ code: -1, out, err: String(e?.message ?? e), spawnError: e }));
    child.on("close", (code) => finish({ code, out, err }));
    child.stdin.on("error", () => {});
    child.stdin.end(input);
  });

const fail = (message, status = 502) => Object.assign(new Error(message), { status });

const NOT_FOUND =
  "O Claude Code não foi encontrado neste computador. Instale pelo site claude.com/claude-code, abra um terminal, rode \"claude\" e faça login com a sua conta do Claude. Se ele já estiver instalado em outra pasta, informe o caminho do claude.exe em Configurações.";

// Traduz os erros mais comuns do Claude Code
const explain = (text) => {
  const t = text ?? "";
  if (/credit balance/i.test(t))
    return "O Claude Code está usando uma chave de API sem créditos, e não a sua assinatura. Num terminal, rode \"claude auth login\" e entre com a conta do Claude.";
  if (/not logged in|please run \/login|\/login|invalid api key|authentication|oauth/i.test(t))
    return "O Claude Code não está conectado à sua conta. Abra um terminal, rode \"claude\" e faça login com a conta do Claude (a da assinatura). Depois tente de novo.";
  if (/usage limit|limit reached|rate.?limit|5-hour|weekly limit/i.test(t))
    return "Você chegou ao limite de uso da sua assinatura do Claude. A edição por prompt volta a funcionar quando o limite renovar.";
  if (/overloaded|529/i.test(t)) return "O Claude está sobrecarregado no momento. Tente de novo em alguns instantes.";
  return null;
};

// Situação do Claude Code: instalado? versão? conectado com a assinatura?
export const claudeCodeStatus = async (customPath) => {
  const launch = findClaude(customPath);
  if (!launch) return { found: false, message: NOT_FOUND };
  const v = await run(launch, ["--version"], { timeoutMs: 20000 });
  if (v.spawnError) return { found: false, path: launch.path, message: NOT_FOUND };
  const version = (v.out.match(/\d+\.\d+\.\d+/) ?? [null])[0];
  const a = await run(launch, ["auth", "status"], { timeoutMs: 20000 });
  let auth = null;
  try {
    auth = JSON.parse(a.out.slice(a.out.indexOf("{")));
  } catch {
    /* versão antiga sem "auth status" */
  }
  const method = auth?.authMethod ?? null;
  const loggedIn = auth ? (typeof auth.loggedIn === "boolean" ? auth.loggedIn : a.code === 0 && method !== "none") : null;
  let message;
  if (loggedIn === false) message = "Instalado, mas sem login. Abra um terminal, rode \"claude\" e entre com a conta do Claude.";
  else if (method === "api_key" || method === "api_key_helper")
    message = "Conectado por chave de API: isso gasta créditos, não a assinatura. Rode \"claude auth login\" num terminal e entre com a conta do Claude.";
  else if (method === "claude.ai" || method === "oauth_token") message = "Conectado com a sua assinatura do Claude.";
  else message = "Instalado. Não deu para confirmar o login; faça um pedido de teste.";
  return { found: true, path: launch.path, version, loggedIn, authMethod: method, email: auth?.email ?? auth?.account?.email ?? null, ok: loggedIn !== false && !/^api_key/.test(method ?? ""), message };
};

// Faz um pedido ao Claude Code e devolve o objeto JSON da resposta
export const askClaudeCode = async ({ system, user, schema, model, effort = "medium", customPath, timeoutMs = 240000 }) => {
  const launch = findClaude(customPath);
  if (!launch) throw fail(NOT_FOUND, 400);
  // Pasta temporária vazia: o Claude Code não lê arquivos nem configurações de projeto
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "editor-video-cc-"));
  const sysFile = path.join(dir, "system.txt");
  fs.writeFileSync(sysFile, system);
  const base = ["-p", "--output-format", "json", "--system-prompt-file", sysFile, "--no-session-persistence"];
  const extras = [
    ...(model ? ["--model", model] : []),
    // Sem ferramentas: o pedido fica bem menor e gasta menos do limite da assinatura
    "--tools",
    "",
    "--disallowedTools",
    "mcp__*",
    "--permission-mode",
    "dontAsk",
    "--strict-mcp-config",
    "--disable-slash-commands",
    "--effort",
    effort,
    "--json-schema",
    JSON.stringify(schema),
  ];
  try {
    let r = await run(launch, [...base, ...extras], { input: user, cwd: dir, timeoutMs });
    // Versões mais antigas não conhecem algum parâmetro: tenta de novo só com o essencial
    if (r.code !== 0 && /unknown option|unrecognized|invalid option|error: option/i.test(r.err + r.out)) {
      r = await run(launch, [...base, ...(model ? ["--model", model] : [])], { input: user, cwd: dir, timeoutMs });
    }
    if (r.spawnError) throw fail(NOT_FOUND, 400);
    if (r.timedOut) throw fail("O Claude Code demorou demais para responder. Tente um pedido mais curto ou de novo em instantes.", 504);
    let res = null;
    const start = r.out.indexOf("{");
    if (start >= 0) {
      try {
        res = JSON.parse(r.out.slice(start));
      } catch {
        const last = r.out.trim().split(/\r?\n/).reverse().find((l) => l.trim().startsWith("{"));
        try {
          res = last ? JSON.parse(last) : null;
        } catch {
          res = null;
        }
      }
    }
    if (!res || res.is_error || (res.subtype && res.subtype !== "success")) {
      const raw = [res?.result, res?.error, r.err, r.out].filter(Boolean).join("\n");
      throw fail(explain(raw) ?? `O Claude Code retornou um erro: ${(res?.result || r.err || r.out || "sem detalhes").toString().slice(0, 400)}`);
    }
    if (res.structured_output && typeof res.structured_output === "object") return { data: res.structured_output, meta: res };
    // Sem saída estruturada: procura o JSON dentro do texto
    const text = String(res.result ?? "");
    const a = text.indexOf("{");
    const b = text.lastIndexOf("}");
    if (a >= 0 && b > a) {
      try {
        return { data: JSON.parse(text.slice(a, b + 1)), meta: res };
      } catch {
        /* cai no erro abaixo */
      }
    }
    throw fail("O Claude Code respondeu num formato que o editor não entendeu. Tente de novo.");
  } finally {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* temporário */
    }
  }
};
