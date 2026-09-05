import { getEnvelope } from '@/lib/envelopes';

/**
 * Envelope layer lab. Development scaffolding, not a product surface.
 *
 * Each layer is rendered ALONE and then in cumulative stacks, at one fixed
 * size, so a misregistration can be attributed to a single layer instead of
 * being inferred from the finished composite. The live gate animates four
 * layers at once over a photograph; when something looks wrong there, nothing
 * tells you which layer caused it.
 */
export const metadata = { robots: { index: false, follow: false } };

const W = 260;

function Frame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <figure className="m-0">
      <div
        className="relative overflow-hidden"
        style={{ width: W, aspectRatio: '768 / 1376', background: '#d8d4cd' }}
      >
        {children}
      </div>
      <figcaption
        className="mt-2 text-[11px] uppercase tracking-[0.14em] text-cocoa"
        style={{ WebkitFontSmoothing: 'antialiased', textRendering: 'optimizeLegibility' }}
      >
        {label}
      </figcaption>
    </figure>
  );
}

/** One layer, drawn exactly as the gate draws it: cover, centred, full box. */
function Layer({ src }: { src: string }) {
  return (
    <div
      className="absolute inset-0"
      style={{
        backgroundImage: `url(${src})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    />
  );
}

export default function EnvelopeLab() {
  const spec = getEnvelope(undefined);
  const l = spec.layers;

  return (
    <main className="min-h-screen bg-bone p-10">
      <h1 className="mb-8 text-2xl">Envelope layers — {spec.name}</h1>

      <p className="mb-8 max-w-prose text-sm text-cocoa">
        Grey ground shows through wherever a layer is transparent. Each stack
        adds exactly one layer to the one before it.
      </p>

      <div className="flex flex-wrap gap-8">
        <Frame label="1 · body alone"><Layer src={l.body} /></Frame>
        <Frame label="2 · pocket alone"><Layer src={l.pocket} /></Frame>
        <Frame label="3 · flap alone"><Layer src={l.flap} /></Frame>
        <Frame label="4 · pocket + flap">
          <Layer src={l.pocket} />
          <Layer src={l.flap} />
        </Frame>
        <Frame label="5 · body + pocket + flap">
          <Layer src={l.body} />
          <Layer src={l.pocket} />
          <Layer src={l.flap} />
        </Frame>
      </div>
    </main>
  );
}
