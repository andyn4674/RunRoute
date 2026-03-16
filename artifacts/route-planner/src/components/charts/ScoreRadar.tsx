import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import type { ScoreBreakdown } from '@workspace/api-client-react';

interface ScoreRadarProps {
  score: ScoreBreakdown;
  color?: string;
}

export function ScoreRadar({ score, color = "#FF4500" }: ScoreRadarProps) {
  const data = [
    { subject: 'Terrain', value: score.terrainMatch, fullMark: 100 },
    { subject: 'Safety', value: score.safetyScore, fullMark: 100 },
    { subject: 'Environment', value: score.environmentalFit, fullMark: 100 },
    { subject: 'Training', value: score.trainingEffectiveness, fullMark: 100 },
    { subject: 'Shade', value: score.shadeScore, fullMark: 100 },
    { subject: 'Traffic', value: score.trafficScore, fullMark: 100 },
  ];

  return (
    <div className="w-full h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontFamily: 'var(--font-sans)' }} 
          />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--card))', 
              borderColor: 'hsl(var(--border))',
              color: 'hsl(var(--foreground))',
              borderRadius: '8px'
            }}
            itemStyle={{ color: color }}
          />
          <Radar 
            name="Score" 
            dataKey="value" 
            stroke={color} 
            fill={color} 
            fillOpacity={0.4} 
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
