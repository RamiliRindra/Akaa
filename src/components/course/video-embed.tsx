import { getVideoEmbedUrl } from "@/lib/content";

type VideoEmbedProps = {
  url?: string | null;
  title: string;
};

export function VideoEmbed({ url, title }: VideoEmbedProps) {
  const embedUrl = getVideoEmbedUrl(url);

  if (!embedUrl) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[#0c0910]/10 bg-white shadow-sm">
      <div className="aspect-video">
        <iframe
          src={embedUrl}
          title={title}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
}

