import { ListaPage as Impl, metadata as baseMeta } from '@/app/_demo/lista';
import { t } from '@/lib/i18n';

// inglés (D-094): la página vive en app/_demo/lista.tsx
export const metadata = { ...baseMeta, title: t('en', String(baseMeta.title)) };
export default function Page(props: PageProps<'/en/h/[hotel]/lista'>) {
  return Impl(props, 'en');
}
