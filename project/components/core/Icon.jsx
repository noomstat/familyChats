import React from "react";

/**
 * Rally Icon — thin wrapper over Lucide (the brand's icon set).
 * Consumers must load Lucide UMD once:
 *   <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
 * Renders an <i data-lucide> then asks Lucide to swap it for an inline SVG.
 */
export function Icon({ name, size = 20, strokeWidth = 2, color = "currentColor", style, ...rest }) {
  const ref = React.useRef(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === "undefined" || !window.lucide) return;
    // Reset then let Lucide render the SVG for this <i>
    el.innerHTML = "";
    const i = document.createElement("i");
    i.setAttribute("data-lucide", name);
    el.appendChild(i);
    try {
      window.lucide.createIcons({
        attrs: { width: size, height: size, "stroke-width": strokeWidth, stroke: color },
        nameAttr: "data-lucide",
      });
    } catch (e) { /* lucide not ready */ }
  }, [name, size, strokeWidth, color]);

  return (
    <span
      ref={ref}
      aria-hidden="true"
      style={{
        display: "inline-flex",
        width: size,
        height: size,
        flex: "0 0 auto",
        color,
        ...style,
      }}
      {...rest}
    />
  );
}
