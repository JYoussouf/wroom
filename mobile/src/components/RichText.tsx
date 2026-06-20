import { Fragment } from "react";
import { StyleSheet, Text } from "react-native";
import { parseInlineMarkup } from "@wroom/shared";

import { fonts } from "@/theme/theme";

/**
 * Renders inline markup (**bold**, *italic*, ~~strike~~, `code`) as nested
 * <Text> spans. MUST be placed inside a parent <Text> so the spans inherit its
 * color, size, font, and any numberOfLines clamping — e.g.
 *   <Text style={styles.body}><RichText text={post.body} /></Text>
 */
export function RichText({ text }: { text: string }) {
  return (
    <>
      {parseInlineMarkup(text).map((s, i) => (
        <Fragment key={i}>
          <Text
            style={[
              s.bold && styles.bold,
              s.italic && styles.italic,
              s.strike && styles.strike,
              s.code && styles.code,
            ]}
          >
            {s.text}
          </Text>
        </Fragment>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  bold: { fontWeight: "700" },
  italic: { fontStyle: "italic" },
  strike: { textDecorationLine: "line-through" },
  code: { fontFamily: fonts.mono },
});
