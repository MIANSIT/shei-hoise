interface PolicyBlockProps {
  title: string;
  content: string;
  compact?: boolean;
}

export default function PolicyBlock({
  title,
  content,
  compact = false,
}: PolicyBlockProps) {
  return (
    <div>
      {title && <h2 className="text-xl font-semibold mb-3">{title}</h2>}
      <div
        className={`policy-content-wrapper ${
          compact ? "max-h-96 overflow-y-auto pr-2" : ""
        }`}
      >
        <div
          className={`
            prose 
            prose-gray 
            dark:prose-invert
            max-w-none
            ${compact ? "prose-sm" : ""}
            [&_*[data-start]]:border-none
            [&_*[data-end]]:border-none
            [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:mt-6 [&_h1]:mb-4
            [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-3
            [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2
            [&_p]:my-3
            [&_ul]:my-4 [&_ul]:pl-6 [&_ul]:list-disc
            [&_ol]:my-4 [&_ol]:pl-6 [&_ol]:list-decimal
            [&_li]:my-2
            [&_hr]:my-8 [&_hr]:border-gray-300 dark:[&_hr]:border-gray-700
            [&_strong]:font-semibold
            [&_a]:text-blue-600 dark:[&_a]:text-blue-400 [&_a]:underline
          `}
          dangerouslySetInnerHTML={{
            __html:
              content ||
              "<p class='text-gray-800 dark:text-gray-400 italic'>Not provided</p>",
          }}
        />
      </div>
    </div>
  );
}
