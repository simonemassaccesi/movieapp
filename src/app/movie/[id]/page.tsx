/* ============================================================
   MOVIE DETAIL PAGE — Server Component
   ============================================================ */

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
  getMovieDetail,
  getMovieCredits,
  getMovieVideos,
  getWatchProviders,
  getRelatedMovies,
  getGenres,
  tmdbImage,
} from "@/lib/tmdb";

/* === ISR CONFIG ============================================ */
/* ── Cache the rendered page; revalidate every 24h ── */
export const revalidate = 86400;

/* ── Allow on-demand generation of non-prebuilt movie pages ── */
export const dynamicParams = true;

export async function generateMetadata({
  params,
}: MoviePageProps): Promise<Metadata> {
  const { id } = await params;
  const movie = await getMovieDetail(Number(id)).catch(() => null);
  if (!movie) return {};

  const title = movie.title ?? "Film";
  const description = movie.overview
    ? movie.overview.slice(0, 160)
    : `Scopri ${title} su MovieApp`;
  const image = movie.poster_path
    ? tmdbImage.posterLarge(movie.poster_path)
    : null;

  return {
    title,
    description,
    alternates: {
      canonical: `https://www.movieapp.it/movie/${id}`,
    },
    openGraph: {
      title: `${title}`,
      description,
      url: `https://www.movieapp.it/movie/${id}`,
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

interface MoviePageProps {
  params: Promise<{ id: string }>;
}

/* ── Reusable currency formatter ── */
const currencyFmt = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export default async function MoviePage({ params }: MoviePageProps) {
  const { id } = await params;
  const movieId = Number(id);

  const [movie, credits, videos, providers, related, genres] =
    await Promise.all([
      getMovieDetail(movieId),
      getMovieCredits(movieId),
      getMovieVideos(movieId),
      getWatchProviders(movieId, "movie"),
      getRelatedMovies(movieId),
      getGenres(),
    ]).catch(() => notFound());

  const trailer = videos[0] ?? null;
  const director = credits.crew.find((c) => c.job === "Director");
  const cast = credits.cast.slice(0, 12);
  const backdropUrl = tmdbImage.backdropFull(movie.backdrop_path);
  const year = new Date(movie.release_date ?? "").getFullYear();
  const runtime = movie.runtime
    ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m`
    : null;
  const budget = movie.budget ? currencyFmt.format(movie.budget) : null;
  const revenue = movie.revenue ? currencyFmt.format(movie.revenue) : null;
  const movieObj = toMovie({ ...movie, media_type: "movie" }, genres);

  return (
    <>
      {/* Hero — fullscreen backdrop */}
      <section className="relative w-full h-svh">
        {backdropUrl && (
          <Image
            src={backdropUrl}
            alt={movie.title ?? ""}
            fill
            className="object-cover"
            priority
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-bg-primary/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-bg-primary/80 via-transparent to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 px-6 md:px-10 pb-16">
          <div className="max-w-screen-2xl mx-auto flex items-end gap-12">
            {/* Poster — desktop only */}
            <div className="hidden lg:block relative shrink-0 w-74 aspect-[2/3] rounded-xl overflow-hidden shadow-2xl border border-border-subtle">
              {movie.poster_path && (
                <Image
                  src={tmdbImage.posterLarge(movie.poster_path) ?? ""}
                  alt={movie.title ?? ""}
                  fill
                  className="object-cover"
                />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 w-full">
              <h1 className="text-3xl md:text-6xl font-light text-text-primary mb-5 leading-tight">
                {movie.title}
              </h1>

              <div className="flex items-center gap-2 flex-wrap mb-3">
                <span className="text-xs px-2 py-1 rounded-sm border border-accent/30 text-accent bg-accent/10">
                  Film
                </span>
                {runtime && (
                  <>
                    <span className="text-text-muted">·</span>
                    <span className="text-text-secondary md:text-base">
                      {runtime}
                    </span>
                  </>
                )}
                <span className="text-text-muted">·</span>
                <span className="text-text-secondary md:text-base">{year}</span>
                <span className="text-text-muted">·</span>
                <div className="flex items-center gap-1">
                  <Star size={15} className="text-accent" />
                  <span className="text-accent md:text-base font-medium">
                    {formatRating(movie.vote_average)}
                  </span>
                </div>
              </div>

              {director && (
                <p className="text-text-secondary md:text-base mb-4">
                  Regia di{" "}
                  <Link
                    href={`/person/${director.id}`}
                    className="text-text-primary hover:text-accent transition-colors duration-300"
                  >
                    {director.name}
                  </Link>
                </p>
              )}

              <div className="flex gap-2 flex-wrap mb-5">
                {movie.genres?.map((g) => (
                  <span
                    key={g.id}
                    className="text-xs px-2 py-1 rounded-sm border border-border-subtle text-text-secondary"
                  >
                    {g.name}
                  </span>
                ))}
              </div>

              <p className="text-text-primary md:text-base leading-relaxed line-clamp-4 mb-6">
                {movie.overview}
              </p>

              <div className="flex items-center gap-3">
                <MovieActions movie={movieObj} />
                <ShareButton
                  title={movie.title ?? ""}
                  description={movie.overview?.slice(0, 160)}
                  url={`https://www.movieapp.it/movie/${id}`}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content sections */}
      <div className="px-6 md:px-10 py-16 max-w-screen-2xl mx-auto space-y-16">
        {(providers.length > 0 || budget || revenue) && (
          <div className="flex flex-col md:flex-row gap-16">
            {providers.length > 0 && (
              <section className="flex-1">
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

            {(budget || revenue) && (
              <section className="flex-1">
                <h2 className="text-xl font-light text-text-primary mb-6">
                  Box Office
                </h2>
                <div className="flex gap-8 flex-wrap">
                  {budget && (
                    <div>
                      <p className="text-text-muted text-xs mb-1">Budget</p>
                      <p className="text-text-primary text-lg font-light">
                        {budget}
                      </p>
                    </div>
                  )}
                  {revenue && (
                    <div>
                      <p className="text-text-muted text-xs mb-1">Incassi</p>
                      <p className="text-accent text-lg font-light">
                        {revenue}
                      </p>
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>
        )}

        {trailer && (
          <TrailerPlayer trailerKey={trailer.key} title={movie.title ?? ""} />
        )}

        <section>
          <h2 className="text-xl font-light text-text-primary mb-6">Cast</h2>
          <CastGallery cast={cast} />
        </section>

        {related.length > 0 && (
          <section>
            <h2 className="text-xl font-light text-text-primary mb-6">
              Film consigliati
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {related.slice(0, 6).map((m) => (
                <Link href={`/movie/${m.id}`} key={m.id} className="group">
                  <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden bg-surface-2 border border-transparent group-hover:border-accent transition-all duration-300">
                    {m.poster_path && (
                      <Image
                        src={tmdbImage.poster(m.poster_path) ?? ""}
                        alt={m.title ?? ""}
                        fill
                        className="object-cover group-hover:brightness-110 transition-all duration-300"
                      />
                    )}
                  </div>
                  <p className="text-text-secondary text-xs mt-2 truncate group-hover:text-text-primary transition-colors duration-300">
                    {m.title}
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
