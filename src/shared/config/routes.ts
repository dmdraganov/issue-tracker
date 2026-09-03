export const SEGMENTS = {
  logIn: 'login',
  signUp: 'signup',
  issues: 'issues',
  projects: 'projects',
  members: 'members',
} as const;

export const PATHS = {
  home: '/',
  logIn: `/${SEGMENTS.logIn}`,
  signUp: `/${SEGMENTS.signUp}`,
  profile: '/profile',
} as const;
