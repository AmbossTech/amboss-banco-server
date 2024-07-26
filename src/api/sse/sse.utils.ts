export const EventTypes = {
  contacts: (user_id: string) => `/events/contacts/${user_id}`,
  payments: (user_id: string) => `/events/payments/${user_id}`,
};
