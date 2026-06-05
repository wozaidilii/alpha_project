import { BattleGame } from "./_components/BattleGame";

interface Props {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<Record<string, string>>;
}

export default async function BattleRoomPage({ params, searchParams }: Props) {
  const { roomId } = await params;
  const sp = await searchParams;

  const isHost = sp.host === "1";
  const name = sp.name ?? "玩家";
  const settings = isHost
    ? {
        rounds: Number(sp.rounds ?? 5),
        timePerRound: Number(sp.time ?? 60),
        startingHp: Number(sp.hp ?? 100),
      }
    : null;

  return (
    <BattleGame
      roomId={roomId}
      isHost={isHost}
      playerName={name}
      hostSettings={settings}
    />
  );
}
