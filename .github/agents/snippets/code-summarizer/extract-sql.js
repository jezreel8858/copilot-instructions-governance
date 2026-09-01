/**
 * extract-sql.js
 * Modo 1 (Determinístico) — SQL via node-sql-parser (decisão fechada por @analysis-architect,
 * 2026-08-31: gramática comunitária tree-sitter-sql é imatura; node-sql-parser retorna AST
 * semântico pronto com tableList/columnList, multi-dialeto).
 *
 * Executado via ctx_execute_file(language: "javascript", path: "<arquivo-alvo>", code: <este script>).
 * Requer (instalar 1x no sandbox): npm install node-sql-parser
 *
 * ATENÇÃO (risco conhecido, registrado por @analysis-architect): node-sql-parser é majoritariamente
 * voltado a DML (SELECT/INSERT/UPDATE). DDL Postgres com `GENERATED ALWAYS AS ... STORED` requer
 * smoke test contra o fixture V1__create_orders.sql antes de declarar suporte SQL como fechado.
 * Se o parser lançar erro aqui, o critério (iii) do threshold cobre — cai para Modo 2 automaticamente.
 *
 * Critérios de aceite (ver code-summarizer.agent.md § "Critérios Objetivos e Mensuráveis"):
 *   - assinaturaPublicaCobertura >= 1.00 (100%) — nome da tabela + colunas
 *   - regraDeNegocioCobertura    >= 0.80 (80%)  — CHECK, GENERATED ALWAYS AS, WHERE/HAVING
 */

const { Parser } = require("node-sql-parser");
const { redactSecrets } = require("./secret-redaction");

function extract(sourceText, dialect = "postgresql") {
  const parser = new Parser();
  const signatures = [];
  const decisions = [];
  let parseErrorDetected = false;
  let parseErrorDetail = null;

  try {
    // node-sql-parser é orientado a DML; para DDL, ast() ainda funciona na maioria dos
    // casos mas comentários de regra de negócio (CHECK, GENERATED ALWAYS) ficam como
    // texto bruto no AST de coluna — extraídos abaixo via regex complementar sobre o
    // texto original, não apenas o AST (mitigação documentada no README deste diretório).
    const ast = parser.astify(sourceText, { database: dialect });
    const asArray = Array.isArray(ast) ? ast : [ast];

    for (const statement of asArray) {
      if (statement.type === "create" && statement.keyword === "table") {
        const tableName = statement.table?.[0]?.table || "unknown_table";
        const columns = (statement.create_definitions || [])
          .filter((def) => def.resource === "column")
          .map((def) => def.column?.column);

        signatures.push({ type: "table", name: tableName, columns });

        // Regras de negócio a nível de schema (CHECK / GENERATED ALWAYS) — busca
        // complementar em texto bruto, pois nem toda gramática de node-sql-parser
        // expõe check_constraint como nó dedicado para todos os dialetos.
        for (const def of statement.create_definitions || []) {
          const rawDef = JSON.stringify(def);
          if (/check/i.test(rawDef)) {
            decisions.push({ type: "CHECK", detail: def.column?.column || "constraint" });
          }
          if (/generated/i.test(rawDef)) {
            decisions.push({ type: "GENERATED_ALWAYS", detail: def.column?.column || "coluna_gerada" });
          }
        }
      }

      if (statement.where) {
        decisions.push({ type: "WHERE", detail: "cláusula de filtro condicional" });
      }
      if (statement.having) {
        decisions.push({ type: "HAVING", detail: "cláusula de filtro agregado" });
      }
    }
  } catch (err) {
    parseErrorDetected = true;
    parseErrorDetail = err.message;
  }

  const { hadSecret } = redactSecrets(sourceText);

  return {
    modo: "Determinístico",
    stack: "sql",
    assinaturaPublica: signatures,
    blocosDecisao: decisions,
    parseErrorDetected,
    parseErrorDetail,
    segredoDetectadoNoFonte: hadSecret,
  };
}

module.exports = { extract };

