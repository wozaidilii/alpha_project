import { z } from "zod";
import {
  jsonOk,
  parseJsonBody,
  toErrorResponse,
  TOKEN_SCHEMA,
} from "~/server/api/miniprogram";
import { getRandomFunfactQuestions } from "~/server/data/funfact-store";
import { getPlayerProfile } from "~/server/data/player-store";

const ROUND_QUESTION_COUNT = 5;

const StartBodySchema = z.object({
  token: TOKEN_SCHEMA,
});

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody(request, StartBodySchema);
    await getPlayerProfile(body.token);

    const questions = await getRandomFunfactQuestions({
      count: ROUND_QUESTION_COUNT,
    });

    if (questions.length < ROUND_QUESTION_COUNT) {
      return jsonOk({
        questions,
        warning: "INSUFFICIENT_QUESTIONS",
      });
    }

    return jsonOk({ questions });
  } catch (error) {
    return toErrorResponse(error);
  }
}
