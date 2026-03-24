export default function Header() {
  return (
    <header
      className="sticky top-0 z-50 border-b border-(--border)"
      style={{ backgroundColor: "#141414" }}
    >
      <div className="pl-10 sm:pl-16 lg:pl-28 pr-8 sm:pr-12 lg:pr-20 py-6">
        <h1 className="text-sm font-medium tracking-[0.25em] text-(--text-primary) uppercase opacity-90">
          AppLens
        </h1>
      </div>
    </header>
  );
}
