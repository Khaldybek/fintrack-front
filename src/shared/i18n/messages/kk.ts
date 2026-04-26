import type { Messages } from "./ru";

/** Қазақ тілі */
export const kk = {
  nav: {
    dashboard: "Басты бет",
    transactions: "Транзакциялар",
    analytics: "Талдау",
    planning: "Бюджет пен мақсаттар",
    profile: "Профиль",
  },
  shell: {
    more: "Тағы",
  },
  extraNav: {
    sectionLabel: "Бөлімдер бойынша навигация",
    sectionTitle: "Қосымша экрандар",
    sectionDesc:
      "Қажетті бөлімді таңдап, сервистік экрандар арасында жылдам өтіңіз.",
    items: {
      cashflow: {
        label: "Төлем қабілеті болжамы",
        desc: "Жалақыға дейінгі ликвидтілік",
      },
      subscriptions: {
        label: "Жазылымдар",
        desc: "Тұрақты төлемдер мен автосписаниялар",
      },
      family: {
        label: "Отбасы режимі",
        desc: "Ортақ бюджет және рөлдер",
      },
      security: {
        label: "Қауіпсіздік",
        desc: "Сессиялар, 2FA және кірулер",
      },
      credits: {
        label: "Несиелер",
        desc: "Қарыз жүктемесі және бостандық күні",
      },
      categories: {
        label: "Санаттар",
        desc: "Кіріс пен шығыс санаттарын басқару",
      },
    },
  },
  common: {
    loading: "Жүктелуде…",
    close: "Жабу",
    cancel: "Болдырмау",
    save: "Сақтау",
    delete: "Жою",
    edit: "Өзгерту",
    yes: "иә",
    no: "жоқ",
  },
  auth: {
    oauth: {
      telegramInlineBrowserHint:
        "Сіз сайтты Telegram ішкі браузерінде аштыңыз. Google арқылы кіру және сессия сонда жиі сақталмайды. «⋯» немесе «Шолғышта ашу» арқылы Safari немесе Chrome-та қайта кіріңіз.",
    },
    login: {
      title: "Кіру",
      subtitle: "Қаржыңызбен жұмысты жалғастырыңыз",
      helper:
        "FinTrack транзакциялардан төлем қабілеті болжамына дейін ақшаны реттеуге көмектеседі.",
      email: "Email",
      password: "Құпия сөз",
      remember: "Есте сақтау",
      forgot: "Құпия сөзді ұмыттыңыз ба?",
      submit: "Кіру",
      submitting: "Кіру…",
      google: "Google арқылы кіру",
      noAccount: "Аккаунт жоқ па?",
      register: "Тіркелу",
      errorFree: "Free тарифына шектеу бар.",
      errorGeneric: "Кіру қатесі. Email мен құпия сөзді тексеріңіз.",
    },
  },
  profile: {
    loadError: "Профильді жүктеу мүмкін болмады",
    title: "Профиль",
    subtitle: "Қауіпсіздік, валюта және жазылым баптаулары бір жерде.",
    logout: "Шығу",
    loggingOut: "Шығу…",
    account: "Аккаунт",
    name: "Аты",
    email: "Email",
    timezone: "Уақыт белдеуі",
    language: "Тіл",
    accounts: "Есептер",
    addAccount: "+ Есеп қосу",
    accountsHint:
      "Транзакцияларды қосқанда есептер қолданылады. Кем дегенде бір есеп қосыңыз.",
    noAccounts:
      "Есеп жоқ. «+ Есеп қосу» батырмасын басып, бірінші есепті жасаңыз (мысалы, карта немесе қолма-қол).",
    security: "Қауіпсіздік",
    securityHint: "Құпия сөзді қалпына келтіру, сессиялар және кіру тарихы.",
    resetPassword: "Құпия сөзді қалпына келтіру",
    resetPasswordDesc: "Құпия сөзді ұмыттыңыз ба? Email-ге сілтеме жібереміз.",
    sessions: "Сессиялар мен құрылғылар",
    notifications: "Хабарламалар",
    planTitle: "FinTrack",
    planSubtitle:
      "Қаржылық индекс, төлем қабілеті болжамы және ақылды ұсыныстарға қолжетімділік.",
    planLimits:
      "Шектеулер: {accounts} есеп, {budgets} бюджет, {goals} мақсат. Индекс: {index}, болжам: {forecast}, отбасы: {family}.",
    manageSubscription: "Жазылымды басқару",
    subscriptionModalTitle: "Жазылымды басқару",
    subscriptionModalConfirm: "Төлемге өту",
    subscriptionModalDesc:
      "Жоспарды өзгерту, төлем күнін көру және автожаңартуды өшіру.",
    deleteAccountTitle: "Есепті жою керек пе?",
    deleteAccountBody:
      "{name} жойылады. Транзакциялар тарихта қалады, бірақ есепке байланыс өзгеруі мүмкін.",
    deleting: "Жойылуда…",
    interface: {
      title: "Интерфейс тілі",
      hint: "Орыс немесе қазақ тілін таңдаңыз. Баптау осы браузерде сақталады.",
      ru: "Орысша",
      kk: "Қазақша",
    },
  },
} satisfies Messages;
