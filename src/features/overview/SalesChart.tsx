import { useState } from 'react';
import type { Calc } from '@/domain/calc';
import { mesLabel, mesLongo, shiftMonth } from '@/lib/dates';
import { brl, brlShort } from '@/lib/format';

const W = 600;
const H = 230;
const LEFT = 58;
const BOTTOM = 200;
const TOP = 14;

function niceStep(max: number) {
  const raw = max / 4;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

/** Sales vs. expenses for the 6 months ending in `month`, with a text version for screen readers. */
export function SalesChart({ calc, month }: { calc: Calc; month: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const data = Array.from({ length: 6 }, (_, i) => {
    const k = shiftMonth(month, i - 5);
    return { k, ...calc.resumoMes(k), lucro: calc.monthProfit(k).profit };
  });
  const max = Math.max(1, ...data.map(d => Math.max(d.vendas, d.gastos)));
  const step = niceStep(max);
  const top = Math.ceil(max / step) * step;
  const colW = (W - LEFT - 8) / 6;
  const barW = Math.min(26, colW / 3.2);
  const y = (v: number) => BOTTOM - (v / top) * (BOTTOM - TOP);
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  const bar = (x: number, v: number, fill: string) => {
    const h = BOTTOM - y(v);
    if (h <= 0) return null;
    const r = Math.min(3, h);
    const yt = y(v);
    return (
      <path
        d={`M${x},${BOTTOM} L${x},${yt + r} Q${x},${yt} ${x + r},${yt} L${x + barW - r},${yt} Q${x + barW},${yt} ${x + barW},${yt + r} L${x + barW},${BOTTOM} Z`}
        className={fill}
      />
    );
  };
  const text = data.map(d => `${mesLongo(d.k)}: vendas ${brl(d.vendas)}, gastos ${brl(d.gastos)}`).join('; ');
  const tip = hover != null ? data[hover] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Vendas e gastos por mês. ${text}.`}
        className="block h-auto w-full text-2xs font-medium"
      >
        {ticks.map(v => (
          <g key={v}>
            <line x1={LEFT} x2={W - 8} y1={y(v)} y2={y(v)} className="stroke-border" />
            <text x={LEFT - 8} y={y(v) + 4} textAnchor="end" className="fill-fg-subtle">
              {brlShort(v)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = LEFT + colW * i + colW / 2;
          return (
            <g key={d.k}>
              {bar(cx - barW - 1, d.vendas, 'fill-chart-1')}
              {bar(cx + 1, d.gastos, 'fill-chart-2')}
              <text x={cx} y={BOTTOM + 18} textAnchor="middle" className={d.k === month ? 'fill-fg font-bold' : 'fill-fg-subtle'}>
                {mesLabel(d.k)}
              </text>
              <rect
                x={LEFT + colW * i + 2}
                y={TOP}
                width={colW - 4}
                height={BOTTOM - TOP}
                className="fill-transparent hover:fill-fg/4"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
            </g>
          );
        })}
      </svg>
      {tip && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-2 z-60 rounded-sm bg-fg px-3 py-2 text-xs/[1.55] text-bg shadow-lg"
          style={{ left: `clamp(0px, ${((LEFT + colW * hover! + colW / 2) / W) * 100}% - 90px, calc(100% - 180px))` }}
        >
          <b>{mesLabel(tip.k)}</b>
          <br />
          Vendas: {brl(tip.vendas)}
          <br />
          Gastos: {brl(tip.gastos)}
          <br />
          Lucro: {brl(tip.lucro)}
          <br />
          Caixa: {brl(tip.saldo)}
        </div>
      )}
    </div>
  );
}
