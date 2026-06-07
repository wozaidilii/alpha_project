import { z } from "zod";

const questionBaseSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  year: z.number().int(),
  imageUrl: z.string().url().optional(),
  wikipediaTitle: z.string().optional(),
  source: z.string().optional(),
});

export const historicalQuestionSchema = questionBaseSchema.extend({
  type: z.literal("historical"),
  lat: z.number(),
  lng: z.number(),
  location: z.string().min(1),
  category: z.enum(["world", "china"]),
  funfact: z.array(z.string().min(1)).max(3).optional(),
});

export const nostalgiaQuestionSchema = questionBaseSchema.extend({
  type: z.literal("nostalgia"),
  subCategory: z.enum([
    "appliance",
    "snack",
    "toy",
    "anime",
    "comic",
    "movie",
    "tv",
    "celebrity",
    "game",
    "music",
    "other",
  ]),
  culturalScope: z.enum(["cn_mainland", "cn_hk_tw", "global"]),
  tags: z.array(z.string()).min(1),
  yearEnd: z.number().int().optional(),
  aliases: z.array(z.string()).optional(),
});

export const funfactQuestionSchema = questionBaseSchema.extend({
  type: z.literal("funfact"),
  format: z.enum(["multiple_choice", "true_false"]),
  sourceId: z.string().min(1),
  stem: z.string().min(1),
  options: z.array(z.string().min(1)).min(2).max(4),
  correctIndex: z.number().int().min(0),
  explanation: z.string().optional(),
  category: z.string().min(1),
  hint: z.string().optional(),
  funfact: z.array(z.string().min(1)).max(3).optional(),
  difficulty: z.number().int().min(1).max(5).optional(),
});

export const memeQuestionSchema = questionBaseSchema.extend({
  type: z.literal("meme"),
  subCategory: z.enum(["phrase", "image", "video", "event", "character"]),
  culturalScope: z.enum(["cn_mainland", "cn_hk_tw", "global"]),
  platform: z.union([
    z.enum([
      "bbs",
      "weibo",
      "wechat",
      "bilibili",
      "douyin",
      "zhihu",
      "tieba",
      "other",
    ]),
    z
      .array(
        z.enum([
          "bbs",
          "weibo",
          "wechat",
          "bilibili",
          "douyin",
          "zhihu",
          "tieba",
          "other",
        ]),
      )
      .min(1),
  ]),
  tags: z.array(z.string()).min(1),
  aliases: z.array(z.string()).optional(),
  sourceUrl: z.string().url().optional(),
});

export const gameQuestionSchema = z.discriminatedUnion("type", [
  historicalQuestionSchema,
  funfactQuestionSchema,
  nostalgiaQuestionSchema,
  memeQuestionSchema,
]);

export function validateQuestion(data: unknown) {
  return gameQuestionSchema.safeParse(data);
}
