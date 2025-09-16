import Razorpay from 'razorpay';
import crypto from 'crypto';
import { logger } from '../config/logger';

interface SubscriptionPlan {
  name: string;
  features: string[];
  maxUsers: number;
  maxJobs: number;
  pricing: {
    monthly: number;
    annual: number;
  };
}

interface CreateOrderParams {
  amount: number;
  currency: string;
  companyName: string;
  plan: string;
  interval: 'monthly' | 'annual';
}

interface VerifyPaymentParams {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export class PaymentService {
  private static razorpay: Razorpay;

  // Initialize Razorpay instance lazily
  private static getRazorpayInstance(): Razorpay {
    if (!this.razorpay) {
      console.log(process.env.RAZORPAY_KEY_ID,"ddddddddddddddddddddd")
      const keyId = process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;

      if (!keyId || !keySecret) {
        throw new Error(
          'Razorpay configuration missing. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables.'
        );
      }

      this.razorpay = new Razorpay({
        key_id: keyId,
        key_secret: keySecret
      });
    }

    return this.razorpay;
  }

  // Subscription plans configuration
  static readonly SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
    basic: {
      name: 'Basic Plan',
      features: [
        'Up to 10 users',
        'Up to 25 job postings',
        'Basic candidate management',
        'Email support',
        'Standard templates'
      ],
      maxUsers: 10,
      maxJobs: 25,
      pricing: {
        monthly: 999, // ₹999/month
        annual: 9999 // ₹9999/year (2 months free)
      }
    },
    professional: {
      name: 'Professional Plan',
      features: [
        'Up to 50 users',
        'Up to 100 job postings',
        'Advanced candidate management',
        'AI-powered resume parsing',
        'Interview scheduling',
        'Analytics dashboard',
        'Priority support',
        'Custom templates'
      ],
      maxUsers: 50,
      maxJobs: 100,
      pricing: {
        monthly: 2999, // ₹2999/month
        annual: 29999 // ₹29999/year (2 months free)
      }
    },
    enterprise: {
      name: 'Enterprise Plan',
      features: [
        'Unlimited users',
        'Unlimited job postings',
        'Full candidate management suite',
        'AI-powered matching',
        'Advanced analytics',
        'Custom integrations',
        'Dedicated support',
        'White-label options',
        'API access',
        'Custom workflows'
      ],
      maxUsers: -1, // Unlimited
      maxJobs: -1, // Unlimited
      pricing: {
        monthly: 9999, // ₹9999/month
        annual: 99999 // ₹99999/year (2 months free)
      }
    }
  };

  // Get subscription plan details
  static getSubscriptionPlan(planName: string): SubscriptionPlan | null {
    return this.SUBSCRIPTION_PLANS[planName] || null;
  }

  // Get all subscription plans
  static getAllPlans(): Record<string, SubscriptionPlan> {
    return this.SUBSCRIPTION_PLANS;
  }

  // Calculate pricing based on plan and interval
  static calculatePricing(plan: string, interval: 'monthly' | 'annual'): number {
    const subscriptionPlan = this.getSubscriptionPlan(plan);
    if (!subscriptionPlan) {
      throw new Error(`Invalid subscription plan: ${plan}`);
    }
    return subscriptionPlan.pricing[interval];
  }

  // Check if Razorpay is configured
  static isConfigured(): boolean {
    return !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
  }

  // Create Razorpay order
  static async createOrder(params: CreateOrderParams): Promise<any> {
    try {
      const options = {
        amount: params.amount * 100, // Amount in paisa (multiply by 100)
        currency: params.currency,
        receipt: `receipt_${Date.now()}`,
        notes: {
          company_name: params.companyName,
          subscription_plan: params.plan,
          billing_interval: params.interval,
          created_at: new Date().toISOString()
        }
      };

      const order = await this.getRazorpayInstance().orders.create(options);

      logger.info('Razorpay order created successfully', {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        companyName: params.companyName,
        plan: params.plan
      });

      return order;
    } catch (error) {
      logger.error('Failed to create Razorpay order:', error);
      throw new Error('Payment order creation failed');
    }
  }

  // Verify payment signature
  static verifyPaymentSignature(params: VerifyPaymentParams): boolean {
    try {
      const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = params;

      const body = razorpayOrderId + '|' + razorpayPaymentId;

      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
        .update(body.toString())
        .digest('hex');

      const isSignatureValid = expectedSignature === razorpaySignature;

      logger.info('Payment signature verification', {
        orderId: razorpayOrderId,
        paymentId: razorpayPaymentId,
        isValid: isSignatureValid
      });

      return isSignatureValid;
    } catch (error) {
      logger.error('Payment signature verification failed:', error);
      return false;
    }
  }

  // Get payment details from Razorpay
  static async getPaymentDetails(paymentId: string): Promise<any> {
    try {
      const payment = await this.getRazorpayInstance().payments.fetch(paymentId);

      logger.info('Retrieved payment details', {
        paymentId: payment.id,
        amount: payment.amount,
        status: payment.status,
        method: payment.method
      });

      return payment;
    } catch (error) {
      logger.error('Failed to retrieve payment details:', error);
      throw new Error('Failed to retrieve payment details');
    }
  }

  // Calculate next payment date
  static calculateNextPaymentDate(interval: 'monthly' | 'annual'): Date {
    const currentDate = new Date();
    if (interval === 'monthly') {
      return new Date(currentDate.setMonth(currentDate.getMonth() + 1));
    } else {
      return new Date(currentDate.setFullYear(currentDate.getFullYear() + 1));
    }
  }

  // Generate subscription configuration
  static generateSubscriptionConfig(plan: string, interval: 'monthly' | 'annual') {
    const subscriptionPlan = this.getSubscriptionPlan(plan);
    if (!subscriptionPlan) {
      throw new Error(`Invalid subscription plan: ${plan}`);
    }

    const amount = this.calculatePricing(plan, interval);
    const nextPaymentDate = this.calculateNextPaymentDate(interval);

    return {
      plan,
      status: 'pending_payment',
      maxUsers: subscriptionPlan.maxUsers,
      maxJobs: subscriptionPlan.maxJobs,
      features: subscriptionPlan.features,
      pricing: {
        amount,
        currency: 'INR',
        interval
      },
      paymentInfo: {
        nextPaymentDate
      }
    };
  }

  // Refund payment
  static async refundPayment(paymentId: string, amount?: number): Promise<any> {
    try {
      const refundData: any = {
        payment_id: paymentId,
        speed: 'normal'
      };

      if (amount) {
        refundData.amount = amount * 100; // Convert to paisa
      }

      const refund = await this.getRazorpayInstance().payments.refund(paymentId, refundData);

      logger.info('Refund processed successfully', {
        refundId: refund.id,
        paymentId: paymentId,
        amount: refund.amount,
        status: refund.status
      });

      return refund;
    } catch (error) {
      logger.error('Failed to process refund:', error);
      throw new Error('Refund processing failed');
    }
  }
}