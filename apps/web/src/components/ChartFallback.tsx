export function ChartFallback() {
  return (
    <div
      className="flex h-72 w-full animate-pulse items-center justify-center rounded-lg bg-zinc-100 text-sm text-zinc-500"
      aria-hidden
    >
      Cargando gráfico…
    </div>
  );
}
