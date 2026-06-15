import Pusher from "pusher";
import { env } from "~/env";

let pusherServer: Pusher | null = null;

function getRequiredPusherConfig() {
  const { PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER } = env;
  const missing = [
    ["PUSHER_APP_ID", PUSHER_APP_ID],
    ["PUSHER_KEY", PUSHER_KEY],
    ["PUSHER_SECRET", PUSHER_SECRET],
    ["PUSHER_CLUSTER", PUSHER_CLUSTER],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Pusher 配置缺失: ${missing.join(", ")}`);
  }

  if (!PUSHER_APP_ID || !PUSHER_KEY || !PUSHER_SECRET || !PUSHER_CLUSTER) {
    throw new Error("Pusher 配置缺失");
  }

  return {
    appId: PUSHER_APP_ID,
    key: PUSHER_KEY,
    secret: PUSHER_SECRET,
    cluster: PUSHER_CLUSTER,
  };
}

export function getPusherServer() {
  const config = getRequiredPusherConfig();
  pusherServer ??= new Pusher({
    appId: config.appId,
    key: config.key,
    secret: config.secret,
    cluster: config.cluster,
    useTLS: true,
  });
  return pusherServer;
}

export function roomChannel(roomId: string) {
  return `game-${roomId}`;
}
