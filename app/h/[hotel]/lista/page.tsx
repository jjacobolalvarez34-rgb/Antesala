import { ListaPage as Impl, metadata as baseMeta } from '@/app/_demo/lista';
import { t } from '@/lib/i18n';

// español (D-094): la página vive en app/_demo/lista.tsx
export const metadata = { ...baseMeta, title: t('es', String(baseMeta.title)) };
export default function Page(props: PageProps<'/h/[hotel]/lista'>) {
  return Impl(props, 'es');
}
