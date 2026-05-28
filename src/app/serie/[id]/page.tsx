import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import { formatRating, toMovie } from "@/lib/utils";
import CastGallery from "@/components/ui/CastGallery";
import TrailerPlayer from "@/components/ui/TrailerPlayer";
import MovieActions from "@/components/ui/MovieActions";
import type { Metadata } from "next";
import ShareButton from "@/components/ui/ShareButton";
import {
  getSeriesDetail,
  getSeriesCredits,
  getSeriesVideos,
  getWatchProviders,
  getRelatedSeries,
  getGenres,
  tmdbImage,
} from "@/lib/tmdb";

/* === ISR CONFIG ============================================ */
/* ── Cache the rendered page; revalidate every 24h ── */
export const revalidate = 86400;

/* ── Allow on-demand generation of non-prebuilt pages ── */
export const dynamicParams = true;

export async function generateMetadata({
  params,
}: SeriePageProps): Promise<Metadata> {
  const { id } = await params;
  const serie = await getSeriesDetail(Number(id)).catch(() => null);
  if (!serie) return {};

  const title = serie.name ?? "Serie TV";
  const description = serie.overview
    ? serie.overview.slice(0, 160)
    : `Scopri ${title} su MovieApp`;
  const image = serie.poster_path
    ? tmdbImage.posterLarge(serie.poster_path)
    : null;

  return {
    title,
    description,
    alternates: {
      canonical: `https://www.movieapp.it/serie/${id}`,
    },
    openGraph: {
      title: `${title}`,
      description,
      url: `https://www.movieapp.it/serie/${id}`,
      images: image
        ? [{ url: image, width: 500, height: 750, alt: title }]
        : [],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title}`,
      description,
      images: image ? [image] : [],
    },
  };
}

/* =============================================
   PROPS
   ============================================= */
interface SeriePageProps {
  params: Promise<{ id: string }>;
}

/* =============================================
   SERIE DETAIL PAGE — SERVER COMPONENT
   ============================================= */
export default async function SeriePage({ params }: SeriePageProps) {
  const { id } = await params;
  const serieId = Number(id);

  /* ── Fetch all data in parallel ── */
  const [serie, credits, videos, providers, related, genres] =
    await Promise.all([
      getSeriesDetail(serieId),
      getSeriesCredits(serieId),
      getSeriesVideos(serieId),
      getWatchProviders(serieId, "tv"),
      getRelatedSeries(serieId),
      getGenres(),
    ]).catch(() => notFound());

  /* ── Data helpers ── */
  const trailer = videos[0] ?? null;
  const creator =
    credits.crew.find(
      (c) => c.job === "Director" || c.job === "Executive Producer",
    ) ?? null;
  const cast = credits.cast.slice(0, 12);
  const backdropUrl = tmdbImage.backdropFull(serie.backdrop_path);
  const year = new Date(serie.first_air_date ?? "").getFullYear();

  /* ── Build Movie object for MovieActions ── */
  const serieObj = toMovie({ ...serie, media_type: "tv" }, genres);

  return (
    <>
      {/* ── Hero — fullscreen backdrop ── */}
      <section className="relative w-full h-svh">
        {backdropUrl && (
          <Image
            src={backdropUrl}
            alt={serie.name ?? ""}
            fill
            className="object-cover"
            priority
          />
        )}

        {/* Gradients overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-bg-primary/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-bg-primary/80 via-transparent to-transparent" />

        {/* ── Hero content ── */}
        <div className="absolute bottom-0 left-0 right-0 px-6 md:px-10 pb-16">
          <div className="max-w-screen-2xl mx-auto flex items-end gap-12">
            {/* ── Poster desktop ── */}
            <div className="hidden lg:block relative shrink-0 w-74 aspect-[2/3] rounded-xl overflow-hidden shadow-2xl border border-border-subtle">
              {serie.poster_path && (
                <Image
                  src={tmdbImage.posterLarge(serie.poster_path) ?? ""}
                  alt={serie.name ?? ""}
                  fill
                  className="object-cover"
                />
              )}
            </div>

            {/* ── Info ── */}
            <div className="flex-1 w-full">
              {/* Title */}
              <h1 className="text-3xl md:text-6xl font-light text-text-primary mb-5 leading-tight">
                {serie.name}
              </h1>

              {/* Meta */}
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <span className="text-xs px-2 py-1 rounded-sm border border-blue-400/30 text-blue-400 bg-blue-400/10">
                  Serie
                </span>
                {serie.number_of_seasons && (
                  <>
                    <span className="text-text-muted">·</span>
                    <span className="text-text-secondary md:text-base">
                      {serie.number_of_seasons}{" "}
                      {serie.number_of_seasons === 1 ? "stagione" : "stagioni"}
                    </span>
                  </>
                )}
                {serie.number_of_episodes && (
                  <>
                    <span className="text-text-muted">·</span>
                    <span className="text-text-secondary md:text-base">
                      {serie.number_of_episodes} episodi
                    </span>
                  </>
                )}
                <span className="text-text-muted">·</span>
                <span className="text-text-secondary md:text-base">{year}</span>
                <span className="text-text-muted">·</span>
                <div className="flex items-center gap-1">
                  <Star size={15} className="text-accent" />
                  <span className="text-accent md:text-base font-medium">
                    {formatRating(serie.vote_average)}
                  </span>
                </div>
              </div>

              {/* Creator */}
              {creator && (
                <p className="text-text-secondary md:text-base mb-4">
                  Creata da{" "}
                  <Link
                    href={`/person/${creator.id}`}
                    className="text-text-primary hover:text-accent transition-colors duration-300"
                  >
                    {creator.name}
                  </Link>
                </p>
              )}

              {/* Genre chips */}
              <div className="flex gap-2 flex-wrap mb-5">
                {serie.genres?.map((g) => (
                  <span
                    key={g.id}
                    className="text-xs px-2 py-1 rounded-sm border border-border-subtle text-text-secondary"
                  >
                    {g.name}
                  </span>
                ))}
              </div>

              {/* Plot */}
              <p className="text-text-primary md:text-base leading-relaxed line-clamp-4 mb-6">
                {serie.overview}
              </p>

              {/* Action buttons */}
              <div className="flex items-center gap-3">
                <MovieActions movie={serieObj} />
                <ShareButton
                  title={serie.name ?? ""}
                  description={serie.overview?.slice(0, 160)}
                  url={`https://www.movieapp.it/serie/${id}`}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Content sections ── */}
      <div className="px-6 md:px-10 py-16 max-w-screen-2xl mx-auto space-y-16">
        {/* ── Disponibile su ── */}
        {providers.length > 0 && (
          <section>
            <h2 className="text-xl font-light text-text-primary mb-6">
              Disponibile su
            </h2>
            <div className="flex gap-3 flex-wrap">
              {providers.map((p) => (
                <div
                  key={p.provider_id}
                  className="relative w-16 h-16 rounded-xl overflow-hidden border border-border-subtle"
                  title={p.provider_name}
                >
                  <Image
                    src={tmdbImage.profile(p.logo_path) ?? ""}
                    alt={p.provider_name}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Trailer ── */}
        {trailer && (
          <TrailerPlayer trailerKey={trailer.key} title={serie.name ?? ""} />
        )}

        {/* ── Cast ── */}
        <section>
          <h2 className="text-xl font-light text-text-primary mb-6">Cast</h2>
          <CastGallery cast={cast} />
        </section>

        {/* ── Related series ── */}
        {related.length > 0 && (
          <section>
            <h2 className="text-xl font-light text-text-primary mb-6">
              Serie consigliate
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {related.slice(0, 6).map((s) => (
                <Link href={`/serie/${s.id}`} key={s.id} className="group">
                  <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden bg-surface-2 border border-transparent group-hover:border-accent transition-all duration-300">
                    {s.poster_path && (
                      <Image
                        src={tmdbImage.poster(s.poster_path) ?? ""}
                        alt={s.name ?? ""}
                        fill
                        className="object-cover group-hover:brightness-110 transition-all duration-300"
                      />
                    )}
                  </div>
                  <p className="text-text-secondary text-xs mt-2 truncate group-hover:text-text-primary transition-colors duration-300">
                    {s.name}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
