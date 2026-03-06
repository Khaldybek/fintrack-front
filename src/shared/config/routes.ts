/**
 * Константы маршрутов приложения (FSD shared/config)
 */

export const ROUTES = {
  home: "/",
  transactions: "/transactions",
  analytics: "/analytics",
  /** Объединённая страница бюджетов и целей */
  planning: "/planning",
  budgets: "/budgets",
  goals: "/goals",
  profile: "/profile",
  creditCalculator: "/credit-calculator",
  cashflow: "/cashflow",
  subscriptions: "/subscriptions",
  family: "/family",
  security: "/security",
  notifications: "/notifications",
  pro: "/pro",
  login: "/login",
  register: "/register",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  authCallback: "/auth/callback",
  onboarding: "/onboarding",
  categories: "/categories",
} as const;
