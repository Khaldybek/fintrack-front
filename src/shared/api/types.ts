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

/** POST /v1/transactions/:id/splits — тело запроса разбивки по категориям (SetSplitsDto). */
export interface CreateTransactionSplitsBody {
  splits: TransactionSplitItem[];
}

/** Транзакция (GET /v1/transactions/:id, POST/PATCH /v1/transactions). amount_minor: доход >0, расход <0 */
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

/** GET /v1/transactions — список транзакций. Ответ 200: { items, total }. */
export interface GetTransactionsQuery {
  /** Фильтр по счёту (UUID) */
  accountId?: string;
  /** Фильтр по категории (UUID) */
  categoryId?: string;
  /** Начало периода, YYYY-MM-DD */
  dateFrom?: string;
  /** Конец периода, YYYY-MM-DD */
  dateTo?: string;
  /** Поиск по memo */
  search?: string;
  /** Страница (по умолчанию 1) */
  page?: number;
  /** На страницу (1–500, по умолчанию 20) */
  limit?: number;
}

export interface GetTransactionsResponse {
  items: Transaction[];
  total: number;
}

/** POST /v1/transactions — создание транзакции. Ответ 201: объект созданной транзакции. */
export interface CreateTransactionBody {
  /** UUID счёта */
  accountId: string;
  /** UUID категории */
  categoryId: string;
  /** Сумма в минорах (расход < 0, доход > 0) */
  amountMinor: number;
  /** Дата в формате YYYY-MM-DD */
  date: string;
  /** По умолчанию KZT */
  currency?: string;
  /** До 2000 символов */
  memo?: string;
}

/** PATCH /v1/transactions/:id — частичное обновление (все поля опциональны). */
export interface UpdateTransactionBody {
  accountId?: string;
  categoryId?: string;
  amountMinor?: number;
  currency?: string;
  date?: string;
  memo?: string;
}

/** DELETE /v1/transactions/:id — ответ при удалении (soft delete). */
export interface DeleteTransactionResponse {
  success: true;
}

/** Шаблон транзакции: GET /v1/transactions/templates, POST /v1/transactions/templates, DELETE /v1/transactions/templates/:id */
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

/** POST /v1/transactions/templates — создание шаблона. */
export interface CreateTransactionTemplateBody {
  name: string;
  categoryId: string;
  amountMinor: number;
  currency?: string;
}

/** Severity/status для dashboard (good | attention | risk и т.д.) */
export type DashboardSeverity = "good" | "attention" | "risk" | string;
export type DashboardStatus = "stable" | "attention" | "risk" | string;

/** GET /v1/dashboard/summary — границы месяца в ответе сводки. */
export interface DashboardSummaryMonth {
  dateFrom: string;
  dateTo: string;
}

/**
 * GET /v1/dashboard/summary — сводка дашборда.
 * Ответ 200: баланс, доход и расход за текущий месяц, валюта, границы месяца.
 */
export interface DashboardSummary {
  /** Баланс (форматированный или MoneyDto) */
  balance?: MoneyDto | string;
  /** Баланс в минорных единицах */
  balance_total_minor: number;
  /** Валюта (например KZT) */
  currency: string;
  /** Границы текущего месяца */
  month: DashboardSummaryMonth;
  /** Доход за месяц (форматированный или MoneyDto) */
  income?: MoneyDto | string;
  /** Доход за месяц в минорах */
  income_minor: number;
  /** Расход за месяц (форматированный или MoneyDto) */
  expense?: MoneyDto | string;
  /** Расход за месяц в минорах */
  expense_minor: number;
  /** Подсказка таймзоны для отображения дат */
  timezone_hint?: string;
}

/**
 * GET /v1/dashboard/forecast — прогноз с AI-объяснением.
 * Ответ 200: balance, projected_balance (object: amount_minor, currency, formatted), date_to, days_left, status, severity, explanation (всегда), explanationAi (опционально).
 * Если AI выключен или ошибка — приходит только explanation, explanationAi может отсутствовать.
 */
export interface DashboardForecast {
  /** Текущий баланс (amount_minor, currency, formatted) */
  balance?: MoneyDto | string;
  /** Прогноз на конец месяца */
  projected_balance?: MoneyDto | string;
  /** Прогноз на конец месяца числом (миноры) */
  projected_balance_minor: number;
  /** Конец месяца YYYY-MM-DD */
  date_to: string;
  /** Дней до конца месяца */
  days_left: number;
  /** "stable" | "attention" | "risk" */
  status: DashboardStatus;
  /** "good" | "attention" | "risk" */
  severity: DashboardSeverity;
  /** Текстовое объяснение (всегда) */
  explanation: string;
  /** Краткое объяснение от AI (1–2 предложения), опционально */
  explanationAi?: string;
  /** Таймзона пользователя */
  timezone_hint?: string;
}

/** Элемент GET /v1/dashboard/alerts — алерт (минус баланс, низкий остаток, зарплата и т.д.). */
export interface DashboardAlert {
  type: string;
  severity: DashboardSeverity;
  status: DashboardStatus;
  explanation: string;
  amount?: MoneyDto | string;
}

/** GET /v1/dashboard/alerts — алерты дашборда. */
export interface DashboardAlertsResponse {
  items: DashboardAlert[];
  timezone_hint?: string;
}

/**
 * GET /v1/dashboard/insight — инсайт дня (AI).
 * Один персонализированный совет на основе баланса и прогноза. Кеш на бэкенде ~6 ч.
 * Ответ 200:
 */
export interface DashboardInsight {
  /** Текст совета (1–2 предложения) */
  text: string;
  /** "good" | "attention" | "risk" */
  severity: DashboardSeverity;
  /** "stable" | "attention" | "risk" */
  status: DashboardStatus;
}

/** GET /v1/dashboard/salary-schedules — элемент расписания зарплат. */
export interface SalarySchedule {
  id: string;
  dayOfMonth: number;
  label: string | null;
  /** Сумма в минорных единицах валюты (целые ₸), если указана при создании */
  amountMinor?: number | null;
  createdAt: string;
}

/** POST /v1/dashboard/salary-schedules — добавить расписание */
export interface CreateSalaryScheduleBody {
  dayOfMonth: number;
  label?: string;
  /** Сумма зарплаты в минорных единицах (≥ 1), необязательно */
  amountMinor?: number | null;
}

/** DELETE /v1/dashboard/salary-schedules/:id — ответ при удалении. */
export interface DeleteSalaryScheduleResponse {
  success: true;
}

/** GET /v1/dashboard/charts — query: dateFrom + dateTo (YYYY-MM-DD), months 1..24 (по умолчанию 6). */
export interface DashboardChartsQuery {
  dateFrom: string;
  dateTo: string;
  /** Тренд cashflow по месяцам, 1–24, по умолчанию 6 */
  months?: number;
}

export interface DashboardChartsPeriod {
  dateFrom: string;
  dateTo: string;
}

export interface DashboardExpenseByDay {
  date: string;
  amount_minor: number;
  amount?: MoneyDto | string;
}

export interface DashboardExpenseByCategory {
  categoryId: string;
  name: string;
  color?: string;
  icon?: string;
  amount_minor: number;
  share_pct: number;
  amount?: MoneyDto | string;
}

export interface DashboardCashflowByMonth {
  month: string;
  income_minor: number;
  expense_minor: number;
  net_minor: number;
  income?: MoneyDto | string;
  expense?: MoneyDto | string;
  net?: MoneyDto | string;
}

/** GET /v1/dashboard/charts — графики для главного экрана. */
export interface DashboardChartsResponse {
  period: DashboardChartsPeriod;
  currency: string;
  expense_by_day: DashboardExpenseByDay[];
  expense_by_category: DashboardExpenseByCategory[];
  cashflow_by_month: DashboardCashflowByMonth[];
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

/** Элемент GET /v1/analytics/heatmap */
export interface AnalyticsHeatmapDay {
  /** Новый API: YYYY-MM-DD */
  day?: string;
  /** Сумма расходов за день */
  total?: MoneyDto | string;
  total_minor?: number;
  /** Интенсивность 0–100 для цвета */
  intensity?: number;
  /** Устаревшие поля (старый стаб) */
  date?: string;
  level?: number;
  anomaly?: boolean;
}

/** GET /v1/analytics/heatmap */
export interface AnalyticsHeatmapResponse {
  days: AnalyticsHeatmapDay[];
  explanation?: string;
}

/** Элемент GET /v1/analytics/anomalies */
export interface AnalyticsAnomalyItem {
  /** Новый API */
  month?: string;
  expense?: MoneyDto | string;
  avg_expense?: MoneyDto | string;
  deviation_pct?: number;
  /** Устаревшие поля (старый стаб) */
  id?: string;
  period?: string;
  note?: string;
  explanation?: string;
}

/** GET /v1/analytics/anomalies */
export interface AnalyticsAnomaliesResponse {
  items: AnalyticsAnomalyItem[];
  status: string;
}

/** GET /v1/analytics/top-categories */
export interface AnalyticsTopCategoryItem {
  rank: number;
  categoryId: string;
  name: string;
  icon?: string | null;
  expense: MoneyDto | string;
  expense_minor?: number;
  tx_count: number;
  share_pct: number;
}

export interface AnalyticsTopCategoriesQuery {
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}

export interface AnalyticsTopCategoriesResponse {
  date_from: string;
  date_to: string;
  items: AnalyticsTopCategoryItem[];
  total_expense: MoneyDto | string;
}

/** GET /v1/analytics/savings-rate */
export interface AnalyticsSavingsRateItem {
  month: string;
  income: MoneyDto | string;
  expense: MoneyDto | string;
  saved: MoneyDto | string;
  saved_minor: number;
  savings_rate_pct: number;
  /** good ≥ 20%, attention 0–19%, risk < 0% */
  status: "good" | "attention" | "risk" | string;
}

export interface AnalyticsSavingsRateResponse {
  items: AnalyticsSavingsRateItem[];
}

/** GET /v1/analytics/compare */
export interface AnalyticsComparePeriod {
  date_from: string;
  date_to?: string;
  income: MoneyDto | string;
  expense: MoneyDto | string;
  net: MoneyDto | string;
  tx_count: number;
}

export interface AnalyticsCompareDiff {
  income_change: MoneyDto | string;
  income_change_pct: number;
  expense_change: MoneyDto | string;
  expense_change_pct: number;
}

export interface AnalyticsCompareQuery {
  aFrom: string;
  aTo: string;
  bFrom: string;
  bTo: string;
}

export interface AnalyticsCompareResponse {
  period_a: AnalyticsComparePeriod;
  period_b: AnalyticsComparePeriod;
  diff: AnalyticsCompareDiff;
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
  /** null, если доход не передан на бэке — нельзя считать долю платежей */
  debt_to_income_percent: number | null;
  /** Средневзвешенная ставка по кредитам, % */
  avg_rate_pct?: number | null;
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

/** POST /v1/credits/simulate-prepayment — помесячная амортизация с учётом ставок */
export interface SimulatePrepaymentResponse {
  extra_per_month?: MoneyDto | string;
  new_total_monthly?: MoneyDto | string;
  /** Срок без доп. платежа (текущий график) */
  baseline_months_to_payoff: number;
  /** Срок с доп. платежом extraPerMonthMinor */
  estimated_months_to_payoff: number;
  /** Сколько месяцев сокращает сценарий относительно baseline */
  months_saved?: number;
  /** Полная переплата процентами при baseline */
  baseline_overpayment: MoneyDto | string;
  /** Переплата процентами при досрочном сценарии */
  estimated_overpayment: MoneyDto | string;
  /** Разница в переплате (экономия на процентах) */
  interest_saved?: MoneyDto | string;
  severity: string;
  explanation?: string;
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

/** GET /v1/subscriptions/summary */
export interface SubscriptionsSummaryResponse {
  subscriptions_count: number;
  due_soon_count: number;
  estimated_monthly_total?: MoneyDto | string;
  estimated_monthly_total_minor: number;
  currency: string;
}

/** Элемент GET /v1/subscriptions/reminders — подписка с днями до платежа */
export interface SubscriptionReminder extends Subscription {
  days_until_payment: number;
}

/** DELETE /v1/subscriptions/:id */
export interface DeleteSubscriptionResponse {
  success: true;
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
  /** Иногда приходит в GET /v1/household (синхронно с overview) */
  my_role?: HouseholdMemberRole;
  members_count?: number;
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

/** GET /v1/household/overview — сводка семьи за период (по умолчанию текущий месяц). */
export interface HouseholdOverviewHousehold {
  id: string;
  name: string;
  my_role: HouseholdMemberRole;
  members_count: number;
}

export interface HouseholdOverviewPeriod {
  dateFrom: string;
  dateTo: string;
}

export interface HouseholdOverviewTotals {
  balance_minor: number;
  income_minor: number;
  expense_minor: number;
  balance: MoneyDto;
  income: MoneyDto;
  expense: MoneyDto;
}

/** Баланс по участнику в обзоре семьи */
export interface HouseholdMemberBalanceRow {
  userId: string;
  name: string | null;
  role: HouseholdMemberRole;
  balance_minor: number;
  balance: MoneyDto;
}

export interface HouseholdOverviewResponse {
  household: HouseholdOverviewHousehold;
  period: HouseholdOverviewPeriod;
  totals: HouseholdOverviewTotals;
  members: HouseholdMember[];
  balances_by_member: HouseholdMemberBalanceRow[];
}

export interface GetHouseholdOverviewQuery {
  dateFrom?: string;
  dateTo?: string;
}

/** GET /v1/dashboard/index — фактор индекса (положительный или отрицательный). */
export interface DashboardIndexFactor {
  label: string;
  score: number;
}

export type DashboardIndexStatus = "stable" | "attention" | "risk";

/** GET /v1/dashboard/index — финансовый индекс 0–100 и факторы. */
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

/** POST /v1/transactions/voice-parse — умный ввод из текста/голоса (AI) */
export interface VoiceParseResponse {
  amountMinor: number;
  categoryId: string | null;
  date: string;
  memo: string | null;
  accountId: string | null;
  /** 0–1; при < 0.7 лучше показать «Проверьте» */
  confidence: number;
}

/** POST /v1/transactions/receipt-ocr — чек по фото (AI). При ошибке/нечитаемом фото поля приходят пустыми/нулевыми. */
export interface ReceiptOcrResponse {
  /** Сумма (расход отрицательный), 0 если не распознано */
  amountMinor: number;
  /** YYYY-MM-DD или null */
  date: string | null;
  /** Название магазина */
  memo: string | null;
  /** Подсказка категории */
  categoryId: string | null;
  /** Пока всегда пустой массив; может отсутствовать в ответе */
  items?: unknown[];
}

/** POST /v1/transactions/suggest-category — подсказка категории по memo (AI) */
export interface SuggestCategoryBody {
  /** Текст операции, до 500 символов */
  memo: string;
  /** Сумма в минорах (опционально) */
  amountMinor?: number;
}

export interface SuggestCategoryResponse {
  categoryId: string | null;
  categoryName: string;
  /** Нормализованное имя мерчанта */
  merchantCanonical: string;
  /** 0–1 */
  confidence: number;
}

/** GET /v1/analytics/monthly-report/summary — query-параметры (year, month — по умолчанию текущие). */
export interface MonthlyReportSummaryQuery {
  /** Год (например 2025). По умолчанию — текущий */
  year?: string;
  /** Месяц 1–12. По умолчанию — текущий */
  month?: string;
}

/**
 * GET /v1/analytics/monthly-report/summary — AI-резюме месячного отчёта.
 * Ответ 200: summaryText (короткий абзац), shareReadyText (строка для шаринга).
 * Если нет данных за месяц: оба поля — «Нет данных за период.»
 */
export interface MonthlyReportSummaryResponse {
  /** Короткий абзац: доход, расход, топ категорий, накопления */
  summaryText: string;
  /** Одна короткая строка для шаринга (можно с эмодзи) */
  shareReadyText: string;
}

/** GET /v1/notifications — объединённая лента (дашборд, подписки, кредиты, зарплата) */
export type NotificationSource = "dashboard" | "subscription" | "credit" | "salary";

export type NotificationSeverity = "good" | "attention" | "risk";

export interface NotificationItem {
  id: string;
  source: NotificationSource;
  type: string;
  title: string;
  message: string;
  severity: NotificationSeverity;
  status: string;
  date?: string | null;
  days_left?: number | null;
  meta?: Record<string, unknown>;
}

export interface NotificationsResponse {
  items: NotificationItem[];
}

export interface GetNotificationsQuery {
  /** 1..90, по умолчанию 14 */
  daysAhead?: number;
  /** 1..200, по умолчанию 50 */
  limit?: number;
  /** Включать уведомления с severity good (по умолчанию false) */
  includeStable?: boolean;
}

/** GET /v1/notifications/count */
export interface NotificationsCountResponse {
  total: number;
  unread: number;
  by_severity: {
    risk: number;
    attention: number;
    good: number;
  };
}

export interface GetNotificationsCountQuery {
  daysAhead?: number;
}

/** POST /v1/analytics/monthly-report/export */
export interface MonthlyReportExportBody {
  year?: number;
  month?: number;
}

/** @deprecated API теперь возвращает PDF-blob напрямую */
export interface MonthlyReportExportResponse {
  url?: string;
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
