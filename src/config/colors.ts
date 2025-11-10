/**
 * Centralized color configuration for the TestFrame application
 * Uses Tailwind CSS utility classes with pastel and muted color palette
 */

export const colors = {
  // Primary - Muted taupe for main actions and focus states
  primary: {
    bg: 'bg-stone-400',
    bgHover: 'bg-stone-500',
    bgActive: 'bg-stone-600',
    text: 'text-stone-600',
    textHover: 'text-stone-700',
    border: 'border-stone-400',
    ring: 'focus:ring-stone-500',
    badge: 'bg-stone-100 text-stone-800',
  },

  // Secondary - Muted neutral gray
  secondary: {
    bg: 'bg-slate-50',
    bgHover: 'bg-slate-50',
    text: 'text-slate-900',
    textMuted: 'text-slate-600',
    textLight: 'text-slate-500',
    border: 'border-slate-300',
    borderLight: 'border-slate-200',
    divide: 'divide-slate-200',
    ring: 'focus:ring-stone-400',
    skeleton: 'bg-slate-200',
  },

  // Success - Pastel green
  success: {
    bg: 'bg-emerald-800',
    bgHover: 'bg-emerald-500',
    text: 'text-white',
    badge: 'bg-emerald-100 text-emerald-800',
    badgeLight: 'bg-emerald-200 text-emerald-700',
    ring: 'focus:ring-emerald-400',
  },

  // Danger - Pastel red/rose
  danger: {
    bg: 'bg-rose-300',
    bgHover: 'bg-rose-400',
    bgLight: 'bg-rose-50',
    text: 'text-rose-600',
    textDark: 'text-rose-700',
    border: 'border-rose-200',
    badge: 'bg-rose-100 text-rose-800',
  },

  // Warning - Pastel amber/yellow
  warning: {
    bg: 'bg-amber-300',
    bgHover: 'bg-amber-400',
    text: 'text-amber-600',
    badge: 'bg-amber-100 text-amber-800',
    badgeLight: 'bg-amber-200 text-amber-700',
  },

  // Info/Blocked - Pastel orange
  blocked: {
    text: 'text-amber-600',
    badge: 'bg-amber-100 text-amber-800',
  },

  // Navigation
  nav: {
    bg: 'bg-white',
    border: 'border-stone-400',
    text: 'text-slate-600',
    textActive: 'text-slate-900',
    textHover: 'text-slate-900',
  },

  // Status badges
  status: {
    notStarted: {
      bg: 'bg-slate-100',
      text: 'text-slate-700',
    },
    inProgress: {
      bg: 'bg-blue-200',
      text: 'text-blue-700',
    },
    completed: {
      bg: 'bg-emerald-800',
      text: 'text-stone-100',
    },
  },

  // Test execution results
  testResults: {
    pass: {
      text: 'text-emerald-800',
      badge: 'bg-emerald-800 text-stone-100',
    },
    fail: {
      text: 'text-rose-600',
      badge: 'bg-rose-100 text-rose-800',
    },
    blocked: {
      text: 'text-amber-600',
      badge: 'bg-amber-100 text-amber-800',
    },
    skip: {
      text: 'text-slate-600',
      badge: 'bg-slate-100 text-slate-800',
    },
    notRun: {
      text: 'text-slate-400',
      badge: 'bg-slate-50 text-slate-500',
    },
  },

  // Priority levels (for test cases)
  priority: {
    p0: {
      badge: 'bg-rose-100 text-rose-800',
    },
    p1: {
      badge: 'bg-orange-100 text-orange-800',
    },
    p2: {
      badge: 'bg-amber-100 text-amber-800',
    },
    p3: {
      badge: 'bg-emerald-800 text-white',
    },
  },

  // UI Elements
  form: {
    input: 'border-slate-300',
    inputFocus: 'focus:ring-stone-500 focus:border-stone-500',
    label: 'text-slate-700',
    placeholder: 'text-slate-500',
    disabled: 'bg-slate-50 text-slate-600 cursor-not-allowed',
  },

  // Progress bar
  progress: {
    bg: 'bg-slate-200',
    fill: 'bg-stone-400',
  },

  // Backgrounds
  background: {
    main: 'bg-slate-50',
    card: 'bg-white',
    hover: 'hover:bg-slate-50',
    selected: 'bg-stone-50',
    selectedBorder: 'border-stone-600',
  },

  // Text variants
  text: {
    primary: 'text-slate-900',
    secondary: 'text-slate-600',
    muted: 'text-slate-500',
    light: 'text-slate-400',
    inverse: 'text-white',
  },

  // Shadows and borders
  ui: {
    shadow: 'shadow-sm',
    shadowLg: 'shadow',
    border: 'border',
    borderLight: 'border-b',
    divide: 'divide-y divide-slate-200',
  },
};

/**
 * Helper functions for common color combinations
 */

export const colorHelpers = {
  /**
   * Get status badge colors for test run status
   */
  getStatusBadge: (status: 'Not Started' | 'In Progress' | 'Completed') => {
    switch (status) {
      case 'Not Started':
        return colors.status.notStarted;
      case 'In Progress':
        return colors.status.inProgress;
      case 'Completed':
        return colors.status.completed;
      default:
        return colors.status.notStarted;
    }
  },

  /**
   * Get test result badge colors
   */
  getTestResultBadge: (result: 'Pass' | 'Fail' | 'Blocked' | 'Skip' | 'Not Run') => {
    switch (result) {
      case 'Pass':
        return colors.testResults.pass.badge;
      case 'Fail':
        return colors.testResults.fail.badge;
      case 'Blocked':
        return colors.testResults.blocked.badge;
      case 'Skip':
        return colors.testResults.skip.badge;
      case 'Not Run':
        return colors.testResults.notRun.badge;
      default:
        return colors.testResults.notRun.badge;
    }
  },

  /**
   * Get priority badge colors
   */
  getPriorityBadge: (priority: 'P0' | 'P1' | 'P2' | 'P3') => {
    switch (priority) {
      case 'P0':
        return colors.priority.p0.badge;
      case 'P1':
        return colors.priority.p1.badge;
      case 'P2':
        return colors.priority.p2.badge;
      case 'P3':
        return colors.priority.p3.badge;
      default:
        return colors.priority.p3.badge;
    }
  },

  /**
   * Get pass rate color based on percentage
   */
  getPassRateColor: (passRate: number) => {
    if (passRate >= 80) return colors.success.text;
    if (passRate >= 50) return colors.warning.text;
    return colors.danger.text;
  },

  /**
   * Get test result text color
   */
  getTestResultColor: (result: 'Pass' | 'Fail' | 'Blocked' | 'Skip' | 'Not Run') => {
    switch (result) {
      case 'Pass':
        return colors.testResults.pass.text;
      case 'Fail':
        return colors.testResults.fail.text;
      case 'Blocked':
        return colors.testResults.blocked.text;
      case 'Skip':
        return colors.testResults.skip.text;
      case 'Not Run':
        return colors.testResults.notRun.text;
      default:
        return colors.testResults.notRun.text;
    }
  },

  /**
   * Build a button class string
   */
  button: {
    primary: `${colors.primary.bg} hover:${colors.primary.bgHover} text-white ${colors.primary.ring}`,
    secondary: `${colors.secondary.border} text-slate-700 ${colors.background.hover}`,
    danger: `${colors.danger.bg} hover:${colors.danger.bgHover} text-white`,
    success: `${colors.success.bg} hover:${colors.success.bgHover} text-white`,
  },

  /**
   * Build a form input class string
   */
  formInput: `border ${colors.form.input} rounded-md shadow-sm py-2 px-3 outline-none ${colors.form.inputFocus} text-sm`,
};
