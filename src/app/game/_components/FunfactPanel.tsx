interface Props {
  funfacts: string[];
}

export function FunfactPanel({ funfacts }: Props) {
  if (funfacts.length === 0) return null;

  return (
    <div className="mt-4 rounded-xl bg-stone-800 p-4">
      <div className="mb-2 text-sm font-semibold text-amber-400">💡 冷知识</div>
      <ul className="list-inside list-disc space-y-2 text-sm leading-relaxed text-stone-300">
        {funfacts.map((fact, index) => (
          <li key={index}>{fact}</li>
        ))}
      </ul>
    </div>
  );
}
