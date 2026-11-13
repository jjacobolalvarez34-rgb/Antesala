'use client';

import Link from 'next/link';
import { Moon, Sun } from 'lucide-react';
import { useEffect, useId, useState } from 'react';

import { AntesalaLogo } from '@/components/brand/AntesalaLogo';
import { lessMotion } from '@/lib/motion';

import s from './landing.module.css';
import { setModo, useModo } from './modo';
import { setTema, useTema } from './tema';
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

/** Claro u oscuro (pedido de Jacobo, 2026-11-13). */
export function TemaToggle() {
  const tema = useTema();
  if (!tema) return null;
  const oscuro = tema === 'oscuro';
  return (
    <button
      type="button"
      className={s.modoBtn}
      onClick={() => setTema(oscuro ? 'claro' : 'oscuro')}
      aria-label={oscuro ? 'Tema oscuro: pasar al claro' : 'Tema claro: pasar al oscuro'}
      title={oscuro ? 'Pasar al tema claro' : 'Pasar al tema oscuro'}
    >
      {oscuro ? <Sun aria-hidden size={14} strokeWidth={1.6} /> : <Moon aria-hidden size={14} strokeWidth={1.6} />}
      <span className={s.temaTxt}>{oscuro ? 'Claro' : 'Oscuro'}</span>
    </button>
  );
}

/**
 * Transición de puerta al saltar a una sección (pedido de Jacobo, 2026-11-12): dos
 * paneles azul noche se cierran hacia el centro con la ranura de luz de la marca,
 * la página se mueve detrás y la puerta se abre otra vez. Solo transform y
 * opacidad. Si el destino está a menos de una pantalla, desliza sin puerta; en
 * modo ligero también.
 */
function doorTo(target: HTMLElement, hash: string) {
  const host = document.querySelector('.marca-antesala') ?? document.body;
  const dist = Math.abs(target.getBoundingClientRect().top);
  const go = () => {
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, target.getBoundingClientRect().top + window.scrollY);
    document.documentElement.style.scrollBehavior = '';
    history.replaceState(null, '', hash);
  };
  if (dist < window.innerHeight * 1.1 || lessMotion() || typeof document.body.animate !== 'function') {
    window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY, behavior: 'smooth' });
    history.replaceState(null, '', hash);
    return;
  }
  const door = document.createElement('div');
  door.className = s.door ?? "";
  door.setAttribute('aria-hidden', 'true');
  door.innerHTML = `<i class="${s.doorL}"></i><i class="${s.doorR}"></i><b class="${s.doorSlit}"></b>`;
  host.appendChild(door);
  const [l, r, slit] = Array.from(door.children) as HTMLElement[];
  const ease = 'cubic-bezier(.7,0,.3,1)';
  const shut = { duration: 460, easing: ease, fill: 'forwards' as const };
  l!.animate([{ transform: 'translateX(-101%)' }, { transform: 'translateX(0)' }], shut);
  r!.animate([{ transform: 'translateX(101%)' }, { transform: 'translateX(0)' }], shut);
  slit!.animate([{ opacity: 0, transform: 'translateX(-50%) scaleY(.2)' }, { opacity: 1, transform: 'translateX(-50%) scaleY(1)' }], { duration: 380, delay: 240, easing: 'ease-out', fill: 'forwards' });
  window.setTimeout(() => {
    go();
    const open = { duration: 620, delay: 140, easing: ease, fill: 'forwards' as const };
    l!.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-101%)' }], open);
    r!.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(101%)' }], open);
    slit!.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, easing: 'ease-in', fill: 'forwards' });
    window.setTimeout(() => door.remove(), 900);
  }, 520);
}

/** Barra superior: transparente sobre el escenario, sólida al bajar. */
export function Nav() {
  const [solid, setSolid] = useState(false);
  // sobre el plano de papel (modo ligero) la barra va siempre sólida
  const ligero = useModo() === 'ligero';
  // transparente solo arriba del todo: al bajar, los textos de los pasos pasan
  // por debajo y con la barra transparente se montaban sobre el logo
  // los enlaces a secciones (menú, botones) pasan por la puerta
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const a = (e.target as HTMLElement).closest('a[href^="#"]') as HTMLAnchorElement | null;
      const hash = a?.getAttribute('href') ?? '';
      const target = hash.length > 1 ? document.getElementById(hash.slice(1)) : null;
      if (!a || !target) return;
      e.preventDefault();
      doorTo(target, hash);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
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
        <TemaToggle />
        <ModoToggle />
        <a className={`${s.btn} ${s.solid}`} href="#cotizar" style={{ minHeight: 40, padding: '0 16px' }}>
          Cotizar
        </a>
      </div>
    </header>
  );
}

/** Recorrido: el botón de la reserva lleva a las demos (antes abría un aviso que tapaba la página). */
export function RecorridoConAviso({ data }: { data: RecorridoData }) {
  return <Recorrido data={data} onReserve={() => document.getElementById('demos')?.scrollIntoView({ behavior: 'smooth' })} />;
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
          <option>A la medida (varias sedes)</option>
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
