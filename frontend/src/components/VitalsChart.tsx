import type { VitalsDTO } from "@fhir-mern/shared"
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
} from "recharts"
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegend,
    ChartLegendContent,
    type ChartConfig,
} from "@/components/ui/chart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const CHART_COLORS = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
] as const

interface VitalsChartProps {
    vitals: VitalsDTO[]
}

/** Convert "Systolic blood pressure" → "systolicBloodPressure" (CSS-safe key) */
function toSafeKey(type: string): string {
    return type
        .split(/\s+/)
        .map((w, i) => (i === 0 ? w.toLowerCase() : w[0]!.toUpperCase() + w.slice(1).toLowerCase()))
        .join("")
}

/**
 * Groups vitals by recorded date and pivots vital types into columns.
 * Uses sanitized keys so CSS variables resolve correctly.
 */
function prepareChartData(vitals: VitalsDTO[]) {
    const byDate = new Map<string, { ts: number; date: string; [key: string]: unknown }>()

    for (const v of vitals) {
        if (v.value == null || !v.recordedAt) continue

        const ts = new Date(v.recordedAt).getTime()
        if (Number.isNaN(ts)) continue

        const dateKey = new Date(v.recordedAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
        })

        if (!byDate.has(dateKey)) byDate.set(dateKey, { ts, date: dateKey })
        const row = byDate.get(dateKey)!
        row[toSafeKey(v.type)] = v.value
    }

    return [...byDate.values()].sort((a, b) => a.ts - b.ts)
}

/**
 * Extract unique vital types and build a ChartConfig with CSS-safe keys.
 */
function buildChartConfig(vitals: VitalsDTO[]): {
    config: ChartConfig
    keys: string[]
} {
    const typeMap = new Map<string, string>() // safeKey → display name
    for (const v of vitals) {
        if (v.value != null && v.recordedAt) {
            typeMap.set(toSafeKey(v.type), v.type)
        }
    }
    const keys = [...typeMap.keys()]

    const config: ChartConfig = {}
    keys.forEach((key, i) => {
        config[key] = {
            label: typeMap.get(key)!,
            color: CHART_COLORS[i % CHART_COLORS.length],
        }
    })

    return { config, keys }
}

export function VitalsChart({ vitals }: VitalsChartProps) {
    if (vitals.length === 0) return null

    const data = prepareChartData(vitals)
    const { config, keys } = buildChartConfig(vitals)

    if (data.length === 0 || keys.length === 0) return null

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Vitals Trend</CardTitle>
            </CardHeader>
            <CardContent>
                <ChartContainer config={config} className="h-[300px] w-full">
                    <LineChart
                        accessibilityLayer
                        data={data}
                        margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
                    >
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="date"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                        />
                        <YAxis
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            width={40}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <ChartLegend content={<ChartLegendContent />} />
                        {keys.map((key) => (
                            <Line
                                key={key}
                                type="monotone"
                                dataKey={key}
                                stroke={`var(--color-${key})`}
                                strokeWidth={2}
                                dot={{ r: 3 }}
                                activeDot={{ r: 5 }}
                            />
                        ))}
                    </LineChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}
