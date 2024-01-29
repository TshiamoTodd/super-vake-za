'use client';
import { IEvent } from '@/lib/database/models/event.model'
import React, { useEffect } from 'react'
import { Button } from '../ui/button'
import CheckoutButton from './CheckoutButton'
import Link from 'next/link'
import { compileWelcomeTemplate, getOrderByEventAndUser, sendOrderMail } from '@/lib/actions/order.actions'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'

interface OrderOrganizerProps {
  event: IEvent,
  userId: string
}

const OrderOrganizer = async ({event, userId}: OrderOrganizerProps) => {
    const searchParams = useSearchParams();
    const router = useRouter();

    useEffect(() => {
        // Check to see if this is a redirect back from Checkout
        if(searchParams.has('success')) {
            console.log('Order placed! You will receive an email confirmation.');
            const orderDetails = async () => {
                return await getOrderByEventAndUser({eventId: event._id, userId});
            }

            const order = orderDetails();
            console.log(order);
            const sendEmail = async () => {
              await sendOrderMail({
                  to: 'tshiamo.gaara@gmail.com',
                  subject: 'Order Confirmation',
                  body: await compileWelcomeTemplate({
                        heroImg: '/images/hero.png',
                        qrcode: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${order}`,
                        url: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${order}`,
                        facebook: '/images/image-4.png',
                        instagram: '/images/image-5.png',
                        twitter: '/images/image-3.png',
                        linkedin: '/images/image-1.png',
                        logo: '/images/logo.svg',
                  }),
              });
            }
    
            sendEmail();
            toast.success('Order placed!');

            router.push(`/events/${event._id}`);
            
        } else if(searchParams.has('cancel')) {
            console.log('Order canceled -- continue to shop around and checkout when you are ready.');
        }

      }, []);
    
    return (
        <>
            {/* {orderByEventAndUser && event.organizer._id !== userId ? (
                <div className='flex flex-col md:flex-row gap-3 md:items-center space-x-2'>
                    <p className='p-bold-20 text-grey-600'>
                        Already Purchased Ticket
                    </p>
                </div>
            
            ): (
                null
            )}

            {event.organizer._id !== userId && !orderByEventAndUser && (
                <CheckoutButton event={event} />
            )}

            
            {event.organizer._id === userId && (
                <Button asChild className='button rounded-full' size={'lg'}>
                    <Link href={`/orders?eventId=${event._id}`}>
                        View Orders
                    </Link>
                </Button>
            )} */}
        </>
    );
}

export default OrderOrganizer