export interface ServiceCategory {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  icon: string;
  keywords: readonly string[];
}

export const SERVICE_CATEGORIES = [
  {
    id: 'electrician',
    label: 'Electrical Services',
    shortLabel: 'Electrician',
    description: 'Wiring, fittings, faults, and power repairs.',
    icon: 'flash-outline',
    keywords: ['electrician', 'wiring', 'light', 'power'],
  },
  {
    id: 'plumber',
    label: 'Plumbing & Water',
    shortLabel: 'Plumber',
    description: 'Leaks, pipes, pumps, drainage, and installations.',
    icon: 'water-outline',
    keywords: ['plumber', 'pipe', 'water', 'drainage'],
  },
  {
    id: 'generator-tech',
    label: 'Generator Services',
    shortLabel: 'Generator Tech',
    description: 'Generator diagnostics, servicing, and repairs.',
    icon: 'hardware-chip-outline',
    keywords: ['generator', 'power', 'engine', 'repair'],
  },
  {
    id: 'tailor',
    label: 'Fashion & Tailoring',
    shortLabel: 'Tailor',
    description: 'Custom clothing, alterations, and fashion support.',
    icon: 'shirt-outline',
    keywords: ['tailor', 'fashion', 'clothes', 'alteration'],
  },
  {
    id: 'hairdresser',
    label: 'Hair & Grooming',
    shortLabel: 'Hairdresser',
    description: 'Hair styling, grooming, and salon services.',
    icon: 'cut-outline',
    keywords: ['hair', 'salon', 'stylist', 'grooming'],
  },
  {
    id: 'mechanic',
    label: 'Auto & Mechanics',
    shortLabel: 'Mechanic',
    description: 'Vehicle diagnostics, servicing, and repairs.',
    icon: 'car-sport-outline',
    keywords: ['mechanic', 'car', 'vehicle', 'engine'],
  },
  {
    id: 'ac-tech',
    label: 'Cooling & AC',
    shortLabel: 'AC Technician',
    description: 'Air-conditioner installation, servicing, and repair.',
    icon: 'snow-outline',
    keywords: ['ac', 'air conditioner', 'cooling', 'repair'],
  },
  {
    id: 'phone-repair',
    label: 'Phone & Device Repair',
    shortLabel: 'Phone Repair',
    description: 'Screen, battery, software, and device repairs.',
    icon: 'phone-portrait-outline',
    keywords: ['phone', 'device', 'screen', 'battery'],
  },
  {
    id: 'caterer',
    label: 'Food & Catering',
    shortLabel: 'Caterer',
    description: 'Meals, event catering, and food services.',
    icon: 'restaurant-outline',
    keywords: ['caterer', 'food', 'meal', 'event'],
  },
  {
    id: 'event-planner',
    label: 'Events & Planning',
    shortLabel: 'Event Planner',
    description: 'Event coordination, vendors, venues, and logistics.',
    icon: 'calendar-outline',
    keywords: ['event', 'planner', 'venue', 'wedding'],
  },
  {
    id: 'event-ticket-sales',
    label: 'Event Tickets',
    shortLabel: 'Ticket Sales',
    description: 'Ticket discovery and sales for local events.',
    icon: 'ticket-outline',
    keywords: ['ticket', 'event', 'concert', 'admission'],
  },
  {
    id: 'photographer',
    label: 'Photo & Video',
    shortLabel: 'Photographer',
    description: 'Photography and visual coverage for every occasion.',
    icon: 'camera-outline',
    keywords: ['photographer', 'photo', 'video', 'camera'],
  },
  {
    id: 'makeup-artist',
    label: 'Makeup & Beauty',
    shortLabel: 'Makeup Artist',
    description: 'Professional makeup and beauty services.',
    icon: 'color-palette-outline',
    keywords: ['makeup', 'beauty', 'artist', 'bridal'],
  },
  {
    id: 'driver',
    label: 'Drivers & Transport',
    shortLabel: 'Driver',
    description: 'Reliable drivers for personal and business trips.',
    icon: 'car-outline',
    keywords: ['driver', 'transport', 'trip', 'car'],
  },
  {
    id: 'cleaner',
    label: 'Cleaning Services',
    shortLabel: 'Cleaner',
    description: 'Home, office, and post-construction cleaning.',
    icon: 'sparkles-outline',
    keywords: ['cleaner', 'cleaning', 'home', 'office'],
  },
  {
    id: 'bricklayer',
    label: 'Masonry & Building',
    shortLabel: 'Bricklayer',
    description: 'Blockwork, masonry, repairs, and construction support.',
    icon: 'cube-outline',
    keywords: ['bricklayer', 'masonry', 'block', 'building'],
  },
  {
    id: 'carpenter',
    label: 'Carpentry & Furniture',
    shortLabel: 'Carpenter',
    description: 'Furniture, fittings, woodwork, and repairs.',
    icon: 'hammer-outline',
    keywords: ['carpenter', 'wood', 'furniture', 'cabinet'],
  },
  {
    id: 'painter',
    label: 'Painting & Finishing',
    shortLabel: 'Painter',
    description: 'Interior, exterior, decorative, and repair painting.',
    icon: 'brush-outline',
    keywords: ['painter', 'paint', 'wall', 'finishing'],
  },
  {
    id: 'welder',
    label: 'Welding & Fabrication',
    shortLabel: 'Welder',
    description: 'Metal fabrication, gates, repairs, and installations.',
    icon: 'flame-outline',
    keywords: ['welder', 'metal', 'gate', 'fabrication'],
  },
  {
    id: 'tiler',
    label: 'Tiling & Surfaces',
    shortLabel: 'Tiler',
    description: 'Wall and floor tiling, repairs, and finishing.',
    icon: 'grid-outline',
    keywords: ['tiler', 'tile', 'floor', 'wall'],
  },
  {
    id: 'tutor',
    label: 'Tutoring & Learning',
    shortLabel: 'Tutor',
    description: 'Academic, exam, digital, and vocational learning.',
    icon: 'school-outline',
    keywords: ['tutor', 'teacher', 'lesson', 'exam'],
  },
  {
    id: 'security',
    label: 'Security Services',
    shortLabel: 'Security',
    description: 'Trained security support for people and property.',
    icon: 'shield-checkmark-outline',
    keywords: ['security', 'guard', 'safety', 'property'],
  },
  {
    id: 'laundry',
    label: 'Laundry & Garment Care',
    shortLabel: 'Laundry',
    description: 'Washing, ironing, dry cleaning, and pickup services.',
    icon: 'water-outline',
    keywords: ['laundry', 'washing', 'ironing', 'clothes'],
  },
  {
    id: 'dj',
    label: 'DJ & Entertainment',
    shortLabel: 'DJ',
    description: 'Music and entertainment for events and venues.',
    icon: 'musical-notes-outline',
    keywords: ['dj', 'music', 'entertainment', 'party'],
  },
  {
    id: 'dispatch',
    label: 'Dispatch & Delivery',
    shortLabel: 'Dispatch Rider',
    description: 'Fast local pickup and delivery services.',
    icon: 'bicycle-outline',
    keywords: ['dispatch', 'delivery', 'rider', 'pickup'],
  },
] as const satisfies readonly ServiceCategory[];

export type ServiceCategoryId = (typeof SERVICE_CATEGORIES)[number]['id'];

export function getServiceCategory(id?: string | null) {
  return SERVICE_CATEGORIES.find((category) => category.id === id);
}

export function getServiceCategoryLabel(id?: string | null) {
  return getServiceCategory(id)?.label ?? 'General Services';
}
