# Razorpay Setup Guide

## Development Mode

The application can run without Razorpay configuration for development purposes. When Razorpay keys are not provided, the system will:

- ✅ **Allow company registration** with mock payment orders
- ✅ **Generate subscription plans** and pricing
- ✅ **Accept mock payment verification** for testing
- ⚠️ **Log warnings** about missing Razorpay configuration

## Production Setup

For production deployment, you **must** configure Razorpay:

### 1. Create Razorpay Account
1. Visit [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Sign up for a business account
3. Complete KYC verification

### 2. Get API Keys
1. Go to **Settings** → **API Keys**
2. Generate **Key ID** and **Key Secret**
3. Copy both keys securely

### 3. Configure Environment Variables
Add to your `.env` file:

```env
# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_live_your_actual_key_id
RAZORPAY_KEY_SECRET=your_actual_secret_key
```

**⚠️ Security Note:** Never commit actual keys to version control!

### 4. Test Integration
```bash
# Test with subscription plans endpoint
curl -X GET http://localhost:3000/api/v1/auth/subscription-plans

# Test company registration
curl -X POST http://localhost:3000/api/v1/auth/register-company \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Test Company",
    "size": "medium",
    "subscription": {
      "plan": "professional",
      "interval": "annual"
    },
    "adminFirstName": "Test",
    "adminLastName": "Admin",
    "adminEmail": "admin@test.com",
    "adminPassword": "SecurePass123!"
  }'
```

## Current Behavior

### Without Razorpay Keys:
- Company registration creates **mock payment orders**
- Payment verification accepts **mock payment IDs**
- All subscription features work normally
- Console shows warnings about missing configuration

### With Razorpay Keys:
- Company registration creates **real Razorpay orders**
- Payment verification uses **actual Razorpay API**
- Real payment processing and webhooks
- Production-ready payment flow

## Subscription Plans

| Plan | Monthly | Annual | Features |
|------|---------|---------|----------|
| **Basic** | ₹999 | ₹9,999 | 10 users, 25 jobs, basic features |
| **Professional** | ₹2,999 | ₹29,999 | 50 users, 100 jobs, AI features |
| **Enterprise** | ₹9,999 | ₹99,999 | Unlimited users/jobs, full features |

## Integration Flow

1. **Company Registration**:
   - User selects subscription plan
   - System creates Razorpay order (or mock)
   - Returns payment details to frontend

2. **Payment Processing**:
   - Frontend integrates Razorpay checkout
   - User completes payment
   - Frontend sends payment details to backend

3. **Payment Verification**:
   - Backend verifies payment signature
   - Activates company subscription
   - Returns authentication token

## Error Handling

The system gracefully handles missing Razorpay configuration:

- **Development**: Uses mock orders and warnings
- **Production**: Throws clear error messages
- **Validation**: Checks configuration before payment operations

## Next Steps

1. **For Development**: Continue without Razorpay keys
2. **For Production**: Set up Razorpay account and configure keys
3. **For Testing**: Use Razorpay test keys (prefix: `rzp_test_`)

---

**Need Help?** Check the [Razorpay Documentation](https://razorpay.com/docs/) for detailed integration guides.