import { NextResponse } from "next/server";
import { getPusherServer } from "~/lib/pusher-server";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    channel: string;
    event: string;
    data: unknown;
  };

  try {
    await getPusherServer().trigger(body.channel, body.event, body.data);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Pusher 配置缺失")) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    throw error;
  }

  return NextResponse.json({ ok: true });
}
