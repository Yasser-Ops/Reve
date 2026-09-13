/**
 * A design still being drawn.
 *
 * DELIBERATELY INERT. It is not a link, it carries no price, and it names no
 * design, because a card a visitor could mistake for something orderable would
 * make the collection advertise more than Rêve can sell. It holds a shelf open
 * and says work is coming, which is all it is entitled to say.
 *
 * The shape matches TemplateCard's so a section reads as one grid rather than
 * two: the same square image box, then the same two lines of text beneath it.
 */
export function TemplatePlaceholder() {
  return (
    <article aria-hidden="true" className="select-none">
      <div className="grid aspect-square w-full place-items-center rounded-sm border border-dashed border-taupe/50 bg-sand/25">
        <p className="reve-crisp text-[11px] uppercase tracking-[0.16em] text-taupe">
          In the studio
        </p>
      </div>

      <p className="reve-display mt-4 text-[1.35rem] text-taupe/70">
        A new design
      </p>

      <p className="mt-2 text-[13.5px] leading-relaxed text-taupe/70">
        Being drawn now. Ask us what is coming.
      </p>
    </article>
  );
}
