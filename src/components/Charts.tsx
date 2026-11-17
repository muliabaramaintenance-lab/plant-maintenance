import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import type {
  ElektrikLog,
  LogisticLog,
  MekanikLog,
  PlantUnit,
  ReportPeriod,
  ThemeMode,
} from '@/src/types/muliabara';
import { fmtShort, getLocalDateISO } from '@/src/lib/supabase';

interface FuelKwhChartProps {
  mekanikLogs: MekanikLog[];
  units: PlantUnit[];
  period: ReportPeriod;
  theme: ThemeMode;
}

export const FuelKwhChart: React.FC<FuelKwhChartProps> = ({
  mekanikLogs,
  units,
  period,
  theme,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const getCat = (m: MekanikLog) =>
      m.unitCategory || units.find((u) => u.id === m.unitId)?.category || '-';

    let labels: string[] = [];
    let fuelData: number[] = [];
    let kwhData: number[] = [];

    const unitLogs = mekanikLogs.filter(
      (m) => getCat(m) !== 'General'
    );

    if (period === 'harian') {
      const map: Record<string, { f: number; k: number }> = {};
      unitLogs.forEach((m) => {
        const key = m.unitName || 'Unit';
        if (!map[key]) map[key] = { f: 0, k: 0 };
        map[key].f += Number(m.fuel || 0);
        if (getCat(m) === 'Genset') map[key].k += Number(m.kwh || 0);
      });
      labels = Object.keys(map).map((n) =>
        n.length > 20 ? `${n.slice(0, 18)}..` : n
      );
      fuelData = Object.values(map).map((v) => v.f);
      kwhData = Object.values(map).map((v) => v.k);
    } else {
      const map: Record<string, { label: string; f: number; k: number }> = {};
      unitLogs
        .slice()
        .sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        )
        .forEach((m) => {
          const dayKey = getLocalDateISO(m.timestamp);
          if (!dayKey) return;
          if (!map[dayKey]) {
            map[dayKey] = { label: fmtShort(m.timestamp), f: 0, k: 0 };
          }
          map[dayKey].f += Number(m.fuel || 0);
          if (getCat(m) === 'Genset') map[dayKey].k += Number(m.kwh || 0);
        });
      const keys = Object.keys(map).sort();
      labels = keys.map((k) => map[k].label);
      fuelData = keys.map((k) => map[k].f);
      kwhData = keys.map((k) => map[k].k);
    }

    if (labels.length === 0) {
      labels = ['Belum ada data'];
      fuelData = [0];
      kwhData = [0];
    }

    const isDark = theme === 'dark';
    const textColor = isDark ? '#94a3b8' : '#475569';
    const gridColor = isDark ? 'rgba(148,163,184,0.12)' : 'rgba(15,23,42,0.08)';
    const barColor = isDark ? '#3b82f6' : 'rgba(25,50,93,0.9)';

    chartRef.current = new Chart(ctx, {
      data: {
        labels,
        datasets: [
          {
            type: 'bar',
            label: 'Fuel (Liter)',
            data: fuelData,
            backgroundColor: barColor,
            borderRadius: 6,
            yAxisID: 'y',
          },
          {
            type: 'line',
            label: 'Output KWH (Genset)',
            data: kwhData,
            borderColor: '#82c341',
            backgroundColor: 'rgba(130,195,65,0.16)',
            borderWidth: 2.5,
            tension: 0.3,
            fill: true,
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            labels: {
              color: textColor,
              font: { family: "'DM Sans', sans-serif", size: 12 },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: textColor, font: { size: 11 } },
          },
          y: {
            beginAtZero: true,
            grid: { color: gridColor },
            ticks: { color: textColor, font: { size: 11 } },
            title: { display: true, text: 'Fuel (L)', color: textColor },
          },
          y1: {
            position: 'right',
            beginAtZero: true,
            grid: { drawOnChartArea: false },
            ticks: { color: textColor, font: { size: 11 } },
            title: { display: true, text: 'KWH', color: textColor },
          },
        },
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [mekanikLogs, units, period, theme]);

  return <canvas ref={canvasRef} />;
};

interface ReadinessDoughnutChartProps {
  readyCount: number;
  notReadyCount: number;
  theme: ThemeMode;
}

export const ReadinessDoughnutChart: React.FC<ReadinessDoughnutChartProps> = ({
  readyCount,
  notReadyCount,
  theme,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const isDark = theme === 'dark';
    const textColor = isDark ? '#94a3b8' : '#475569';

    chartRef.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Ready', 'Tidak Ready'],
        datasets: [
          {
            data: [readyCount, notReadyCount],
            backgroundColor: ['#7ab547', '#dc2626'],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 10,
              color: textColor,
              font: { size: 11, family: "'DM Sans', sans-serif" },
            },
          },
        },
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [readyCount, notReadyCount, theme]);

  return <canvas ref={canvasRef} />;
};

interface ActivityBarChartProps {
  mekanikLogs: MekanikLog[];
  elektrikLogs: ElektrikLog[];
  logisticLogs: LogisticLog[];
  theme: ThemeMode;
}

export const ActivityBarChart: React.FC<ActivityBarChartProps> = ({
  mekanikLogs,
  elektrikLogs,
  logisticLogs,
  theme,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const isDark = theme === 'dark';
    const textColor = isDark ? '#94a3b8' : '#475569';
    const gridColor = isDark ? 'rgba(148,163,184,0.12)' : 'rgba(15,23,42,0.08)';

    chartRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: [
          'P2H Genset',
          'Perawatan Harian',
          'Service Berkala',
          'Trouble / Perbaikan',
          'Elektrik',
          'Logistic',
        ],
        datasets: [
          {
            data: [
              mekanikLogs.filter((m) => m.jenis === 'P2H').length,
              mekanikLogs.filter((m) => m.jenis === 'Perawatan Harian').length,
              mekanikLogs.filter((m) => m.jenis === 'Service Berkala').length,
              mekanikLogs.filter((m) => m.jenis === 'Perbaikan / Trouble')
                .length,
              elektrikLogs.length,
              logisticLogs.length,
            ],
            backgroundColor: [
              '#7ab547',
              isDark ? '#3b82f6' : '#19325d',
              '#0284c7',
              '#dc2626',
              '#0ea5e9',
              '#64748b',
            ],
            borderRadius: 6,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            beginAtZero: true,
            ticks: { stepSize: 1, color: textColor, font: { size: 11 } },
            grid: { color: gridColor },
          },
          y: {
            grid: { display: false },
            ticks: { color: textColor, font: { size: 11 } },
          },
        },
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [mekanikLogs, elektrikLogs, logisticLogs, theme]);

  return <canvas ref={canvasRef} />;
};
