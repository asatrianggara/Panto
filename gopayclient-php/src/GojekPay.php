<?php

namespace Namdevel;

/**
 * [Gojek] Gopay Api PHP Class (Un-Official)
 * Author : namdevel <https://github.com/namdevel>
 * Source : https://github.com/namtxs/gopay-api
 */
class GojekPay
{
    const API_URL      = 'https://api.gojekapi.com';
    const API_GOID     = 'https://goid.gojekapi.com';
    const API_CUSTOMER = 'https://customer.gopayapi.com';

    const clientId         = 'gojek:consumer:app';
    const clientSecret     = 'pGwQ7oi8bKqqwvid09UrjqpkMEHklb';
    const appId            = 'com.go-jek.ios';
    const phoneModel       = 'Apple, iPhone XS Max';
    const phoneMake        = 'Apple';
    const osDevice         = 'iOS, 15.6.1';
    const xPlatform        = 'iOS';
    const appVersion       = '4.88.0';
    const gojekCountryCode = 'ID';
    const gojekUserLocale  = 'id_ID';
    const userAgent        = 'Gojek/122076431 CFNetwork/1404.0.5 Darwin/22.3.0';

    private $authToken, $uniqueId, $sessionId, $pin, $idKey;

    public function __construct($authToken = false)
    {
        $this->sessionId = '786C2BF4-A6A1-498D-8906-1B8064D58156';
        $this->uniqueId  = '0D8C6014-F646-43A8-ADFB-F9A2416C1B28';

        if ($authToken) {
            $this->authToken = $authToken;
        }
    }

    protected function setPinGojek($pin)
    {
        $this->pin = $pin;
    }

    protected function setIdKey()
    {
        $this->idKey = self::uuidv4();
    }

    public function loginRequest($phoneNumber)
    {
        $payload = [
            'client_id'      => self::clientId,
            'client_secret'  => self::clientSecret,
            'country_code'   => '+62',
            'magic_link_ref' => null,
            'phone_number'   => self::formatPhone($phoneNumber),
        ];
        return self::Request('POST', self::API_GOID . '/goid/login/request', $payload, true);
    }

    public function getAuthToken($otpToken, $otpCode)
    {
        $payload = [
            'client_id'     => self::clientId,
            'client_secret' => self::clientSecret,
            'data'          => ['otp_token' => $otpToken, 'otp' => $otpCode],
            'grant_type'    => 'otp',
        ];
        return self::Request('POST', self::API_GOID . '/goid/token', $payload, true);
    }

    public function logout()
    {
        return self::Request('DELETE', self::API_GOID . '/goid/token', false, true);
    }

    public function getTransactionHistory($page = 1, $limit = 20)
    {
        return self::Request('GET', self::API_CUSTOMER . "/v1/users/transaction-history?page={$page}&limit={$limit}", false, true);
    }

    public function getBalance()
    {
        return self::Request('GET', self::API_CUSTOMER . '/v1/payment-options/balances', false, true);
    }

    public function getProfile()
    {
        return self::Request('GET', self::API_URL . '/gojek/v2/customer', false, true);
    }

    public function goClubMembership()
    {
        return self::Request('GET', self::API_URL . '/goclub/v1/membership', false, true);
    }

    public function paylaterProfile()
    {
        return self::Request('GET', self::API_URL . '/paylater/v1/user/profile', false, true);
    }

    public function kycStatus()
    {
        return self::Request('GET', self::API_CUSTOMER . '/v1/users/kyc/status', false, true);
    }

    public function isGojek($phoneNumber)
    {
        return self::Request('GET', self::API_CUSTOMER . '/v1/users/p2p-profile?phone_number=' . urlencode($phoneNumber), false, true);
    }

    public function getQrid($phoneNumber)
    {
        return self::getResponse(self::isGojek($phoneNumber), 'qr_id');
    }

    public function transferGopay($phoneNumber, int $amount, $pin)
    {
        self::setPinGojek($pin);
        $payload = [
            'amount'      => ['currency' => 'IDR', 'value' => $amount],
            'description' => '💰',
            'metadata'    => ['post_visibility' => 'NO_SOCIAL', 'theme_id' => 'THEME_CLASSIC'],
            'payee'       => ['id' => self::getQrid($phoneNumber), 'id_type' => 'GOPAY_QR_ID'],
        ];
        return self::Request('POST', self::API_CUSTOMER . '/v1/funds/transfer', $payload, true);
    }

    public function getBankList()
    {
        return self::Request('GET', self::API_CUSTOMER . '/v1/banks?type=transfer&show_withdrawal_block_status=false', false, true);
    }

    public function transferBank($bankCode, $bankNumber, int $amount, $pin)
    {
        self::setIdKey();
        $bankAccountName = self::getResponse(self::isBank($bankCode, $bankNumber), 'account_name');
        $payload = [
            'account_name'   => "$bankAccountName",
            'account_number' => "$bankNumber",
            'amount'         => "$amount",
            'bank_code'      => "$bankCode",
            'currency'       => 'IDR',
            'pin'            => "$pin",
            'type'           => 'transfer',
        ];
        return self::Request('POST', self::API_CUSTOMER . '/v1/withdrawals', $payload, true);
    }

    public function transferBankDetail($requestId)
    {
        return self::Request('GET', self::API_CUSTOMER . "/v1/withdrawals/detail?request_id={$requestId}", false, true);
    }

    public function isBank($bankCode, $bankNumber)
    {
        return self::Request('GET', self::API_CUSTOMER . "/v1/bank-accounts/validate?bank_code={$bankCode}&account_number={$bankNumber}", false, true);
    }

    protected function formatPhone($phoneNumber, $areacode = '')
    {
        return substr_replace($phoneNumber, $areacode, 0, 1);
    }

    public function uuidv4()
    {
        $data    = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
        return strtoupper(vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4)));
    }

    protected function buildHeaders()
    {
        $headers = [
            'x-appid: '           . self::appId,
            'x-phonemodel: '      . self::phoneModel,
            'user-agent: '        . self::userAgent,
            'x-session-id: '      . $this->sessionId,
            'x-phonemake: '       . self::phoneMake,
            'x-uniqueid: '        . $this->uniqueId,
            'x-deviceos: '        . self::osDevice,
            'x-platform: '        . self::xPlatform,
            'x-appversion: '      . self::appVersion,
            'x-signature: 1001',
            'Gojek-Country-Code: ' . self::gojekCountryCode,
            'x-user-locale: '     . self::gojekUserLocale,
            'accept: */*',
            'content-type: application/json',
            'x-user-type: customer',
        ];

        if (!empty($this->authToken)) {
            $headers[] = 'Authorization: Bearer ' . $this->authToken;
        }
        if (!empty($this->pin)) {
            $headers[] = 'pin: ' . $this->pin;
        }
        if (!empty($this->idKey)) {
            $headers[] = 'Idempotency-Key: ' . $this->idKey;
        }

        return $headers;
    }

    public function getResponse($response, $key)
    {
        $json = json_decode($response, true);
        return $json['data'][$key] ?? null;
    }

    protected function Request($type, $url, $post = false, $headers = false)
    {
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL            => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 30,
        ]);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $type);
        if ($post !== false) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($post));
        }
        if ($headers) {
            curl_setopt($ch, CURLOPT_HTTPHEADER, self::buildHeaders());
        }
        $result = curl_exec($ch);
        $error  = curl_error($ch);
        curl_close($ch);
        if ($error) {
            return json_encode(['error' => $error]);
        }
        return $result;
    }
}
