/** Русский — эталонная структура ключей */
export const ru = {
  nav: {
    dashboard: "Главная",
    transactions: "Транзакции",
    analytics: "Аналитика",
    planning: "Бюджеты и цели",
    profile: "Профиль",
  },
  shell: {
    more: "Ещё",
  },
  extraNav: {
    sectionLabel: "Навигация по разделам",
    sectionTitle: "Дополнительные экраны",
    sectionDesc:
      "Нажмите на нужный раздел, чтобы быстро перейти между сервисными экранами.",
    items: {
      cashflow: {
        label: "Прогноз разрыва",
        desc: "Контроль ликвидности до зарплаты",
      },
      subscriptions: {
        label: "Подписки",
        desc: "Регулярные платежи и автосписания",
      },
      family: {
        label: "Семейный режим",
        desc: "Общий бюджет и роли доступа",
      },
      security: {
        label: "Безопасность",
        desc: "Сессии, 2FA и контроль входов",
      },
      credits: {
        label: "Кредиты",
        desc: "Долговая нагрузка и дата свободы",
      },
      categories: {
        label: "Категории",
        desc: "Управление категориями доходов и расходов",
      },
    },
  },
  common: {
    loading: "Загрузка…",
    close: "Закрыть",
    cancel: "Отмена",
    save: "Сохранить",
    delete: "Удалить",
    edit: "Изменить",
    yes: "да",
    no: "нет",
  },
  auth: {
    login: {
      title: "Вход",
      subtitle: "Продолжите работу с вашими финансами",
      helper:
        "FinTrack помогает держать деньги в порядке: от транзакций до прогнозов ликвидности.",
      email: "Email",
      password: "Пароль",
      remember: "Запомнить меня",
      forgot: "Забыли пароль?",
      submit: "Войти",
      submitting: "Вход…",
      google: "Войти через Google",
      noAccount: "Нет аккаунта?",
      register: "Зарегистрироваться",
      errorFree: "Доступ ограничен тарифом Free.",
      errorGeneric: "Ошибка входа. Проверьте email и пароль.",
    },
  },
  profile: {
    loadError: "Не удалось загрузить профиль",
    title: "Профиль",
    subtitle:
      "Настройки безопасности, валюты и подписки в одном месте.",
    logout: "Выйти из аккаунта",
    loggingOut: "Выход…",
    account: "Аккаунт",
    name: "Имя",
    email: "Email",
    timezone: "Часовой пояс",
    language: "Язык",
    accounts: "Счета",
    addAccount: "+ Добавить счёт",
    accountsHint:
      "Счета используются при добавлении транзакций. Добавьте хотя бы один счёт, чтобы сохранять операции.",
    noAccounts:
      "Нет счетов. Нажмите «+ Добавить счёт», чтобы создать первый (например, основная карта или наличные).",
    security: "Безопасность",
    securityHint: "Сброс пароля, сессии и история входов.",
    resetPassword: "Сброс пароля (Reset password)",
    resetPasswordDesc:
      "Забыли пароль? Отправим ссылку на email для смены пароля.",
    sessions: "Сессии и устройства",
    notifications: "Уведомления",
    planTitle: "FinTrack",
    planSubtitle:
      "Доступ к финансовому индексу, прогнозу кассового разрыва и умным инсайтам.",
    planLimits:
      "Лимиты: {accounts} счетов, {budgets} бюджетов, {goals} целей. Индекс: {index}, прогноз: {forecast}, семейный режим: {family}.",
    manageSubscription: "Управлять подпиской",
    subscriptionModalTitle: "Управление подпиской",
    subscriptionModalConfirm: "Перейти к оплате",
    subscriptionModalDesc:
      "Управление подпиской включает смену плана, просмотр даты списания и отключение автопродления.",
    deleteAccountTitle: "Удалить счёт?",
    deleteAccountBody:
      "{name} будет удалён. Транзакции по нему останутся в истории, но привязка к счёту может измениться.",
    deleting: "Удаление…",
    interface: {
      title: "Язык интерфейса",
      hint: "Выберите русский или казахский. Настройка сохраняется в этом браузере.",
      ru: "Русский",
      kk: "Қазақша",
    },
  },
};

export type Messages = typeof ru;
