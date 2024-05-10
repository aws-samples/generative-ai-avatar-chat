import 'react-i18next';
import ja from '../i18n/ja';

declare module 'i18next' {
  interface CustomTypeOptions {
    resources: typeof ja;
  }
}
