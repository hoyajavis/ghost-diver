import React, { useState } from 'react';

interface Props {
  value: string; // "x,y"
  onChange: (val: string) => void;
  onSubmit: () => void;
}

const AXIS_VALUES = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5];
const Y_VALUES = [5, 4, 3, 2, 1, 0, -1, -2, -3, -4, -5];

export const CoordinateGrid: React.FC<Props> = ({ value, onChange, onSubmit }) => {
  const [hovered, setHovered] = useState<[number, number] | null>(null);
  const [x, y] = value ? value.split(',').map(Number) : [null, null];

  const handleCellClick = (cx: number, cy: number) => {
    onChange(`${cx},${cy}`);
  };

  return (
    <div className="w-full max-w-[340px] mx-auto flex flex-col gap-2">
      {/* Grid with Y-axis tick labels on the left */}
      <div className="flex items-stretch gap-1">
        <div className="flex flex-col justify-between py-1 pr-0.5 text-right select-none" aria-hidden="true">
          {Y_VALUES.map((cy) => (
            <div
              key={cy}
              className={`flex-1 flex items-center justify-end text-[11px] leading-none font-bold tabular-nums ${
                cy === 0 ? 'text-neon-cyan' : 'text-gb-2'
              }`}
            >
              {cy}
            </div>
          ))}
        </div>

        <div className="flex-1 flex flex-col gap-1">
          <div className="w-full aspect-square grid grid-cols-11 gap-0 border-2 border-gb-3 bg-gb-0 p-0.5 relative">
            {Y_VALUES.map((cy) =>
              AXIS_VALUES.map((cx) => {
                const isSelected = x === cx && y === cy;
                const isXAxis = cy === 0;
                const isYAxis = cx === 0;
                const isOrigin = cx === 0 && cy === 0;

                let bgClass = 'bg-gb-0 hover:bg-gb-2/60';
                if (isSelected) bgClass = 'bg-neon-cyan';
                else if (isOrigin) bgClass = 'bg-gb-3/80';
                else if (isXAxis || isYAxis) bgClass = 'bg-gb-1/90';

                return (
                  <button
                    key={`${cx},${cy}`}
                    type="button"
                    aria-label={`Plot coordinate (${cx}, ${cy})`}
                    aria-pressed={isSelected}
                    onClick={() => handleCellClick(cx, cy)}
                    onMouseEnter={() => setHovered([cx, cy])}
                    onMouseLeave={() => setHovered(null)}
                    className={`w-full aspect-square border border-gb-3/25 ${bgClass} transition-colors flex items-center justify-center relative`}
                  >
                    {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-gb-0 border border-gb-3" />}
                    {!isSelected && isOrigin && <div className="w-1.5 h-1.5 rounded-full bg-gb-0" />}
                  </button>
                );
              })
            )}
          </div>

          {/* X-axis tick labels along the bottom */}
          <div className="grid grid-cols-11 text-center select-none" aria-hidden="true">
            {AXIS_VALUES.map((cx) => (
              <div
                key={cx}
                className={`text-[11px] leading-none font-bold tabular-nums ${
                  cx === 0 ? 'text-neon-cyan' : 'text-gb-2'
                }`}
              >
                {cx}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live coordinate readout + Plot button */}
      <div className="flex gap-2 items-stretch">
        <div className="flex-1 min-h-11 bg-gb-0 border border-gb-3 px-3 flex items-center justify-between text-xs font-bold tabular-nums">
          <span className="text-gb-2 uppercase">
            {hovered ? `Hover (${hovered[0]}, ${hovered[1]})` : 'Selected'}
          </span>
          <span className="text-neon-cyan text-base">
            {value ? `(${x}, ${y})` : '(?, ?)'}
          </span>
        </div>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!value}
          className="min-h-11 bg-gb-3 text-gb-0 px-5 text-xs font-black uppercase tracking-wider disabled:opacity-30 hover:bg-neon-cyan transition-colors gb-border-sm"
        >
          Plot
        </button>
      </div>
    </div>
  );
};
