export const SEGMENTS = {
  logIn: 'login',
  signUp: 'signup',
} as const;

export const PATHS = {
  home: '/',
  logIn: `/${SEGMENTS.logIn}`,
  signUp: `/${SEGMENTS.signUp}`,
  profile: '/profile',
} as const;
