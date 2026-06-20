import { Fragment } from "react";
import type { ReactNode } from "react";
import { parseInlineMarkup } from "../lib/markup";

/**
 * Renders inline markup (**bold**, *italic*, ~~strike~~, `code`) as styled
 * inline elements. A drop-in replacement for `{text}` inside any text
 * container — it emits only inline elements, so whitespace, font, and
 * line-clamping from the parent are preserved.
 */
export function RichText({ text }: { text: string }) {
  return (
    <>
      {parseInlineMarkup(text).map((s, i) => {
        let node: ReactNode = s.code ? (
          <code className="rich-code">{s.text}</code>
        ) : (
          s.text
        );
        if (s.strike) node = <s>{node}</s>;
        if (s.italic) node = <em>{node}</em>;
        if (s.bold) node = <strong>{node}</strong>;
        return <Fragment key={i}>{node}</Fragment>;
      })}
    </>
  );
}
