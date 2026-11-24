import { EntradaPage as Impl } from '@/app/_demo/entrada';

// español (D-094): la página vive en app/_demo/entrada.tsx
export default function Page(props: PageProps<'/h/[hotel]'>) {
  return Impl(props, 'es');
}
