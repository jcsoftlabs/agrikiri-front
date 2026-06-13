'use client';

export default function HeroSearch() {
  return (
    <form action="/shop" method="GET">
      <div
        className="flex flex-col sm:flex-row gap-2 p-2 rounded-2xl"
        style={{
          background: 'rgba(255,255,255,0.85)',
          border: '1.5px solid rgba(26,92,26,0.15)',
          boxShadow: '0 4px 16px rgba(45,122,45,0.1)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div className="relative flex-1">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: '#78906e' }}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            name="search"
            placeholder="Rechercher un produit haïtien..."
            className="w-full rounded-xl pl-11 pr-4 py-3.5 outline-none transition-all duration-200"
            style={{
              background: 'transparent',
              color: '#1a2e1a',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: '0.9rem',
            }}
            onFocus={(e) => {
              (e.currentTarget.parentElement?.parentElement as HTMLElement).style.borderColor = 'rgba(45,122,45,0.4)';
              (e.currentTarget.parentElement?.parentElement as HTMLElement).style.boxShadow = '0 4px 20px rgba(45,122,45,0.18)';
            }}
            onBlur={(e) => {
              (e.currentTarget.parentElement?.parentElement as HTMLElement).style.borderColor = 'rgba(26,92,26,0.15)';
              (e.currentTarget.parentElement?.parentElement as HTMLElement).style.boxShadow = '0 4px 16px rgba(45,122,45,0.1)';
            }}
          />
        </div>
        <button
          type="submit"
          className="sm:shrink-0 px-6 py-3.5 rounded-xl font-bold text-sm transition-all duration-200 hover:opacity-90 hover:scale-[1.02] active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #2d7a2d, #1a5c1a)',
            color: '#FFFFFF',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            boxShadow: '0 2px 10px rgba(45,122,45,0.3)',
          }}
        >
          Rechercher
        </button>
      </div>
    </form>
  );
}
