import type { Metadata } from 'next';
import { PisoPage as Impl, generateMetadata as meta, generateStaticParams as params } from '@/app/_demo/piso';

// español (D-094): la página vive en app/_demo/piso.tsx
export const dynamicParams = false;
export const generateStaticParams = params;
export const generateMetadata = (props: PageProps<'/h/[hotel]/piso/[nivel]'>): Promise<Metadata> => meta(props, 'es');
export default function Page(props: PageProps<'/h/[hotel]/piso/[nivel]'>) {
  return Impl(props, 'es');
}
