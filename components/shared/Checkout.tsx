'use client';

import { loadStripe } from '@stripe/stripe-js';
import React, {  useEffect } from 'react'

import { IEvent } from '@/lib/database/models/event.model'
import { Button } from '../ui/button'
import { checkoutOrder, sendOrderMail } from '@/lib/actions/order.actions';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckoutOrderParams } from '@/types';


loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

let orderDetails:CheckoutOrderParams  = {
    eventTitle: '',
    eventId: '',
    price: '',
    isFree: false,
    buyerId: '',
}

const Checkout = ({
    event, 
    userId
}: {
    event: IEvent, 
    userId: string
}) => {
    const searchParams = useSearchParams();
    const router = useRouter();

    useEffect(() => {
        // Check to see if this is a redirect back from Checkout
        if(searchParams.has('success')) {
            console.log('Order placed! You will receive an email confirmation.');

            const sendEmail = async () => {
                await sendOrderMail({
                    to: 'tshiamo.gaara@gmail.com',
                    subject: 'New Order',
                    body: `<html>
                        <p>You have a new order </p>
                        <img src='https://api.qrserver.com/v1/create-qr-code/?size=512x5&data=SomethingBro' alt='qrcode'/>
                    </html>`
                });
            };

            sendEmail();

            router.push(`/events/${event._id}`);
            
        } else if(searchParams.has('canceled')) {
            console.log('Order canceled -- continue to shop around and checkout when you are ready.');
        }

      }, []);

    const onCheckout = async () => {
        const order = {
            eventTitle: event.title,
            eventId: event._id,
            price: event.price,
            isFree: event.isFree,
            buyerId: userId,
        }

        orderDetails = order;

        await checkoutOrder(order);
    }

    return (
        <form action={onCheckout} method='post'>
            <Button type='submit' role='link' size={'lg'} className='button sm:w-fit'>
                {event.isFree ? 'Get Tickets' : 'Buy Ticket'}
            </Button>
        </form>
    );
}

export default Checkout