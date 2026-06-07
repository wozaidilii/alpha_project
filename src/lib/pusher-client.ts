"use client";

import PusherJs from "pusher-js";

let _client: PusherJs | null = null;

export function getPusherClient(): PusherJs {
  _client ??= new PusherJs(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  });
  return _client;
}

export async function sendPusherEvent(
  channel: string,
  event: string,
  data: unknown,
) {
  const response = await fetch("/api/pusher/trigger", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ channel, event, data }),
  });
  if (!response.ok) {
    throw new Error(`Pusher 事件发送失败: ${event}`);
  }
}
