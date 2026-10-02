import Link from "next/link";

export function LobbyScreen() {
  return (
    <section className="screen lobby active" aria-label="Lobby">
      <div className="grid-fx" aria-hidden />
      <div className="lobby-inner">
        <span className="eyebrow">Virtual Metal Messe · POC</span>
        <h1>
          Enter the
          <br />
          <em>floor</em>
        </h1>
        <p>
          Walk the exhibition hall, see other visitors, and step into exhibitor booths.
        </p>
        <div className="poc-card">
          <article>
            <span className="tag flat">Hall · Booth</span>
            <h3>Enter hall</h3>
            <p>
              Walk the full floor with WASD or click. Enter a booth — illustrated 2D stand with
              clickable screen, products, brochures &amp; desk.
            </p>
            <Link href="/hall/flat" className="btn">
              Enter hall →
            </Link>
          </article>
          <article>
            <span className="tag flat">Zones · Map</span>
            <h3>Enter zoned hall</h3>
            <p>
              Start with a zone map: 4 zones, booth counts, and active visitors top-right.
            </p>
            <Link href="/hall/zoned" className="btn">
              Enter zoned hall →
            </Link>
          </article>
        </div>
      </div>
    </section>
  );
}
