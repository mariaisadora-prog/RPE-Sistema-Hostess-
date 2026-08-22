import Link from 'next/link';

export default function Home() {
  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", background: '#09090b', color: '#fafafa', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '2rem 3rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid #27272a' }}>
        <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
          RPE <span style={{ color: '#10b981' }}>Flow</span>
        </span>
        <span style={{ fontSize: '0.65rem', fontWeight: 600, background: '#10b981', color: '#fff', padding: '0.2rem 0.55rem', borderRadius: '9999px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          v1.0
        </span>
      </header>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: '1.25rem' }}>
          Inteligência de <span style={{ color: '#10b981' }}>fluxo</span><br />e conversão
        </h1>
        <p style={{ fontSize: '1.1rem', color: '#a1a1aa', maxWidth: '540px', lineHeight: 1.7, marginBottom: '2.5rem' }}>
          Plataforma de gestão de abordagens para hostess. Registre, acompanhe e analise
          o desempenho da equipe em tempo real.
        </p>
        <Link href="/login" style={{ display: 'inline-block', background: '#10b981', color: '#fff', fontSize: '0.95rem', fontWeight: 600, padding: '0.85rem 2rem', borderRadius: '0.75rem', textDecoration: 'none' }}>
          Acessar sistema →
        </Link>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', maxWidth: '900px', width: '100%', marginTop: '4rem', textAlign: 'left' }}>
          {[
            { icon: '📊', title: 'Dashboard em tempo real', desc: 'Taxas de conversão por grupo e pessoa, desempenho por hora, motivos de recusa e concorrentes.' },
            { icon: '✍️', title: 'Registro rápido de abordagens', desc: 'Interface otimizada para hostess registrarem abordagens em segundos, direto do celular.' },
            { icon: '🎯', title: 'Gestão de campanhas', desc: 'Configure perfis de público, interesses, motivos e concorrentes para cada campanha.' },
            { icon: '👥', title: 'Múltiplos perfis de acesso', desc: 'Controle por perfil: Administrador, Gestor e Hostess, cada um com visibilidade adequada.' },
            { icon: '🏢', title: 'Multi-unidade', desc: 'Gerencie equipes e campanhas em diferentes unidades, com filtros e relatórios isolados.' },
            { icon: '📤', title: 'Exportação CSV', desc: 'Exporte os dados das abordagens com BOM UTF-8 para compatibilidade total com Excel.' },
          ].map((f) => (
            <div key={f.title} style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '1rem', padding: '1.5rem' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>{f.icon}</div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fafafa', marginBottom: '0.4rem' }}>{f.title}</h3>
              <p style={{ fontSize: '0.82rem', color: '#71717a', lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '4rem' }}>
          {[
            { color: '#a855f7', label: 'Administrador — acesso total' },
            { color: '#3b82f6', label: 'Gestor — dashboard e campanhas' },
            { color: '#10b981', label: 'Hostess — registro de abordagens' },
          ].map((r) => (
            <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#18181b', border: '1px solid #27272a', borderRadius: '9999px', padding: '0.45rem 1rem', fontSize: '0.82rem', color: '#a1a1aa' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: r.color, display: 'inline-block' }} />
              {r.label}
            </div>
          ))}
        </div>
      </main>

      <footer style={{ textAlign: 'center', padding: '2rem', fontSize: '0.78rem', color: '#52525b', borderTop: '1px solid #27272a' }}>
        <strong style={{ color: '#a1a1aa' }}>RPE Flow</strong> &mdash; Sistema Hostess 1.0 &mdash; Grupo RPE
      </footer>
    </div>
  );
}
