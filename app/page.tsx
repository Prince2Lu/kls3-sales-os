export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="flex flex-col items-center gap-8">
        {/* Logo KLS3 */}
        <h1 className="font-syne text-6xl font-bold tracking-tight md:text-8xl">
          <span className="text-text-primary">KLS</span>
          <span className="text-accent">3</span>
        </h1>

        {/* Titre */}
        <h2 className="text-xl font-medium text-text-muted md:text-2xl">
          Sales OS
        </h2>

        {/* Message */}
        <p className="text-sm text-text-muted">Setup en cours</p>
      </div>
    </main>
  )
}
