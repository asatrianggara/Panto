# PaymentGatewayApi

You can use the APIs below to interface with DANA's `PaymentGatewayApi` API.
To start using the API, you need to destruct instantiated DANA client. This client would be a singleton object that you can use across various api and operation.

```typescript
import { Dana } from 'dana-node';

const danaClient = new Dana({
    partnerId: "YOUR_PARTNER_ID", // process.env.X_PARTNER_ID
    privateKey: "YOUR_PRIVATE_KEY", // process.env.X_PRIVATE_KEY
    origin: "YOUR_ORIGIN", // process.env.ORIGIN
    env: "sandbox", // process.env.DANA_ENV or process.env.ENV or "sandbox" or "production"
    debugMode: "true", // process.env.X_DEBUG
});
const { paymentGatewayApi } = danaClient;
```
## Additional Documentation
* [Enum Types](#enum-types) - List of available enum constants
* [Webhook Parser](#webhookparser) - Webhook handling


All URIs are relative to *https://api.saas.dana.id*, except if the operation defines another base path (for sandbox it is http://api.sandbox.dana.id).

| Method | HTTP request | Description |
| ------------- | ------------- | ------------- |
| [**cancelOrder**](#cancelOrder) | **POST** /payment-gateway/v1.0/debit/cancel.htm | Cancel order |
| [**consultPay**](#consultPay) | **POST** /v1.0/payment-gateway/consult-pay.htm | Consult payment methods |
| [**createOrder**](#createOrder) | **POST** /payment-gateway/v1.0/debit/payment-host-to-host.htm | Create order |
| [**queryPayment**](#queryPayment) | **POST** /payment-gateway/v1.0/debit/status.htm | Query payment status |
| [**refundOrder**](#refundOrder) | **POST** /payment-gateway/v1.0/debit/refund.htm | Refund order |
