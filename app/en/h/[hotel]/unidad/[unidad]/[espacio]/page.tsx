import type { Metadata } from 'next';
import { EspacioPage as Impl, generateMetadata as meta, generateStaticParams as params } from '@/app/_demo/espacio';

// inglés (D-094): la página vive en app/_demo/espacio.tsx
export const dynamicParams = false;
export const generateStaticParams = params;
export const generateMetadata = (props: PageProps<'/en/h/[hotel]/unidad/[unidad]/[espacio]'>): Promise<Metadata> => meta(props, 'en');
export default function Page(props: PageProps<'/en/h/[hotel]/unidad/[unidad]/[espacio]'>) {
  return Impl(props, 'en');
}
