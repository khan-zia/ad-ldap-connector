export const WEBHOOK = {
  SUCCESS: 'success',
  FAILURE: 'failure',
} as const;

type SendPayloadResponse = {
  status: (typeof WEBHOOK)[keyof typeof WEBHOOK];
  message?: string;
};

export const sendPayload = (): SendPayloadResponse => {
  return { status: WEBHOOK.SUCCESS };
};
