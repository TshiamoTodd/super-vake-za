"use server"

import Stripe from 'stripe';
import { CheckoutOrderParams, CreateOrderParams, GetOrdersByEventParams, GetOrdersByUserParams } from "@/types"
import { redirect } from 'next/navigation';
import { handleError } from '../utils';
import { connectToDatabase } from '../database';
import Order from '../database/models/order.model';
import Event from '../database/models/event.model';
import {ObjectId} from 'mongodb';
import User from '../database/models/user.model';
import nodemailer from 'nodemailer';

export const checkoutOrder = async (order: CheckoutOrderParams) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  const price = order.isFree ? 0 : Number(order.price) * 100;

  try {
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: price,
            product_data: {
              name: order.eventTitle
            }
          },
          quantity: 1
        },
      ],
      metadata: {
        eventId: order.eventId,
        buyerId: order.buyerId,
      },
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_SERVER_URL}/events/${order.eventId}?success=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_SERVER_URL}/events/${order.eventId}?cancel=1`,
    });

    redirect(session.url!)
  } catch (error) {
    throw error;
  }
}

export const createOrder = async (order: CreateOrderParams) => {
  try {
    await connectToDatabase();
    
    const newOrder = await Order.create({
      ...order,
      event: order.eventId,
      buyer: order.buyerId,
    });

    return JSON.parse(JSON.stringify(newOrder));
  } catch (error) {
    handleError(error);
  }
}

// GET ORDERS BY EVENT
export async function getOrdersByEvent({ searchString, eventId }: GetOrdersByEventParams) {
  try {
    await connectToDatabase()

    if (!eventId) throw new Error('Event ID is required')
    const eventObjectId = new ObjectId(eventId)

    const orders = await Order.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'buyer',
          foreignField: '_id',
          as: 'buyer',
        },
      },
      {
        $unwind: '$buyer',
      },
      {
        $lookup: {
          from: 'events',
          localField: 'event',
          foreignField: '_id',
          as: 'event',
        },
      },
      {
        $unwind: '$event',
      },
      {
        $project: {
          _id: 1,
          totalAmount: 1,
          createdAt: 1,
          eventTitle: '$event.title',
          eventId: '$event._id',
          buyer: {
            $concat: ['$buyer.firstName', ' ', '$buyer.lastName'],
          },
        },
      },
      {
        $match: {
          $and: [{ eventId: eventObjectId }, { buyer: { $regex: RegExp(searchString, 'i') } }],
        },
      },
    ])

    return JSON.parse(JSON.stringify(orders))
  } catch (error) {
    handleError(error)
  }
}

// GET ORDERS BY USER
export async function getOrdersByUser({ userId, limit = 3, page }: GetOrdersByUserParams) {
  try {
    await connectToDatabase()

    const skipAmount = (Number(page) - 1) * limit
    const conditions = { buyer: userId }

    const orders = await Order.distinct('event._id')
      .find(conditions)
      .sort({ createdAt: 'desc' })
      .skip(skipAmount)
      .limit(limit)
      .populate({
        path: 'event',
        model: Event,
        populate: {
          path: 'organizer',
          model: User,
          select: '_id firstName lastName',
        },
      })

    const ordersCount = await Order.distinct('event._id').countDocuments(conditions)

    return { data: JSON.parse(JSON.stringify(orders)), totalPages: Math.ceil(ordersCount / limit) }
  } catch (error) {
    handleError(error)
  }
}

// GET ORDER BY EVENT AND USER
export async function getOrderByEventAndUser({ eventId, userId }: { eventId: string, userId: string }) {
  try {
    await connectToDatabase()

    const order = await Order.findOne({ event: eventId, buyer: userId })

    return JSON.parse(JSON.stringify(order))
  } catch (error) {
    handleError(error)
  }
}

// SEND ORDER MAIL
export async function sendOrderMail({
  to, 
  subject, 
  body,
}: {
  to: string, subject: string, body: string
}) {
  const {SMTP_EMAIL, SMTP_PASSWORD} = process.env;

  const transport = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: SMTP_EMAIL,
        pass: SMTP_PASSWORD,
    },
  });

  try {
        const testResult = await transport.verify();
        console.log(testResult);
    } catch (error) {
        console.log(error);
    }

  try {
      const sendResult = await transport.sendMail({
          from: SMTP_EMAIL,
          to,
          subject,
          html: body
      });
  } catch (error) {
      console.log(error);
  }
}

