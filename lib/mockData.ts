/**
 * =============================================
 * MODE MOCK — Données fictives pour les associés et livreurs
 * Activé via NEXT_PUBLIC_MOCK_MODE=true dans .env.local
 * Désactiver après renouvellement de la DB Postgres
 * =============================================
 */

export const IS_MOCK = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';

// ─── Livreur Mock (DELIVERY_AGENT) ─────────────────────────────────────────────────────
const MOCK_ROLE = (process.env.NEXT_PUBLIC_MOCK_ROLE || 'DELIVERY_AGENT') as
  | 'DELIVERY_AGENT'
  | 'ASSOCIATE'
  | 'AYIZAN'
  | 'BUYER'
  | 'CUSTOMER';

export { MOCK_ROLE };

// ─── Livraisons Mock ─────────────────────────────────────────────────────────────────────
const mockDeliveryBase = {
  customerId: 'cust-001',
  paymentStatus: 'PAID' as const,
  createdAt: '2026-05-12T08:00:00Z',
  trackingEvents: [],
  orderItems: [],
  items: [],
  deliveredLatitude: null,
  deliveredLongitude: null,
  deliveredLocationAccuracy: null,
};

export const MOCK_DELIVERIES = [
  {
    ...mockDeliveryBase,
    id: 'order-001-mock',
    orderNumber: 'AGR-2026-001',
    totalAmount: 4500,
    status: 'PROCESSING' as const,
    paymentMethod: 'CASH' as const,
    deliveryZone: 'Pétionville',
    customer: { firstName: 'Sophie', lastName: 'Paul', email: 'sophie@mail.com', phone: '+50936000001' },
    deliveryAddress: {
      label: 'Domicile',
      countryCode: 'HT' as const,
      fullName: 'Sophie Paul',
      phoneCountryCode: '+509' as const,
      phoneNumber: '36000001',
      addressLine1: '45 Rue Faubert',
      addressLine2: 'Apt 3B',
      city: 'Pétionville',
      stateRegion: 'Ouest',
    },
  },
  {
    ...mockDeliveryBase,
    id: 'order-002-mock',
    orderNumber: 'AGR-2026-002',
    totalAmount: 7200,
    status: 'SHIPPED' as const,
    paymentMethod: 'MONCASH' as const,
    deliveryZone: 'Delmas',
    customer: { firstName: 'Marc', lastName: 'Estimp', email: 'marc@mail.com', phone: '+50937000002' },
    deliveryAddress: {
      label: 'Bureau',
      countryCode: 'HT' as const,
      fullName: 'Marc Estimp',
      phoneCountryCode: '+509' as const,
      phoneNumber: '37000002',
      addressLine1: '12 Rue Lamarre',
      city: 'Delmas 33',
      stateRegion: 'Ouest',
    },
    shippedAt: '2026-05-13T07:30:00Z',
  },
  {
    ...mockDeliveryBase,
    id: 'order-003-mock',
    orderNumber: 'AGR-2026-003',
    totalAmount: 2800,
    status: 'DELIVERED' as const,
    paymentMethod: 'CASH' as const,
    deliveryZone: 'Tabarre',
    customer: { firstName: 'Carla', lastName: 'Bélus', email: 'carla@mail.com', phone: '+50938000003' },
    deliveryAddress: {
      countryCode: 'HT' as const,
      fullName: 'Carla Bélus',
      phoneCountryCode: '+509' as const,
      phoneNumber: '38000003',
      addressLine1: 'Impasse Rose, #7',
      city: 'Tabarre',
      stateRegion: 'Ouest',
    },
    deliveredAt: '2026-05-12T15:45:00Z',
    deliveryRecipientName: 'Carla Bélus',
  },
  {
    ...mockDeliveryBase,
    id: 'order-004-mock',
    orderNumber: 'AGR-2026-004',
    totalAmount: 3100,
    status: 'DELIVERY_FAILED' as const,
    paymentMethod: 'CASH' as const,
    deliveryZone: 'Croix-des-Bouquets',
    customer: { firstName: 'Patrick', lastName: 'Moise', email: 'pat@mail.com', phone: '+50939000004' },
    deliveryAddress: {
      countryCode: 'HT' as const,
      fullName: 'Patrick Moise',
      phoneCountryCode: '+509' as const,
      phoneNumber: '39000004',
      addressLine1: 'Route de Framboise, Lot 14',
      city: 'Croix-des-Bouquets',
      stateRegion: 'Ouest',
    },
    deliveryProofNote: 'Client absent. Adresse introuvable.',
  },
];

// ─── Dossiers ─────────────────────────────────────────────────────────────────
export const MOCK_DOSSIERS = [
  {
    id: 'dossier-001-mock',
    title: 'Expansion des parcelles agricoles — Zone Nord',
    description: 'Évaluation des opportunités d\'acquisition de nouvelles terres agricoles dans la région du Nord pour augmenter la capacité de production d\'Agrikiri de 40%.',
    status: 'OPEN',
    createdAt: '2026-05-01T10:00:00Z',
    author: { firstName: 'Marie', lastName: 'Joseph' },
    _count: { documents: 3, votes: 5 },
    documents: [
      { id: 'doc-001', name: 'Rapport_Foncier_Nord.pdf', url: '#' },
      { id: 'doc-002', name: 'Etude_Impact_Environnemental.pdf', url: '#' },
      { id: 'doc-003', name: 'Plan_Financier_Q3_2026.xlsx', url: '#' },
    ],
    comments: [
      {
        id: 'c-001',
        content: 'J\'ai reviewé le rapport foncier. Les prix sont raisonnables pour la zone.',
        createdAt: '2026-05-03T14:30:00Z',
        author: { firstName: 'Jean', lastName: 'Demo' },
      },
      {
        id: 'c-002',
        content: 'Il faudrait valider les titres de propriété avant d\'avancer.',
        createdAt: '2026-05-05T09:00:00Z',
        author: { firstName: 'Marie', lastName: 'Joseph' },
      },
    ],
  },
  {
    id: 'dossier-002-mock',
    title: 'Partenariat logistique avec DigiLogHaiti',
    description: 'Négociation d\'un accord de partenariat exclusif avec DigiLogHaiti pour optimiser la chaîne de livraison des produits agricoles vers Port-au-Prince et les régions côtières.',
    status: 'IN_REVIEW',
    createdAt: '2026-04-15T08:00:00Z',
    author: { firstName: 'Pierre', lastName: 'Dupont' },
    _count: { documents: 1, votes: 2 },
    documents: [
      { id: 'doc-004', name: 'Contrat_Partenariat_DigiLog.pdf', url: '#' },
    ],
    comments: [],
  },
  {
    id: 'dossier-003-mock',
    title: 'Campagne de financement Série A',
    description: 'Lancement d\'une campagne de levée de fonds Série A ciblant 500,000 USD pour financer le développement technologique de la plateforme MLM et l\'expansion opérationnelle.',
    status: 'COMPLETED',
    createdAt: '2026-03-01T07:00:00Z',
    author: { firstName: 'Jean', lastName: 'Demo' },
    _count: { documents: 5, votes: 8 },
    documents: [
      { id: 'doc-005', name: 'Pitch_Deck_SerieA.pdf', url: '#' },
      { id: 'doc-006', name: 'Projections_Financieres_2026_2028.xlsx', url: '#' },
    ],
    comments: [
      {
        id: 'c-003',
        content: 'Excellent pitch deck. Prêt pour la présentation aux investisseurs.',
        createdAt: '2026-03-10T11:00:00Z',
        author: { firstName: 'Pierre', lastName: 'Dupont' },
      },
    ],
  },
];

// ─── Sessions de Vote ──────────────────────────────────────────────────────────
export const MOCK_VOTES = [
  {
    id: 'vote-001-mock',
    title: 'Approbation du budget Q3 2026',
    description: 'Vote pour l\'approbation du budget trimestriel de 2,500,000 HTG incluant les dépenses opérationnelles, logistiques et marketing pour le troisième trimestre 2026.',
    isActive: true,
    expiresAt: '2026-05-20T23:59:00Z',
    createdAt: '2026-05-10T08:00:00Z',
    dossier: { title: 'Campagne de financement Série A' },
    _count: { ballots: 3 },
  },
  {
    id: 'vote-002-mock',
    title: 'Nomination du Directeur des Opérations',
    description: 'Vote pour l\'approbation de la nomination de Mme. Carole Pierre au poste de Directrice des Opérations régionales, suite au départ de l\'ancien titulaire.',
    isActive: true,
    expiresAt: '2026-05-18T17:00:00Z',
    createdAt: '2026-05-08T10:00:00Z',
    dossier: null,
    _count: { ballots: 4 },
  },
];

// ─── Messages de Chat ─────────────────────────────────────────────────────────
export const MOCK_MESSAGES = [
  {
    id: 'msg-001-mock',
    content: 'Bonjour à tous! La réunion du conseil est confirmée pour vendredi 16h.',
    createdAt: '2026-05-13T07:00:00Z',
    sender: { firstName: 'Marie', lastName: 'Joseph', associateType: 'PDG', avatarUrl: null },
  },
  {
    id: 'msg-002-mock',
    content: 'Parfait. J\'ai partagé les documents du dossier Nord dans l\'espace dossiers.',
    createdAt: '2026-05-13T07:15:00Z',
    sender: { firstName: 'Pierre', lastName: 'Dupont', associateType: 'INVESTOR', avatarUrl: null },
  },
  {
    id: 'msg-003-mock',
    content: 'Merci Pierre. On va passer en revue le partenariat DigiLog aussi.',
    createdAt: '2026-05-13T07:30:00Z',
    sender: { firstName: 'Jean', lastName: 'Demo', associateType: 'INVESTOR', avatarUrl: null },
  },
  {
    id: 'msg-004-mock',
    content: 'N\'oubliez pas de voter sur le budget Q3 avant jeudi!',
    createdAt: '2026-05-13T08:00:00Z',
    sender: { firstName: 'Marie', lastName: 'Joseph', associateType: 'PDG', avatarUrl: null },
  },
];
