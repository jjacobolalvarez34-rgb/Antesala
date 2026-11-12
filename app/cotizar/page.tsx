import { redirect } from 'next/navigation';

/** /cotizar lleva al formulario de cotización de la página de Antesala (D-063). */
export default function CotizarPage() {
  redirect('/#cotizar');
}
