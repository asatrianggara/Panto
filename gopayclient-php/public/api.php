<?php
session_start();

header('Content-Type: application/json');

require_once __DIR__ . '/../src/GojekPay.php';

use Namdevel\GojekPay;

$action = $_GET['action'] ?? '';
$body   = json_decode(file_get_contents('php://input'), true) ?? [];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ok($data = null, int $code = 200): void
{
    http_response_code($code);
    echo json_encode($data ?? ['success' => true]);
    exit;
}

function fail(string $msg, int $code = 500): void
{
    http_response_code($code);
    echo json_encode(['error' => $msg]);
    exit;
}

function requireAuth(): void
{
    if (empty($_SESSION['access_token'])) {
        fail('Not logged in', 401);
    }
}

function gopay(): GojekPay
{
    return new GojekPay($_SESSION['access_token'] ?? false);
}

function parseJson(string $raw): array
{
    $decoded = json_decode($raw, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        fail('Upstream API returned invalid JSON: ' . substr($raw, 0, 200));
    }
    return $decoded ?? [];
}

// ─── Router ───────────────────────────────────────────────────────────────────

switch ($action) {

    // ── Session ───────────────────────────────────────────────────────────────
    case 'session':
        ok(['loggedIn' => !empty($_SESSION['access_token'])]);

    // ── Login Step 1: Request OTP ─────────────────────────────────────────────
    case 'login_otp':
        $phone = trim($body['phone'] ?? '');
        if (!$phone) fail('phone required', 400);

        $g      = new GojekPay();
        $result = parseJson($g->loginRequest($phone));

        ok(['otp_token' => $result['otp_token'] ?? null]);

    // ── Login Step 2: Verify OTP → Access Token ───────────────────────────────
    case 'login_verify':
        $otp       = trim($body['otp'] ?? '');
        $otp_token = trim($body['otp_token'] ?? '');
        if (!$otp || !$otp_token) fail('otp and otp_token required', 400);

        $g      = new GojekPay();
        $result = parseJson($g->getAuthToken($otp_token, $otp));

        if (!empty($result['access_token'])) {
            $_SESSION['access_token'] = $result['access_token'];
            ok();
        }

        $errMsg = $result['errors'][0]['message'] ?? ($result['message'] ?? 'Invalid OTP');
        fail($errMsg, 401);

    // ── Balance ───────────────────────────────────────────────────────────────
    case 'balance':
        requireAuth();
        ok(parseJson(gopay()->getBalance()));

    // ── Profile ───────────────────────────────────────────────────────────────
    case 'profile':
        requireAuth();
        ok(parseJson(gopay()->getProfile()));

    // ── Transaction History ───────────────────────────────────────────────────
    case 'history':
        requireAuth();
        $page  = max(1, (int)($_GET['page']  ?? 1));
        $limit = max(1, (int)($_GET['limit'] ?? 20));
        ok(parseJson(gopay()->getTransactionHistory($page, $limit)));

    // ── KYC Status ────────────────────────────────────────────────────────────
    case 'kyc':
        requireAuth();
        ok(parseJson(gopay()->kycStatus()));

    // ── GoClub Membership ─────────────────────────────────────────────────────
    case 'goclub':
        requireAuth();
        ok(parseJson(gopay()->goClubMembership()));

    // ── PayLater Profile ──────────────────────────────────────────────────────
    case 'paylater':
        requireAuth();
        ok(parseJson(gopay()->paylaterProfile()));

    // ── Bank List ─────────────────────────────────────────────────────────────
    case 'bank_list':
        requireAuth();
        ok(parseJson(gopay()->getBankList()));

    // ── Validate Bank Account ─────────────────────────────────────────────────
    case 'is_bank':
        requireAuth();
        $bank_code   = trim($_GET['bank_code']   ?? '');
        $bank_number = trim($_GET['bank_number'] ?? '');
        if (!$bank_code || !$bank_number) fail('bank_code and bank_number required', 400);
        ok(parseJson(gopay()->isBank($bank_code, $bank_number)));

    // ── Check if Gojek User ───────────────────────────────────────────────────
    case 'is_gojek':
        requireAuth();
        $phone = trim($_GET['phone'] ?? '');
        if (!$phone) fail('phone required', 400);
        ok(parseJson(gopay()->isGojek($phone)));

    // ── Transfer GoPay (P2P) ──────────────────────────────────────────────────
    case 'transfer_gopay':
        requireAuth();
        $phone  = trim($body['phone']  ?? '');
        $amount = (int)($body['amount'] ?? 0);
        $pin    = trim($body['pin']    ?? '');
        if (!$phone || !$amount || !$pin) fail('phone, amount, and pin required', 400);
        ok(parseJson(gopay()->transferGopay($phone, $amount, $pin)));

    // ── Transfer to Bank ──────────────────────────────────────────────────────
    case 'transfer_bank':
        requireAuth();
        $bank_code   = trim($body['bank_code']   ?? '');
        $bank_number = trim($body['bank_number'] ?? '');
        $amount      = (int)($body['amount']     ?? 0);
        $pin         = trim($body['pin']         ?? '');
        if (!$bank_code || !$bank_number || !$amount || !$pin) {
            fail('bank_code, bank_number, amount, and pin required', 400);
        }
        ok(parseJson(gopay()->transferBank($bank_code, $bank_number, $amount, $pin)));

    // ── Bank Transfer Status ──────────────────────────────────────────────────
    case 'transfer_bank_detail':
        requireAuth();
        $request_id = trim($_GET['request_id'] ?? '');
        if (!$request_id) fail('request_id required', 400);
        ok(parseJson(gopay()->transferBankDetail($request_id)));

    // ── Logout ────────────────────────────────────────────────────────────────
    case 'logout':
        requireAuth();
        gopay()->logout();
        session_destroy();
        ok();

    default:
        fail('Unknown action', 404);
}
