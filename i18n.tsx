import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type Language = "ja" | "en";

const translations = {
  ja: {
    // Navigation & Layout
    appTitle: "作業員起床ダッシュボード",
    dashboard: "ダッシュボード",
    workers: "作業員管理",
    history: "履歴",
    signIn: "ログイン",
    signInDesc: "ダッシュボードにアクセスするにはログインが必要です。",
    signOut: "ログアウト",
    navigation: "ナビゲーション",

    // Summary Cards
    totalWorkers: "全作業員",
    awake: "起床済み",
    onTheWay: "移動中",
    arrived: "到着済み",
    noResponse: "未応答",
    person: "人",

    // Status Labels
    statusAwake: "起床済み",
    statusOnTheWay: "移動中",
    statusArrived: "到着済み",
    statusNoResponse: "未応答",

    // Step Labels
    stepWakeUp: "目覚め",
    stepOnTheWay: "移動中",
    stepArrived: "到着",

    // Table Headers
    workerName: "作業員名",
    currentStatus: "現在の状態",
    wakeUpTime: "起床時間",
    onTheWayTime: "出発時間",
    arrivedTime: "到着時間",
    progress: "進捗",
    actions: "操作",
    language: "言語",

    // Worker Management
    addWorker: "作業員を追加",
    editWorker: "作業員を編集",
    deleteWorker: "作業員を削除",
    workerNameLabel: "名前",
    lineUserIdLabel: "LINE ユーザーID",
    languagePref: "言語設定",
    japanese: "日本語",
    english: "英語",
    save: "保存",
    cancel: "キャンセル",
    confirm: "確認",
    deleteConfirm: "この作業員を削除してもよろしいですか？",
    active: "有効",
    inactive: "無効",

    // History
    selectDate: "日付を選択",
    dateRange: "期間",
    noData: "データがありません",
    today: "今日",

    // Auto-refresh
    autoRefresh: "自動更新",
    lastUpdated: "最終更新",
    refreshing: "更新中...",

    // Progress
    progressPercent: "進捗率",
    notStarted: "未開始",
    complete: "完了",

    // Toast
    workerAdded: "作業員を追加しました",
    workerUpdated: "作業員を更新しました",
    workerDeleted: "作業員を削除しました",
    checkinRecorded: "チェックインを記録しました",
    error: "エラーが発生しました",
    featureComingSoon: "この機能は近日公開予定です",
  },
  en: {
    // Navigation & Layout
    appTitle: "Worker Wake-up Dashboard",
    dashboard: "Dashboard",
    workers: "Workers",
    history: "History",
    signIn: "Sign In",
    signInDesc: "Access to this dashboard requires authentication.",
    signOut: "Sign Out",
    navigation: "Navigation",

    // Summary Cards
    totalWorkers: "Total Workers",
    awake: "Awake",
    onTheWay: "On the Way",
    arrived: "Arrived",
    noResponse: "No Response",
    person: "",

    // Status Labels
    statusAwake: "Awake",
    statusOnTheWay: "On the Way",
    statusArrived: "Arrived",
    statusNoResponse: "No Response",

    // Step Labels
    stepWakeUp: "Wake Up",
    stepOnTheWay: "On the Way",
    stepArrived: "Arrived",

    // Table Headers
    workerName: "Worker Name",
    currentStatus: "Current Status",
    wakeUpTime: "Wake-up Time",
    onTheWayTime: "Departure Time",
    arrivedTime: "Arrival Time",
    progress: "Progress",
    actions: "Actions",
    language: "Language",

    // Worker Management
    addWorker: "Add Worker",
    editWorker: "Edit Worker",
    deleteWorker: "Delete Worker",
    workerNameLabel: "Name",
    lineUserIdLabel: "LINE User ID",
    languagePref: "Language Preference",
    japanese: "Japanese",
    english: "English",
    save: "Save",
    cancel: "Cancel",
    confirm: "Confirm",
    deleteConfirm: "Are you sure you want to delete this worker?",
    active: "Active",
    inactive: "Inactive",

    // History
    selectDate: "Select Date",
    dateRange: "Date Range",
    noData: "No data available",
    today: "Today",

    // Auto-refresh
    autoRefresh: "Auto-refresh",
    lastUpdated: "Last Updated",
    refreshing: "Refreshing...",

    // Progress
    progressPercent: "Progress",
    notStarted: "Not Started",
    complete: "Complete",

    // Toast
    workerAdded: "Worker added successfully",
    workerUpdated: "Worker updated successfully",
    workerDeleted: "Worker deleted successfully",
    checkinRecorded: "Check-in recorded",
    error: "An error occurred",
    featureComingSoon: "This feature is coming soon",
  },
} as const;

export type TranslationKey = keyof typeof translations.ja;

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem("dashboard-lang");
    return (saved === "en" || saved === "ja") ? saved : "ja";
  });

  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem("dashboard-lang", newLang);
  }, []);

  const t = useCallback((key: TranslationKey): string => {
    return translations[lang][key] ?? key;
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
