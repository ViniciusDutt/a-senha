function Sunbeam() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 top-1/2 -z-10 size-0 animate-[spin_100s_linear_infinite]"
    >
      {Array.from({ length: 16 }).map((_, index) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: List is static and won't change order
          key={index}
          className="absolute bottom-0 left-0 h-[90vmax] w-[12vmax] origin-bottom bg-linear-to-t from-transparent from-5% to-chart-1/20 [clip-path:polygon(0_0,100%_0,58%_100%,42%_100%)]"
          style={{
            transform: `translateX(-50%) rotate(${index * (360 / 16)}deg)`,
          }}
        />
      ))}
    </div>
  );
}

export { Sunbeam };
