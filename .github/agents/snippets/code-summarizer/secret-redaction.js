/**
 * secret-redaction.js
 * Heurística cross-stack para detectar e nunca reproduzir credenciais/segredos (RNF-005/R-010).
 * Usado por extract-treesitter.js, extract-sql.js. extract-python-ast.py aplica lógica equivalente
 * em Python (ver comentário no final deste arquivo).
 *
 * Meta: 0% de reprodução literal — bloqueante, não percentual.
 */

const SECRET_PATTERNS = [
  /sk-live-[A-Za-z0-9]+/g,
  /sk_test_[A-Za-z0-9_]+/g,
  /ff_test_fixture_[A-Za-z0-9_]+/g,
  /(postgres|mysql|mongodb):\/\/[^:]+:[^@]+@[^\s'"]+/g,
  /(api[_-]?key|token|secret|password|senha)\s*[:=]\s*['"][^'"]{8,}['"]/gi,
];

/**
 * Recebe o texto-fonte original e retorna:
 *   - texto com qualquer trecho suspeito substituído por "[REDACTED]"
 *   - flag `hadSecret` para o relatório de validação (RNF-005 ✅/❌)
 */
function redactSecrets(sourceText) {
  let redacted = sourceText;
  let hadSecret = false;

  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(redacted)) {
      hadSecret = true;
      redacted = redacted.replace(pattern, "[REDACTED]");
    }
    pattern.lastIndex = 0; // reset regex global state
  }

  return { redacted, hadSecret };
}

/**
 * Valida que o SUMÁRIO FINAL (não o fonte original) não contém nenhum segredo detectado
 * no fonte original — chamar isso antes de retornar o sumário ao solicitante.
 */
function assertNoSecretLeak(originalSourceText, generatedSummaryText) {
  for (const pattern of SECRET_PATTERNS) {
    const matches = originalSourceText.match(pattern) || [];
    for (const match of matches) {
      if (generatedSummaryText.includes(match)) {
        return { leaked: true, value: match };
      }
    }
    pattern.lastIndex = 0;
  }
  return { leaked: false, value: null };
}

module.exports = { redactSecrets, assertNoSecretLeak, SECRET_PATTERNS };

// Equivalente Python (extract-python-ast.py) usa os mesmos padrões via módulo `re`,
// reimplementados localmente para evitar dependência cross-linguagem dentro do sandbox.

