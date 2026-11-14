import { t } from '../i18n';
import { toAppError } from './errors';

/** Returns a localized, human-readable message (i18n key `errors.<CODE>`). */
export function getErrorMessage(error: unknown): string {
  return t(`errors.${toAppError(error).code}`);
}
