import Link from 'next/link';
import Image from 'next/image';

const footerLinks = {
  Boutique: [
    { label: 'Tous les produits', href: '/shop' },
    { label: 'Riz local', href: '/shop?category=riz' },
    { label: 'Légumineuses', href: '/shop?category=legumineuses' },
    { label: 'Céréales', href: '/shop?category=cereales' },
  ],
  Réseau: [
    { label: 'Rejoindre AGRIKIRI', href: '/register' },
    { label: 'Programme MLM', href: '/mlm-program' },
    { label: 'Niveaux & Commissions', href: '/levels' },
    { label: 'Classement', href: '/leaderboard' },
  ],
  Compte: [
    { label: 'Connexion', href: '/login' },
    { label: "S'inscrire", href: '/register' },
    { label: 'Mon tableau de bord', href: '/dashboard' },
    { label: 'Mes gains', href: '/earnings' },
  ],
};

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-agri-dark text-white">
      {/* Main footer */}
      <div className="container-agri py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="relative h-12 w-44 mb-6">
              <Image 
                src="/images/logo.png" 
                alt="AGRIKIRI Logo" 
                fill
                className="object-contain object-left"
              />
            </div>
            <p className="text-gray-400 text-sm leading-relaxed mb-6 max-w-xs">
              La première plateforme e-commerce de produits locaux haïtiens avec un système MLM intégré.
              De nos champs à votre table.
            </p>
            <div className="flex items-center gap-3">
              {['📘', '📷', '🐦', '▶️'].map((icon, i) => (
                <button
                  key={i}
                  className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center text-sm hover:bg-agri-green-600 transition-colors"
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="font-semibold text-white mb-4">{category}</h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-400 hover:text-agri-green-400 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="container-agri py-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-500">
            © {currentYear} AGRIKIRI. Tous droits réservés.
          </p>
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <span>Fait avec</span>
            <span className="text-agri-green-400">❤</span>
            <span>pour Haïti 🇭🇹</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="text-xs text-gray-500 hover:text-white transition-colors">
              Confidentialité
            </Link>
            <Link href="/terms" className="text-xs text-gray-500 hover:text-white transition-colors">
              Conditions
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
