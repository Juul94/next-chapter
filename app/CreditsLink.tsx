// Link til Anthropic-konsollen, hvor man fylder kredit på
export default function CreditsLink() {
  return (
    <a
      href="https://platform.claude.com/settings/billing"
      target="_blank"
      rel="noreferrer"
      className="ml-auto text-sm text-gray-600 underline-offset-4 hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-primary"
    >
      Add more credits
    </a>
  );
}
