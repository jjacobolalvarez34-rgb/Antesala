import type { Metadata } from 'next';
import { HotelLayout as Impl, generateMetadata as meta, generateStaticParams as params } from '@/app/_demo/layout';

// español (D-094): la página vive en app/_demo/layout.tsx
export const dynamicParams = false;
export const generateStaticParams = params;
export const generateMetadata = (props: LayoutProps<'/h/[hotel]'>): Promise<Metadata> => meta(props, 'es');
export default function Layout(props: LayoutProps<'/h/[hotel]'>) {
  return Impl(props, 'es');
}
