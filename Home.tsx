import { useI18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Sun, Truck, MapPin, AlertCircle, Users, RefreshCw } from "lucide-react";
import { useState, useEffect, useMemo } from "react";

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

export default function Home() {
  const { t, lang } = useI18n();
  const today = useMemo(() => getTodayJST(), []);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const workersQuery = trpc.worker.list.useQuery({ activeOnly: true });
  const progressQuery = trpc.progress.today.useQuery({ date: today });
  const summaryQuery = trpc.progress.summary.useQuery({ date: today });

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      workersQuery.refetch();
      progressQuery.refetch();
      summaryQuery.refetch();
      setLastUpdated(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

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

  const summaryCards = [
    { key: "total", label: t("totalWorkers"), value: summary.total, icon: Users, color: "bg-slate-500", bgLight: "bg-slate-50", borderColor: "border-slate-200", textColor: "text-slate-700" },
    { key: "awake", label: t("awake"), value: summary.awake, icon: Sun, color: "bg-amber-500", bgLight: "bg-amber-50", borderColor: "border-amber-200", textColor: "text-amber-700" },
    { key: "onTheWay", label: t("onTheWay"), value: summary.onTheWay, icon: Truck, color: "bg-blue-500", bgLight: "bg-blue-50", borderColor: "border-blue-200", textColor: "text-blue-700" },
    { key: "arrived", label: t("arrived"), value: summary.arrived, icon: MapPin, color: "bg-emerald-500", bgLight: "bg-emerald-50", borderColor: "border-emerald-200", textColor: "text-emerald-700" },
    { key: "noResponse", label: t("noResponse"), value: summary.noResponse, icon: AlertCircle, color: "bg-red-500", bgLight: "bg-red-50", borderColor: "border-red-200", textColor: "text-red-700" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t("dashboard")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {today} — {lastUpdated.toLocaleTimeString(lang === "ja" ? "ja-JP" : "en-US", { timeZone: "Asia/Tokyo" })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
            <span className="text-sm text-muted-foreground">{t("autoRefresh")}</span>
          </div>
          <button
            onClick={() => {
              workersQuery.refetch();
              progressQuery.refetch();
              summaryQuery.refetch();
              setLastUpdated(new Date());
            }}
            className="h-9 w-9 flex items-center justify-center rounded-lg border border-border hover:bg-accent transition-colors"
          >
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {summaryCards.map((card) => (
          <Card key={card.key} className={`${card.bgLight} border ${card.borderColor} shadow-sm`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {card.label}
                  </p>
                  <p className={`text-3xl font-bold mt-1 ${card.textColor}`}>
                    {card.value}
                    <span className="text-sm font-normal text-muted-foreground ml-1">{t("person")}</span>
                  </p>
                </div>
                <div className={`h-10 w-10 rounded-xl ${card.color} flex items-center justify-center`}>
                  <card.icon className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Status Table with Progress Bars */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t("currentStatus")}</CardTitle>
        </CardHeader>
        <CardContent>
          {workers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>{t("noData")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Desktop Table Header */}
              <div className="hidden md:grid md:grid-cols-[1fr_120px_100px_100px_100px_180px] gap-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b">
                <span>{t("workerName")}</span>
                <span>{t("currentStatus")}</span>
                <span>{t("wakeUpTime")}</span>
                <span>{t("onTheWayTime")}</span>
                <span>{t("arrivedTime")}</span>
                <span>{t("progress")}</span>
              </div>

              {workers.map((worker) => {
                const prog = progressMap.get(worker.id);
                const status = getWorkerStatus(prog);
                const percent = getProgressPercent(status);
                const config = statusConfig[status];
                const StatusIcon = config.icon;

                return (
                  <div
                    key={worker.id}
                    className={`rounded-xl border ${config.borderColor} ${config.bgLight} p-4 transition-all hover:shadow-sm`}
                  >
                    {/* Mobile Layout */}
                    <div className="md:hidden space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`h-9 w-9 rounded-lg ${config.color} flex items-center justify-center`}>
                            <StatusIcon className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{worker.name}</p>
                            <Badge variant="outline" className={`${config.textColor} text-xs mt-1`}>
                              {getStatusLabel(status)}
                            </Badge>
                          </div>
                        </div>
                        <span className={`text-2xl font-bold ${config.textColor}`}>{percent}%</span>
                      </div>
                      <div className="relative">
                        <Progress value={percent} className="h-3 rounded-full" />
                        <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground">
                          <span>{t("stepWakeUp")}</span>
                          <span>{t("stepOnTheWay")}</span>
                          <span>{t("stepArrived")}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="text-center">
                          <p className="text-muted-foreground">{t("stepWakeUp")}</p>
                          <p className="font-medium">{formatTime(prog?.wakeUpTime)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-muted-foreground">{t("stepOnTheWay")}</p>
                          <p className="font-medium">{formatTime(prog?.onTheWayTime)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-muted-foreground">{t("stepArrived")}</p>
                          <p className="font-medium">{formatTime(prog?.arrivedTime)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden md:grid md:grid-cols-[1fr_120px_100px_100px_100px_180px] gap-4 items-center">
                      <div className="flex items-center gap-3">
                        <div className={`h-9 w-9 rounded-lg ${config.color} flex items-center justify-center shrink-0`}>
                          <StatusIcon className="h-4 w-4 text-white" />
                        </div>
                        <span className="font-semibold text-foreground">{worker.name}</span>
                      </div>
                      <Badge variant="outline" className={`${config.textColor} justify-center`}>
                        {getStatusLabel(status)}
                      </Badge>
                      <span className="text-sm text-center">{formatTime(prog?.wakeUpTime)}</span>
                      <span className="text-sm text-center">{formatTime(prog?.onTheWayTime)}</span>
                      <span className="text-sm text-center">{formatTime(prog?.arrivedTime)}</span>
                      <div className="flex items-center gap-2">
                        <Progress value={percent} className="h-2.5 flex-1 rounded-full" />
                        <span className={`text-sm font-bold ${config.textColor} w-10 text-right`}>{percent}%</span>
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
