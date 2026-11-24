import type { Metadata } from 'next';
import { UnidadPage as Impl, generateMetadata as meta, generateStaticParams as params } from '@/app/_demo/unidad';

// inglés (D-094): la página vive en app/_demo/unidad.tsx
export const dynamicParams = false;
export const generateStaticParams = params;
export const generateMetadata = (props: PageProps<'/en/h/[hotel]/unidad/[unidad]'>): Promise<Metadata> => meta(props, 'en');
export default function Page(props: PageProps<'/en/h/[hotel]/unidad/[unidad]'>) {
  return Impl(props, 'en');
}
