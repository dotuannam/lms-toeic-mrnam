import React from "react";
import { useTheme } from "../../context/ThemeContext";

/**
 * High-performance, zero-dependency Dynamic SVG Radar Chart.
 * Maps skill scores on a normalized 0-100% scale for TOEIC, IELTS, or APTIS.
 *
 * @param {Object} props
 * @param {Object} props.normalizedData - { [skillName]: percentage (0-100) }
 * @param {Object} props.rawData - { [skillName]: actualScore }
 * @param {string} props.testType - "TOEIC" | "IELTS" | "APTIS"
 */
export const RadarChart = ({ normalizedData = {}, rawData = {}, testType = "IELTS", size = 320 }) => {
  const { isDark } = useTheme();
  let skills = Object.keys(normalizedData);

  // Fallback if data is completely empty
  if (skills.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
        No assessment score data available for radar mapping
      </div>
    );
  }

  // If exactly 1 skill / single metric, render a circular gauge with percentage & points
  if (skills.length === 1) {
    const skill = skills[0];
    const pct = Math.min(100, Math.max(0, normalizedData[skill] || 0));
    const rawVal = rawData[skill.toLowerCase()] ?? rawData[skill] ?? `${pct}%`;
    const gaugeRadius = size * 0.28;
    const circumference = 2 * Math.PI * gaugeRadius;
    const strokeDashoffset = circumference - (pct / 100) * circumference;

    return (
      <div className="flex flex-col items-center justify-center p-2">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible select-none">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={gaugeRadius}
            fill="none"
            stroke={isDark ? "#2d3c52" : "#e2e8f0"}
            strokeWidth="12"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={gaugeRadius}
            fill="none"
            stroke="#c27803"
            strokeWidth="12"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            className="transition-all duration-700 ease-out"
          />
          <text
            x={size / 2}
            y={size / 2 - 10}
            textAnchor="middle"
            dominantBaseline="central"
            fill={isDark ? "#f1f5f9" : "#261e16"}
            className="font-heading font-black text-2xl"
          >
            {pct}%
          </text>
          <text
            x={size / 2}
            y={size / 2 + 16}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#c27803"
            className="font-bold text-xs"
          >
            {rawVal}
          </text>
          <text
            x={size / 2}
            y={size / 2 + 34}
            textAnchor="middle"
            dominantBaseline="central"
            fill={isDark ? "#94a3b8" : "#64748b"}
            className="font-semibold text-[11px]"
          >
            {skill}
          </text>
        </svg>

        <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#c27803]"></span>
            <span className="font-medium text-slate-700 dark:text-slate-300">Tỷ lệ đạt chuẩn ({pct}%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-slate-200 dark:bg-slate-700"></span>
            <span>Mục tiêu chuẩn (100%)</span>
          </div>
        </div>
      </div>
    );
  }

  // If 2 skills, clone with an overall axis if not present so radar polygon renders a 3D closed triangle
  let displayNormalized = { ...normalizedData };
  if (skills.length === 2 && !displayNormalized["Tổng kết (Overall)"] && !displayNormalized["Overall"]) {
    const avg = Math.round((displayNormalized[skills[0]] + displayNormalized[skills[1]]) / 2);
    displayNormalized["Tổng kết"] = avg;
    skills = Object.keys(displayNormalized);
  }

  const center = size / 2;
  const radius = size * 0.38;
  const numAxes = skills.length;
  const angleStep = (Math.PI * 2) / numAxes;

  // Compute (x, y) coordinates for an angle and radius
  const getCoordinates = (angle, dist) => {
    const rad = angle - Math.PI / 2;
    return {
      x: center + dist * Math.cos(rad),
      y: center + dist * Math.sin(rad),
    };
  };

  // Generate concentric grid rings (25%, 50%, 75%, 100%)
  const levels = [0.25, 0.5, 0.75, 1.0];
  const gridPolygons = levels.map((lvl) => {
    return skills
      .map((_, i) => {
        const pt = getCoordinates(i * angleStep, radius * lvl);
        return `${pt.x},${pt.y}`;
      })
      .join(" ");
  });

  // Generate data polygon points
  const dataPoints = skills.map((skill, i) => {
    const pct = Math.min(100, Math.max(0, displayNormalized[skill] || 0));
    const dist = (pct / 100) * radius;
    return getCoordinates(i * angleStep, dist);
  });
  const dataPolygon = dataPoints.map((pt) => `${pt.x},${pt.y}`).join(" ");

  return (
    <div className="flex flex-col items-center justify-center p-2">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible select-none"
      >
        {/* Background Grid Rings */}
        {gridPolygons.map((poly, idx) => (
          <polygon
            key={idx}
            points={poly}
            fill={isDark ? (idx % 2 === 0 ? "#1a2436" : "#131a27") : (idx % 2 === 0 ? "#f8fafc" : "#ffffff")}
            stroke={isDark ? "#2d3c52" : "#e2e8f0"}
            strokeWidth="1"
          />
        ))}

        {/* Radial Axis Lines */}
        {skills.map((_, i) => {
          const pt = getCoordinates(i * angleStep, radius);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={pt.x}
              y2={pt.y}
              stroke={isDark ? "#384961" : "#cbd5e1"}
              strokeDasharray="2 2"
              strokeWidth="1"
            />
          );
        })}

        {/* Data Shaded Area */}
        <polygon
          points={dataPolygon}
          fill={isDark ? "rgba(194, 120, 3, 0.28)" : "rgba(194, 120, 3, 0.20)"}
          stroke="#c27803"
          strokeWidth="2.5"
          className="transition-all duration-300"
        />

        {/* Data Points */}
        {dataPoints.map((pt, i) => {
          return (
            <g key={i}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r="4.5"
                fill={isDark ? "#1c1610" : "#ffffff"}
                stroke="#c27803"
                strokeWidth="2.5"
              />
            </g>
          );
        })}

        {/* Axis Labels */}
        {skills.map((skill, i) => {
          const labelDist = radius + 22;
          const pt = getCoordinates(i * angleStep, labelDist);
          const rawVal = rawData[skill.toLowerCase()] ?? rawData[skill];
          const pct = displayNormalized[skill] ?? 0;

          return (
            <g key={i} className="text-[11px] font-semibold">
              <text
                x={pt.x}
                y={pt.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill={isDark ? "#f1f5f9" : "#261e16"}
                className="font-heading font-bold"
              >
                {skill}
              </text>
              <text
                x={pt.x}
                y={pt.y + 13}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#c27803"
                className="font-bold text-[10px]"
              >
                {rawVal !== undefined && typeof rawVal === "string" && rawVal.includes("%")
                  ? rawVal
                  : rawVal !== undefined && String(rawVal) !== String(pct)
                  ? `${rawVal} (${pct}%)`
                  : `${pct}%`}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#c27803]/40 border border-[#c27803]"></span>
          <span className="font-medium text-slate-700 dark:text-slate-300">Năng lực thực tế</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600"></span>
          <span>Thang chuẩn (100%)</span>
        </div>
      </div>
    </div>
  );
};

export default RadarChart;
