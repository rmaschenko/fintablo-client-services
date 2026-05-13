<?php
/**
 * diagnostika-growth · lead intake endpoint
 * 1) CSV backup в api/leads/dg_YYYY-MM.csv (UTF-8 BOM, ;)
 * 2) AmoCRM /api/v4/leads/complex (если ../.env заполнен)
 *
 * Принимает payload от quiz/js/lead.js (sendLead):
 *   name, phone, email, city, route, source, profile{}, transparencyScore,
 *   lossRange{min,max}, recommendation, utm{}, consent{}, marketingConsent,
 *   pageUrl, referrer, timestamp
 *
 * Без .env (нет amoCRM-токена) endpoint всё равно работает —
 * CSV сохраняется, JSON возвращает success:true. Это значит лиды
 * не теряются: даже без CRM-интеграции контакты лежат на FTP.
 */

declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('X-Content-Type-Options: nosniff');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST')   { http_response_code(405); echo '{"error":"POST only"}'; exit; }

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!is_array($data) || empty($data['phone']) || empty($data['name'])) {
  http_response_code(400);
  echo json_encode(['error' => 'name and phone required'], JSON_UNESCAPED_UNICODE);
  exit;
}

// Honeypot — невидимое поле website. Боты заполняют, люди — нет.
if (!empty($data['website'])) {
  http_response_code(200); echo '{"success":true}'; exit;
}

$profile  = is_array($data['profile'] ?? null) ? $data['profile'] : [];
$lossRange = is_array($data['lossRange'] ?? null) ? $data['lossRange'] : [];
$utm      = is_array($data['utm']     ?? null) ? $data['utm']     : [];
$consent  = is_array($data['consent'] ?? null) ? $data['consent'] : [];

// Человекочитаемые лейблы маршрутов и ролей — для CRM-менеджера
$routeLabels = [
  'hot_icp'            => 'Горячий ICP (на встречу)',
  'hot_icp_no_finance' => 'Горячий ICP без финансиста (на встречу + партнёр)',
  'warm_icp'           => 'Тёплый ICP (на триал)',
  'anti_icp'           => 'Вне ICP (шаблоны)',
];
$roleLabels = [
  'owner'      => 'Собственник',
  'financier'  => 'Финдир/Финансист',
  'accountant' => 'Бухгалтер',
  'other'      => 'Другая роль',
];
$cfoLabels = [
  'yes_cfo'             => 'Есть финансист/финдир',
  'accountant_combined' => 'Бухгалтер совмещает',
  'self_only'           => 'Собственник сам',
];

$route          = (string)($data['route'] ?? '');
$role           = (string)($profile['role'] ?? '');
$businessType   = (string)($profile['businessType'] ?? '');
$businessLabel  = (string)($profile['businessTypeLabel'] ?? $businessType);
$annualRevenue  = (int)($profile['annualRevenue'] ?? 0);
$age            = (string)($profile['age'] ?? '');
$primaryPain    = (string)($profile['primaryPain'] ?? '');
$painLabel      = (string)($profile['primaryPainLabel'] ?? $primaryPain);
$cfoStatus      = (string)($profile['cfoStatus'] ?? '');
$transparency   = (int)($data['transparencyScore'] ?? 0);
$lossMin        = (int)($lossRange['min'] ?? 0);
$lossMax        = (int)($lossRange['max'] ?? 0);
$recommendation = (string)($data['recommendation'] ?? '');

$revLabel = $annualRevenue > 0
  ? ($annualRevenue . ' млн ₽/год')
  : '';

$lossLabel = ($lossMin > 0 && $lossMax > 0)
  ? (number_format($lossMin, 0, ',', ' ') . ' – ' . number_format($lossMax, 0, ',', ' ') . ' ₽/год')
  : '';

$lead = [
  'timestamp'          => (string)($data['timestamp'] ?? date('c')),
  'route'              => $route,
  'routeLabel'         => $routeLabels[$route] ?? $route,
  'name'               => (string)($data['name'] ?? ''),
  'phone'              => (string)($data['phone'] ?? ''),
  'email'              => (string)($data['email'] ?? ''),
  'city'               => (string)($data['city'] ?? ''),
  'role'               => $role,
  'roleLabel'          => $roleLabels[$role] ?? $role,
  'businessType'       => $businessType,
  'businessLabel'      => $businessLabel,
  'annualRevenueMln'   => $annualRevenue,
  'age'                => $age,
  'primaryPain'        => $primaryPain,
  'painLabel'          => $painLabel,
  'cfoStatus'          => $cfoStatus,
  'cfoLabel'           => $cfoLabels[$cfoStatus] ?? $cfoStatus,
  'transparencyIndex'  => $transparency,
  'lossMin'            => $lossMin,
  'lossMax'            => $lossMax,
  'recommendation'     => $recommendation,
  'marketingConsent'   => !empty($data['marketingConsent']) ? 'yes' : 'no',
  'consentTimestamp'   => (string)($consent['timestamp'] ?? ''),
  'utm_source'         => (string)($utm['source']   ?? ''),
  'utm_medium'         => (string)($utm['medium']   ?? ''),
  'utm_campaign'       => (string)($utm['campaign'] ?? ''),
  'utm_content'        => (string)($utm['content']  ?? ''),
  'utm_term'           => (string)($utm['term']     ?? ''),
  'pageUrl'            => (string)($data['pageUrl']  ?? ''),
  'referrer'           => (string)($data['referrer'] ?? ''),
  'ip'                 => $_SERVER['REMOTE_ADDR']      ?? '',
  'userAgent'          => $_SERVER['HTTP_USER_AGENT'] ?? '',
];

// ── CSV backup ──
$csvDir = __DIR__ . '/leads';
if (!is_dir($csvDir)) { @mkdir($csvDir, 0755, true); }
$ht = $csvDir . '/.htaccess';
if (!file_exists($ht)) { @file_put_contents($ht, "Deny from all\n"); }

$csvFile = $csvDir . '/dg_' . date('Y-m') . '.csv';
$isNew = !file_exists($csvFile);
$fp = @fopen($csvFile, 'a');
if ($fp) {
  if ($isNew) {
    fwrite($fp, "\xEF\xBB\xBF");
    fputcsv($fp, array_keys($lead), ';');
  }
  fputcsv($fp, array_values($lead), ';');
  fclose($fp);
}

// ── AmoCRM (опционально) ──
$envPath = __DIR__ . '/../.env';
$env = [];
if (file_exists($envPath)) {
  foreach (file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
    if (strpos(trim($line), '#') === 0) continue;
    $parts = explode('=', $line, 2);
    if (count($parts) === 2) $env[trim($parts[0])] = trim($parts[1], " \t\"'");
  }
}

$amoDomain     = $env['AMO_DOMAIN']      ?? '';
$amoToken      = $env['AMO_TOKEN']       ?? '';
$amoPipelineId = (int)($env['AMO_PIPELINE_ID'] ?? 0);

// Каждый маршрут попадает в свой этап воронки. Конфигурируется через .env:
//   AMO_STATUS_HOT_ICP, AMO_STATUS_HOT_ICP_NO_FINANCE,
//   AMO_STATUS_WARM_ICP, AMO_STATUS_ANTI_ICP.
$statusMap = [
  'hot_icp'            => (int)($env['AMO_STATUS_HOT_ICP']            ?? 0),
  'hot_icp_no_finance' => (int)($env['AMO_STATUS_HOT_ICP_NO_FINANCE'] ?? 0),
  'warm_icp'           => (int)($env['AMO_STATUS_WARM_ICP']           ?? 0),
  'anti_icp'           => (int)($env['AMO_STATUS_ANTI_ICP']           ?? 0),
];
$amoStatusId = $statusMap[$route] ?? 0;

$amoResult = null;
if ($amoDomain && $amoToken && $amoPipelineId && $amoStatusId && function_exists('curl_init')) {
  $tags = [
    ['name' => 'diagnostika-growth'],
    ['name' => 'route_' . $route],
  ];
  if (!empty($utm['source']))   $tags[] = ['name' => 'utm_' . preg_replace('/[^a-z0-9_]/i', '', $utm['source'])];
  if (!empty($primaryPain))     $tags[] = ['name' => 'pain_' . $primaryPain];
  if (!empty($businessType))    $tags[] = ['name' => 'type_' . $businessType];

  $leadName = 'Диагностика: ' . $lead['name'] . ' — ' . $businessLabel . ' — ' . $revLabel . ' — ' . $lead['routeLabel'];

  $amoLead = [[
    'name'         => $leadName,
    'pipeline_id'  => $amoPipelineId,
    'status_id'    => $amoStatusId,
    '_embedded'    => [
      'tags'     => $tags,
      'contacts' => [[
        'first_name' => $lead['name'],
        'custom_fields_values' => array_values(array_filter([
          ['field_code' => 'PHONE', 'values' => [['value' => $lead['phone'], 'enum_code' => 'WORK']]],
          $lead['email'] ? ['field_code' => 'EMAIL', 'values' => [['value' => $lead['email'], 'enum_code' => 'WORK']]] : null,
        ])),
      ]],
    ],
  ]];

  $ch = curl_init("https://{$amoDomain}/api/v4/leads/complex");
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_HTTPHEADER     => ['Content-Type: application/json', "Authorization: Bearer {$amoToken}"],
    CURLOPT_POSTFIELDS     => json_encode($amoLead, JSON_UNESCAPED_UNICODE),
    CURLOPT_TIMEOUT        => 10,
  ]);
  $amoResponseRaw = curl_exec($ch);
  $amoHttp = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);
  $amoResponse = json_decode($amoResponseRaw ?: 'null', true);
  $leadId = $amoResponse[0]['id'] ?? null;

  // Подробная заметка к сделке — менеджеру под звонок
  if ($leadId) {
    $note =
      "=== ДИАГНОСТИКА РОСТА ПРИБЫЛИ ===\n" .
      "Маршрут: {$lead['routeLabel']}\n" .
      "Роль: {$lead['roleLabel']}\n" .
      "Тип бизнеса: {$lead['businessLabel']}\n" .
      "Годовая выручка: {$revLabel}\n" .
      "Возраст бизнеса: {$lead['age']}\n" .
      "Главная боль: {$lead['painLabel']}\n" .
      "Финансы ведёт: {$lead['cfoLabel']}\n\n" .
      "=== РАСЧЁТ ===\n" .
      "Индекс прозрачности: {$lead['transparencyIndex']}/100\n" .
      "Упущенная прибыль: {$lossLabel}\n" .
      "Рекомендация: {$lead['recommendation']}\n\n" .
      "=== ИСТОЧНИК ===\n" .
      "UTM: {$lead['utm_source']} / {$lead['utm_medium']} / {$lead['utm_campaign']} / {$lead['utm_content']} / {$lead['utm_term']}\n" .
      "Referrer: {$lead['referrer']}\n" .
      "Страница: {$lead['pageUrl']}\n" .
      "Время: {$lead['timestamp']}\n" .
      "152-ФЗ: " . ($lead['consentTimestamp'] ?: 'нет timestamp') . "\n" .
      "Маркетинговое согласие: {$lead['marketingConsent']}";
    $noteBody = [[
      'entity_id' => $leadId,
      'note_type' => 'common',
      'params'    => ['text' => $note],
    ]];
    $ch = curl_init("https://{$amoDomain}/api/v4/leads/notes");
    curl_setopt_array($ch, [
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_POST           => true,
      CURLOPT_HTTPHEADER     => ['Content-Type: application/json', "Authorization: Bearer {$amoToken}"],
      CURLOPT_POSTFIELDS     => json_encode($noteBody, JSON_UNESCAPED_UNICODE),
      CURLOPT_TIMEOUT        => 10,
    ]);
    curl_exec($ch);
    curl_close($ch);
  }

  $amoResult = ['leadId' => $leadId, 'http' => $amoHttp];
}

http_response_code(200);
echo json_encode([
  'success' => true,
  'csv'     => (bool)$fp,
  'amo'     => $amoResult,
], JSON_UNESCAPED_UNICODE);
