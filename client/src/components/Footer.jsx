import { Link } from 'react-router-dom';
import Logo from './Logo';
import { useTranslation } from '../i18n/context';
import { LANGUAGES } from '../i18n/translations';

export default function Footer() {
  const { t, language, setLanguage } = useTranslation();

  const columns = [
    [
      t('footer.explore'),
      [
        [t('footer.rent'), '/search?type=rent'],
        [t('footer.sale'), '/search?type=sale'],
        [t('footer.offers'), '/search?offer=true'],
        [t('footer.openHouses'), '/open-houses'],
      ],
    ],
    [
      t('footer.account'),
      [
        [t('footer.post'), '/create-listing'],
        [t('footer.saved'), '/saved'],
        [t('footer.messages'), '/messages'],
      ],
    ],
    [t('footer.company'), [[t('footer.aboutUs'), '/about'], [t('footer.help'), '/help']]],
  ];

  return (
    <footer className='mt-16 border-t border-slate-200 bg-white print:hidden'>
      <div className='container-page grid grid-cols-2 gap-8 py-10 lg:grid-cols-5'>
        <div className='col-span-2'>
          <Logo />
          <p className='mt-3 max-w-xs text-sm text-slate-600'>{t('footer.tagline')}</p>
        </div>
        {columns.map(([title, links]) => (
          <nav key={title} aria-label={title}>
            <h2 className='text-sm font-semibold text-slate-900'>{title}</h2>
            <ul className='mt-3 space-y-2'>
              {links.map(([label, to]) => (
                <li key={to}>
                  <Link to={to} className='text-sm text-slate-600 hover:text-brand-700'>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className='border-t border-slate-100'>
        <div className='container-page flex flex-wrap items-center justify-between gap-3 py-4'>
          <p className='text-xs text-slate-500'>{t('footer.rights', { year: new Date().getFullYear() })}</p>
          <label className='flex items-center gap-2 text-xs text-slate-500'>
            <span className='sr-only'>{t('footer.language')}</span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              aria-label={t('footer.language')}
              className='rounded border border-slate-200 p-1'
            >
              {LANGUAGES.map(({ code, label }) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </footer>
  );
}
