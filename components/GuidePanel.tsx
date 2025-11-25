import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Book } from "lucide-react";

export function GuidePanel() {
    return (
        <Card className="h-full bg-card border shadow-md flex flex-col">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Book className="w-5 h-5 text-primary" />
                    <span>Guide</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 p-0 overflow-y-auto">
                <div className="h-full px-6 pb-6">
                    <div className="space-y-6">
                        <section>
                            <h3 className="font-semibold text-foreground mb-2 text-sm uppercase tracking-wider text-muted-foreground">
                                Robot API
                            </h3>
                            <ul className="space-y-2 text-sm font-mono text-foreground/90">
                                <li className="flex flex-col">
                                    <span className="font-bold text-primary">move(steps?)</span>
                                    <span className="text-muted-foreground text-xs">
                                        Move forward (default: 1 step)
                                    </span>
                                </li>
                                <li className="flex flex-col">
                                    <span className="font-bold text-primary">turn(dir)</span>
                                    <span className="text-muted-foreground text-xs">
                                        Turn &quot;left&quot; or &quot;right&quot;
                                    </span>
                                </li>
                                <li className="flex flex-col">
                                    <span className="font-bold text-primary">is_empty(dir?)</span>
                                    <span className="text-muted-foreground text-xs">
                                        Check if &quot;front&quot;, &quot;left&quot;, or &quot;right&quot; is empty
                                    </span>
                                </li>
                                <li className="flex flex-col">
                                    <span className="font-bold text-primary">is_goal(dir?)</span>
                                    <span className="text-muted-foreground text-xs">
                                        Check if goal is at &quot;here&quot;, &quot;front&quot;, &quot;left&quot;, &quot;right&quot;
                                    </span>
                                </li>
                                <li className="flex flex-col">
                                    <span className="font-bold text-primary">get_position()</span>
                                    <span className="text-muted-foreground text-xs">
                                        Returns &#123;x, y&#125; current position
                                    </span>
                                </li>
                                <li className="flex flex-col">
                                    <span className="font-bold text-primary">get_goal()</span>
                                    <span className="text-muted-foreground text-xs">
                                        Returns &#123;x, y&#125; goal position
                                    </span>
                                </li>
                                <li className="flex flex-col">
                                    <span className="font-bold text-primary">log(msg)</span>
                                    <span className="text-muted-foreground text-xs">
                                        Print message to console
                                    </span>
                                </li>
                                <li className="flex flex-col">
                                    <span className="font-bold text-primary">done()</span>
                                    <span className="text-muted-foreground text-xs">
                                        Stop execution
                                    </span>
                                </li>
                            </ul>
                        </section>

                        <section>
                            <h3 className="font-semibold text-foreground mb-2 text-sm uppercase tracking-wider text-muted-foreground">
                                Memory API
                            </h3>
                            <ul className="space-y-2 text-sm font-mono text-foreground/90">
                                <li className="flex flex-col">
                                    <span className="font-bold text-primary">
                                        memory.has_visited(dir?)
                                    </span>
                                    <span className="text-muted-foreground text-xs">
                                        Check if cell was visited (&quot;here&quot;, &quot;front&quot;, etc)
                                    </span>
                                </li>
                                <li className="flex flex-col">
                                    <span className="font-bold text-primary">
                                        memory.visit_count(dir?)
                                    </span>
                                    <span className="text-muted-foreground text-xs">
                                        Get visit count for cell
                                    </span>
                                </li>
                                <li className="flex flex-col">
                                    <span className="font-bold text-primary">
                                        memory.get_visited_cells()
                                    </span>
                                    <span className="text-muted-foreground text-xs">
                                        Get all visited cells
                                    </span>
                                </li>
                            </ul>
                        </section>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
