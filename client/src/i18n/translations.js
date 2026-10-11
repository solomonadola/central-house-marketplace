// Translation strings. English is the default and the fallback for any key
// missing from another language. Values may contain {placeholders}.
export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
];

const en = {
  'nav.browse': 'Browse',
  'nav.insights': 'Insights',
  'nav.about': 'About',
  'nav.signIn': 'Sign in',
  'nav.signUp': 'Sign up',

  'footer.tagline': 'Find a place to rent or buy, talk to owners directly, and book viewings in one place.',
  'footer.explore': 'Explore',
  'footer.account': 'Your account',
  'footer.company': 'Company',
  'footer.rent': 'Homes for rent',
  'footer.sale': 'Homes for sale',
  'footer.offers': 'Special offers',
  'footer.openHouses': 'Open houses',
  'footer.post': 'Post a listing',
  'footer.saved': 'Saved homes',
  'footer.messages': 'Messages',
  'footer.aboutUs': 'About us',
  'footer.help': 'Help & FAQ',
  'footer.rights': '© {year} Central House Marketplace',
  'footer.language': 'Language',
};

const es = {
  'nav.browse': 'Explorar',
  'nav.insights': 'Estadísticas',
  'nav.about': 'Acerca de',
  'nav.signIn': 'Iniciar sesión',
  'nav.signUp': 'Registrarse',

  'footer.tagline': 'Encuentra un lugar para alquilar o comprar, habla con los propietarios y reserva visitas en un solo lugar.',
  'footer.explore': 'Explorar',
  'footer.account': 'Tu cuenta',
  'footer.company': 'Empresa',
  'footer.rent': 'Casas en alquiler',
  'footer.sale': 'Casas en venta',
  'footer.offers': 'Ofertas especiales',
  'footer.openHouses': 'Jornadas de puertas abiertas',
  'footer.post': 'Publicar un anuncio',
  'footer.saved': 'Casas guardadas',
  'footer.messages': 'Mensajes',
  'footer.aboutUs': 'Sobre nosotros',
  'footer.help': 'Ayuda y preguntas',
  'footer.rights': '© {year} Central House Marketplace',
  'footer.language': 'Idioma',
};

export const translations = { en, es };

// Looks up a key in the chosen language, falling back to English and then to
// the key itself, and fills in {placeholder} values.
export const translate = (language, key, vars = {}) => {
  const template = translations[language]?.[key] ?? translations.en[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_, name) => (name in vars ? String(vars[name]) : `{${name}}`));
};
