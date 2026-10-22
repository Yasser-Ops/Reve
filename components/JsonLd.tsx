/**
 * Structured data, as a script tag.
 *
 * JSON.stringify leaves `<` alone, so a value containing "</script>" would end
 * the tag early and run whatever followed. Every `<` is escaped to its unicode
 * form, which JSON parsers read back as the same character.
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
      type="application/ld+json"
    />
  );
}
