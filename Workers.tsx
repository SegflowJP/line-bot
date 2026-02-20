import { useI18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Workers() {
  const { t } = useI18n();
  const utils = trpc.useUtils();
  const workersQuery = trpc.worker.list.useQuery({ activeOnly: false });
  const createMutation = trpc.worker.create.useMutation({
    onSuccess: () => {
      utils.worker.list.invalidate();
      toast.success(t("workerAdded"));
      setDialogOpen(false);
      resetForm();
    },
    onError: () => toast.error(t("error")),
  });
  const updateMutation = trpc.worker.update.useMutation({
    onSuccess: () => {
      utils.worker.list.invalidate();
      toast.success(t("workerUpdated"));
      setDialogOpen(false);
      resetForm();
    },
    onError: () => toast.error(t("error")),
  });
  const deleteMutation = trpc.worker.delete.useMutation({
    onSuccess: () => {
      utils.worker.list.invalidate();
      toast.success(t("workerDeleted"));
      setDeleteId(null);
    },
    onError: () => toast.error(t("error")),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formName, setFormName] = useState("");
  const [formLineId, setFormLineId] = useState("");
  const [formLang, setFormLang] = useState<"ja" | "en">("ja");

  const resetForm = () => {
    setEditingId(null);
    setFormName("");
    setFormLineId("");
    setFormLang("ja");
  };

  const openAdd = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (worker: any) => {
    setEditingId(worker.id);
    setFormName(worker.name);
    setFormLineId(worker.lineUserId ?? "");
    setFormLang(worker.language ?? "ja");
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formName.trim()) return;
    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        name: formName.trim(),
        lineUserId: formLineId.trim() || undefined,
        language: formLang,
      });
    } else {
      createMutation.mutate({
        name: formName.trim(),
        lineUserId: formLineId.trim() || undefined,
        language: formLang,
      });
    }
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteMutation.mutate({ id: deleteId });
    }
  };

  const workers = workersQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("workers")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {workers.filter((w) => w.isActive === 1).length} {t("active")} / {workers.length} {t("totalWorkers")}
          </p>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="h-4 w-4" />
          {t("addWorker")}
        </Button>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-0">
          {workers.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>{t("noData")}</p>
            </div>
          ) : (
            <div className="divide-y">
              {workers.map((worker) => (
                <div
                  key={worker.id}
                  className={`flex items-center justify-between p-4 hover:bg-accent/30 transition-colors ${worker.isActive === 0 ? "opacity-50" : ""}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-primary">
                        {worker.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{worker.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {worker.language === "ja" ? "🇯🇵 " + t("japanese") : "🇬🇧 " + t("english")}
                        </Badge>
                        {worker.isActive === 0 && (
                          <Badge variant="secondary" className="text-xs">{t("inactive")}</Badge>
                        )}
                        {worker.lineUserId && (
                          <Badge variant="outline" className="text-xs text-emerald-600">LINE</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(worker)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(worker.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? t("editWorker") : t("addWorker")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t("workerNameLabel")}</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t("workerNameLabel")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("lineUserIdLabel")}</Label>
              <Input
                value={formLineId}
                onChange={(e) => setFormLineId(e.target.value)}
                placeholder="U1234567890abcdef..."
              />
            </div>
            <div className="space-y-2">
              <Label>{t("languagePref")}</Label>
              <Select value={formLang} onValueChange={(v) => setFormLang(v as "ja" | "en")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ja">🇯🇵 {t("japanese")}</SelectItem>
                  <SelectItem value="en">🇬🇧 {t("english")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={handleSave} disabled={!formName.trim()}>
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteWorker")}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteConfirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>{t("confirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
