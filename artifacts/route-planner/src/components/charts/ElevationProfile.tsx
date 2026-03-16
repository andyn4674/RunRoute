import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import type { Waypoint } from '@workspace/api-client-react';

interface ElevationProfileProps {
  waypoints: Waypoint[];
  color?: string;
}

export function ElevationProfile({ waypoints, color = "#FF4500" }: ElevationProfileProps) {
  // Approximate distance calculation for X axis
  const data = waypoints.map((wp, i) => ({
    point: i,
    elevation: wp.elevation,
  }));

  return (
    <div className="w-full h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorElevation" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.8}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis 
            dataKey="point" 
            tick={false} 
            axisLine={{ stroke: 'hsl(var(--border))' }}
          />
          <YAxis 
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
            axisLine={false}
            tickLine={false}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--card))', 
              borderColor: 'hsl(var(--border))',
              borderRadius: '8px',
              color: 'hsl(var(--foreground))'
            }}
            labelStyle={{ display: 'none' }}
            formatter={(value: number) => [`${value.toFixed(0)} ft`, 'Elevation']}
          />
          <Area 
            type="monotone" 
            dataKey="elevation" 
            stroke={color} 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorElevation)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
