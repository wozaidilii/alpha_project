const HIDDEN_ANSWER_MARKER = "□□";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isAnswerTerm(value: string | undefined): value is string {
  return value !== undefined && value.length >= 2;
}

export function redactAnswerTerms(
  text: string,
  terms: readonly (string | null | undefined)[],
) {
  const answerTerms = [...new Set(terms.map((term) => term?.trim()))]
    .filter(isAnswerTerm)
    .sort((left, right) => right.length - left.length);

  return answerTerms.reduce(
    (result, term) =>
      result.replace(
        new RegExp(escapeRegExp(term), "gi"),
        HIDDEN_ANSWER_MARKER,
      ),
    text,
  );
}
