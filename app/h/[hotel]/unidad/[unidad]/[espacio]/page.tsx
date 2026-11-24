import type { Metadata } from 'next';
import { EspacioPage as Impl, generateMetadata as meta, generateStaticParams as params } from '@/app/_demo/espacio';

// español (D-094): la página vive en app/_demo/espacio.tsx
export const dynamicParams = false;
export const generateStaticParams = params;
export const generateMetadata = (props: PageProps<'/h/[hotel]/unidad/[unidad]/[espacio]'>): Promise<Metadata> => meta(props, 'es');
export default function Page(props: PageProps<'/h/[hotel]/unidad/[unidad]/[espacio]'>) {
  return Impl(props, 'es');
}
