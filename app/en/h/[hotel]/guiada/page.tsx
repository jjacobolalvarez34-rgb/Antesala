import type { Metadata } from 'next';
import { GuiadaPage as Impl, generateMetadata as meta } from '@/app/_demo/guiada';

// inglés (D-094): la página vive en app/_demo/guiada.tsx
export const generateMetadata = (props: PageProps<'/en/h/[hotel]/guiada'>): Promise<Metadata> => meta(props, 'en');
export default function Page(props: PageProps<'/en/h/[hotel]/guiada'>) {
  return Impl(props, 'en');
}
