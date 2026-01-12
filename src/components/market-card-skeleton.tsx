import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";

export function MarketCardSkeleton() {
  return (
    <Card className="flex flex-col bg-white/5 border-white/10 backdrop-blur-md">
      <div className="animate-pulse">
        <CardHeader>
          <Badge
            variant="secondary"
            className="mb-2 bg-white/10 h-4 w-16 rounded-md"
          />
          <CardTitle className="bg-white/10 h-6 w-3/4 rounded-md" />
        </CardHeader>
        <CardContent>
          <div className="mb-4 space-y-3">
            <div className="flex justify-between mb-2">
              <span className="bg-white/10 h-4 w-1/4 rounded-md" />
              <span className="bg-white/10 h-4 w-1/4 rounded-md" />
            </div>
            <Progress value={0} className="h-2 bg-white/5" />
            <div className="h-24 bg-white/5 rounded-md mt-4" />
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
