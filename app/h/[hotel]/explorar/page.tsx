import type { Metadata } from 'next';
import { ExplorarPage as Impl, generateMetadata as meta } from '@/app/_demo/explorar';

// español (D-094): la página vive en app/_demo/explorar.tsx
export const generateMetadata = (props: PageProps<'/h/[hotel]/explorar'>): Promise<Metadata> => meta(props, 'es');
export default function Page(props: PageProps<'/h/[hotel]/explorar'>) {
  return Impl(props, 'es');
}
