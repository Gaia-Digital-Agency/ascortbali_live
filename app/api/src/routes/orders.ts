// This module defines routes for managing user orders and payments.
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

export const ordersRouter = Router();

// Zod schema for validating order creation requests.
const CreateOrderSchema = z.object({
  serviceId: z.string().uuid(),
});

// POST route for creating a new order.
ordersRouter.post("/", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = CreateOrderSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });

  const service = await prisma.service.findUnique({ where: { id: parsed.data.serviceId } });
  if (!service || !service.active) return res.status(404).json({ error: "service_not_found" });

  const order = await prisma.$transaction(async (tx) => {
    const o = await tx.order.create({
      data: {
        userId: req.user!.id,
        serviceId: service.id,
        creatorId: service.creatorId,
        status: "pending",
        totalPrice: service.basePrice,
      },
    });
    return o;
  });

  res.status(201).json(order);
});

// Zod schema for validating payment requests.
const PaymentSchema = z.object({
  orderId: z.string().uuid(),
  provider: z.string().min(2).max(50).default("manual"),
  amount: z.coerce.number().positive(),
  transactionRef: z.string().max(120).optional().nullable(),
  status: z.enum(["pending","succeeded","failed","refunded"]).default("succeeded"),
});

// POST route for processing payments for an order.
ordersRouter.post("/payment", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = PaymentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });

  const order = await prisma.order.findUnique({ where: { id: parsed.data.orderId } });
  if (!order) return res.status(404).json({ error: "order_not_found" });
  if (order.userId !== req.user!.id) return res.status(403).json({ error: "forbidden" });

  const payment = await prisma.payment.create({
    data: {
      orderId: order.id,
      provider: parsed.data.provider,
      amount: parsed.data.amount.toFixed(2),
      status: parsed.data.status,
      transactionRef: parsed.data.transactionRef ?? null,
      paidAt: parsed.data.status === "succeeded" ? new Date() : null,
    },
  });

  // Update order status if payment is successful.
  if (parsed.data.status === "succeeded") {
    await prisma.order.update({ where: { id: order.id }, data: { status: "paid" } });
  }

  res.status(201).json(payment);
});
