import { redirect } from 'next/navigation';

/** /demo lleva a la sección de demos de la página de Antesala (D-063). */
export default function DemoPage() {
  redirect('/#demos');
}
