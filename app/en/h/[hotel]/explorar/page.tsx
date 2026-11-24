import type { Metadata } from 'next';
import { ExplorarPage as Impl, generateMetadata as meta } from '@/app/_demo/explorar';

// inglés (D-094): la página vive en app/_demo/explorar.tsx
export const generateMetadata = (props: PageProps<'/en/h/[hotel]/explorar'>): Promise<Metadata> => meta(props, 'en');
export default function Page(props: PageProps<'/en/h/[hotel]/explorar'>) {
  return Impl(props, 'en');
}
