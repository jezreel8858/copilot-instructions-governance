#!/usr/bin/env node
/**
 * cli-runner.js
 * Ponte de execução (subprocess) entre pytest e os scripts extract-treesitter.js /
 * extract-sql.js, que expõem apenas `extract()` como função de módulo (sem CLI própria
 * — ver README.md "Executado via ctx_execute_file"). Criado por @test-implementation
 * SOMENTE para viabilizar automação de teste; não altera os scripts de extração.
 *
 * Uso:
 *   node cli-runner.js treesitter <arquivo> <java|typescript> <caminho.wasm>
 *   node cli-runner.js sql <arquivo> [dialect]
 *
 * Saída: JSON de uma linha em stdout (resultado de extract()). Erros não tratados
 * pelo próprio script (ex.: exceção fora do try/catch interno) viram exit code != 0
 * com a mensagem em stderr — o chamador (pytest) deve tratar como falha de infraestrutura,
 * não como resultado de avaliação.
 */

const path = require("path");

async function main() {
  const [, , mode, filePath, ...rest] = process.argv;

  if (!mode || !filePath) {
    console.error("Uso: node cli-runner.js <treesitter|sql> <arquivo> [args...]");
    process.exit(2);
  }

  const fs = require("fs");
  const sourceText = fs.readFileSync(filePath, "utf8");

  let result;
  if (mode === "treesitter") {
    const [stack, grammarWasmPath] = rest;
    const { extract } = require(path.join(__dirname, "extract-treesitter.js"));
    result = await extract(sourceText, stack, grammarWasmPath);
  } else if (mode === "sql") {
    const [dialect] = rest;
    const { extract } = require(path.join(__dirname, "extract-sql.js"));
    result = extract(sourceText, dialect || "postgresql");
  } else {
    console.error(`Modo desconhecido: ${mode}`);
    process.exit(2);
  }

  process.stdout.write(JSON.stringify(result));
}

main().catch((err) => {
  console.error(err.stack || String(err));
  process.exit(1);
});

