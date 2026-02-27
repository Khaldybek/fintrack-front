/**
 * Типы ответов и ошибок API
 */

export interface ApiUser {
  id: string;
  email: string;
  name?: string | null;
}

export interface AuthResponse {
  accessToken: string;
  /** Бэкенд может отдавать snake_case */
  access_token?: string;
  accessExpiresIn?: number;
  user: ApiUser;
}

/** Достаёт access token из ответа (camelCase или snake_case). */
export function getAccessTokenFromResponse(data: AuthResponse): string {
  const token = data.accessToken ?? data.access_token;
  if (!token || typeof token !== "string") throw new Error("No access token in response");
  return token;
}

/** Профиль пользователя (GET/PATCH /v1/me) */
export interface Profile {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  timezone: string;
  locale: string;
}

export interface PatchMeBody {
  name?: string;
  timezone?: string;
  locale?: string;
  avatarUrl?: string;
}

/** План и лимиты (GET /v1/me/plan) */
export type PlanSlug = "free" | "pro";

export interface PlanLimits {
  accounts: number;
  budgets: number;
  goals: number;
}

export interface PlanFeatures {
  dashboardIndex: boolean;
  forecast: boolean;
  familyMode: boolean;
}

export interface PlanResponse {
  plan: PlanSlug;
  limits: PlanLimits;
  features: PlanFeatures;
}

/** Баланс счёта (amount в minor units + formatted для UI) */
export interface AccountBalance {
  amount_minor: number;
  currency: string;
  formatted: string;
}

/** Счёт (GET/POST/PATCH /v1/accounts) */
export interface Account {
  id: string;
  name: string;
  currency: string;
  balance: AccountBalance;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAccountBody {
  name: string;
  currency?: string;
}

export interface UpdateAccountBody {
  name?: string;
  currency?: string;
}

export interface DeleteAccountResponse {
  success: true;
}

/** Тип категории (доход/расход) */
export type CategoryType = "income" | "expense";

/** Категория (GET/POST/PATCH /v1/categories) */
export interface Category {
  id: string;
  userId: string;
  name: string;
  type: CategoryType;
  icon: string | null;
  color: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryBody {
  name: string;
  type: CategoryType;
  icon?: string;
  color?: string;
}

export interface UpdateCategoryBody {
  name?: string;
  type?: CategoryType;
  icon?: string;
  color?: string;
}

export interface DeleteCategoryResponse {
  success: true;
}

/** Вложенная категория в транзакции */
export interface TransactionCategoryRef {
  id: string;
  name: string;
  type: CategoryType;
}

/** Вложенный счёт в транзакции */
export interface TransactionAccountRef {
  id: string;
  name: string;
}

/** Сплит транзакции в ответе: id, categoryId, amountMinor, category? */
export interface TransactionSplit {
  id: string;
  transactionId?: string;
  categoryId: string;
  category?: TransactionCategoryRef;
  amountMinor: number;
}

export interface TransactionSplitItem {
  categoryId: string;
  amountMinor: number;
}

export interface CreateTransactionSplitsBody {
  splits: TransactionSplitItem[];
}

/** Транзакция (GET/POST/PATCH /v1/transactions). amount_minor: доход >0, расход <0 */
export interface Transaction {
  id: string;
  accountId: string;
  categoryId: string;
  category: TransactionCategoryRef;
  account: TransactionAccountRef;
  /** Может прийти как MoneyDto или уже форматированная строка */
  amount: MoneyDto | string;
  amount_minor: number;
  currency: string;
  date: string;
  memo: string | null;
  createdAt: string;
  splits?: TransactionSplit[];
}

export interface GetTransactionsQuery {
  accountId?: string;
  categoryId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  /** Номер страницы (по умолчанию 1, max 500) */
  page?: number;
  /** Размер страницы (по умолчанию 20, max 100) */
  limit?: number;
}

export interface GetTransactionsResponse {
  items: Transaction[];
  total: number;
}

export interface CreateTransactionBody {
  accountId: string;
  categoryId: string;
  amountMinor: number;
  currency?: string;
  date: string;
  memo?: string;
}

export interface UpdateTransactionBody {
  accountId?: string;
  categoryId?: string;
  amountMinor?: number;
  currency?: string;
  date?: string;
  memo?: string;
}

export interface DeleteTransactionResponse {
  success: true;
}

/** Шаблон транзакции (GET/POST /v1/transactions/templates) */
export interface TransactionTemplate {
  id: string;
  name: string;
  categoryId: string;
  category?: TransactionCategoryRef;
  /** Может прийти как MoneyDto или форматированная строка */
  amount: MoneyDto | string;
  amount_minor: number;
  currency: string;
}

export interface CreateTransactionTemplateBody {
  name: string;
  categoryId: string;
  amountMinor: number;
  currency?: string;
}

/** Severity/status для dashboard (good | attention | risk и т.д.) */
export type DashboardSeverity = "good" | "attention" | "risk" | string;
export type DashboardStatus = "stable" | "attention" | "risk" | string;

/** GET /v1/dashboard/summary */
export interface DashboardSummaryMonth {
  dateFrom: string;
  dateTo: string;
}

export interface DashboardSummary {
  balance?: MoneyDto | string;
  balance_total_minor: number;
  currency: string;
  month: DashboardSummaryMonth;
  income?: MoneyDto | string;
  income_minor: number;
  expense?: MoneyDto | string;
  expense_minor: number;
  timezone_hint?: string;
}

/** GET /v1/dashboard/forecast */
export interface DashboardForecast {
  balance?: MoneyDto | string;
  projected_balance?: MoneyDto | string;
  projected_balance_minor: number;
  date_to: string;
  days_left: number;
  status: DashboardStatus;
  severity: DashboardSeverity;
  explanation: string;
  timezone_hint?: string;
}

/** Элемент GET /v1/dashboard/alerts */
export interface DashboardAlert {
  type: string;
  severity: DashboardSeverity;
  status: DashboardStatus;
  explanation: string;
  amount?: MoneyDto | string;
}

export interface DashboardAlertsResponse {
  items: DashboardAlert[];
  timezone_hint?: string;
}

/** GET /v1/dashboard/insight */
export interface DashboardInsight {
  text: string;
  severity: DashboardSeverity;
  status: DashboardStatus;
}

/** GET/POST /v1/dashboard/salary-schedules */
export interface SalarySchedule {
  id: string;
  dayOfMonth: number;
  label: string | null;
  createdAt: string;
}

export interface CreateSalaryScheduleBody {
  dayOfMonth: number;
  label?: string;
}

export interface DeleteSalaryScheduleResponse {
  success: true;
}

/** Универсальный объект денег { amount_minor, currency, formatted } */
export interface MoneyDto {
  amount_minor: number;
  currency: string;
  formatted: string;
}

/** Пороги предупреждений бюджета (70%, 85%, 100%) */
export interface BudgetThresholds {
  warning_70: boolean;
  warning_85: boolean;
  danger_100: boolean;
}

/** Бюджет (GET/POST/PATCH /v1/budgets) */
export interface Budget {
  id: string;
  categoryId: string;
  /** Может отсутствовать (lazy join) */
  category?: TransactionCategoryRef;
  /** Объект денег или строка */
  limit: MoneyDto | string;
  limit_minor: number;
  /** Объект денег или строка */
  spent: MoneyDto | string;
  spent_minor: number;
  progress_percent: number;
  /** 'good' | 'attention' | 'risk' */
  severity: "good" | "attention" | "risk" | string;
  /** 'stable' | 'attention' | 'risk' */
  status: "stable" | "attention" | "risk" | string;
  explanation: string;
  currency: string;
  thresholds: BudgetThresholds;
}

export interface CreateBudgetBody {
  categoryId: string;
  limitMinor: number;
  currency?: string;
}

export interface UpdateBudgetBody {
  limitMinor?: number;
  currency?: string;
}

export interface DeleteBudgetResponse {
  success: true;
}

/** Цель накопления (GET/POST/PATCH /v1/goals) */
export interface Goal {
  id: string;
  name: string;
  /** Объект денег или строка */
  target: MoneyDto | string;
  target_minor: number;
  /** Объект денег или строка */
  current: MoneyDto | string;
  current_minor: number;
  progress_percent: number;
  target_date: string;
  currency: string;
  /** 'good' | 'attention' | 'risk' */
  severity: "good" | "attention" | "risk" | string;
  /** 'stable' | 'attention' */
  status: "stable" | "attention" | string;
  explanation: string;
}

export interface CreateGoalBody {
  name: string;
  targetMinor: number;
  currentMinor?: number;
  targetDate: string;
  currency?: string;
}

export interface UpdateGoalBody {
  name?: string;
  targetMinor?: number;
  currentMinor?: number;
  targetDate?: string;
  currency?: string;
}

export interface DeleteGoalResponse {
  success: true;
}

/** Запись операции по цели (пополнение/снятие) */
export interface GoalEntry {
  id: string;
  goalId: string;
  amountMinor: number;
  comment: string | null;
  createdAt: string;
}

export interface GoalEntriesResponse {
  items: GoalEntry[];
  total: number;
  page: number;
  limit: number;
}

export interface AddGoalEntryBody {
  amountMinor: number;
  comment?: string;
}

/** Ответ POST /v1/goals/:id/entries: созданная запись + обновлённая цель */
export interface AddGoalEntryResponse {
  entry: GoalEntry;
  goal: Goal;
}

/** Элемент byMonth в аналитике по цели */
export interface GoalAnalyticsByMonth {
  month: string;
  added?: MoneyDto | string;
  added_minor?: number;
  withdrawn?: MoneyDto | string;
  withdrawn_minor?: number;
}

export interface GoalAnalyticsResponse {
  goalId: string;
  entriesCount: number;
  totalAdded?: MoneyDto | string;
  totalAdded_minor?: number;
  totalWithdrawn?: MoneyDto | string;
  totalWithdrawn_minor?: number;
  byMonth?: GoalAnalyticsByMonth[];
}

/** @deprecated Используйте MoneyDto */
export type AnalyticsMoneyDto = MoneyDto;

/** GET /v1/analytics/monthly */
export interface AnalyticsMonth {
  month: string;
  income: AnalyticsMoneyDto;
  expense: AnalyticsMoneyDto;
}

export interface AnalyticsMonthlyResponse {
  year: number;
  months: AnalyticsMonth[];
}

/** Элемент GET /v1/analytics/categories */
export interface AnalyticsCategoryItem {
  categoryId: string;
  name: string;
  type: CategoryType;
  expense: string;
  expense_minor: number;
}

export interface AnalyticsCategoriesQuery {
  dateFrom?: string;
  dateTo?: string;
}

export interface AnalyticsCategoriesResponse {
  items: AnalyticsCategoryItem[];
  /** Объект денег { amount_minor, currency, formatted } или строка */
  total_expense: AnalyticsMoneyDto | string | null;
  total_expense_minor: number;
}

/** GET /v1/analytics/trends */
export interface AnalyticsTrendItem {
  month: string;
  net: string;
  net_minor: number;
}

export interface AnalyticsTrendsResponse {
  items: AnalyticsTrendItem[];
}

/** Элемент GET /v1/analytics/heatmap — день в календаре */
export interface AnalyticsHeatmapDay {
  date?: string;
  level?: number;
  anomaly?: boolean;
}

/** GET /v1/analytics/heatmap (stub) */
export interface AnalyticsHeatmapResponse {
  days: AnalyticsHeatmapDay[];
  explanation: string;
}

/** Элемент GET /v1/analytics/anomalies */
export interface AnalyticsAnomalyItem {
  id?: string;
  period?: string;
  note?: string;
  explanation?: string;
}

/** GET /v1/analytics/anomalies (stub) */
export interface AnalyticsAnomaliesResponse {
  items: AnalyticsAnomalyItem[];
  status: string;
}

/** Кредит (GET/POST/PATCH /v1/credits) */
export interface Credit {
  id: string;
  bank: string | null;
  /** Объект денег или строка */
  principal: MoneyDto | string;
  principal_minor: number;
  ratePct: number;
  termMonths: number;
  /** Объект денег или строка */
  monthlyPayment: MoneyDto | string;
  monthly_payment_minor: number;
  currency: string;
  /** День месяца платежа (1–31) или null */
  paymentDayOfMonth?: number | null;
  /** Ближайшая дата платежа YYYY-MM-DD */
  nextPaymentDate?: string | null;
  /** Дней до ближайшего платежа */
  daysUntilPayment?: number | null;
}

/** Элемент GET /v1/credits/reminders */
export interface CreditReminderItem {
  id: string;
  bank: string | null;
  monthlyPayment?: MoneyDto | string;
  monthly_payment_minor?: number;
  nextPaymentDate?: string;
  daysUntilPayment?: number;
  currency?: string;
}

export interface CreditsRemindersResponse {
  items: CreditReminderItem[];
  daysAhead: number;
}


/** GET /v1/credits/summary */
export interface CreditsSummaryResponse {
  total_debt: MoneyDto | string;
  total_debt_minor: number;
  total_monthly_payment: MoneyDto | string;
  total_monthly_payment_minor: number;
  debt_to_income_percent: number;
  /** 'good' | 'attention' | 'risk' */
  severity: "good" | "attention" | "risk" | string;
  status: "stable" | "attention" | "risk" | string;
  explanation: string;
  currency: string;
}

export interface CreateCreditBody {
  bank?: string | null;
  principalMinor: number;
  ratePct: number;
  termMonths: number;
  monthlyPaymentMinor: number;
  /** День месяца платежа (1–31) для напоминаний */
  paymentDayOfMonth?: number | null;
  currency?: string;
}

export interface UpdateCreditBody {
  bank?: string | null;
  principalMinor?: number;
  ratePct?: number;
  termMonths?: number;
  monthlyPaymentMinor?: number;
  paymentDayOfMonth?: number | null;
  currency?: string;
}

export interface DeleteCreditResponse {
  success: true;
}

/** POST /v1/credits/simulate-prepayment */
export interface SimulatePrepaymentBody {
  extraPerMonthMinor: number;
}

export interface SimulatePrepaymentResponse {
  extra_per_month: MoneyDto | string;
  new_total_monthly: MoneyDto | string;
  estimated_months_to_payoff: number;
  estimated_overpayment: MoneyDto | string;
  severity: string;
}

/** GET /v1/security/sessions — только не истёкшие */
export interface SecuritySession {
  id: string;
  createdAt: string;
  expiresAt: string;
}

/** GET /v1/security/events */
export interface SecurityEvent {
  id: string;
  type: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

/** Подписка (GET/POST/PATCH /v1/subscriptions) */
export type SubscriptionSeverity = "good" | "attention" | "risk";
export type SubscriptionStatus = "stable" | "soon" | "overdue";

export interface Subscription {
  id: string;
  userId: string;
  name: string;
  /** Объект денег или строка */
  amount: MoneyDto | string;
  amount_minor: number;
  currency: string;
  nextPaymentDate: string;
  intervalDays: number;
  categoryId: string;
  /** Может отсутствовать (lazy join) */
  category?: TransactionCategoryRef;
  severity: SubscriptionSeverity;
  status: SubscriptionStatus;
}

export interface CreateSubscriptionBody {
  name: string;
  amountMinor: number;
  currency?: string;
  nextPaymentDate: string;
  intervalDays: number;
  categoryId: string;
}

export interface UpdateSubscriptionBody {
  name?: string;
  amountMinor?: number;
  currency?: string;
  nextPaymentDate?: string;
  intervalDays?: number;
  categoryId?: string;
}

/** Домохозяйство (GET/POST /v1/household). GET возвращает null, если нет. */
export type HouseholdMemberRole = "owner" | "member" | "viewer";

export interface HouseholdMember {
  id: string;
  userId: string;
  email: string;
  name: string | null;
  role: HouseholdMemberRole;
  joinedAt: string;
}

export interface Household {
  id: string;
  name: string;
  members: HouseholdMember[];
}

export interface CreateHouseholdBody {
  name: string;
}

export interface InviteHouseholdBody {
  email: string;
  role: HouseholdMemberRole;
}

export interface PatchHouseholdMemberBody {
  role: HouseholdMemberRole;
}

/** GET /v1/dashboard/index — финансовый индекс (Pro) */
export interface DashboardIndexFactor {
  label: string;
  score: number;
}

export type DashboardIndexStatus = "stable" | "attention" | "risk";

export interface DashboardIndex {
  score: number;
  status: DashboardIndexStatus;
  factors_positive: DashboardIndexFactor[];
  factors_negative: DashboardIndexFactor[];
}

/** POST /v1/transactions/voice-parse */
export interface VoiceParseBody {
  text: string;
}

export interface VoiceParseResponse {
  amountMinor: number;
  categoryId: string | null;
  memo: string | null;
}

/** POST /v1/transactions/receipt-ocr */
export interface ReceiptOcrResponse {
  amountMinor: number;
  date: string | null;
  memo: string | null;
  categoryId: string | null;
}

/** POST /v1/analytics/monthly-report/export */
export interface MonthlyReportExportBody {
  year?: number;
  month?: number;
}

export interface MonthlyReportExportResponse {
  url: string;
}

export interface FeatureGatedBody {
  code: "FEATURE_GATED";
  feature_code: string;
  upgrade_hint: string;
}

export class ApiError extends Error {
  declare status: number;
  declare body: unknown;
  featureCode?: string;
  upgradeHint?: string;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
    if (body && typeof body === "object" && "feature_code" in body && "upgrade_hint" in body) {
      this.featureCode = (body as FeatureGatedBody).feature_code;
      this.upgradeHint = (body as FeatureGatedBody).upgrade_hint;
    }
  }
}

export class FeatureGatedError extends ApiError {
  constructor(
    message: string,
    status: number,
    public featureCode: string,
    public upgradeHint: string,
  ) {
    super(message, status, { code: "FEATURE_GATED", feature_code: featureCode, upgrade_hint: upgradeHint });
    this.name = "FeatureGatedError";
  }
}
