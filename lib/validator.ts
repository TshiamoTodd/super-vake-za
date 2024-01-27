import * as z from "zod";

export const eventFormSchema = z.object({
    title: z.string().min(3, {
        message: 'Title must be at least 3 characters long',
    }),
    description: z.string().min(3, {
        message: 'Description must be at least 3 characters long',
    }).max(400, {
        message: 'Description must be less than 400 characters',
    }),
    location: z.string().min(3, {
        message: 'Location must be at least 3 characters long',
    }).max(400, {
        message: 'Location must be less than 400 characters',
    }),
    imageUrl: z.string(),
    startDateTime: z.date(),
    endDateTime: z.date(),
    categoryId: z.string(),
    price: z.string(),
    isFree: z.boolean(),
    url: z.string().url({
        message: 'Please enter a valid URL',
    }),
});