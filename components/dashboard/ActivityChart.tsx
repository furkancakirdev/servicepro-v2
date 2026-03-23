"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";

import type { DashboardActivityPoint } from "@/types";

type ActivityChartProps = {
  data: DashboardActivityPoint[];
};

export default function ActivityChart({ data }: ActivityChartProps) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="createdGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="completedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0f766e" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#0f766e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            minTickGap={24}
            tick={{ fill: "#64748b", fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 16,
              border: "1px solid #e2e8f0",
              backgroundColor: "#ffffff",
              boxShadow: "0 16px 40px rgba(15, 45, 90, 0.12)",
            }}
          />
          <Area
            type="monotone"
            dataKey="created"
            stroke="#2563eb"
            strokeWidth={2}
            fill="url(#createdGradient)"
            name="Oluşturulan"
          />
          <Area
            type="monotone"
            dataKey="completed"
            stroke="#0f766e"
            strokeWidth={2}
            fill="url(#completedGradient)"
            name="Tamamlanan"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

