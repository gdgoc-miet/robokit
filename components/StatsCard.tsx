import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
    title: string;
    value: string | number;
    description?: string;
    icon: LucideIcon;
    color: string; // Tailwind text color class, e.g., "text-blue-500"
    onClick?: () => void;
    className?: string;
}

export function StatsCard({
    title,
    value,
    description,
    icon: Icon,
    color,
    onClick,
    className,
}: StatsCardProps) {
    return (
        <Card
            className={cn(
                "cursor-pointer hover:shadow-lg transition-all duration-300 bg-card border shadow-md",
                className
            )}
            onClick={onClick}
        >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {title}
                </CardTitle>
                <Icon className={cn("h-4 w-4", color)} />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {description && (
                    <p className="text-xs text-muted-foreground mt-1">{description}</p>
                )}
            </CardContent>
        </Card>
    );
}
