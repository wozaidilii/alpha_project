import { z } from "zod";
import {
  jsonOk,
  parseJsonBody,
  toErrorResponse,
  TOKEN_SCHEMA,
} from "~/server/api/miniprogram";
import { updateSoloHighScore } from "~/server/data/player-store";

const HighScoreBodySchema = z.object({
  token: TOKEN_SCHEMA,
  score: z.number().int().min(0).max(1_000_000),
});

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody(request, HighScoreBodySchema);
    const user = await updateSoloHighScore(body);

    return jsonOk({
      soloHighScore: user.soloHighScore,
      user,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
