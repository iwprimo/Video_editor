// Script de auditoria e verificação de segredos (007 Hardening)
// Executado para certificar que nenhum segredo, chave ou credencial seja enviado ao GitHub.
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const SENSITIVE_PATTERNS = [
  /sk-ant-usr-[a-zA-Z0-9_-]{20,}/,
  /sk-ant-api[a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{32,}/,
  /AQ\.[a-zA-Z0-9_-]{30,}/,
  /AIzaSy[a-zA-Z0-9_-]{33}/,
  /AKIA[0-9A-Z]{16}/,
  /-----BEGIN [A-Z]+ PRIVATE KEY-----/,
];

console.log("\n🕵️‍♂️ [007] Iniciando auditoria de credenciais e integridade...");

// 1. Verificar se config.json ou .env estão no git tracking
try {
  const trackedFiles = execSync("git ls-files", { encoding: "utf8" }).split("\n").map(f => f.trim()).filter(Boolean);
  
  const illegalFiles = ["config.json", ".env", ".env.local", ".env.production"];
  const foundIllegal = trackedFiles.filter(f => illegalFiles.includes(f));
  
  if (foundIllegal.length > 0) {
    console.error("\n❌ [ALERTA CRÍTICO] Arquivos sensíveis encontrados rastreados pelo Git:");
    foundIllegal.forEach(f => console.error(`   - ${f}`));
    process.exit(1);
  }
  console.log("✓ Nenhum arquivo sensível de configuração (.env, config.json) está rastreado no Git.");

  // 2. Verificar padrões de chaves nos arquivos rastreados
  let issues = 0;
  for (const file of trackedFiles) {
    if (!fs.existsSync(file)) continue;
    // Pular binários e imagens
    if (/\.(png|jpe?g|webp|gif|woff2?|mp4|bin|ico)$/i.test(file)) continue;

    const content = fs.readFileSync(file, "utf8");
    for (const pattern of SENSITIVE_PATTERNS) {
      if (pattern.test(content)) {
        console.error(`\n❌ [ALERTA DE SEGURANÇA] Possível credencial encontrada em: ${file}`);
        issues++;
      }
    }
  }

  if (issues > 0) {
    console.error(`\n❌ Total de falhas encontradas: ${issues}. Corrija antes de publicar.`);
    process.exit(1);
  }

  console.log("✓ Varredura concluída: ZERO credenciais ou chaves privadas encontradas nos arquivos do repositório.");
  console.log("✓ Repositório certificado para publicação segura.\n");
} catch (e) {
  console.error("Erro durante a auditoria:", e.message);
  process.exit(1);
}
