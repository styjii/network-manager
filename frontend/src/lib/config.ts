export const APP_NAME = 'Network Monitor'
export const APP_TAGLINE = 'Supervision Réseau'
export const APP_VERSION = '1.0.0'
/** Les dates sont stockées en UTC côté serveur ; l'affichage suit ce fuseau (cahier des charges, 6.2). */
export const APP_TIMEZONE: string = import.meta.env.VITE_APP_TIMEZONE || 'Indian/Antananarivo'
/** Politique de mot de passe documentée dans le README du backend. */
export const MIN_PASSWORD_LENGTH = 10
/** Rafraîchissement automatique des données (cahier des charges, section 4 : 10 s). */
export const POLL_INTERVAL_MS = 10_000
