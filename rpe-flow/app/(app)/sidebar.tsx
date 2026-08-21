'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Profile } from '@/src/types';

interface SidebarProps {
  profile: Profile;
  logoutAction: () => Promise<void>;
}

const roleLabel: Record<string, string> = {
  admin: 'Administrador',
  manager: 'Gestor',
  hostess: 'Hostess',
};

const navItems = [
  { href: '/dashboard', label: 'Dashboard', roles: ['admin', 'manager', 'hostess'] },
  { href: '/approach/new', label: 'Nova Abordagem', roles: ['admin', 'manager', 'hostess'] },
  { href: '/approaches', label: 'Histórico', roles: ['admin', 'manager', 'hostess'] },
  { href: '/admin/campaigns', label: 'Campanhas', roles: ['admin', 'manager'] },
  { href: '/admin/users', label: 'Usuários', roles: ['admin'] },
  { href: '/admin/units', label: 'Unidades', roles: ['admin'] },
];

export default function Sidebar({ profile, logoutAction }: SidebarProps) {
  const pathname = usePathname();

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/');
  }

  const visibleItems = navItems.filter((item) =>
    item.roles.includes(profile.role)
  );

  return (
    <aside className="fixed left-0 top-0 h-full w-56 bg-zinc-900 text-white flex flex-col z-10">
      {/* Logo */}
      <div className="p-6 border-b border-zinc-800">
        <span className="text-lg font-bold text-white">RPE <span className="text-emerald-500">Flow</span></span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive(item.href)
                ? 'bg-emerald-950 text-emerald-500 font-semibold'
                : 'text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {/* User info + logout */}
      <div className="p-4 border-t border-zinc-800">
        <div className="mb-3">
          <p className="text-sm font-medium text-white truncate">{profile.name}</p>
          <p className="text-xs text-zinc-500">{roleLabel[profile.role] ?? profile.role}</p>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="w-full text-left text-xs text-zinc-400 hover:text-white px-2 py-1.5 rounded hover:bg-zinc-800 transition-colors"
          >
            Sair
          </button>
        </form>
      </div>
    </aside>
  );
}
