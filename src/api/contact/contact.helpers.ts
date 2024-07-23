import { GraphQLError } from 'graphql';

export const MESSAGE_PAYLOAD_LIMIT = 512;

export const checkPayloadLimit = (payloads: (string | null)[]) => {
  for (const payload of payloads) {
    if (!payload) continue;
    if (payload.length > MESSAGE_PAYLOAD_LIMIT) {
      throw new GraphQLError(
        `Chat payload too big. Max ${MESSAGE_PAYLOAD_LIMIT} characters allowed`,
      );
    }
  }
};
