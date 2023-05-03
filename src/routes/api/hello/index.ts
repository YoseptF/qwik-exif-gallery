import type { RequestHandler } from '@builder.io/qwik-city';
 
export const onGet: RequestHandler = async (requestEvent) => {
  // Get the product from the database
 
  // Send the product as JSON
  requestEvent.json(200, {hello: 'world 2'});
};

