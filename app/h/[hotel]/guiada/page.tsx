import type { Metadata } from 'next';
import { GuiadaPage as Impl, generateMetadata as meta } from '@/app/_demo/guiada';

// español (D-094): la página vive en app/_demo/guiada.tsx
export const generateMetadata = (props: PageProps<'/h/[hotel]/guiada'>): Promise<Metadata> => meta(props, 'es');
export default function Page(props: PageProps<'/h/[hotel]/guiada'>) {
  return Impl(props, 'es');
}
