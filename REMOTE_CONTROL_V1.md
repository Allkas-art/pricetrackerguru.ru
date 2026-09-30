# Remote Control v1 — каноническая схема

Цель: один `config.json` является источником управляемых значений для Android-приложения и сайта. APK 2.0.0 не меняется.

## Управляется текущим APK 2.0.0

- `version_control.min_version_code` — минимальный разрешённый versionCode.
- `version_control.force_update` — включает блокирующее требование обновления.
- `version_control.update_url` — ссылка кнопки обновления.
- `version_control.update_message` — текст окна обновления.
- `app_limits.max_products` — максимальное число отслеживаемых товаров.
- `app_limits.history_months` — период истории, используемый приложением.
- `community_links.*` — внешние ссылки сообщества и RuStore.
- `monetization.affiliate_subid` — SubID партнёрских ссылок.
- `legal_links.*` — юридические ссылки.
- `announcement.show/text/url/id` — значения принимаются приложением, но текущий APK не показывает этот блок; сайт использует их сейчас.

## Используется сайтом из того же JSON

- `version_control.current_version_name` — версия в футере и schema.org.
- `app_limits.max_products` — число доступных к отслеживанию товаров.
- `app_limits.history_months` — текст о периоде истории.
- `app_limits.widgets_count` — маркетинговое значение на сайте; в APK 2.0.0 количество виджетов фактически фиксировано четырьмя.
- `community_links.*` — ссылки.
- `legal_links.*` — ссылки.
- `announcement.*` — баннер.
- `site.seo.*` — SEO сайта.
- `site.footer.*` — данные футера.

## Не включаем в админку v1

- crawler delays — техническая внутренняя настройка, не нужна владельцу.
- `min_check_interval_hours` — текущий APK 2.0.0 не читает это значение из Remote Config.
- `affiliate_enabled` — текущий APK 2.0.0 не использует этот флаг как отдельный переключатель.

## Важное правило

Админка не должна показывать переключатель как рабочий, если текущий APK его не поддерживает. Новые Remote Config-функции сначала добавляются в APK следующей версии, затем включаются в админке.
