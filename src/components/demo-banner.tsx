// Visible banner for member-area pages that are not yet behind real
// authentication — keeps the public, journalist, and SEC views from
// mistaking a demo dashboard for live member data.

export function DemoBanner({
  message = "Sample view — member-area features ship with the Miami launch. No real co-ownership data is shown here.",
}: {
  message?: string;
}) {
  return (
    <div className="border-b border-red/30 bg-red/10 px-6 py-2 text-center text-xs text-red sm:px-10">
      <span className="mr-1 font-medium uppercase tracking-wider">Demo</span>
      <span className="text-ink-soft">{message}</span>
    </div>
  );
}
