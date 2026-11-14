# OpenFrame

**RU:** Открытое Android-приложение-агрегатор для генерации видео с помощью ИИ. Собственной модели нет — вы подключаете свои API-ключи MiniMax Hailuo и Kling. Ключи хранятся на устройстве в зашифрованном виде.

**EN:** An open-source Android app that aggregates AI video generation APIs. No built-in model — bring your own MiniMax Hailuo and Kling API keys. Keys are stored encrypted on the device.

## Возможности / Features

- Текст → видео и картинка → видео / Text→video and image→video
- MiniMax Hailuo, Kling
- Ключи в `expo-secure-store` (шифрование), только HTTPS / Keys in `expo-secure-store`, HTTPS only
- Защита от двойных нажатий, индикатор ожидания / Double-tap protection and a visible "waiting for server" state
- Понятные ошибки (нет интернета, нет баланса и т. д.) / Human-readable errors (no network, no balance, ...)
- История, просмотр, шаринг, удаление / History with play, share, delete
- Русский и English интерфейс / Russian and English UI

## Запуск для разработки / Development

```bash
npm install
npx expo start
```

## Сборка APK через EAS Build (без Android Studio) / Building an APK with EAS Build (no Android Studio)

1. **Установите Node.js (LTS)** — https://nodejs.org / Install Node.js LTS.
2. **Установите зависимости проекта / Install dependencies:**
   ```bash
   npm install
   ```
3. **Установите EAS CLI / Install EAS CLI:**
   ```bash
   npm i -g eas-cli
   ```
4. **Создайте аккаунт Expo (бесплатно) / Create a free Expo account:** https://expo.dev/signup
5. **Войдите / Log in:**
   ```bash
   eas login
   ```
6. **Настройте проект / Configure the project:**
   ```bash
   eas build:configure
   ```
   Выберите платформу Android. / Choose Android.
7. **Убедитесь, что в `eas.json` профиль `preview` собирает APK / Make sure the `preview` profile builds an APK:**
   ```json
   {
     "build": {
       "preview": {
         "distribution": "internal",
         "android": { "buildType": "apk" }
       }
     }
   }
   ```
8. **Запустите сборку в облаке / Start the cloud build:**
   ```bash
   eas build -p android --profile preview
   ```
   На вопрос про keystore ответьте «Yes» — EAS создаст его сам. / Answer "Yes" to generate a keystore.
9. **Скачайте APK / Download the APK:** по ссылке в терминале или на https://expo.dev → Projects → Builds (можно открыть QR-код на телефоне). / Use the link in the terminal or the Builds page (scan the QR on your phone).
10. **Установите на телефон / Install on the phone:** скопируйте APK на устройство, откройте его и разрешите «Установку из неизвестных источников». / Copy the APK, open it and allow "Install unknown apps".
11. **Введите ключи / Enter keys:** вкладка «Настройки» / Settings tab.

### Если что-то не работает / Troubleshooting

| Проблема / Problem | Решение / Fix |
|---|---|
| `eas: command not found` | Перезапустите терминал; проверьте `npm bin -g` в PATH / Restart the terminal, check global npm path |
| Не авторизован / Not logged in | `eas login`, проверьте `eas whoami` |
| Собралось `.aab`, а не `.apk` | В `eas.json` профиля `preview` задайте `"buildType": "apk"` / Set `buildType: apk` |
| Ошибка Gradle / Gradle error | Откройте лог сборки на expo.dev, обычно виновата несовместимая версия зависимости: `npx expo install --check` |
| Очередь сборки долгая / Long queue | На бесплатном тарифе это нормально, подождите / Normal on the free plan |
| APK не устанавливается / APK won't install | Разрешите установку из неизвестных источников; удалите старую версию с другой подписью / Allow unknown sources; uninstall an older build signed differently |
| Видео не создаётся / Generation fails | Проверьте ключи, баланс и интернет — текст ошибки в приложении подскажет причину / Check keys, balance, network — the in-app message explains |

## Лицензия / License

See [LICENSE](LICENSE).
