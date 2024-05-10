import i18next, { Resource } from 'i18next';
import { initReactI18next } from 'react-i18next';
import ja from './ja';
import ko from './ko';
import vi from './vi';
import zh from './zh';
import en from './en';

export const LANGUAGE_OPTIONS = [
  {
    label: '日本語',
    value: '日本語',
    code: 'ja',
    transcribeCode: 'ja-JP',
  },
  {
    label: '한국어',
    value: '韓国語',
    code: 'ko',
    transcribeCode: 'ko-KR',
  },
  {
    label: 'Tiếng Việt',
    value: 'ベトナム語',
    code: 'vi',
    // "vi-VN" is NOT supported stream transcription.
    // https://docs.aws.amazon.com/ja_jp/transcribe/latest/dg/supported-languages.html
    transcribeCode: '',
  },
  {
    label: '简体中文',
    value: '中国語（簡体字）',
    code: 'zh',
    transcribeCode: 'zh-CN',
  },
  {
    label: 'English',
    value: '英語',
    code: 'en',
    transcribeCode: 'en-US',
  },
];
export const resources: Resource = {
  ja,
  ko,
  vi,
  zh,
  en,
};

// Settings i18n
const i18n = i18next.use(initReactI18next).init({
  resources,
  fallbackLng: 'ja',
  interpolation: {
    escapeValue: false, // react already safes from xss => https://www.i18next.com/translation-function/interpolation#unescape
  },
});

export default i18n;
