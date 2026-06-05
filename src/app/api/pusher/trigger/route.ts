import { NextResponse } from "next/server";
import { pusherServer } from "~/lib/pusher-server";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    channel: string;
    event: string;
    data: unknown;
  };
  await pusherServer.trigger(body.channel, body.event, body.data);
  return NextResponse.json({ ok: true });
}
