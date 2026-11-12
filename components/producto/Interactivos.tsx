'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';

import { AntesalaLogo } from '@/components/brand/AntesalaLogo';

import s from './landing.module.css';
import { setModo, useModo } from './modo';
import { Recorrido, type RecorridoData } from './Recorrido';

/** Cambiar entre el modo cine (3D y video) y el ligero (plano y fotos). */
export function ModoToggle() {
  const modo = useModo();
  if (!modo) return null;
  const cine = modo === 'cine';
  return (
    <button
      type="button"
      className={s.modoBtn}
      onClick={() => setModo(cine ? 'ligero' : 'cine')}
      aria-label={cine ? 'Cine: pasar al modo ligero, sin 3D ni video' : 'Ligero: pasar al modo cine, con 3D y video'}
      title={cine ? 'Modo ligero: sin 3D ni video' : 'Modo cine: 3D y video'}
    >
      <span className={s.modoDot} data-on={cine} />
      {cine ? 'Cine' : 'Ligero'}
    </button>
  );
}

/**
 * Bloom al desplazarse rápido (pedido de Jacobo, 2026-11-12): una luz suave que
 * crece con la velocidad del scroll (rueda rápida o salto desde el menú) y se
 * apaga al frenar. Solo opacidad y transform en una capa fija: no toca el diseño.
 */
export function ScrollBloom() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let lastY = window.scrollY;
    let lastT = performance.now();
    let level = 0;
    let dir = 1;
    let raf = 0;
    const tick = (now: number) => {
      const dt = Math.max(1, now - lastT);
      const y = window.scrollY;
      const dy = y - lastY;
      lastY = y;
      lastT = now;
      if (dy !== 0) dir = Math.sign(dy);
      // px por ms; un salto de más de una pantalla en un cuadro cuenta como máximo
      const v = Math.abs(dy) > window.innerHeight * 1.2 ? 99 : Math.abs(dy) / dt;
      const want = Math.min(1, Math.max(0, (v - 1.4) / 4));
      // sube rápido, baja despacio
      level += (want - level) * (want > level ? 0.35 : 0.06);
      if (level < 0.004) level = 0;
      el.style.opacity = (level * 0.85).toFixed(3);
      // la ranura se abre a lo ancho y se corre un poco hacia donde va el scroll
      el.style.transform = `translate3d(0, ${(dir * level * 4).toFixed(2)}vh, 0) scale(${(1 + level * 1.6).toFixed(3)}, ${(1 + level * 0.15).toFixed(3)})`;
      raf = level > 0 ? requestAnimationFrame(tick) : 0;
    };
    const on = () => {
      if (!raf) {
        lastT = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };
    window.addEventListener('scroll', on, { passive: true });
    return () => {
      window.removeEventListener('scroll', on);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return <div ref={ref} aria-hidden className={s.bloom} />;
}

/** Barra superior: transparente sobre el escenario, sólida al bajar. */
export function Nav() {
  const [solid, setSolid] = useState(false);
  // sobre el plano de papel (modo ligero) la barra va siempre sólida
  const ligero = useModo() === 'ligero';
  // transparente solo arriba del todo: al bajar, los textos de los pasos pasan
  // por debajo y con la barra transparente se montaban sobre el logo
  useEffect(() => {
    let raf = 0;
    const on = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        setSolid(window.scrollY > 24);
      });
    };
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => {
      window.removeEventListener('scroll', on);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <header className={`${s.nav} ${solid || ligero ? s.navSolid : ''}`}>
      <Link href="/" aria-label="Antesala, inicio">
        <AntesalaLogo tone="oscuro" symbolClassName="h-7 w-auto" wordClassName="text-[0.8rem]" />
      </Link>
      <ul className={s.navLinks}>
        <li>
          <a href="#recorrido">Recorrido</a>
        </li>
        <li>
          <a href="#demos">Demos</a>
        </li>
        <li>
          <a href="#precios">Precios</a>
        </li>
        <li>
          <a href="#mamut">Mamut Herd</a>
        </li>
      </ul>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <ModoToggle />
        <a className={`${s.btn} ${s.solid}`} href="#cotizar" style={{ minHeight: 40, padding: '0 16px' }}>
          Cotizar
        </a>
      </div>
    </header>
  );
}

/** Recorrido con el aviso de demo del botón "Reservar". */
export function RecorridoConAviso({ data }: { data: RecorridoData }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [open]);
  return (
    <>
      <Recorrido data={data} onReserve={() => setOpen(true)} />
      {open ? (
        <div className={s.dlg} role="dialog" aria-modal="true" aria-labelledby="dlg-t" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className={s.dlgBox}>
            <h3 id="dlg-t">Esto es una demo</h3>
            <p>En su hotel, este botón lleva a su motor de reservas o a su WhatsApp, con la unidad ya elegida.</p>
            <div className={s.acts} style={{ marginTop: 22 }}>
              <a className={`${s.btn} ${s.solid}`} href="#cotizar" onClick={() => setOpen(false)}>
                Quiero esto para mi hotel
              </a>
              <button type="button" className={s.btn} onClick={() => setOpen(false)} autoFocus>
                Seguir explorando
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

/** Cotización sin backend: arma el mensaje y lo abre en WhatsApp o en el correo. */
export function QuoteForm({ whatsapp, email }: { whatsapp: string; email: string }) {
  const id = useId();
  const [text, setText] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) ?? '').trim();
    const lines = [
      'Hola, quiero una cotización de Antesala.',
      v('nombre') && `Nombre: ${v('nombre')}`,
      v('hotel') && `Hotel: ${v('hotel')}`,
      v('ciudad') && `Ciudad: ${v('ciudad')}`,
      `Tipo: ${v('tipo')}`,
      v('unidades') && `Unidades: ${v('unidades')}`,
      `Paquete de interés: ${v('paquete')}`,
      v('mensaje') && `\n${v('mensaje')}`,
    ].filter(Boolean);
    setText(lines.join('\n'));
    setCopied(false);
  };
  return (
    <form className={s.form} onSubmit={submit}>
      <label htmlFor={`${id}-n`}>
        Su nombre
        <input id={`${id}-n`} name="nombre" autoComplete="name" required />
      </label>
      <label htmlFor={`${id}-h`}>
        Hotel
        <input id={`${id}-h`} name="hotel" required />
      </label>
      <label htmlFor={`${id}-c`}>
        Ciudad
        <input id={`${id}-c`} name="ciudad" autoComplete="address-level2" />
      </label>
      <label htmlFor={`${id}-t`}>
        Tipo
        <select id={`${id}-t`} name="tipo">
          <option>Hotel boutique</option>
          <option>Apartahotel</option>
          <option>Glamping</option>
          <option>Constructora</option>
          <option>Otro</option>
        </select>
      </label>
      <label htmlFor={`${id}-u`}>
        Número de unidades
        <input id={`${id}-u`} name="unidades" inputMode="numeric" />
      </label>
      <label htmlFor={`${id}-p`}>
        Paquete de interés
        <select id={`${id}-p`} name="paquete">
          <option>Aún no sé</option>
          <option>Solo página web</option>
          <option>Esencial</option>
          <option>Inmersivo</option>
          <option>Premium</option>
          <option>Corporativo</option>
        </select>
      </label>
      <label htmlFor={`${id}-m`} className={s.full}>
        Mensaje
        <textarea id={`${id}-m`} name="mensaje" placeholder="Lo que quiera contarnos de su hotel" />
      </label>
      <div className={s.full}>
        <button className={`${s.btn} ${s.solid}`} type="submit">
          Preparar mensaje <span className={s.arr}>→</span>
        </button>
      </div>
      {text ? (
        <div className={s.qout} role="status">
          <pre>{text}</pre>
          <div className={s.acts}>
            <a className={`${s.btn} ${s.solid}`} target="_blank" rel="noopener noreferrer" href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(text)}`}>
              Abrir WhatsApp
            </a>
            <button
              type="button"
              className={s.btn}
              onClick={() => {
                navigator.clipboard?.writeText(text).then(
                  () => setCopied(true),
                  () => setCopied(false),
                );
              }}
            >
              {copied ? 'Copiado' : 'Copiar mensaje'}
            </button>
            <a className={s.btn} href={`mailto:${email}?subject=${encodeURIComponent('Cotización Antesala')}&body=${encodeURIComponent(text)}`}>
              Enviar por correo
            </a>
          </div>
        </div>
      ) : null}
    </form>
  );
}

/** Pie: volver a ver la intro. */
export function ReplayIntro({ className }: { className?: string }) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        try {
          sessionStorage.removeItem('antesala:intro-web');
        } catch {
          /* sin almacenamiento */
        }
        // recarga completa a propósito: la intro corre al montar la página
        location.reload();
      }}
    >
      Ver la intro otra vez
    </button>
  );
}
