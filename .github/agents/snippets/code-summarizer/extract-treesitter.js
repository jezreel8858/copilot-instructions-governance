/**
 * extract-treesitter.js
 * Modo 1 (Determinístico) — Java e Angular/TypeScript via web-tree-sitter (WASM puro, sem
 * compilação nativa — decisão fechada por @analysis-architect, 2026-08-31).
 *
 * Executado via ctx_execute_file(language: "javascript", path: "<arquivo-alvo>", code: <este script>).
 * Requer (instalar 1x no sandbox): npm install web-tree-sitter tree-sitter-java tree-sitter-typescript
 *
 * Critérios de aceite (ver code-summarizer.agent.md § "Critérios Objetivos e Mensuráveis"):
 *   - assinaturaPublicaCobertura >= 1.00 (100%)
 *   - regraDeNegocioCobertura    >= 0.80 (80%)
 * Se qualquer um não for atingido, OU o parser lançar erro → agent deve acionar Modo 2 (fallback LLM).
 */

const { Parser, Language } = require("web-tree-sitter");
const { redactSecrets } = require("./secret-redaction");

// Nós de assinatura pública por gramática (RF-004 — 100% de cobertura esperada)
const PUBLIC_SIGNATURE_NODES = {
  java: ["class_declaration", "method_declaration", "record_declaration", "interface_declaration"],
  typescript: ["class_declaration", "method_definition", "public_field_definition", "interface_declaration"],
};

// Nós de bloco de decisão por gramática (RF-004 — >= 80% de cobertura esperada).
// TypeScript inclui binary_expression relacional para cobrir padrão Angular Signals
// (ex.: computed(() => this.valorPedidoSignal() > 1000)) — fecha o Risco Alto identificado
// por @analysis-architect (query só de if/switch captura 0% nesse padrão reativo).
const DECISION_BLOCK_NODES = {
  java: ["if_statement", "switch_statement", "ternary_expression"],
  typescript: ["if_statement", "switch_statement", "ternary_expression", "binary_expression"],
};

const RELATIONAL_OPERATORS = new Set([">", "<", ">=", "<=", "==", "!="]);

async function loadLanguage(grammarWasmPath) {
  return Language.load(grammarWasmPath);
}

/**
 * @param {string} sourceText - conteúdo do arquivo-alvo (via FILE_CONTENT do ctx_execute_file)
 * @param {"java"|"typescript"} stack
 * @param {string} grammarWasmPath - caminho do .wasm da gramática já compilado (ver README)
 */
async function extract(sourceText, stack, grammarWasmPath) {
  await Parser.init();
  const parser = new Parser();
  const lang = await loadLanguage(grammarWasmPath);
  parser.setLanguage(lang);

  const tree = parser.parse(sourceText);
  const root = tree.rootNode;

  const signatures = [];
  const decisions = [];

  const publicNodes = PUBLIC_SIGNATURE_NODES[stack] || [];
  const decisionNodes = DECISION_BLOCK_NODES[stack] || [];

  walk(root, (node) => {
    if (publicNodes.includes(node.type)) {
      signatures.push({ type: node.type, text: firstLine(node.text) });
    }
    if (decisionNodes.includes(node.type)) {
      if (node.type === "binary_expression") {
        const operatorNode = node.child(1);
        if (operatorNode && RELATIONAL_OPERATORS.has(operatorNode.text)) {
          decisions.push({ type: node.type, text: firstLine(node.text) });
        }
      } else {
        decisions.push({ type: node.type, text: firstLine(node.text) });
      }
    }
  });

  const { hadSecret } = redactSecrets(sourceText);

  return {
    modo: "Determinístico",
    stack,
    assinaturaPublica: signatures,
    blocosDecisao: decisions,
    parseErrorDetected: root.hasError,
    segredoDetectadoNoFonte: hadSecret,
    // Sumário textual objetivo — o agent monta o Markdown final combinando estes dados
    // com o Formato de Saída documentado em code-summarizer.agent.md.
  };
}

function walk(node, callback) {
  callback(node);
  for (let i = 0; i < node.childCount; i++) {
    walk(node.child(i), callback);
  }
}

function firstLine(text) {
  return text.split("\n")[0].trim();
}

module.exports = { extract };

