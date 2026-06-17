import { NextResponse } from "next/server";
import { z } from "zod";
import { isBattleGameModeSlug } from "~/lib/game-mode";
import {
  cancelBattleRoomStart,
  getBattleRoomSnapshot,
  joinBattleRoom,
  leaveBattleRoom,
  markBattleRoomStarting,
  startBattleRoom,
} from "~/server/data/battle-room-store";
import {
  type BattlePlayer,
  type BattleQuestion,
  type BattleSettings,
} from "~/types/battle";

type RouteContext = {
  params: Promise<{ roomId: string }>;
};

const avatarSchema = z.object({
  icon: z.string().min(1),
  color: z.string().min(1),
});

const playerSchema = z.object({
  id: z.string().min(1),
  userId: z.string().optional(),
  name: z.string().min(1),
  avatar: avatarSchema,
  character: z.unknown().optional(),
  hp: z.number().finite(),
  isHost: z.boolean(),
});

const settingsSchema = z.object({
  rounds: z.number().int().min(1).max(10),
  timePerRound: z.number().int().min(5).max(300),
  startingHp: z.number().int().min(1).max(999),
  questionType: z.string().refine(isBattleGameModeSlug, {
    message: "Unsupported battle mode",
  }),
});

function toSettings(input: z.infer<typeof settingsSchema>): BattleSettings {
  return {
    ...input,
    questionType: input.questionType,
  };
}

function toPlayer(input: z.infer<typeof playerSchema>): BattlePlayer {
  return input as BattlePlayer;
}

function toPlayers(input: Record<string, z.infer<typeof playerSchema>>) {
  return Object.fromEntries(
    Object.entries(input).map(([id, player]) => [id, toPlayer(player)]),
  );
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(_request: Request, context: RouteContext) {
  const { roomId } = await context.params;
  const snapshot = getBattleRoomSnapshot(roomId);
  if (!snapshot) return jsonError("Battle room not found", 404);
  return NextResponse.json({ room: snapshot });
}

export async function POST(request: Request, context: RouteContext) {
  const { roomId } = await context.params;
  const body = (await request.json()) as unknown;

  try {
    const action = z
      .object({
        action: z.enum([
          "join",
          "starting",
          "cancel-start",
          "started",
          "leave",
        ]),
      })
      .parse(body).action;

    if (action === "join") {
      const parsed = z
        .object({
          action: z.literal("join"),
          player: playerSchema,
          settings: settingsSchema.optional(),
        })
        .parse(body);
      const room = joinBattleRoom({
        roomId,
        player: toPlayer(parsed.player),
        settings: parsed.settings ? toSettings(parsed.settings) : undefined,
      });
      return NextResponse.json({ room });
    }

    if (action === "starting") {
      const parsed = z
        .object({
          action: z.literal("starting"),
          settings: settingsSchema,
          players: z.record(playerSchema),
        })
        .parse(body);
      const room = markBattleRoomStarting({
        roomId,
        settings: toSettings(parsed.settings),
        players: toPlayers(parsed.players),
      });
      return NextResponse.json({ room });
    }

    if (action === "cancel-start") {
      const room = cancelBattleRoomStart({ roomId });
      if (!room) return jsonError("Battle room not found", 404);
      return NextResponse.json({ room });
    }

    if (action === "started") {
      const parsed = z
        .object({
          action: z.literal("started"),
          settings: settingsSchema,
          players: z.record(playerSchema),
          questionIds: z.array(z.string()).optional(),
          questions: z.custom<BattleQuestion[]>().optional(),
          roundIndex: z.number().int().min(0),
          startTime: z.number().finite(),
        })
        .parse(body);
      const room = startBattleRoom({
        roomId,
        settings: toSettings(parsed.settings),
        players: toPlayers(parsed.players),
        questionIds: parsed.questionIds,
        questions: parsed.questions,
        roundIndex: parsed.roundIndex,
        startTime: parsed.startTime,
      });
      return NextResponse.json({ room });
    }

    const parsed = z
      .object({
        action: z.literal("leave"),
        playerId: z.string().min(1),
      })
      .parse(body);
    return NextResponse.json(
      leaveBattleRoom({ roomId, playerId: parsed.playerId }),
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError("Invalid battle room payload", 400);
    }
    if (error instanceof Error && error.message === "房间已满") {
      return jsonError(error.message, 409);
    }
    throw error;
  }
}
