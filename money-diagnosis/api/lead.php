<?php
/**
 * money-profit · lead intake endpoint
 * 1) CSV backup (api/leads/moneyprofit_YYYY-MM.csv, UTF-8 BOM, ;)
 * 2) AmoCRM /api/v4/leads/complex (при заполненных credentials в .env)
 */

declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('X-Content-Type-Options: nosniff');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST')   { http_response_code(405); echo '{"error":"POST only"}'; exit; }

// ── Читаем JSON ──
$raw = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!is_array($data) || empty($data['phone']) || empty($data['name'])) {
  http_response_code(400);
  echo json_encode(['error' => 'name and phone required']);
  exit;
}

// ── Honeypot (если прилетел website-поле — спамер) ──
if (!empty($data['website'])) {
  http_response_code(200); echo '{"success":true}'; exit;
}

// ── Нормализация ──
$lead = [
  'timestamp'        => date('c'),
  'name'             => (string)($data['name'] ?? ''),
  'phone'            => (string)($data['phone'] ?? ''),
  'email'            => (string)($data['email'] ?? ''),
  'role'             => (string)($data['role'] ?? ''),
  'industry'         => (string)($data['industry'] ?? ''),
  'industryLabel'    => (string)($data['industryLabel'] ?? ''),
  'revenueRange'     => (string)($data['revenueRange'] ?? ''),
  'revenueValue'     => (int)($data['revenueValue'] ?? 0),
  'cashIn'           => (int)($data['cashIn'] ?? 0),
  'receivables'      => (int)($data['receivables'] ?? 0),
  'expenses'         => (int)($data['expenses'] ?? 0),
  'balance'          => (int)($data['balance'] ?? 0),
  'earnedRevenue'    => (int)($data['earnedRevenue'] ?? 0),
  'realProfit'       => (int)($data['realProfit'] ?? 0),
  'gap'              => (int)($data['gap'] ?? 0),
  'annualGap'        => (int)($data['annualGap'] ?? 0),
  'diagnosisType'    => (string)($data['diagnosisType'] ?? ''),
  'diagnosis'        => (string)($data['diagnosis'] ?? ''),
  'receivablesShare' => (int)($data['receivablesShare'] ?? 0),
  'utm_source'       => (string)($data['utm']['utm_source'] ?? ''),
  'utm_medium'       => (string)($data['utm']['utm_medium'] ?? ''),
  'utm_campaign'     => (string)($data['utm']['utm_campaign'] ?? ''),
  'utm_content'      => (string)($data['utm']['utm_content'] ?? ''),
  'utm_term'         => (string)($data['utm']['utm_term'] ?? ''),
  'referrer'         => (string)($data['referrer'] ?? ''),
  'pageUrl'          => (string)($data['pageUrl'] ?? ''),
  'ip'               => $_SERVER['REMOTE_ADDR'] ?? '',
  'userAgent'        => $_SERVER['HTTP_USER_AGENT'] ?? ''
];

// ── CSV backup ──
$csvDir = __DIR__ . '/leads';
if (!is_dir($csvDir)) { @mkdir($csvDir, 0755, true); }
$ht = $csvDir . '/.htaccess';
if (!file_exists($ht)) { @file_put_contents($ht, "Deny from all\n"); }

$csvFile = $csvDir . '/moneyprofit_' . date('Y-m') . '.csv';
$isNew = !file_exists($csvFile);
$fp = @fopen($csvFile, 'a');
if ($fp) {
  if ($isNew) {
    fwrite($fp, "\xEF\xBB\xBF"); // UTF-8 BOM for Excel
    fputcsv($fp, array_keys($lead), ';');
  }
  fputcsv($fp, array_values($lead), ';');
  fclose($fp);
}

// ── AmoCRM (опционально, из .env) ──
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
$amoStatusId   = (int)($env['AMO_STATUS_ID']   ?? 0);

$amoResult = null;
if ($amoDomain && $amoToken && $amoPipelineId && $amoStatusId && function_exists('curl_init')) {
  // Теги квалификации
  $tags = [
    ['name' => 'micro_service'],
    ['name' => 'money_profit'],
    ['name' => 'direct_client'],
  ];
  if ($lead['realProfit'] < 0 || $lead['annualGap'] > $lead['revenueValue'] * 3) {
    $tags[] = ['name' => 'lead_A'];
  } elseif ($lead['revenueValue'] < 5_000_000) {
    $tags[] = ['name' => 'lead_C'];
  } else {
    $tags[] = ['name' => 'lead_B'];
  }

  $leadName = 'Деньги/прибыль: ' . $lead['name'] . ' — ' . ($lead['industryLabel'] ?: 'other') . ' — ' . $lead['revenueRange'];

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

  // Примечание с расчётом
  if ($leadId) {
    $note =
      "=== ДАННЫЕ РАСЧЁТА ===\n" .
      "Роль: {$lead['role']}\n" .
      "Отрасль: {$lead['industryLabel']}\n" .
      "Оборот: {$lead['revenueRange']}\n\n" .
      "Поступило от клиентов: " . number_format($lead['cashIn'], 0, ',', ' ') . " ₽\n" .
      "Дебиторка: " . number_format($lead['receivables'], 0, ',', ' ') . " ₽\n" .
      "Расходы: " . number_format($lead['expenses'], 0, ',', ' ') . " ₽\n" .
      "Остаток на счёте: " . number_format($lead['balance'], 0, ',', ' ') . " ₽\n\n" .
      "--- РЕЗУЛЬТАТ ---\n" .
      "Заработано (начисл.): " . number_format($lead['earnedRevenue'], 0, ',', ' ') . " ₽\n" .
      "Реальная прибыль: " . number_format($lead['realProfit'], 0, ',', ' ') . " ₽\n" .
      "Разрыв: " . number_format($lead['gap'], 0, ',', ' ') . " ₽\n" .
      "Тип разрыва: {$lead['diagnosisType']}\n" .
      "Диагноз: {$lead['diagnosis']}\n" .
      "Потенциал год: " . number_format($lead['annualGap'], 0, ',', ' ') . " ₽\n\n" .
      "=== ИСТОЧНИК ===\n" .
      "UTM: {$lead['utm_source']} / {$lead['utm_medium']} / {$lead['utm_campaign']} / {$lead['utm_content']} / {$lead['utm_term']}\n" .
      "Referrer: {$lead['referrer']}\n" .
      "Страница: {$lead['pageUrl']}\n" .
      "Время: {$lead['timestamp']}";
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
