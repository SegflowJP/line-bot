import { useI18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Calendar, Sun, Truck, MapPin, AlertCircle } from "lucide-react";
import { useState, useMemo } from "react";

function getTodayJST(): string {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

function formatTime(ms: number | null | undefined): string {
  if (!ms) return "—";
  const d = new Date(ms);
  return d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo" });
}

type WorkerStatus = "arrived" | "onTheWay" | "awake" | "noResponse";

function getWorkerStatus(progress: any): WorkerStatus {
  if (!progress) return "noResponse";
  if (progress.arrivedTime) return "arrived";
  if (progress.onTheWayTime) return "onTheWay";
  if (progress.wakeUpTime) return "awake";
  return "noResponse";
}

function getProgressPercent(status: WorkerStatus): number {
  switch (status) {
    case "arrived": return 100;
    case "onTheWay": return 66;
    case "awake": return 33;
    default: return 0;
  }
}

const statusConfig = {
  arrived: { color: "bg-emerald-500", textColor: "text-emerald-700", bgLight: "bg-emerald-50", borderColor: "border-emerald-200", icon: MapPin },
  onTheWay: { color: "bg-blue-500", textColor: "text-blue-700", bgLight: "bg-blue-50", borderColor: "border-blue-200", icon: Truck },
  awake: { color: "bg-amber-500", textColor: "text-amber-700", bgLight: "bg-amber-50", borderColor: "border-amber-200", icon: Sun },
  noResponse: { color: "bg-red-500", textColor: "text-red-700", bgLight: "bg-red-50", borderColor: "border-red-200", icon: AlertCircle },
};

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function HistoryPage() {
  const { t, lang } = useI18n();
  const today = useMemo(() => getTodayJST(), []);
  const [selectedDate, setSelectedDate] = useState(today);

  const workersQuery = trpc.worker.list.useQuery({ activeOnly: true });
  const progressQuery = trpc.progress.today.useQuery({ date: selectedDate });
  const summaryQuery = trpc.progress.summary.useQuery({ date: selectedDate });

  const workers = workersQuery.data ?? [];
  const progressList = progressQuery.data ?? [];
  const summary = summaryQuery.data ?? { total: 0, awake: 0, onTheWay: 0, arrived: 0, noResponse: 0 };

  const progressMap = useMemo(() => {
    const map = new Map<number, any>();
    for (const p of progressList) {
      map.set(p.workerId, p);
    }
    return map;
  }, [progressList]);

  const getStatusLabel = (status: WorkerStatus) => {
    switch (status) {
      case "arrived": return t("statusArrived");
      case "onTheWay": return t("statusOnTheWay");
      case "awake": return t("statusAwake");
      default: return t("statusNoResponse");
    }
  };

  const formattedDate = new Date(selectedDate + "T00:00:00").toLocaleDateString(
    lang === "ja" ? "ja-JP" : "en-US",
    { year: "numeric", month: "long", day: "numeric", weekday: "long" }
  );

  return (
    <div className="space-y-6">
      {/* Header with Date Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("history")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{formattedDate}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setSelectedDate(shiftDate(selectedDate, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="relative">
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={today}
              className="w-40 text-center"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSelectedDate(shiftDate(selectedDate, 1))}
            disabled={selectedDate >= today}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedDate(today)}
            disabled={selectedDate === today}
          >
            {t("today")}
          </Button>
        </div>
      </div>

      {/* Summary for selected date */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-amber-50 border border-amber-200 shadow-sm">
          <CardContent className="p-4 text-center">
            <Sun className="h-5 w-5 text-amber-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-amber-700">{summary.awake}</p>
            <p className="text-xs text-muted-foreground">{t("awake")}</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border border-blue-200 shadow-sm">
          <CardContent className="p-4 text-center">
            <Truck className="h-5 w-5 text-blue-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-blue-700">{summary.onTheWay}</p>
            <p className="text-xs text-muted-foreground">{t("onTheWay")}</p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 border border-emerald-200 shadow-sm">
          <CardContent className="p-4 text-center">
            <MapPin className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-emerald-700">{summary.arrived}</p>
            <p className="text-xs text-muted-foreground">{t("arrived")}</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border border-red-200 shadow-sm">
          <CardContent className="p-4 text-center">
            <AlertCircle className="h-5 w-5 text-red-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-red-700">{summary.noResponse}</p>
            <p className="text-xs text-muted-foreground">{t("noResponse")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Worker Details for selected date */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {formattedDate}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {workers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>{t("noData")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {workers.map((worker) => {
                const prog = progressMap.get(worker.id);
                const status = getWorkerStatus(prog);
                const percent = getProgressPercent(status);
                const config = statusConfig[status];
                const StatusIcon = config.icon;

                return (
                  <div
                    key={worker.id}
                    className={`rounded-xl border ${config.borderColor} ${config.bgLight} p-4`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-lg ${config.color} flex items-center justify-center`}>
                          <StatusIcon className="h-4 w-4 text-white" />
                        </div>
                        <span className="font-semibold text-foreground">{worker.name}</span>
                        <Badge variant="outline" className={`${config.textColor} text-xs`}>
                          {getStatusLabel(status)}
                        </Badge>
                      </div>
                      <span className={`text-lg font-bold ${config.textColor}`}>{percent}%</span>
                    </div>
                    <Progress value={percent} className="h-2 rounded-full mb-2" />
                    <div className="grid grid-cols-3 gap-2 text-xs text-center">
                      <div>
                        <p className="text-muted-foreground">{t("stepWakeUp")}</p>
                        <p className="font-medium">{formatTime(prog?.wakeUpTime)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">{t("stepOnTheWay")}</p>
                        <p className="font-medium">{formatTime(prog?.onTheWayTime)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">{t("stepArrived")}</p>
                        <p className="font-medium">{formatTime(prog?.arrivedTime)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
