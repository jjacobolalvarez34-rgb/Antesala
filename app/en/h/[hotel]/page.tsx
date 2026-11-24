import { EntradaPage as Impl } from '@/app/_demo/entrada';

// inglés (D-094): la página vive en app/_demo/entrada.tsx
export default function Page(props: PageProps<'/en/h/[hotel]'>) {
  return Impl(props, 'en');
}
