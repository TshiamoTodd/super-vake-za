# Table of context
1. Introduction
2. Installation
3. Project Structure
4. Authentication with clerk
5. Database Schema
6. API Endpoints
7. Server Actions
8. Payment Integration
9. Running the Application
10. Deployment
11. Conclusion

# Introduction
This Events Booking Application is built using Next.js and utilizes MongoDB with Mongoose as the Object Data Modeling (ODM) library. The application leverages UploadThing for cloud storage to upload event images and uses Stripe for processing ticket payments. Server actions are employed to handle API requests to the database.

# Installation
To set up the application, follow these steps:

1. **Clone the repository:**
```bash
git clone https://github.com/TshiamoTodd/super-vake-za.git
cd super-vake-za
```

2. **Install dependencies:**
```bash
npm install
```

3. Set up environment variables by creating a `.env` file in the root folder:
```env
NEXT_PUBLIC_SERVER_URL=http://localhost:3000
UPLOADTHING_SECRET=YOUR-UPLOATHING-SECRET
UPLOADTHING_APP_ID=YOUR-UPLOADTHING-APP-ID
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=YOUR-STRIPE-PUBLISHABLE-KEY
```
check out the `.env.example` file in the root folder to get the full list of environment variables

# Configuration
1. **MongoDB:**
- Ensure MongoDB is running locally or use a cloud-based MongoDB service.
- Update the connection string in the `.env` file.

2. **Mongoose:**
- Define your schemas and models in the `lib/database/models` directory.

3. **UploadThing:**
- Sign up for UploadThing and get your API key.
- Configure the API key in the `.env` file.

4. **Stripe:**
- Sign up for Stripe and get your secret and public keys.
- Configure the keys in the `.env` file.

# Folder Structure
```
super-vake-za/
├── app/
│   ├── layout.tsx
│   ├── favicon.ico
│   ├── global.css
│   ├── page.tsx
│   ├── api/
│   │    ├── uploadthing/
│   │    └── wenbhook/
│   ├── (auth)/
│   │    ├── sign-in/[[...sign-in]]/
│   │    ├── sign-up/[[...sign-up]]/ 
│   │    └── layout.tsx
│   └── (root)/
│       ├── events/
│       ├── orders/
│       ├── profile/
│       ├── layout.tsx
│       └── page.tsx
├── components/
│   ├── shared/
│   └── ui/
├── lib/
│   ├── actions
│   ├── database
│   ├── uploadthing.ts
│   ├── validator.ts
│   └── utils.ts
├── public/
├── constants/
│   └── index.ts
├── types/
│   └── index.ts
├── .env
├── next.config.js
├── package.json
└── README.md

```

# Set up Clerk Authentication
- Sign up for Clerk at [Clerk.com](https://clerk.com/).
- Create a Clerk application and get your Frontend API.
- Add your Clerk Frontend API to your .env.local file.

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your-clerk-publishable-key
CLERK_SECRET_KEY=your-clerk-secret-key
```

# Database Schema
There are 4 database schema representing 4 database objects namely `user`, `envent`, `oder`, `category`

**The User Schema**
This represents the user object `user.model.ts`
```typescript
import { Schema, model, models } from "mongoose";

const UserSchema = new Schema({
    clerkId: {type: String, required: true, unique: true},
    email: {type: String, required: true, unique: true},
    username: {type: String, required: true, unique: true},
    firstName: {type: String, required: true},
    lastName: {type: String, required: true},
    photo: {type: String, required: true},
});

const User = models.User || model('User', UserSchema);

export default User;
```

**The Event Schema**
This represents the event object `event.model.ts`
```typescript
import { Document, Schema, model, models } from "mongoose";

export interface IEvent extends Document {
    _id: string;
    title: string;
    description?: string;
    location?: string;
    createdAt: Date;
    imageUrl: string;
    startDateTime: Date;
    endDateTime: Date;
    price: string;
    isFree: boolean;
    url?: string;
    category: {_id: string, name: string};
    organizer: {_id: string, firstName: string, lastName: string};
}

const EventSchema = new Schema({
    title: {type: String, required: true},
    description: {type: String},
    location: {type: String},
    createdAt: {type: Date, default: Date.now},
    imageUrl: {type: String, required: true},
    startDateTime: {type: Date, default: Date.now},
    endDateTime: {type: Date, default: Date.now},
    price: {type: String},
    isFree: {type: Boolean, default: false},
    url: {type: String},
    category: {type: Schema.Types.ObjectId, ref: 'Category'},
    organizer: { type: Schema.Types.ObjectId, ref: 'User' },
});

const Event = models.Event || model('Event', EventSchema);

export default Event;

```

**The Order Schema**
This represents the order object `order.model.ts`
```typescript
import { Schema, model, models, Document } from 'mongoose'

export interface IOrder extends Document {
  createdAt: Date
  stripeId: string
  totalAmount: string
  event: {
    _id: string
    title: string
  }
  buyer: {
    _id: string
    firstName: string
    lastName: string
    email: string
  }
}

export type IOrderItem = {
  _id: string
  totalAmount: string
  createdAt: Date
  eventTitle: string
  eventId: string
  buyer: string
}

const OrderSchema = new Schema({
  createdAt: {
    type: Date,
    default: Date.now,
  },
  stripeId: {
    type: String,
    required: true,
    unique: true,
  },
  totalAmount: {
    type: String,
  },
  event: {
    type: Schema.Types.ObjectId,
    ref: 'Event',
  },
  buyer: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
})

const Order = models.Order || model('Order', OrderSchema);

export default Order;
```

**The Category Schema**
This represents the category object `category.model.ts`
```typescript
import { Document, Schema, model, models } from "mongoose";

export interface ICategory extends Document {
    _id: string;
    name: string;
}

const CategorySchema = new Schema({
    name: {type: String, required: true, unique: true},
});

const Category = models.Category || model('Category', CategorySchema);

export default Category;
```

# API Endpoints

### Authentication
**Clerk API Endpoins**
For authentication we use Clerk and Clerk webhook to sync user data from Clerk with our own database user information. `api/webhook/clerk/route.ts`

```typescript
import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { createUser, deleteUser, updateUser } from '@/lib/actions/user.actions'
import { clerkClient } from '@clerk/nextjs'
import { NextResponse } from 'next/server'
 
export async function POST(req: Request) {
 
  // You can find this in the Clerk Dashboard -> Webhooks -> choose the webhook
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET
 
  if (!WEBHOOK_SECRET) {
    throw new Error('Please add WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local')
  }
 
  // Get the headers
  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");
 
  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400
    })
  }
 
  // Get the body
  const payload = await req.json()
  const body = JSON.stringify(payload);
 
  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);
 
  let evt: WebhookEvent
 
  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error occured', {
      status: 400
    })
  }
 
  // Get the ID and type
  const { id } = evt.data;
  const eventType = evt.type;
 
  if(eventType === 'user.created') {
    const {id, email_addresses, image_url, first_name, last_name, username} = evt.data;

    const user = {
        clerkId: id,
        email: email_addresses[0].email_address,
        username: username!,
        firstName: first_name,
        lastName: last_name,
        photo: image_url,
    };

    const newUser = await createUser(user);

    if(newUser) {
        await clerkClient.users.updateUserMetadata(id, {
            publicMetadata: {
                userId: newUser._id,
            }
        });
    };

    return NextResponse.json({message: "Ok", user: newUser});
  }

  if (eventType === 'user.updated') {
    const {id, image_url, first_name, last_name, username } = evt.data

    const user = {
      firstName: first_name,
      lastName: last_name,
      username: username!,
      photo: image_url,
    }

    const updatedUser = await updateUser(id, user)

    return NextResponse.json({ message: 'OK', user: updatedUser })
  }

  if (eventType === 'user.deleted') {
    const { id } = evt.data

    const deletedUser = await deleteUser(id!)

    return NextResponse.json({ message: 'OK', user: deletedUser })
  }
 
  return new Response('', { status: 200 })
}
 
```


### File Uploads
**UploadThing**
For image file uploads we use UploadThing file route endpoint to allow our users to upload files to cloud storage
`api/api/uploadthing/route.ts`

```typescript
import { createNextRouteHandler } from "uploadthing/next";
 
import { ourFileRouter } from "./core";
 
// Export routes for Next App Router
export const { GET, POST } = createNextRouteHandler({
  router: ourFileRouter,
});
```

**UploadThing**
`api/api/uploadthing/core.ts`
Endpoint for file uploads to UploadThging using FileRoutes 
```typescript
import { createUploadthing, type FileRouter } from "uploadthing/next";
 
const f = createUploadthing();
 
const auth = (req: Request) => ({ id: "fakeId" }); // Fake auth function
 
// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
  // Define as many FileRoutes as you like, each with a unique routeSlug
  imageUploader: f({ image: { maxFileSize: "4MB" } })
    // Set permissions and file types for this FileRoute
    .middleware(async ({ req }) => {
      // This code runs on your server before upload
      const user = await auth(req);
 
      // If you throw, the user will not be able to upload
      if (!user) throw new Error("Unauthorized");
 
      // Whatever is returned here is accessible in onUploadComplete as `metadata`
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // This code RUNS ON YOUR SERVER after upload
      console.log("Upload complete for userId:", metadata.userId);
 
      console.log("file url", file.url);
 
      // !!! Whatever is returned here is sent to the clientside `onClientUploadComplete` callback
      return { uploadedBy: metadata.userId };
    }),
} satisfies FileRouter;
 
export type OurFileRouter = typeof ourFileRouter;
```

### Payments
We use Stripe payment webhook to facilitate payments within the application.
`api/webhook/stripe/route.ts`

```typescript
import stripe from 'stripe'
import { NextResponse } from 'next/server'
import { createOrder } from '@/lib/actions/order.actions'

export async function POST(request: Request) {
  const body = await request.text()

  const sig = request.headers.get('stripe-signature') as string
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

  let event

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret)
  } catch (err) {
    return NextResponse.json({ message: 'Webhook error', error: err })
  }

  // Get the ID and type
  const eventType = event.type

  // CREATE
  if (eventType === 'checkout.session.completed') {
    const { id, amount_total, metadata } = event.data.object

    const order = {
      stripeId: id,
      eventId: metadata?.eventId || '',
      buyerId: metadata?.buyerId || '',
      totalAmount: amount_total ? (amount_total / 100).toString() : '0',
      createdAt: new Date(),
    }

    const newOrder = await createOrder(order);

    return NextResponse.json({ message: 'OK', order: newOrder })
  }

  return new Response('Order Created & Email sent', { status: 200 })
}
```

# Server Actions

### 1. User Actions
For our user actions we have 4 functions that perform CRUD operations to the database using our User object the functions are as follows:

- **`createUser()`** `lib/actions/user.action.ts` which creates a new user:
```typescript
export async function createUser(user: CreateUserParams) {
  try {
    await connectToDatabase()

    const newUser = await User.create(user)
    return JSON.parse(JSON.stringify(newUser))
  } catch (error) {
    handleError(error)
  }
}
```

- **`getUserById()`** `lib/actions/user.action.ts` which retrieves a user based on the ID provided:
```typescript
export async function getUserById(userId: string) {
  try {
    await connectToDatabase()

    const user = await User.findById(userId)

    if (!user) throw new Error('User not found')
    return JSON.parse(JSON.stringify(user))
  } catch (error) {
    handleError(error)
  }
}
```

- **`updateUser()`** `lib/actions/user.action.ts` which updates a user based on the ID, and new user data provided:
```typescript
export async function updateUser(clerkId: string, user: UpdateUserParams) {
  try {
    await connectToDatabase()

    const updatedUser = await User.findOneAndUpdate({ clerkId }, user, { new: true })

    if (!updatedUser) throw new Error('User update failed')
    return JSON.parse(JSON.stringify(updatedUser))
  } catch (error) {
    handleError(error)
  }
}
```

- **`deleteUser()`** `lib/actions/user.action.ts` which deletes a user based on the ID provided:
```typescript
export async function deleteUser(clerkId: string) {
  try {
    await connectToDatabase()

    // Find user to delete
    const userToDelete = await User.findOne({ clerkId })

    if (!userToDelete) {
      throw new Error('User not found')
    }

    // Unlink relationships
    await Promise.all([
      // Update the 'events' collection to remove references to the user
      Event.updateMany(
        { _id: { $in: userToDelete.events } },
        { $pull: { organizer: userToDelete._id } }
      ),

      // Update the 'orders' collection to remove references to the user
      Order.updateMany({ _id: { $in: userToDelete.orders } }, { $unset: { buyer: 1 } }),
    ])

    // Delete user
    const deletedUser = await User.findByIdAndDelete(userToDelete._id)
    revalidatePath('/')

    return deletedUser ? JSON.parse(JSON.stringify(deletedUser)) : null
  } catch (error) {
    handleError(error)
  }
}
```

### 2. Event Actions
For our **event** actions we have 7 functions that perform CRUD operations to the database using our Event object the functions are as follows:
`lib/actions/event.actions.ts`

1. `createEvent()`
   -  Creates a new Event object in the database
2. `getEventById()`
  - Retrieves event object based on the ID provided
3. `updateEvent()`
   - Updates an event based on the ID and event data provided
4. `deleteEvent()`
   - Deletes an event based on the ID provided
5. `getAllEvents()`
    - Retrieves a list of event objects in the database limited to only 6 objects per query
6. `getEventsByUser()`
    - Retrieves a list of event objects in the database that matches the userId of the user provided
7. `getRelatedEventsByCategory()`
    - Retrieves a list of event objects in the database that are related based on category

### 3. Order Actions
For the **order** actions we have 5 functions that perform CRUD operations to the database using our Order object the functions are as follows:
`lib/actions/order.actions.ts`

1. `createOrder()`
   - Creates a new Order object in the database
2. `checkoutOrder()`
  - Creates a stripe checkout session with the order data
3. `getOrdersByEvent()`
   - Retrieves orders from the database that are linked to an event
4. `getOrdersByUser()`
   - Retrieves orders from the database that are linked to a user
5. `getOrderByEventAndUser()`
    - Retrieves orders from the database that are linked to a user and an event

### 4. Category Actions
For the **category** actions we have 2 functions that perform CRUD operations to the database using our Category object the functions are as follows:
`lib/actions/category.actions.ts`

1. `createCategory()`
   - Creates a new Category object in the database
2. `getAllCategories()`
  - Retrives a list of all category objects from the database

# Payment Integration
This function create a Stripe checkout session intent that triggers a session webhook to process the transaction
`lib/action/order.actions.ts`

```typescript
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
```



# Running the Application

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

# Conclusion
This documentation provides a high-level overview of the Events Booking Application, including installation, configuration, folder structure, database schema, API endpoints, server actions, image uploading, and payment integration. For detailed usage and additional features, refer to the source code and in-line comments.

Check out my [blog](#) for more details.
