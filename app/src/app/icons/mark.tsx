/** The app mark: a rising bar chart on the accent color. Rendered to PNG by ImageResponse. */
export function Mark({ size }: { size: number }) {
  const bar = (h: number) => <div style={{ width: size * 0.13, height: size * h, background: "#ffffff", borderRadius: size * 0.03 }} />;
  return (
    <div style={{ width: size, height: size, display: "flex", alignItems: "flex-end", justifyContent: "center", gap: size * 0.06, padding: size * 0.22, background: "#4f46e5" }}>
      {bar(0.2)}
      {bar(0.35)}
      {bar(0.56)}
    </div>
  );
}
