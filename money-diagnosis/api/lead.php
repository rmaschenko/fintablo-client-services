<?php
/**
 * money-diagnosis · lead intake endpoint
 * 1) CSV backup (api/leads/fin_diagnostics_YYYY-MM.csv, UTF-8 BOM, ;)
 * 2) AmoCRM /api/v4/leads/complex (если заполнен ../.env)
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
  echo json_encode(['error' => 'name and phone required']);
  exit;
}

// Honeypot
if (!empty($data['website'])) {
  http_response_code(200); echo '{"success":true}'; exit;
}

$answers = is_array($data['answers'] ?? null) ? $data['answers'] : [];
$metrics = is_array($data['metrics'] ?? null) ? $data['metrics'] : [];
$utm     = is_array($data['utm']     ?? null) ? $data['utm']     : [];

$industryLabels = [
  'construction' => 'Строительство',
  'it'           => 'IT',
  'agency'       => 'Агентство',
  'production'   => 'Производство',
  'other'        => 'Другой'
];
$profileLabels = [
  'blind' => 'Управление вслепую',
  'scale_without_control' => 'Масштаб без управления',
  'accounting_illusion' => 'Бухгалтерская иллюзия',
  'early_stage' => 'Ранняя стадия',
  'almost_there' => 'В шаге от системы',
  'plateau' => 'Наступившее плато'
];

$industry = (string)($answers['industry'] ?? '');
$revenue  = (int)($answers['monthlyRevenue'] ?? 0);
$profile  = (string)($metrics['profileType'] ?? '');

$lead = [
  'timestamp'          => date('c'),
  'name'               => (string)($data['name'] ?? ''),
  'phone'              => (string)($data['phone'] ?? ''),
  'email'              => (string)($data['email'] ?? ''),
  'role'               => (string)($answers['role'] ?? ''),
  'industry'           => $industry,
  'industryLabel'      => $industryLabels[$industry] ?? $industry,
  'monthlyRevenue'     => $revenue,
  'annualRevenue'      => $revenue * 12,
  'activeProjects'     => (int)($answers['activeProjects'] ?? 0),
  'accountingSystem'   => implode(',', (array)($answers['accountingSystem'] ?? [])),
  'mainProblems'       => implode(',', (array)($answers['mainProblems'] ?? [])),
  'desiredResult'      => (string)($answers['desiredResult'] ?? ''),
  'hasFinancist'       => (string)($answers['hasFinancist'] ?? ''),
  'profileType'        => $profile,
  'profileLabel'       => $profileLabels[$profile] ?? $profile,
  'transparencyIndex'  => (int)($metrics['transparencyIndex'] ?? 0),
  'estimatedAnnualLoss'=> (int)($metrics['estimatedAnnualLoss'] ?? 0),
  'riskProjectsCount'  => (int)($metrics['riskProjectsCount'] ?? 0),
  'icpScore'           => (int)($metrics['icpScore'] ?? 0),
  'icpTag'             => (string)($metrics['icpTag'] ?? ''),
  'primaryRiskZone'    => (string)($metrics['primaryRiskZone'] ?? ''),
  'utm_source'         => (string)($utm['source']   ?? ''),
  'utm_medium'         => (string)($utm['medium']   ?? ''),
  'utm_campaign'       => (string)($utm['campaign'] ?? ''),
  'utm_content'        => (string)($utm['content']  ?? ''),
  'utm_term'           => (string)($utm['term']     ?? ''),
  'referrer'           => (string)($data['referrer'] ?? ''),
  'pageUrl'            => (string)($data['pageUrl'] ?? ''),
  'ip'                 => $_SERVER['REMOTE_ADDR'] ?? '',
  'userAgent'          => $_SERVER['HTTP_USER_AGENT'] ?? ''
];

// ── CSV backup ──
$csvDir = __DIR__ . '/leads';
if (!is_dir($csvDir)) { @mkdir($csvDir, 0755, true); }
$ht = $csvDir . '/.htaccess';
if (!file_exists($ht)) { @file_put_contents($ht, "Deny from all\n"); }

$csvFile = $csvDir . '/fin_diagnostics_' . date('Y-m') . '.csv';
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
$amoStatusId   = (int)($env['AMO_STATUS_ID']   ?? 0);

$amoResult = null;
if ($amoDomain && $amoToken && $amoPipelineId && $amoStatusId && function_exists('curl_init')) {
  $tags = [
    ['name' => 'micro_service'],
    ['name' => 'fin_diagnostics'],
    ['name' => 'direct_client'],
    ['name' => $lead['icpTag'] ?: 'lead_C'],
  ];

  $revLabel = $revenue >= 1_000_000
    ? (round($revenue / 1_000_000, 1) . ' млн/мес')
    : (round($revenue / 1000) . ' тыс/мес');

  $leadName = 'Диагностика: ' . $lead['name'] . ' — ' . $lead['industryLabel'] . ' — ' . $lead['profileLabel'] . ' — ' . $revLabel;

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

  if ($leadId) {
    $note =
      "=== ДИАГНОСТИКА ФИНАНСОВОГО УЧЁТА ===\n" .
      "Роль: {$lead['role']}\n" .
      "Отрасль: {$lead['industryLabel']}\n" .
      "Оборот: {$revLabel}\n" .
      "Проектов одновременно: {$lead['activeProjects']}\n" .
      "Системы учёта: {$lead['accountingSystem']}\n" .
      "Главные боли: {$lead['mainProblems']}\n" .
      "Желаемый результат: {$lead['desiredResult']}\n" .
      "Финансист в штате: {$lead['hasFinancist']}\n\n" .
      "=== РЕЗУЛЬТАТ РАСЧЁТА ===\n" .
      "Профиль: {$lead['profileLabel']}\n" .
      "Индекс прозрачности: {$lead['transparencyIndex']}/100\n" .
      "Оценочные потери: " . number_format($lead['estimatedAnnualLoss'], 0, ',', ' ') . " ₽/год\n" .
      "Проектов в зоне риска: {$lead['riskProjectsCount']} из {$lead['activeProjects']}\n" .
      "Главная зона риска: {$lead['primaryRiskZone']}\n" .
      "ICP-балл: {$lead['icpScore']}/100 ({$lead['icpTag']})\n\n" .
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
